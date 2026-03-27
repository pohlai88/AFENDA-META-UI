import { describe, expect, it } from "vitest";

import { assertNever, isJsonArray, isJsonObject, isJsonPrimitive } from "../utils.js";

describe("utils", () => {
  it("validates json objects", () => {
    expect(isJsonObject({ ok: true })).toBe(true);
    expect(isJsonObject([1, 2, 3])).toBe(false);
    expect(isJsonObject(null)).toBe(false);
    expect(isJsonObject("x")).toBe(false);
  });

  it("validates json arrays", () => {
    expect(isJsonArray([1, "two", null])).toBe(true);
    expect(isJsonArray({ value: 1 })).toBe(false);
    expect(isJsonArray("not-array")).toBe(false);
  });

  it("validates json primitives", () => {
    expect(isJsonPrimitive("text")).toBe(true);
    expect(isJsonPrimitive(10)).toBe(true);
    expect(isJsonPrimitive(false)).toBe(true);
    expect(isJsonPrimitive(null)).toBe(true);

    expect(isJsonPrimitive(undefined)).toBe(false);
    expect(isJsonPrimitive({})).toBe(false);
    expect(isJsonPrimitive([])).toBe(false);
  });

  it("throws in assertNever for unhandled value", () => {
    expect(() => assertNever("unexpected" as never)).toThrow("Unhandled case");
  });
});
