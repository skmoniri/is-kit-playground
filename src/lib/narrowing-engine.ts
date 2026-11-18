
import { guardLookup } from "../data/guards";
import type {
  GuardName,
  ValidationResult,
} from "../types/playground";
import type {
  ParsingMode,
  ParsingResult,
} from "./safe-parsing";
import { safeJsonParse, safeParse } from "is-kit";

export type NarrowingInfo = {
  type: string;
  condition: string;
  description: string;
};

const NARROWING_INFO: Record<GuardName, NarrowingInfo> = {
  isString: {
    type: "string",
    condition: "typeof value === 'string'",
    description: "The value is a string.",
  },
  isNumber: {
    type: "number",
    condition: "A finite number",
    description: "The value is a finite number.",
  },
  isBoolean: {
    type: "boolean",
    condition: "typeof value === 'boolean'",
    description: "The value is a boolean.",
  },
  isInteger: {
    type: "number",
    condition: "Number.isInteger(value)",
    description: "The value is an integer.",
  },
  isSafeInteger: {
    type: "number",
    condition: "Number.isSafeInteger(value)",
    description: "The value is a safe integer.",
  },
  isPositive: {
    type: "number",
    condition: "value > 0",
    description: "The value is a positive number.",
  },
  isNegative: {
    type: "number",
    condition: "value < 0",
    description: "The value is a negative number.",
  },
  isZero: {
    type: "number",
    condition: "Object.is(value, 0) or equivalent zero check",
    description: "The value matches is-kit's zero guard.",
  },
  isNull: {
    type: "null",
    condition: "value === null",
    description: "The value is null.",
  },
  isNil: {
    type: "null | undefined",
    condition: "value == null",
    description: "The value is null or undefined.",
  },
  isPrimitive: {
    type: "Primitive",
    condition: "A JavaScript primitive",
    description: "The value is a primitive.",
  },
  isObject: {
    type: "object",
    condition: "An object value",
    description: "The value matches isObject.",
  },
  isPlainObject: {
    type: "Record<string, unknown>",
    condition: "A plain object",
    description: "The value matches isPlainObject.",
  },
  isArray: {
    type: "unknown[]",
    condition: "Array.isArray(value)",
    description: "The value is an array.",
  },
};

export function getNarrowingInfo(
  guard: GuardName
): NarrowingInfo {
  return NARROWING_INFO[guard];
}

export function evaluateNarrowing(
  input: string,
  guardName: GuardName,
  mode: ParsingMode
): {
  validation: ValidationResult;
  parsing: ParsingResult;
} {
  const guard = guardLookup[guardName].guard;

  let value: unknown;

  try {
    value = JSON.parse(input);
  } catch {
    return {
      validation: {
        status: "invalid",
        explanation: "Enter valid JSON to test type narrowing.",
        details: [],
      },
      parsing: {
        mode,
        valid: null,
        error: "Invalid JSON input.",
      },
    };
  }

  const passed = guard(value);
  const info = getNarrowingInfo(guardName);

  const validation: ValidationResult = {
    status: passed ? "pass" : "fail",
    value,
    explanation: passed
      ? `${guardName} passed. TypeScript can narrow the value to ${info.type} inside the true branch.`
      : `${guardName} failed. The value does not satisfy the selected guard.`,
    details: [
      `Selected guard: ${guardName}`,
      `Runtime condition: ${info.condition}`,
      `True branch type: ${info.type}`,
      "False branch: remains unknown for this unknown-typed input.",
    ],
  };

  if (mode === "safeParse") {
    const result = safeParse(guard, value);

    return {
      validation,
      parsing: result.valid
        ? { mode, valid: true, value: result.value }
        : { mode, valid: false },
    };
  }

  if (mode === "safeJsonParse") {
    const result = safeJsonParse(input, guard);

    return {
      validation,
      parsing: result.valid
        ? { mode, valid: true, value: result.value }
        : { mode, valid: false },
    };
  }

  return {
    validation,
    parsing: {
      mode,
      valid: passed,
      value,
    },
  };
}
