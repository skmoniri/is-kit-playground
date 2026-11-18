
export type GuardName =
  | "isString"
  | "isNumber"
  | "isBoolean"
  | "isInteger"
  | "isSafeInteger"
  | "isPositive"
  | "isNegative"
  | "isZero"
  | "isNull"
  | "isNil"
  | "isPrimitive"
  | "isObject"
  | "isPlainObject"
  | "isArray";

export type Operator = "or" | "and" | "not";

export type ExampleId =
  | "quick"
  | "numbers"
  | "boolean"
  | "nullish"
  | "objects"
  | "arrays";

export type RuntimeGuard = (
  value: unknown
) => value is unknown;

export type GuardInfo = {
  name: GuardName;
  description: string;
  category: string;
  guard: RuntimeGuard;
  matches: string;
};

export type Example = {
  id: ExampleId;
  title: string;
  description: string;
  operator: Operator;
  guards: GuardName[];
  input: string;
};

export type ValidationResult = {
  status: "pass" | "fail" | "invalid";
  value?: unknown;
  explanation: string;
  details: string[];
};
