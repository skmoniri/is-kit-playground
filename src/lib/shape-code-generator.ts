
import type {
  ShapeConfig,
  ShapeField,
} from "../types/object-shape";
import type { ParsingMode } from "./safe-parsing";

import { getShapeError } from "./shape-engine";

function collectGuards(
  fields: ShapeField[],
  names: Set<string>
): void {
  for (const field of fields) {
    if (field.kind === "object") {
      collectGuards(field.fields ?? [], names);
    } else {
      names.add(field.guard);
    }
  }
}

function buildSchemaLines(
  fields: ShapeField[],
  exact: boolean,
  indent: number
): string[] {
  const spaces = " ".repeat(indent);
  const lines: string[] = [];

  for (const field of fields) {
    const key = JSON.stringify(field.key);
    let expression: string;

    if (field.kind === "object") {
      const children = buildSchemaLines(
        field.fields ?? [],
        exact,
        indent + 2
      );

      const options = exact
        ? ", { exact: true }"
        : "";

      expression = [
        "struct({",
        ...children,
        `${spaces}}${options})`,
      ].join("\n");
    } else {
      expression = field.guard;
    }

    if (field.optional) {
      expression = `optionalKey(${expression})`;
    }

    lines.push(`${spaces}${key}: ${expression},`);
  }

  return lines;
}

function buildTypeLines(
  fields: ShapeField[],
  indent: number
): string[] {
  const spaces = " ".repeat(indent);
  const lines: string[] = [];

  for (const field of fields) {
    const key = JSON.stringify(field.key);
    const optional = field.optional ? "?" : "";

    if (field.kind === "object") {
      lines.push(
        `${spaces}readonly ${key}${optional}: {`
      );

      lines.push(
        ...buildTypeLines(
          field.fields ?? [],
          indent + 2
        )
      );

      lines.push(`${spaces}};`);
    } else {
      lines.push(
        `${spaces}readonly ${key}${optional}: GuardOutput<typeof ${field.guard}>;`
      );
    }
  }

  return lines;
}

export function generateShapeCode(
  config: ShapeConfig,
  input: string,
  mode: ParsingMode = "direct"
): string {
  const error = getShapeError(config);

  if (error) {
    return `// Schema incomplete: ${error}`;
  }

  const guardNames = new Set<string>();
  collectGuards(config.fields, guardNames);

  const typed = config.mode === "typed";

  const imports = new Set<string>([
    typed ? "typedStruct" : "struct",
    ...guardNames,
  ]);

  // Nested objects always use struct().
  function containsNested(
    fields: ShapeField[]
  ): boolean {
    return fields.some(
      (field) => field.kind === "object"
    );
  }

  if (containsNested(config.fields)) {
    imports.add("struct");
  }

  function hasOptional(
    fields: ShapeField[]
  ): boolean {
    return fields.some(
      (field) =>
        field.optional ||
        (field.kind === "object" &&
          hasOptional(field.fields ?? []))
    );
  }

  if (hasOptional(config.fields)) {
    imports.add("optionalKey");
  }

  if (mode !== "direct") {
    imports.add(mode);
  }

  const lines: string[] = [
    `import { ${[...imports].sort().join(", ")} } from "is-kit";`,
    "",
  ];

  if (typed) {
    lines.push(
      "// Extract the type narrowed by a type guard.",
      "type GuardOutput<G> = G extends",
      "  (value: any) => value is infer T ? T : never;",
      "",
      "interface SchemaTarget {",
      ...buildTypeLines(config.fields, 2),
      "}",
      ""
    );
  }

  const options = config.exact
    ? ", { exact: true }"
    : "";

  lines.push(
    typed
      ? "const guard = typedStruct<SchemaTarget>()({"
      : "const guard = struct({",
    ...buildSchemaLines(
      config.fields,
      config.exact,
      2
    ),
    `}${options});`,
    "",
    `const input = ${JSON.stringify(input)};`,
    ""
  );

  if (mode === "safeJsonParse") {
    lines.push(
      "const result = safeJsonParse(input, guard);",
      "",
      "if (result.valid) {",
      "  console.log(result.value);",
      "} else {",
      '  console.log("Validation failed");',
      "}"
    );
  } else {
    lines.push(
      "try {",
      "  const value: unknown = JSON.parse(input);",
      ""
    );

    if (mode === "safeParse") {
      lines.push(
        "  const result = safeParse(guard, value);",
        "",
        "  if (result.valid) {",
        "    console.log(result.value);",
        "  } else {",
        '    console.log("Validation failed");',
        "  }"
      );
    } else {
      lines.push(
        "  if (guard(value)) {",
        "    // TypeScript narrows value here.",
        "    console.log(value);",
        "  } else {",
        '    console.log("Validation failed");',
        "  }"
      );
    }

    lines.push(
      "} catch {",
      '  console.error("Invalid JSON input.");',
      "}"
    );
  }

  return lines.join("\n");
}
