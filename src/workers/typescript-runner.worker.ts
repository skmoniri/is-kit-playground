
import * as ts from "typescript";
import * as isKit from "is-kit";

type RunRequest = {
  type: "run";
  code: string;
};

type OutputEntry = {
  level: "log" | "warn" | "error";
  text: string;
};

type RunResponse =
  | {
      type: "complete";
      output: OutputEntry[];
    }
  | {
      type: "error";
      message: string;
      output: OutputEntry[];
    };

type WorkerContext = {
  postMessage: (message: RunResponse) => void;
  onmessage:
    | ((event: MessageEvent<RunRequest>) => void)
    | null;
};

const workerScope = self as unknown as WorkerContext;

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined) return "undefined";
  if (value === null) return "null";

  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }

  if (value instanceof Map) {
    return `Map ${formatValue([...value.entries()])}`;
  }

  if (value instanceof Set) {
    return `Set ${formatValue([...value.values()])}`;
  }

  if (typeof value === "bigint") {
    return `${value}n`;
  }

  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

function formatArguments(args: unknown[]): string {
  return args.map(formatValue).join(" ");
}

function send(response: RunResponse): void {
  workerScope.postMessage(response);
}

function formatDiagnostic(
  diagnostic: ts.Diagnostic
): string {
  const message = ts.flattenDiagnosticMessageText(
    diagnostic.messageText,
    "\n"
  );

  if (
    !diagnostic.file ||
    diagnostic.start === undefined
  ) {
    return `TS${diagnostic.code}: ${message}`;
  }

  const position =
    diagnostic.file.getLineAndCharacterOfPosition(
      diagnostic.start
    );

  return (
    `Line ${position.line + 1}, ` +
    `column ${position.character + 1} ` +
    `(TS${diagnostic.code}): ${message}`
  );
}

function getSyntaxErrors(
  source: string
): string[] {
  const sourceFile = ts.createSourceFile(
    "playground.ts",
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS
  );

  const diagnostics = (
    sourceFile as ts.SourceFile & {
      parseDiagnostics?: readonly ts.Diagnostic[];
    }
  ).parseDiagnostics ?? [];

  return diagnostics
    .filter(
      (diagnostic) =>
        diagnostic.category ===
        ts.DiagnosticCategory.Error
    )
    .map(formatDiagnostic);
}

function getRuntimeMessage(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

function runTypeScript(source: string): void {
  const output: OutputEntry[] = [];

  const capturedConsole = {
    log: (...args: unknown[]) => {
      output.push({
        level: "log",
        text: formatArguments(args),
      });
    },

    info: (...args: unknown[]) => {
      output.push({
        level: "log",
        text: formatArguments(args),
      });
    },

    warn: (...args: unknown[]) => {
      output.push({
        level: "warn",
        text: formatArguments(args),
      });
    },

    error: (...args: unknown[]) => {
      output.push({
        level: "error",
        text: formatArguments(args),
      });
    },
  };

  try {
    const syntaxErrors = getSyntaxErrors(source);

    if (syntaxErrors.length > 0) {
      send({
        type: "error",
        message:
          "TypeScript syntax errors:\n\n" +
          syntaxErrors.join("\n\n"),
        output,
      });
      return;
    }

    const result = ts.transpileModule(source, {
      fileName: "playground.ts",
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        strict: true,
        esModuleInterop: true,
        sourceMap: false,
      },
    });

    const compileErrors = (
      result.diagnostics ?? []
    )
      .filter(
        (diagnostic) =>
          diagnostic.category ===
          ts.DiagnosticCategory.Error
      )
      .map(formatDiagnostic);

    if (compileErrors.length > 0) {
      send({
        type: "error",
        message:
          "TypeScript compilation errors:\n\n" +
          compileErrors.join("\n\n"),
        output,
      });
      return;
    }

    const allowedRequire = (moduleName: string) => {
      if (moduleName === "is-kit") {
        return isKit;
      }

      throw new Error(
        `Unsupported import "${moduleName}". ` +
        `Only imports from "is-kit" are supported.`
      );
    };

    const exportsObject: Record<string, unknown> = {};

    // Runs inside a disposable Web Worker.
    // Workers are not security sandboxes.
    // Execute trusted code only.
    const execute = new Function(
      "exports",
      "require",
      "console",
      result.outputText
    ) as (
      exports: Record<string, unknown>,
      requireModule: typeof allowedRequire,
      logger: typeof capturedConsole
    ) => void;

    try {
      execute(
        exportsObject,
        allowedRequire,
        capturedConsole
      );
    } catch (error) {
      send({
        type: "error",
        message:
          "Runtime error:\n\n" +
          getRuntimeMessage(error),
        output,
      });
      return;
    }

    send({
      type: "complete",
      output,
    });
  } catch (error) {
    send({
      type: "error",
      message:
        "Execution engine error:\n\n" +
        getRuntimeMessage(error),
      output,
    });
  }
}

workerScope.onmessage = (
  event: MessageEvent<RunRequest>
) => {
  if (event.data.type === "run") {
    runTypeScript(event.data.code);
  }
};

export {};
