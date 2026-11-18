
import * as isKit from "is-kit";

type OutputEntry = {
  level: "log" | "warn" | "error";
  text: string;
};

type ExecuteRequest = {
  type: "execute";
  id: string;
  javascript: string;
};

type ExecutionResponse =
  | {
      type: "complete";
      id: string;
      output: OutputEntry[];
    }
  | {
      type: "error";
      id: string;
      message: string;
      output: OutputEntry[];
    };

const MAX_JAVASCRIPT_LENGTH = 200_000;
const MAX_OUTPUT_ENTRIES = 100;
const MAX_OUTPUT_LENGTH = 4_000;

function isExecuteRequest(
  value: unknown
): value is ExecuteRequest {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const request = value as Record<string, unknown>;

  return (
    request.type === "execute" &&
    typeof request.id === "string" &&
    request.id.length > 0 &&
    request.id.length <= 128 &&
    typeof request.javascript === "string" &&
    request.javascript.length <=
      MAX_JAVASCRIPT_LENGTH
  );
}

function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value === undefined) {
    return "undefined";
  }

  if (value === null) {
    return "null";
  }

  if (typeof value === "bigint") {
    return `${value}n`;
  }

  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }

  if (value instanceof Map) {
    return `Map ${formatValue(
      [...value.entries()]
    )}`;
  }

  if (value instanceof Set) {
    return `Set ${formatValue(
      [...value.values()]
    )}`;
  }

  try {
    return (
      JSON.stringify(value, null, 2) ??
      String(value)
    );
  } catch {
    return String(value);
  }
}

function formatArguments(
  args: unknown[]
): string {
  return args
    .map(formatValue)
    .join(" ")
    .slice(0, MAX_OUTPUT_LENGTH);
}

function getErrorMessage(
  error: unknown
): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
}

function executeJavaScript(
  request: ExecuteRequest
): void {
  const output: OutputEntry[] = [];

  function capture(
    level: OutputEntry["level"],
    args: unknown[]
  ): void {
    if (output.length >= MAX_OUTPUT_ENTRIES) {
      return;
    }

    output.push({
      level,
      text: formatArguments(args),
    });
  }

  const capturedConsole = {
    log: (...args: unknown[]) =>
      capture("log", args),

    info: (...args: unknown[]) =>
      capture("log", args),

    warn: (...args: unknown[]) =>
      capture("warn", args),

    error: (...args: unknown[]) =>
      capture("error", args),
  };

  const allowedRequire = (
    moduleName: string
  ): typeof isKit => {
    if (moduleName === "is-kit") {
      return isKit;
    }

    throw new Error(
      `Unsupported import "${moduleName}". ` +
      'Only "is-kit" imports are supported.'
    );
  };

  try {
    const exportsObject: Record<
      string,
      unknown
    > = {};

    // IMPORTANT:
    // This evaluates arbitrary JavaScript.
    // It is safe to enable only after the
    // separate sandbox origin, CSP, iframe
    // isolation, and protocol are verified.
    //
    // This worker alone is NOT a sandbox.
    const execute = new Function(
      "exports",
      "require",
      "console",
      request.javascript
    ) as (
      exports: Record<string, unknown>,
      requireModule: typeof allowedRequire,
      logger: typeof capturedConsole
    ) => void;

    execute(
      exportsObject,
      allowedRequire,
      capturedConsole
    );

    const response: ExecutionResponse = {
      type: "complete",
      id: request.id,
      output,
    };

    self.postMessage(response);
  } catch (error) {
    const response: ExecutionResponse = {
      type: "error",
      id: request.id,
      message: getErrorMessage(error),
      output,
    };

    self.postMessage(response);
  }
}

self.onmessage = (
  event: MessageEvent<unknown>
) => {
  if (!isExecuteRequest(event.data)) {
    return;
  }

  executeJavaScript(event.data);
};

export {};
