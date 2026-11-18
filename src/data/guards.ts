
import {
  isArray,
  isBoolean,
  isInteger,
  isNegative,
  isNil,
  isNull,
  isNumber,
  isObject,
  isPlainObject,
  isPositive,
  isPrimitive,
  isSafeInteger,
  isString,
  isZero,
} from "is-kit";

import type {
  GuardInfo,
  GuardName,
} from "../types/playground";

export const GUARDS: GuardInfo[] = [
  // Primitive values
  {
    name: "isString",
    description: "Checks whether a value is a string.",
    category: "Primitive",
    guard: isString,
    matches: "a string",
  },
  {
    name: "isNumber",
    description: "Checks whether a value is a finite number.",
    category: "Primitive",
    guard: isNumber,
    matches: "a finite number",
  },
  {
    name: "isBoolean",
    description: "Checks whether a value is a boolean.",
    category: "Primitive",
    guard: isBoolean,
    matches: "a boolean",
  },
  {
    name: "isPrimitive",
    description: "Checks whether a value is a JavaScript primitive.",
    category: "Primitive",
    guard: isPrimitive,
    matches: "a primitive value",
  },

  // Number guards
  {
    name: "isInteger",
    description: "Checks whether a value is an integer.",
    category: "Number",
    guard: isInteger,
    matches: "an integer",
  },
  {
    name: "isSafeInteger",
    description:
      "Checks whether a value is a safe integer.",
    category: "Number",
    guard: isSafeInteger,
    matches: "a safe integer",
  },
  {
    name: "isPositive",
    description:
      "Checks whether a value is a positive number.",
    category: "Number",
    guard: isPositive,
    matches: "a positive number",
  },
  {
    name: "isNegative",
    description:
      "Checks whether a value is a negative number.",
    category: "Number",
    guard: isNegative,
    matches: "a negative number",
  },
  {
    name: "isZero",
    description:
      "Checks whether a value is zero.",
    category: "Number",
    guard: isZero,
    matches: "zero",
  },

  // Nullish values
  {
    name: "isNull",
    description:
      "Checks whether a value is exactly null.",
    category: "Nullish",
    guard: isNull,
    matches: "null",
  },
  {
    name: "isNil",
    description:
      "Checks whether a value is null or undefined.",
    category: "Nullish",
    guard: isNil,
    matches: "null or undefined",
  },

  // Objects
  {
    name: "isObject",
    description:
      "Checks whether a value is an object.",
    category: "Object",
    guard: isObject,
    matches: "an object",
  },
  {
    name: "isPlainObject",
    description:
      "Checks whether a value is a plain object.",
    category: "Object",
    guard: isPlainObject,
    matches: "a plain object",
  },

  // Collections
  {
    name: "isArray",
    description:
      "Checks whether a value is an array.",
    category: "Collection",
    guard: isArray,
    matches: "an array",
  },
];

export const guardLookup = Object.fromEntries(
  GUARDS.map((guard) => [guard.name, guard])
) as Record<GuardName, GuardInfo>;
