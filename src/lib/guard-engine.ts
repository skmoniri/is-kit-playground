
import { and, not, or } from "is-kit";

import { guardLookup } from "../data/guards";

import type {
  GuardName,
  Operator,
  RuntimeGuard,
} from "../types/playground";

export function createGuard(
  operator: Operator,
  names: GuardName[]
): RuntimeGuard {
  if (names.length === 0) {
    throw new Error("At least one guard is required.");
  }

  const selected = names.map(
    (name) => guardLookup[name].guard
  );

  if (operator === "not") {
    return not(selected[0]);
  }

  if (selected.length === 1) {
    return selected[0];
  }

  return selected.slice(1).reduce(
    (current, next) =>
      operator === "and"
        ? and(current, next)
        : or(current, next),
    selected[0]
  );
}
