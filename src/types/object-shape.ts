
import type { GuardName } from "./playground";

export type ShapeMode = "inferred" | "typed";

export type ShapeField = {
  id: string;
  key: string;
  guard: GuardName;
  optional: boolean;
  kind?: "guard" | "object";
  fields?: ShapeField[];
};

export type ShapeConfig = {
  fields: ShapeField[];
  exact: boolean;
  mode?: ShapeMode;
};

export type WorkspaceTool =
  | "composer"
  | "shape"
  | "collection"
  | "union"
  | "narrowing";
