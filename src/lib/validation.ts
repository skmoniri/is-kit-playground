
import { guardLookup } from "../data/guards";
import { createGuard } from "./guard-engine";

import type {
  GuardName,
  Operator,
  ValidationResult,
} from "../types/playground";

export function describeValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  if (Array.isArray(value)) {
    return "an array";
  }

  if (typeof value === "number") {
    return Number.isInteger(value)
      ? "an integer"
      : "a number";
  }

  if (typeof value === "object") {
    return "an object";
  }

  return `a ${typeof value}`;
}

export function formatValue(value: unknown): string {
  if (value === undefined) {
    return "undefined";
  }

  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

export function validateInput(
  input: string,
  operator: Operator,
  names: GuardName[]
): ValidationResult {
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
    const composedGuard = createGuard(operator, names);
    const passed = composedGuard(value);

    const individualResults = names.map((name) => ({
      name,
      matches: guardLookup[name].guard(value),
    }));

    const details = individualResults.map(
      ({ name, matches }) =>
        `${name}: ${matches ? "PASS" : "FAIL"}`
    );

    const received = describeValue(value);
    let explanation: string;

    if (operator === "not") {
      const name = names[0];

      explanation = passed
        ? `The value is ${received}. It does not match ${name}, so the negated guard passes.`
        : `The value matches ${name}, so the negated guard fails.`;
    } else if (operator === "and") {
      const failed = individualResults
        .filter((result) => !result.matches)
        .map((result) => result.name);

      explanation = passed
        ? "All selected guards matched this value."
        : `The value is ${received}. The following guards did not match: ${failed.join(", ")}.`;
    } else {
      const matched = individualResults
        .filter((result) => result.matches)
        .map((result) => result.name);

      explanation = passed
        ? `The value matched ${matched.join(", ")}. At least one match is enough for OR.`
        : `The value is ${received}. None of the selected guards matched.`;
    }

    return {
      status: passed ? "pass" : "fail",
      value,
      explanation,
      details,
    };
  } catch (error) {
    return {
      status: "invalid",
      value,
      explanation:
        error instanceof Error
          ? error.message
          : "The guard could not be evaluated.",
      details: [],
    };
  }
}
