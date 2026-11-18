
import * as ts from "typescript";

type CompileRequest = {
  type: "compile";
  code: string;
};

type CompileResponse =
  | {
      type: "compiled";
      javascript: string;
      diagnostics: string[];
    }
  | {
      type: "error";
      message: string;
      diagnostics: string[];
    };

const MAX_SOURCE_LENGTH = 100_000;

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

function compileTypeScript(
  source: string
): CompileResponse {
  if (source.length > MAX_SOURCE_LENGTH) {
    return {
      type: "error",
      message:
        "The TypeScript source exceeds the " +
        "100,000-character limit.",
      diagnostics: [],
    };
  }

  try {
    const sourceFile = ts.createSourceFile(
      "playground.ts",
      source,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS
    );

    const parseDiagnostics = (
      sourceFile as ts.SourceFile & {
        parseDiagnostics?: readonly ts.Diagnostic[];
      }
    ).parseDiagnostics ?? [];

    const syntaxErrors = parseDiagnostics
      .filter(
        (diagnostic) =>
          diagnostic.category ===
          ts.DiagnosticCategory.Error
      )
      .map(formatDiagnostic);

    if (syntaxErrors.length > 0) {
      return {
        type: "error",
        message: "TypeScript syntax errors.",
        diagnostics: syntaxErrors,
      };
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
        inlineSourceMap: false,
      },
    });

    const errors = (result.diagnostics ?? [])
      .filter(
        (diagnostic) =>
          diagnostic.category ===
          ts.DiagnosticCategory.Error
      )
      .map(formatDiagnostic);

    if (errors.length > 0) {
      return {
        type: "error",
        message: "TypeScript compilation errors.",
        diagnostics: errors,
      };
    }

    return {
      type: "compiled",
      javascript: result.outputText,
      diagnostics: [],
    };
  } catch (error) {
    return {
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unexpected TypeScript compiler error.",
      diagnostics: [],
    };
  }
}

self.onmessage = (
  event: MessageEvent<CompileRequest>
) => {
  const request = event.data;

  if (
    !request ||
    request.type !== "compile" ||
    typeof request.code !== "string"
  ) {
    return;
  }

  const response = compileTypeScript(request.code);

  self.postMessage(response);
};

export {};
