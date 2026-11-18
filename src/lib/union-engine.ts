
import {
  discriminatedUnion,
  oneOf,
  oneOfValues,
  safeJsonParse,
  safeParse,
} from "is-kit";

import { guardLookup } from "../data/guards";

import type {
  RuntimeGuard,
  ValidationResult,
} from "../types/playground";

import type {
  UnionConfig,
  LiteralValue,
} from "../types/union";

import type {
  ParsingMode,
  ParsingResult,
} from "./safe-parsing";

type TextMessage = {
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

function getUnionGuard(config: UnionConfig): RuntimeGuard {
  if (config.kind === "guards") {
    if (config.guards.length === 0) {
      throw new Error("Select at least one guard.");
    }

    const guards = config.guards.map(
      (name) => guardLookup[name].guard
    );

    return oneOf(...guards);
  }

  if (config.kind === "literals") {
    if (config.literals.length === 0) {
      throw new Error("Add at least one allowed value.");
    }

    return oneOfValues(
      ...(config.literals as LiteralValue[])
    );
  }

  return discriminatedUnion<Message>()(
    "type",
    ["text", "image"] as const,
    {
      text: isTextMessage,
      image: isImageMessage,
    }
  );
}

function explain(
  config: UnionConfig,
  value: unknown,
  passed: boolean
): string {
  if (config.kind === "guards") {
    return passed
      ? "The value matches at least one selected guard."
      : "The value does not match any selected guard.";
  }

  if (config.kind === "literals") {
    return passed
      ? "The value matches one of the allowed literals."
      : "The value does not match any allowed literal.";
  }

  if (!isRecord(value)) {
    return "Expected an object with a supported type property.";
  }

  if (value.type !== "text" && value.type !== "image") {
    return 'Expected type "text" or "image".';
  }

  if (passed) {
    return `The ${value.type} message matches its branch guard.`;
  }

  return value.type === "text"
    ? 'A text message requires a string "content" property.'
    : 'An image message requires a string "url" property.';
}

function getDetails(
  config: UnionConfig,
  value: unknown
): string[] {
  if (config.kind === "guards") {
    return config.guards.map((name) => {
      const passed = guardLookup[name].guard(value);
      return `${name}: ${passed ? "PASS" : "FAIL"}`;
    });
  }

  if (config.kind === "literals") {
    return config.literals.map(
      (literal) =>
        `${JSON.stringify(literal)}: ${
          Object.is(value, literal) ? "MATCH" : "NO MATCH"
        }`
    );
  }

  return [
    'Discriminant: "type"',
    'Supported variants: "text", "image"',
    'text branch: { type: "text", content: string }',
    'image branch: { type: "image", url: string }',
    "The example uses statically defined TypeScript union members.",
  ];
}

export function evaluateUnion(
  input: string,
  config: UnionConfig,
  mode: ParsingMode
): {
  validation: ValidationResult;
  parsing: ParsingResult;
} {
  try {
    const guard = getUnionGuard(config);

    let value: unknown;

    try {
      value = JSON.parse(input);
    } catch {
      return {
        validation: {
          status: "invalid",
          explanation: "Enter valid JSON to test the union.",
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

    const validation: ValidationResult = {
      status: passed ? "pass" : "fail",
      value,
      explanation: explain(config, value, passed),
      details: getDetails(config, value),
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
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to evaluate the union.";

    return {
      validation: {
        status: "invalid",
        explanation: message,
        details: [],
      },
      parsing: {
        mode,
        valid: null,
        error: message,
      },
    };
  }
}
