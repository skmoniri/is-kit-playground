
import type { GuardName } from "./playground";

export type UnionKind =
  | "guards"
  | "literals"
  | "discriminated";

export type LiteralValue = string | number | boolean | null;

export type UnionConfig = {
  kind: UnionKind;
  guards: GuardName[];
  literals: LiteralValue[];
};

export const DEFAULT_UNION_CONFIG: UnionConfig = {
  kind: "guards",
  guards: ["isString", "isNumber"],
  literals: ["pending", "active", "completed"],
};

export const UNION_MODES = [
  {
    value: "guards",
    title: "Guard Union",
    api: "oneOf()",
    description: "Accept a value matching any selected guard.",
  },
  {
    value: "literals",
    title: "Literal Union",
    api: "oneOfValues()",
    description: "Accept one of several exact primitive values.",
  },
  {
    value: "discriminated",
    title: "Discriminated Union",
    api: "discriminatedUnion<T>()",
    description: "Validate a typed object variant using its type property.",
  },
] as const;

export function defaultUnionInput(kind: UnionKind): string {
  switch (kind) {
    case "guards":
      return '"hello"';
    case "literals":
      return '"active"';
    case "discriminated":
      return '{\n  "type": "text",\n  "content": "Hello"\n}';
  }
}
