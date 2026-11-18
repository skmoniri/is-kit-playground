
import type { GuardName } from "../types/playground";
import type { ParsingMode } from "./safe-parsing";

export function generateNarrowingCode(
  guard: GuardName,
  input: string,
  mode: ParsingMode
): string {
  const importNames: string[] = [guard];

  if (mode === "safeParse") {
    importNames.push("safeParse");
  }

  if (mode === "safeJsonParse") {
    importNames.push("safeJsonParse");
  }

  const header = `import { ${importNames.join(", ")} } from "is-kit";`;
  const json = JSON.stringify(input);

  if (mode === "safeJsonParse") {
    return `${header}

const json = ${json};
const result = safeJsonParse(json, ${guard});

if (result.valid) {
  // result.value has the type guarded by ${guard}.
  console.log(result.value);
} else {
  console.log("Validation failed");
}`;
  }

  const declaration = `const value: unknown = JSON.parse(${json});`;

  if (mode === "safeParse") {
    return `${header}

${declaration}

const result = safeParse(${guard}, value);

if (result.valid) {
  // The parsed value has the type guarded by ${guard}.
  console.log(result.value);
} else {
  console.log("Validation failed");
}`;
  }

  return `${header}

${declaration}

// Before the guard: value is unknown.
if (${guard}(value)) {
  // TypeScript narrows value to the guard's type.
  console.log(value);
} else {
  // The original unknown type remains.
  console.log("Guard did not match", value);
}`;
}
