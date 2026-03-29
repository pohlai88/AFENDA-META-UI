/**
 * @module core/guards
 * @description Runtime boundary narrowing helpers shared across truth contract consumers.
 * @layer truth-contract
 * @consumers api, web, db
 */

import type { JsonObject, JsonArray, JsonPrimitive } from "./json.js";

/**
 * Type guard: checks whether a value is a `JsonObject` (plain object, not null/array).
 *
 * Use at API/dynamic-import boundaries to narrow `unknown` before reading fields.
 *
 * @example
 * if (isJsonObject(maybeConfig)) {
 *   const title = maybeConfig.title; // safe — JsonValue
 * }
 */
export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard: checks whether a value is a `JsonArray`.
 *
 * @example
 * if (isJsonArray(maybeList)) {
 *   maybeList.forEach(item => process(item));
 * }
 */
export function isJsonArray(value: unknown): value is JsonArray {
  return Array.isArray(value);
}

/**
 * Type guard: checks whether a value is a `JsonPrimitive`.
 */
export function isJsonPrimitive(value: unknown): value is JsonPrimitive {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/**
 * Exhaustiveness checker for discriminated union `switch` statements.
 * TypeScript will error at compile time if a case is not handled.
 *
 * @example
 * switch (decision.type) {
 *   case "allow": return ...;
 *   case "block": return ...;
 *   default: return assertNever(decision); // ← compile error if new variant added
 * }
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}
