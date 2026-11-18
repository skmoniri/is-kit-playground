
import { optionalKey, struct } from "is-kit";

import { guardLookup } from "../data/guards";
import type {
  ShapeConfig,
  ShapeField,
} from "../types/object-shape";
import type { ValidationResult } from "../types/playground";
import { describeValue } from "./validation";

type ValueGuard = (value: unknown) => value is unknown;

function isObjectField(field: ShapeField): boolean {
  return field.kind === "object";
}

function validateFields(
  fields: ShapeField[],
  path: string,
  depth: number
): string | null {
  if (depth > 8) {
    return "Maximum nesting depth is 8 levels.";
  }

  if (fields.length === 0) {
    return path
      ? `Add at least one property to "${path}".`
      : "Add at least one property to the schema.";
  }

  const names = new Set<string>();

  for (const field of fields) {
    const key = field.key.trim();
    const fieldPath = path ? `${path}.${key}` : key;

    if (!key) {
      return path
        ? `Every property inside "${path}" needs a name.`
        : "Every property needs a name.";
    }

    if (field.key !== key) {
      return `Remove leading or trailing spaces from "${fieldPath}".`;
    }

    if (names.has(key)) {
      return `Duplicate property: "${fieldPath}".`;
    }

    names.add(key);

    if (isObjectField(field)) {
      const error = validateFields(
        field.fields ?? [],
        fieldPath,
        depth + 1
      );

      if (error) return error;
    } else if (!guardLookup[field.guard]) {
      return `Unknown guard at "${fieldPath}".`;
    }
  }

  return null;
}

export function getShapeError(
  config: ShapeConfig
): string | null {
  return validateFields(config.fields, "", 0);
}

function buildStruct(
  fields: ShapeField[],
  exact: boolean
): ValueGuard {
  const schema: Record<
    string,
    ValueGuard | ReturnType<typeof optionalKey>
  > = Object.create(null);

  for (const field of fields) {
    const guard: ValueGuard = isObjectField(field)
      ? buildStruct(field.fields ?? [], exact)
      : guardLookup[field.guard].guard;

    schema[field.key] = field.optional
      ? optionalKey(guard)
      : guard;
  }

  return struct(schema, { exact });
}

export function createShapeGuard(
  config: ShapeConfig
): ValueGuard {
  const error = getShapeError(config);

  if (error) {
    throw new Error(error);
  }

  // Both modes use struct() for runtime validation.
  // typedStruct<T>() adds compile-time checking in the
  // generated TypeScript code.
  return buildStruct(config.fields, config.exact);
}

function inspectFields(
  value: unknown,
  fields: ShapeField[],
  exact: boolean,
  path: string,
  details: string[],
  failures: string[]
): void {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    const location = path || "root";

    details.push(`${location}: FAIL (expected object)`);
    failures.push(
      `"${location}" must be an object, received ${describeValue(value)}`
    );

    return;
  }

  const object = value as Record<string, unknown>;

  for (const field of fields) {
    const fieldPath = path
      ? `${path}.${field.key}`
      : field.key;

    const exists = Object.prototype.hasOwnProperty.call(
      object,
      field.key
    );

    if (!exists) {
      if (field.optional) {
        details.push(
          `${fieldPath}: SKIPPED (optional)`
        );
      } else {
        details.push(
          `${fieldPath}: FAIL (missing)`
        );
        failures.push(
          `"${fieldPath}" is missing`
        );
      }

      continue;
    }

    const fieldValue = object[field.key];

    if (isObjectField(field)) {
      if (
        fieldValue === null ||
        typeof fieldValue !== "object" ||
        Array.isArray(fieldValue)
      ) {
        details.push(
          `${fieldPath}: FAIL (expected object)`
        );
        failures.push(
          `"${fieldPath}" must be an object`
        );
      } else {
        details.push(
          `${fieldPath}: checking nested object`
        );

        inspectFields(
          fieldValue,
          field.fields ?? [],
          exact,
          fieldPath,
          details,
          failures
        );
      }

      continue;
    }

    const matches = guardLookup[field.guard].guard(
      fieldValue
    );

    details.push(
      `${fieldPath}: ${
        matches ? "PASS" : "FAIL"
      } (${field.guard})`
    );

    if (!matches) {
      failures.push(
        `"${fieldPath}" did not match ${field.guard}`
      );
    }
  }

  if (exact) {
    const allowed = new Set(
      fields.map((field) => field.key)
    );

    for (const key of Object.keys(object)) {
      if (!allowed.has(key)) {
        const unexpected = path
          ? `${path}.${key}`
          : key;

        details.push(
          `${unexpected}: FAIL (unexpected property)`
        );

        failures.push(
          `"${unexpected}" is not allowed`
        );
      }
    }
  }
}

export function validateShapeInput(
  input: string,
  config: ShapeConfig
): ValidationResult {
  const schemaError = getShapeError(config);

  if (schemaError) {
    return {
      status: "invalid",
      explanation: schemaError,
      details: [],
    };
  }

  let value: unknown;

  try {
    value = JSON.parse(input);
  } catch {
    return {
      status: "invalid",
      explanation:
        "The input is not valid JSON. Check the syntax and try again.",
      details: [
        "Strings must use double quotes.",
        "JSON does not support undefined or trailing commas.",
      ],
    };
  }

  try {
    const guard = createShapeGuard(config);
    const passed = guard(value);

    const details: string[] = [];
    const failures: string[] = [];

    inspectFields(
      value,
      config.fields,
      config.exact,
      "",
      details,
      failures
    );

    return {
      status: passed ? "pass" : "fail",
      value,
      explanation: passed
        ? "The object matches the selected schema."
        : failures.length > 0
          ? failures.join("; ") + "."
          : "The object does not match the schema.",
      details,
    };
  } catch (error) {
    return {
      status: "invalid",
      value,
      explanation:
        error instanceof Error
          ? error.message
          : "The schema could not be evaluated.",
      details: [],
    };
  }
}
