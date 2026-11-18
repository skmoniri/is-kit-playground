
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

import type { EditorMode } from "../components/ModeTabs";
import type {
  CollectionConfig,
  CollectionKind,
} from "../types/collection";
import type {
  ShapeConfig,
  ShapeField,
  WorkspaceTool,
} from "../types/object-shape";
import type {
  ExampleId,
  GuardName,
  Operator,
} from "../types/playground";
import type {
  LiteralValue,
  UnionConfig,
  UnionKind,
} from "../types/union";
import type { ParsingMode } from "./safe-parsing";

export type SharedWorkspace = {
  version: 1;
  activeTool: WorkspaceTool;
  editorMode: EditorMode;
  activeExample: ExampleId | null;
  operator: Operator;
  selectedGuards: GuardName[];
  shapeConfig: ShapeConfig;
  collectionConfig: CollectionConfig;
  unionConfig: UnionConfig;
  narrowingGuard: GuardName;
  composerInput: string;
  shapeInput: string;
  collectionInput: string;
  unionInput: string;
  narrowingInput: string;
  parsingMode: ParsingMode;
  codeDrafts: Partial<Record<WorkspaceTool, string>>;
};

const HASH_KEY = "playground=";
const MAX_URL_PAYLOAD = 16000;
const MAX_JSON_LENGTH = 100000;
const MAX_INPUT_LENGTH = 20000;

const TOOLS: WorkspaceTool[] = [
  "composer",
  "shape",
  "collection",
  "union",
  "narrowing",
];

const GUARDS: GuardName[] = [
  "isString",
  "isNumber",
  "isBoolean",
  "isInteger",
  "isSafeInteger",
  "isPositive",
  "isNegative",
  "isZero",
  "isNull",
  "isNil",
  "isPrimitive",
  "isObject",
  "isPlainObject",
  "isArray",
];

const EXAMPLES: ExampleId[] = [
  "quick",
  "numbers",
  "boolean",
  "nullish",
  "objects",
  "arrays",
];

const COLLECTION_KINDS: CollectionKind[] = [
  "arrayOf",
  "nonEmptyArrayOf",
  "tupleOf",
  "setOf",
  "mapOf",
  "recordOf",
];

const UNION_KINDS: UnionKind[] = [
  "guards",
  "literals",
  "discriminated",
];

function record(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function oneOf<T extends string>(
  value: unknown,
  choices: readonly T[]
): value is T {
  return (
    typeof value === "string" &&
    choices.some((choice) => choice === value)
  );
}

function shortString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= MAX_INPUT_LENGTH
  );
}

function guard(value: unknown): value is GuardName {
  return oneOf(value, GUARDS);
}

function guards(
  value: unknown
): value is GuardName[] {
  return (
    Array.isArray(value) &&
    value.length <= 100 &&
    value.every(guard)
  );
}

function shapeField(
  value: unknown,
  depth = 0
): value is ShapeField {
  if (!record(value) || depth > 8) {
    return false;
  }

  if (
    !shortString(value.id) ||
    !shortString(value.key) ||
    typeof value.optional !== "boolean"
  ) {
    return false;
  }

  if (
    value.kind !== undefined &&
    !oneOf(value.kind, ["guard", "object"])
  ) {
    return false;
  }

  if (value.kind === "object") {
    return (
      (value.fields === undefined ||
        shapeFields(value.fields, depth + 1)) &&
      (value.guard === undefined ||
        guard(value.guard))
    );
  }

  return (
    guard(value.guard) &&
    (value.fields === undefined ||
      shapeFields(value.fields, depth + 1))
  );
}

function shapeFields(
  value: unknown,
  depth: number
): value is ShapeField[] {
  return (
    Array.isArray(value) &&
    value.length <= 100 &&
    value.every((item) => shapeField(item, depth))
  );
}

function shapeConfig(
  value: unknown
): value is ShapeConfig {
  return (
    record(value) &&
    shapeFields(value.fields, 0) &&
    typeof value.exact === "boolean" &&
    (value.mode === undefined ||
      oneOf(value.mode, ["inferred", "typed"]))
  );
}

function collectionConfig(
  value: unknown
): value is CollectionConfig {
  return (
    record(value) &&
    oneOf(value.kind, COLLECTION_KINDS) &&
    guard(value.elementGuard) &&
    guard(value.keyGuard) &&
    guards(value.tupleGuards)
  );
}

function literal(
  value: unknown
): value is LiteralValue {
  return (
    value === null ||
    typeof value === "boolean" ||
    (typeof value === "string" &&
      value.length <= MAX_INPUT_LENGTH) ||
    (typeof value === "number" &&
      Number.isFinite(value))
  );
}

function unionConfig(
  value: unknown
): value is UnionConfig {
  return (
    record(value) &&
    oneOf(value.kind, UNION_KINDS) &&
    guards(value.guards) &&
    Array.isArray(value.literals) &&
    value.literals.length <= 100 &&
    value.literals.every(literal)
  );
}

function codeDrafts(
  value: unknown
): value is SharedWorkspace["codeDrafts"] {
  if (!record(value)) return false;

  return Object.entries(value).every(
    ([key, draft]) =>
      oneOf(key, TOOLS) && shortString(draft)
  );
}

export function isSharedWorkspace(
  value: unknown
): value is SharedWorkspace {
  if (!record(value)) return false;

  return (
    value.version === 1 &&
    oneOf(value.activeTool, TOOLS) &&
    oneOf(value.editorMode, ["visual", "code"]) &&
    (value.activeExample === null ||
      oneOf(value.activeExample, EXAMPLES)) &&
    oneOf(value.operator, ["or", "and", "not"]) &&
    guards(value.selectedGuards) &&
    value.selectedGuards.length > 0 &&
    shapeConfig(value.shapeConfig) &&
    collectionConfig(value.collectionConfig) &&
    unionConfig(value.unionConfig) &&
    guard(value.narrowingGuard) &&
    shortString(value.composerInput) &&
    shortString(value.shapeInput) &&
    shortString(value.collectionInput) &&
    shortString(value.unionInput) &&
    shortString(value.narrowingInput) &&
    oneOf(value.parsingMode, [
      "direct",
      "safeParse",
      "safeJsonParse",
    ]) &&
    codeDrafts(value.codeDrafts)
  );
}

export function createShareUrl(
  workspace: SharedWorkspace
): string {
  if (!isSharedWorkspace(workspace)) {
    throw new Error("The workspace contains invalid data.");
  }

  const json = JSON.stringify(workspace);

  if (json.length > MAX_JSON_LENGTH) {
    throw new Error(
      "This workspace is too large to share."
    );
  }

  const payload =
    compressToEncodedURIComponent(json);

  if (payload.length > MAX_URL_PAYLOAD) {
    throw new Error(
      "The shared link is too long. Try shortening your code."
    );
  }

  const url = new URL(window.location.href);
  url.hash = HASH_KEY + payload;

  return url.toString();
}

export function readSharedWorkspace(): {
  workspace: SharedWorkspace | null;
  error: string | null;
} {
  const hash = window.location.hash.slice(1);

  if (!hash.startsWith(HASH_KEY)) {
    return { workspace: null, error: null };
  }

  try {
    const payload = hash.slice(HASH_KEY.length);

    if (
      !payload ||
      payload.length > MAX_URL_PAYLOAD
    ) {
      throw new Error("Invalid shared link.");
    }

    const json =
      decompressFromEncodedURIComponent(payload);

    if (
      !json ||
      json.length > MAX_JSON_LENGTH
    ) {
      throw new Error("Invalid shared data.");
    }

    const parsed: unknown = JSON.parse(json);

    if (!isSharedWorkspace(parsed)) {
      throw new Error(
        "The shared workspace is invalid or unsupported."
      );
    }

    return {
      workspace: parsed,
      error: null,
    };
  } catch {
    return {
      workspace: null,
      error:
        "This shared link could not be loaded. The default workspace was opened instead.",
    };
  }
}
