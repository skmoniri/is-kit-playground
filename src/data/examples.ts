
import type { Example } from "../types/playground";

export const EXAMPLES: Example[] = [
  {
    id: "quick",
    title: "Quick Start",
    description: "Accept a string or a number.",
    operator: "or",
    guards: ["isString", "isNumber"],
    input: '"hello"',
  },
  {
    id: "numbers",
    title: "Numbers",
    description: "Accept finite integer values.",
    operator: "and",
    guards: ["isNumber", "isInteger"],
    input: "42",
  },
  {
    id: "boolean",
    title: "Boolean Values",
    description: "Accept booleans or strings.",
    operator: "or",
    guards: ["isBoolean", "isString"],
    input: "true",
  },
  {
    id: "nullish",
    title: "Not Nullish",
    description: "Reject null and undefined.",
    operator: "not",
    guards: ["isNil"],
    input: '"hello"',
  },
  {
    id: "objects",
    title: "Objects",
    description: "Accept object values.",
    operator: "and",
    guards: ["isObject"],
    input: '{"name":"Alex","age":28}',
  },
  {
    id: "arrays",
    title: "Arrays",
    description: "Accept array values.",
    operator: "and",
    guards: ["isArray"],
    input: '[1,2,3]',
  },
];
