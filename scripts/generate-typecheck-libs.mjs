import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const tsLibDirectory = path.join(root, "node_modules", "typescript", "lib");

const isKitDeclaration = path.join(
  root,
  "node_modules",
  "is-kit",
  "dist",
  "index.d.ts",
);

const outputFile = path.join(
  root,
  "src",
  "generated",
  "typecheck-declarations.ts",
);

const declarations = {};
const visited = new Set();

async function addTypeScriptLib(filename) {
  const normalized = path.posix.basename(filename);

  if (visited.has(normalized)) {
    return;
  }

  if (!/^[\w.-]+\.d\.ts$/.test(normalized)) {
    throw new Error(`Invalid TypeScript library: ${filename}`);
  }

  visited.add(normalized);

  const filePath = path.join(tsLibDirectory, normalized);

  const content = await readFile(filePath, "utf8");

  declarations[`/typescript/lib/${normalized}`] = content;

  const libraryReferences = [
    ...content.matchAll(/\/\/\/\s*<reference\s+lib=["']([^"']+)["']\s*\/>/g),
  ];

  for (const match of libraryReferences) {
    await addTypeScriptLib(`lib.${match[1].toLowerCase()}.d.ts`);
  }

  const pathReferences = [
    ...content.matchAll(/\/\/\/\s*<reference\s+path=["']([^"']+)["']\s*\/>/g),
  ];

  for (const match of pathReferences) {
    const referencedFile = path.posix.normalize(
      path.posix.join(path.posix.dirname(normalized), match[1]),
    );

    await addTypeScriptLib(referencedFile);
  }
}

await addTypeScriptLib("lib.es2022.full.d.ts");

declarations["/node_modules/is-kit/dist/index.d.ts"] = await readFile(
  isKitDeclaration,
  "utf8",
);

await mkdir(path.dirname(outputFile), { recursive: true });

const generatedSource = [
  "// Generated automatically. Do not edit.",
  "export const declarationFiles: Record<string, string> =",
  JSON.stringify(declarations),
  ";",
  "",
].join("\n");

await writeFile(outputFile, generatedSource, "utf8");

console.log(`Generated ${Object.keys(declarations).length} declaration files.`);
