import type { UnionConfig } from "../types/union";
import type { ParsingMode } from "./safe-parsing";

export function generateUnionCode(
  config: UnionConfig,
  input: string,
  mode: ParsingMode,
): string {
  const imports = new Set<string>();
  let definition: string;

  if (config.kind === "guards") {
    imports.add("oneOf");

    for (const guard of config.guards) {
      imports.add(guard);
    }

    definition = `const guard = oneOf(${config.guards.join(", ")});`;
  } else if (config.kind === "literals") {
    imports.add("oneOfValues");

    const values = config.literals
      .map((value) => JSON.stringify(value))
      .join(", ");

    definition = `const guard = oneOfValues(${values});`;
  } else {
    imports.add("discriminatedUnion");

    definition = `type TextMessage = {
  type: "text";
  content: string;
};

type ImageMessage = {
  type: "image";
  url: string;
};

type Message = TextMessage | ImageMessage;

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isTextMessage(
  value: unknown
): value is TextMessage {
  return (
    isRecord(value) &&
    value.type === "text" &&
    typeof value.content === "string"
  );
}

function isImageMessage(
  value: unknown
): value is ImageMessage {
  return (
    isRecord(value) &&
    value.type === "image" &&
    typeof value.url === "string"
  );
}

const guard = discriminatedUnion<Message>()(
  "type",
  ["text", "image"] as const,
  {
    text: isTextMessage,
    image: isImageMessage,
  }
);`;
  }

  if (mode === "safeParse") {
    imports.add("safeParse");
  } else if (mode === "safeJsonParse") {
    imports.add("safeJsonParse");
  }

  const importStatement = `import { ${[...imports].join(", ")} } from "is-kit";`;

  const serializedInput = JSON.stringify(input);

  const evaluation =
    mode === "safeJsonParse"
      ? `const result = safeJsonParse(${serializedInput}, guard);`
      : `const value: unknown = JSON.parse(${serializedInput});\n\n` +
        (mode === "safeParse"
          ? "const result = safeParse(guard, value);"
          : "const result = guard(value);");

  return `${importStatement}

${definition}

${evaluation}

console.log(result);`;
}
