
import type {
  CollectionConfig,
} from "../types/collection";

import type {
  ParsingMode,
} from "./safe-parsing";

export function generateCollectionCode(
  config: CollectionConfig,
  input: string,
  mode: ParsingMode
): string {
  const {
    kind,
    elementGuard,
    keyGuard,
    tupleGuards,
  } = config;

  const guardExpression =
    kind === "tupleOf"
      ? `tupleOf(${tupleGuards.join(", ")})`
      : kind === "mapOf" || kind === "recordOf"
        ? `${kind}(${keyGuard}, ${elementGuard})`
        : `${kind}(${elementGuard})`;

  const imports = [
    kind,
    ...(kind === "tupleOf"
      ? tupleGuards
      : kind === "mapOf" || kind === "recordOf"
        ? [keyGuard, elementGuard]
        : [elementGuard]),
    ...(mode === "safeParse"
      ? ["safeParse"]
      : mode === "safeJsonParse" &&
          kind !== "setOf" &&
          kind !== "mapOf"
        ? ["safeJsonParse"]
        : []),
  ];

  const uniqueImports = [...new Set(imports)];

  const header =
    `import { ${uniqueImports.join(", ")} } from "is-kit";\n\n` +
    `const guard = ${guardExpression};\n\n`;

  const jsonInput = JSON.stringify(input);

  if (kind === "setOf" || kind === "mapOf") {
    const conversion =
      kind === "setOf"
        ? `const value = new Set(JSON.parse(${jsonInput}));`
        : `const value = new Map(JSON.parse(${jsonInput}));`;

    const evaluation =
      mode === "safeParse"
        ? "const result = safeParse(guard, value);"
        : "const result = guard(value);";

    return (
      header +
      `// JSON input is converted into a real JavaScript ${kind === "setOf" ? "Set" : "Map"}.\n` +
      conversion +
      "\n\n" +
      (mode === "safeJsonParse"
        ? "// safeJsonParse cannot construct Set or Map instances.\n// Using direct guard evaluation instead.\n"
        : "") +
      evaluation +
      "\n\nconsole.log(result);"
    );
  }

  if (mode === "safeJsonParse") {
    return (
      header +
      `const result = safeJsonParse(${jsonInput}, guard);\n\n` +
      "console.log(result);"
    );
  }

  return (
    header +
    `const value: unknown = JSON.parse(${jsonInput});\n\n` +
    (mode === "safeParse"
      ? "const result = safeParse(guard, value);"
      : "const result = guard(value);") +
    "\n\nconsole.log(result);"
  );
}
