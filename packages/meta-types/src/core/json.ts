/**
 * @module core/json
 * @description JSON-safe value hierarchy for serialization boundaries.
 * @layer truth-contract
 */

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
