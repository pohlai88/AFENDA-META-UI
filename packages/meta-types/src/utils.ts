/**
 * @afenda/meta-types — Shared TypeScript utility types
 *
 * Zero runtime — pure type utilities for the AFENDA monorepo.
 * Import from "@afenda/meta-types" rather than this file directly.
 */

// ---------------------------------------------------------------------------
// JSON-safe value hierarchy
// ---------------------------------------------------------------------------

/** All primitives that JSON.stringify / JSON.parse can round-trip safely. */
export type JsonPrimitive = string | number | boolean | null;

/** A JSON object with string keys and recursively JSON-safe values. */
export type JsonObject = { [key: string]: JsonValue };

/** A JSON array of recursively JSON-safe values. */
export type JsonArray = JsonValue[];

/**
 * Any value that can be serialised/deserialised through JSON without data loss.
 *
 * @example
 * function storeMetadata(value: JsonValue) { ... }
 */
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

// ---------------------------------------------------------------------------
// Nominal typing helpers
// ---------------------------------------------------------------------------

/**
 * Brands a base type `T` with a phantom string tag `B`.
 * Prevents mixing structurally identical values that carry different semantics.
 *
 * @example
 * type UserId  = Brand<string, "UserId">;
 * type OrderId = Brand<string, "OrderId">;
 *
 * declare const uid: UserId;
 * declare function processOrder(id: OrderId): void;
 * processOrder(uid); // ← TS error — UserId is not assignable to OrderId
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/**
 * Alias for {@link Brand} with a more explicit "opaque" framing.
 * Useful when the phantom tag name should convey module ownership.
 *
 * @example
 * type TenantId = Opaque<string, "TenantId">;
 */
export type Opaque<T, B extends string> = Brand<T, B>;

// ---------------------------------------------------------------------------
// Deep recursive utilities
// ---------------------------------------------------------------------------

/**
 * Recursively makes every property optional.
 * Use for patch / merge payloads where most fields may be absent.
 *
 * @example
 * type FormDraft = DeepPartial<ModelMeta>;
 */
export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

/**
 * Recursively makes every property `readonly`.
 * Use to freeze configuration objects or computed state.
 *
 * @example
 * const config: DeepReadonly<AppConfig> = loadConfig();
 */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
    : T;

// ---------------------------------------------------------------------------
// Array utilities
// ---------------------------------------------------------------------------

/**
 * An array that is guaranteed to have at least one element.
 * Useful for APIs that require non-empty input.
 *
 * @example
 * function join<T>(items: NonEmptyArray<T>, sep: string): string { ... }
 */
export type NonEmptyArray<T> = [T, ...T[]];

// ---------------------------------------------------------------------------
// Async utilities
// ---------------------------------------------------------------------------

/**
 * A value that may be returned directly or wrapped in a `Promise`.
 *
 * @example
 * type Loader<T> = () => MaybePromise<T>;
 */
export type MaybePromise<T> = T | Promise<T>;

/**
 * Extracts the resolved type of a `Promise`, or passes `T` through unchanged.
 * Safe alias for the built-in `Awaited<T>` (TypeScript ≥ 4.5).
 */
export type Resolved<T> = Awaited<T>;

// ---------------------------------------------------------------------------
// Runtime boundary narrowing helpers
// ---------------------------------------------------------------------------

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
