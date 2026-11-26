import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import vm from "node:vm";

import * as ts from "typescript";
import * as isKit from "is-kit";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const libDirectory = path.join(root, "node_modules", "typescript", "lib");

const files = new Map();

for (const filename of await readdir(libDirectory)) {
  if (!filename.endsWith(".d.ts")) continue;

  files.set(
    `/typescript/lib/${filename}`,
    await readFile(path.join(libDirectory, filename), "utf8"),
  );
}

files.set(
  "/node_modules/is-kit/dist/index.d.ts",
  await readFile(
    path.join(root, "node_modules", "is-kit", "dist", "index.d.ts"),
    "utf8",
  ),
);

const sourceFile = "/playground.ts";

const checkOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  skipLibCheck: true,
  esModuleInterop: true,
  noEmit: true,
  types: [],
  lib: ["lib.es2022.full.d.ts"],
};

const emitOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.CommonJS,
  esModuleInterop: true,
};

function compile(source) {
  const sourceFiles = new Map(files);
  sourceFiles.set(sourceFile, source);

  const normalize = (name) => name.replace(/\\/g, "/");

  const host = {
    getSourceFile(name, languageVersion) {
      const filename = normalize(name);
      const content = sourceFiles.get(filename);

      return content === undefined
        ? undefined
        : ts.createSourceFile(filename, content, languageVersion, true);
    },

    getDefaultLibFileName: () => "/typescript/lib/lib.es2022.full.d.ts",

    getCurrentDirectory: () => "/",

    getDirectories: () => [],

    getCanonicalFileName: normalize,

    getNewLine: () => "\n",

    useCaseSensitiveFileNames: () => true,

    fileExists: (name) => sourceFiles.has(normalize(name)),

    readFile: (name) => sourceFiles.get(normalize(name)),

    directoryExists(directory) {
      const prefix = normalize(directory).replace(/\/$/, "") + "/";

      return [...sourceFiles.keys()].some((name) => name.startsWith(prefix));
    },

    writeFile() {},

    resolveModuleNames(names) {
      return names.map((name) =>
        name === "is-kit"
          ? {
              resolvedFileName: "/node_modules/is-kit/dist/index.d.ts",
              extension: ts.Extension.Dts,
              isExternalLibraryImport: true,
            }
          : undefined,
      );
    },
  };

  const program = ts.createProgram({
    rootNames: [sourceFile],
    options: checkOptions,
    host,
  });

  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .filter((item) => item.category === ts.DiagnosticCategory.Error);

  if (diagnostics.length > 0) {
    return {
      diagnostics,
      javascript: null,
    };
  }

  const result = ts.transpileModule(source, {
    fileName: sourceFile,
    compilerOptions: emitOptions,
    reportDiagnostics: true,
  });

  return {
    diagnostics: (result.diagnostics ?? []).filter(
      (item) => item.category === ts.DiagnosticCategory.Error,
    ),
    javascript: result.outputText,
  };
}

// This VM is only a local test harness.
// It is NOT the browser's security sandbox.
function execute(javascript) {
  const output = [];

  const context = {
    exports: {},
    console: {
      log: (...args) => output.push(args.map(String).join(" ")),
    },
    require(name) {
      if (name !== "is-kit") {
        throw new Error(`Unsupported import: ${name}`);
      }

      return isKit;
    },
  };

  vm.runInNewContext(javascript, context, {
    timeout: 500,
  });

  return output;
}

test("accepts valid TypeScript", () => {
  const result = compile(`
    const value: number = 42;
    console.log(value);
  `);

  assert.equal(result.diagnostics.length, 0);
  assert.ok(result.javascript);
});

test("detects incorrect types", () => {
  const result = compile(`
    const age: number = "hello";
  `);

  assert.ok(result.diagnostics.some((item) => item.code === 2322));

  assert.equal(result.javascript, null);
});

test("detects invalid is-kit assignments", () => {
  const result = compile(`
    import { isNumber } from "is-kit";
    const result: string = isNumber(42);
  `);

  assert.ok(result.diagnostics.some((item) => item.code === 2322));
});

test("rejects unsupported module imports", () => {
  const result = compile(`
    import { something } from "unsupported-package";
    console.log(something);
  `);

  assert.ok(result.diagnostics.some((item) => item.code === 2307));
});

test("detects TypeScript syntax errors", () => {
  const result = compile(`
    const value: = 42;
  `);

  assert.ok(result.diagnostics.length > 0);
  assert.equal(result.javascript, null);
});

test("executes valid is-kit code", () => {
  const result = compile(`
    import { isNumber, isString, or } from "is-kit";

    const guard = or(isString, isNumber);
    const value: unknown = "hello";

    console.log(guard(value));
  `);

  assert.equal(result.diagnostics.length, 0);

  const output = execute(result.javascript);

  assert.deepEqual(output, ["true"]);
});

test("reports runtime errors", () => {
  const result = compile(`
    throw new Error("Expected failure");
  `);

  assert.equal(result.diagnostics.length, 0);

  assert.throws(() => execute(result.javascript), /Expected failure/);
});

test("restricts runtime imports", () => {
  assert.throws(
    () => execute('require("unsupported-package");'),
    /Unsupported import/,
  );
});

test("interrupts infinite synchronous loops", () => {
  assert.throws(() => execute("while (true) {}"), /timed out/i);
});
