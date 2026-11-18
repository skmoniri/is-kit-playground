
import type { GuardName } from "./playground";

export type CollectionKind =
  | "arrayOf"
  | "nonEmptyArrayOf"
  | "tupleOf"
  | "setOf"
  | "mapOf"
  | "recordOf";

export type CollectionConfig = {
  kind: CollectionKind;
  elementGuard: GuardName;
  keyGuard: GuardName;
  tupleGuards: GuardName[];
};

export const DEFAULT_COLLECTION_CONFIG: CollectionConfig = {
  kind: "arrayOf",
  elementGuard: "isNumber",
  keyGuard: "isString",
  tupleGuards: ["isString", "isNumber"],
};

export const COLLECTION_KINDS: {
  value: CollectionKind;
  label: string;
  description: string;
}[] = [
  {
    value: "arrayOf",
    label: "Array",
    description: "Every array element must match a guard.",
  },
  {
    value: "nonEmptyArrayOf",
    label: "Non-empty Array",
    description:
      "An array must contain at least one element, and every element must match.",
  },
  {
    value: "tupleOf",
    label: "Tuple",
    description:
      "Each array position has its own guard.",
  },
  {
    value: "setOf",
    label: "Set",
    description:
      "Every value in a JavaScript Set must match.",
  },
  {
    value: "mapOf",
    label: "Map",
    description:
      "Every key and value in a JavaScript Map must match.",
  },
  {
    value: "recordOf",
    label: "Record",
    description:
      "Object keys and values are checked against guards.",
  },
];
