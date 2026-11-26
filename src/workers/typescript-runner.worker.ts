import * as ts from "typescript";

import { declarationFiles } from "../generated/typecheck-declarations";

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
const MAX_JAVASCRIPT_LENGTH = 200_000;
const MAX_DIAGNOSTICS = 30;

const SOURCE_FILE = "/playground.ts";

const IS_KIT_DECLARATION = "/node_modules/is-kit/dist/index.d.ts";

const DEFAULT_LIB = "/typescript/lib/lib.es2022.full.d.ts";

const typeCheckOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  esModuleInterop: true,
  skipLibCheck: true,
  noEmit: true,
  types: [],
  lib: ["lib.es2022.full.d.ts"],
};

const transpileOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  ignoreDeprecations: "6.0",
  strict: true,
  esModuleInterop: true,
  sourceMap: false,
  inlineSourceMap: false,
};

function normalizePath(filename: string): string {
  return filename.replace(/\\/g, "/");
}

function formatDiagnostic(diagnostic: ts.Diagnostic): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");

  if (!diagnostic.file || diagnostic.start === undefined) {
    return `TS${diagnostic.code}: ${message}`;
  }

  const position = diagnostic.file.getLineAndCharacterOfPosition(
    diagnostic.start,
  );

  return (
    `Line ${position.line + 1}, ` +
    `column ${position.character + 1} ` +
    `(TS${diagnostic.code}): ${message}`
  );
}

function createCompilerHost(source: string): ts.CompilerHost {
  const files: Record<string, string> = {
    ...declarationFiles,
    [SOURCE_FILE]: source,
  };

  const fileNames = Object.keys(files);

  const host: ts.CompilerHost = {
    getSourceFile(filename, languageVersion) {
      const normalized = normalizePath(filename);
      const content = files[normalized];

      if (content === undefined) {
        return undefined;
      }

      return ts.createSourceFile(normalized, content, languageVersion, true);
    },

    getDefaultLibFileName() {
      return DEFAULT_LIB;
    },

    writeFile() {
      // JavaScript emission uses transpileModule.
    },

    getCurrentDirectory() {
      return "/";
    },

    getDirectories() {
      return [];
    },

    fileExists(filename) {
      return Object.hasOwn(files, normalizePath(filename));
    },

    readFile(filename) {
      return files[normalizePath(filename)];
    },

    directoryExists(directoryName) {
      const prefix = normalizePath(directoryName).replace(/\/$/, "") + "/";

      return fileNames.some((filename) => filename.startsWith(prefix));
    },

    useCaseSensitiveFileNames() {
      return true;
    },

    getCanonicalFileName(filename) {
      return normalizePath(filename);
    },

    getNewLine() {
      return "\n";
    },

    resolveModuleNames(moduleNames) {
      return moduleNames.map((moduleName) => {
        if (moduleName === "is-kit") {
          return {
            resolvedFileName: IS_KIT_DECLARATION,
            extension: ts.Extension.Dts,
            isExternalLibraryImport: true,
          };
        }

        return undefined;
      });
    },
  };

  return host;
}

function getErrors(diagnostics: readonly ts.Diagnostic[]): ts.Diagnostic[] {
  return diagnostics.filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
}

function createErrorResponse(
  message: string,
  diagnostics: readonly ts.Diagnostic[] = [],
): CompileResponse {
  return {
    type: "error",
    message,
    diagnostics: diagnostics.slice(0, MAX_DIAGNOSTICS).map(formatDiagnostic),
  };
}

function compileTypeScript(source: string): CompileResponse {
  if (source.length > MAX_SOURCE_LENGTH) {
    return createErrorResponse(
      "The TypeScript source exceeds the 100,000-character limit.",
    );
  }

  try {
    const host = createCompilerHost(source);

    const program = ts.createProgram({
      rootNames: [SOURCE_FILE],
      options: typeCheckOptions,
      host,
    });

    const diagnostics = getErrors(ts.getPreEmitDiagnostics(program));

    if (diagnostics.length > 0) {
      return createErrorResponse(
        "TypeScript type checking failed.",
        diagnostics,
      );
    }

    const result = ts.transpileModule(source, {
      fileName: SOURCE_FILE,
      reportDiagnostics: true,
      compilerOptions: transpileOptions,
    });

    const transpileErrors = getErrors(result.diagnostics ?? []);

    if (transpileErrors.length > 0) {
      return createErrorResponse(
        "TypeScript compilation failed.",
        transpileErrors,
      );
    }

    if (
      !result.outputText ||
      result.outputText.length > MAX_JAVASCRIPT_LENGTH
    ) {
      return createErrorResponse("Compiled JavaScript is empty or too large.");
    }

    return {
      type: "compiled",
      javascript: result.outputText,
      diagnostics: [],
    };
  } catch (error) {
    return createErrorResponse(
      error instanceof Error
        ? error.message
        : "Unexpected TypeScript compiler error.",
    );
  }
}

self.onmessage = (event: MessageEvent<CompileRequest>) => {
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
