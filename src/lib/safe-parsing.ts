
import { safeJsonParse, safeParse } from "is-kit";

import { createGuard } from "./guard-engine";
import { createShapeGuard, getShapeError } from "./shape-engine";

import type {
  GuardName,
  Operator,
  RuntimeGuard,
} from "../types/playground";

import type {
  ShapeConfig,
  WorkspaceTool,
} from "../types/object-shape";

export type ParsingMode =
  | "direct"
  | "safeParse"
  | "safeJsonParse";

export type ParsingResult = {
  mode: ParsingMode;
  valid: boolean | null;
  value?: unknown;
  error?: string;
};

type ParsingConfig = {
  activeTool: WorkspaceTool;
  operator: Operator;
  guards: GuardName[];
  shape: ShapeConfig;
};

function resolveGuard(
  config: ParsingConfig
): RuntimeGuard {
  if (config.activeTool === "shape") {
    const error = getShapeError(config.shape);

    if (error) {
      throw new Error(error);
    }

    return createShapeGuard(config.shape);
  }

  return createGuard(config.operator, config.guards);
}

export function evaluateParsing(
  input: string,
  mode: ParsingMode,
  config: ParsingConfig
): ParsingResult {
  try {
    const guard = resolveGuard(config);

    if (mode === "safeJsonParse") {
      const result = safeJsonParse(input, guard);

      return result.valid
        ? {
            mode,
            valid: true,
            value: result.value,
          }
        : {
            mode,
            valid: false,
          };
    }

    let value: unknown;

    try {
      value = JSON.parse(input);
    } catch {
      return {
        mode,
        valid: null,
        error:
          "Invalid JSON. This mode requires a valid JSON value.",
      };
    }

    if (mode === "safeParse") {
      const result = safeParse(guard, value);

      return result.valid
        ? {
            mode,
            valid: true,
            value: result.value,
          }
        : {
            mode,
            valid: false,
          };
    }

    return {
      mode,
      valid: guard(value),
      value,
    };
  } catch (error) {
    return {
      mode,
      valid: null,
      error:
        error instanceof Error
          ? error.message
          : "Unable to evaluate the selected guard.",
    };
  }
}
