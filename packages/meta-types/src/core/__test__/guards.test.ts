/**
 * Core runtime guard tests — exhaustive edge-case coverage.
 *
 * Design intent: these tests MUST PASS without compromise.
 * If a guard behaves unexpectedly for an input, fix the guard, not the test.
 */
import { describe, expect, it } from "vitest";

import { assertNever, isJsonArray, isJsonObject, isJsonPrimitive } from "../guards.js";

// ---------------------------------------------------------------------------
// isJsonObject
// ---------------------------------------------------------------------------

describe("isJsonObject", () => {
  it("returns true for a plain empty object", () => {
    expect(isJsonObject({})).toBe(true);
  });

  it("returns true for an object with nested values", () => {
    expect(isJsonObject({ a: 1, b: { c: [1, 2] } })).toBe(true);
  });

  it("returns false for null (JSON null is not an object)", () => {
    expect(isJsonObject(null)).toBe(false);
  });

  it("returns false for an array", () => {
    expect(isJsonObject([])).toBe(false);
    expect(isJsonObject([1, 2, 3])).toBe(false);
    expect(isJsonObject([{ a: 1 }])).toBe(false);
  });

  it("returns false for string primitives", () => {
    expect(isJsonObject("")).toBe(false);
    expect(isJsonObject("hello")).toBe(false);
  });

  it("returns false for number primitives", () => {
    expect(isJsonObject(0)).toBe(false);
    expect(isJsonObject(42)).toBe(false);
    expect(isJsonObject(-1)).toBe(false);
  });

  it("returns false for boolean", () => {
    expect(isJsonObject(true)).toBe(false);
    expect(isJsonObject(false)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isJsonObject(undefined)).toBe(false);
  });

  it("returns false for Symbol (non-JSON-serializable)", () => {
    expect(isJsonObject(Symbol("test"))).toBe(false);
  });

  it("returns false for BigInt (non-JSON-serializable)", () => {
    expect(isJsonObject(BigInt(9007199254740991))).toBe(false);
  });

  it("returns false for a function", () => {
    expect(isJsonObject(() => {})).toBe(false);
  });

  it("returns true for a Date-shaped plain object (has enumerable keys)", () => {
    // Date is an object but NOT a plain object — however `typeof new Date() === 'object'`
    // and `!Array.isArray(new Date())` and `new Date() !== null`, so it returns true.
    // This is expected given the simple guard implementation, and callers must
    // be aware that non-plain objects pass through if they look like objects.
    const date = new Date("2026-01-01");
    expect(isJsonObject(date)).toBe(true); // guard is structural, not prototype-aware
  });
});

// ---------------------------------------------------------------------------
// isJsonArray
// ---------------------------------------------------------------------------

describe("isJsonArray", () => {
  it("returns true for an empty array", () => {
    expect(isJsonArray([])).toBe(true);
  });

  it("returns true for an array with mixed JSON values", () => {
    expect(isJsonArray([1, "two", null, { a: 3 }, [4]])).toBe(true);
  });

  it("returns true for a nested array of arrays", () => {
    expect(
      isJsonArray([
        [1, 2],
        [3, 4],
      ])
    ).toBe(true);
  });

  it("returns false for a plain object", () => {
    expect(isJsonArray({})).toBe(false);
    expect(isJsonArray({ 0: "a", length: 1 })).toBe(false); // array-like object
  });

  it("returns false for string", () => {
    expect(isJsonArray("hello")).toBe(false);
    expect(isJsonArray("")).toBe(false);
  });

  it("returns false for number", () => {
    expect(isJsonArray(42)).toBe(false);
    expect(isJsonArray(0)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isJsonArray(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isJsonArray(undefined)).toBe(false);
  });

  it("returns false for boolean", () => {
    expect(isJsonArray(true)).toBe(false);
    expect(isJsonArray(false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isJsonPrimitive
// ---------------------------------------------------------------------------

describe("isJsonPrimitive", () => {
  it("returns true for string", () => {
    expect(isJsonPrimitive("")).toBe(true);
    expect(isJsonPrimitive("hello world")).toBe(true);
  });

  it("returns true for number — integer and float", () => {
    expect(isJsonPrimitive(0)).toBe(true);
    expect(isJsonPrimitive(42)).toBe(true);
    expect(isJsonPrimitive(-99.5)).toBe(true);
    expect(isJsonPrimitive(Number.MAX_SAFE_INTEGER)).toBe(true);
  });

  it("returns true for boolean", () => {
    expect(isJsonPrimitive(true)).toBe(true);
    expect(isJsonPrimitive(false)).toBe(true);
  });

  it("returns true for null", () => {
    expect(isJsonPrimitive(null)).toBe(true);
  });

  it("returns false for undefined (not JSON-serializable)", () => {
    expect(isJsonPrimitive(undefined)).toBe(false);
  });

  it("returns false for plain object", () => {
    expect(isJsonPrimitive({})).toBe(false);
    expect(isJsonPrimitive({ a: 1 })).toBe(false);
  });

  it("returns false for array", () => {
    expect(isJsonPrimitive([])).toBe(false);
    expect(isJsonPrimitive([1])).toBe(false);
  });

  it("returns false for Symbol (not JSON-serializable)", () => {
    expect(isJsonPrimitive(Symbol("x"))).toBe(false);
  });

  it("returns false for BigInt (not JSON-serializable by default)", () => {
    expect(isJsonPrimitive(BigInt(42))).toBe(false);
  });

  it("returns false for function", () => {
    expect(isJsonPrimitive(() => "nope")).toBe(false);
  });

  it("handles Number.NaN correctly — NaN is typeof 'number' so passes as primitive", () => {
    // NaN becomes null in JSON.stringify, so this is a known edge case.
    // The guard returns true; callers must handle NaN in downstream logic.
    expect(isJsonPrimitive(NaN)).toBe(true);
  });

  it("handles Infinity correctly — Infinity is typeof 'number' so passes as primitive", () => {
    // Infinity becomes null in JSON.stringify — same edge case as NaN.
    expect(isJsonPrimitive(Infinity)).toBe(true);
    expect(isJsonPrimitive(-Infinity)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// assertNever
// ---------------------------------------------------------------------------

describe("assertNever", () => {
  it("throws an error with the unexpected value serialized", () => {
    const payload = { type: "unhandled_variant" };
    expect(() => assertNever(payload as never)).toThrow("Unhandled case");
  });

  it("includes the value in the thrown error message", () => {
    expect(() => assertNever("surprise" as never)).toThrow("surprise");
  });

  it("throws for an unexpected numeric discriminant", () => {
    expect(() => assertNever(999 as never)).toThrow("999");
  });

  it("throws for an unexpected object discriminant", () => {
    expect(() => assertNever({ kind: "ghost" } as never)).toThrow("ghost");
  });

  it("provides a useful error message that identifies the unhandled case", () => {
    let caught: Error | undefined;
    try {
      assertNever("unknown_type" as never);
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).toBeDefined();
    expect(caught?.message).toMatch(/Unhandled case/);
  });
});
