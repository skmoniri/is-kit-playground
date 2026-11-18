
import type {
  GuardName,
  Operator,
} from "../types/playground";

import type { ParsingMode } from "./safe-parsing";

export function generateExpression(
  operator: Operator,
  names: GuardName[]
): string {
  if (names.length === 0) {
    throw new Error("No guards selected.");
  }

  if (operator === "not") {
    return `not(${names[0]})`;
  }

  if (names.length === 1) {
    return names[0];
  }

  return names.slice(1).reduce(
    (expression, name) =>
      `${operator}(${expression}, ${name})`,
    names[0] as string
  );
}

export function generateCode(
  operator: Operator,
  names: GuardName[],
  input: string,
  mode: ParsingMode = "direct"
): string {
  if (names.length === 0) {
    return "// Select at least one guard.";
  }

  const imports = Array.from(
    new Set([
      ...names,
      ...(operator === "not" || names.length > 1
        ? [operator]
        : []),
      ...(mode === "direct" ? [] : [mode]),
    ])
  ).sort();

  const expression = generateExpression(
    operator,
    names
  );

  const lines = [
    `import { ${imports.join(", ")} } from "is-kit";`,
    "",
    `const guard = ${expression};`,
    "",
    `const input = ${JSON.stringify(input)};`,
    "",
  ];

  if (mode === "safeJsonParse") {
    lines.push(
      "const result = safeJsonParse(input, guard);",
      "",
      "console.log(result);"
    );
  } else {
    lines.push(
      "try {",
      "  const value: unknown = JSON.parse(input);",
      "",
      mode === "safeParse"
        ? "  const result = safeParse(guard, value);"
        : "  const result = guard(value);",
      "",
      "  console.log(result);",
      "} catch {",
      '  console.error("Invalid JSON input.");',
      "}"
    );
  }

  return lines.join("\n");
}
