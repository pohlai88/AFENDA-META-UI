/**
 * Core JSON type hierarchy contract tests.
 *
 * Design intent: JsonPrimitive, JsonObject, JsonArray, and JsonValue form the
 * serialization boundary between meta-types and all consumers. These types
 * must remain structurally stable. Fix the contract, not the test.
 */
import { describe, expect, it } from "vitest";
import { expectTypeOf } from "vitest";

import type { JsonArray, JsonObject, JsonPrimitive, JsonValue } from "../json.js";

// ---------------------------------------------------------------------------
// JsonPrimitive — type membership checks
// ---------------------------------------------------------------------------

describe("JsonPrimitive — type membership", () => {
  it("string is a JsonPrimitive", () => {
    const v: JsonPrimitive = "hello";
    expect(typeof v).toBe("string");
    expectTypeOf(v).toMatchTypeOf<JsonPrimitive>();
  });

  it("number is a JsonPrimitive", () => {
    const v: JsonPrimitive = 42;
    expect(typeof v).toBe("number");
  });

  it("boolean is a JsonPrimitive", () => {
    const vTrue: JsonPrimitive = true;
    const vFalse: JsonPrimitive = false;
    expect(vTrue).toBe(true);
    expect(vFalse).toBe(false);
  });

  it("null is a JsonPrimitive", () => {
    const v: JsonPrimitive = null;
    expect(v).toBeNull();
  });

  it("0 is a valid JsonPrimitive number", () => {
    const v: JsonPrimitive = 0;
    expect(v).toBe(0);
  });

  it("empty string is a valid JsonPrimitive", () => {
    const v: JsonPrimitive = "";
    expect(v).toBe("");
  });
});

// ---------------------------------------------------------------------------
// JsonObject — structural contract
// ---------------------------------------------------------------------------

describe("JsonObject — structural contract", () => {
  it("accepts an empty record", () => {
    const obj: JsonObject = {};
    expect(Object.keys(obj)).toHaveLength(0);
  });

  it("accepts a flat string-valued object", () => {
    const obj: JsonObject = { name: "ACME", locale: "en_US" };
    expect(obj["name"]).toBe("ACME");
  });

  it("accepts a nested object", () => {
    const obj: JsonObject = {
      meta: { model: "invoice", version: 3 },
    };
    expect((obj["meta"] as JsonObject)["model"]).toBe("invoice");
  });

  it("accepts an object with array values", () => {
    const obj: JsonObject = {
      tags: ["urgent", "review"],
    };
    expect(obj["tags"]).toHaveLength(2);
  });

  it("accepts an object with null values", () => {
    const obj: JsonObject = { deletedAt: null };
    expect(obj["deletedAt"]).toBeNull();
  });

  it("accepts mixed-type values", () => {
    const obj: JsonObject = {
      count: 10,
      enabled: true,
      label: "Orders",
      meta: null,
    };
    expect(obj["count"]).toBe(10);
    expect(obj["enabled"]).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// JsonArray — structural contract
// ---------------------------------------------------------------------------

describe("JsonArray — structural contract", () => {
  it("accepts an empty array", () => {
    const arr: JsonArray = [];
    expect(arr).toHaveLength(0);
  });

  it("accepts an array of strings", () => {
    const arr: JsonArray = ["draft", "confirmed", "done"];
    expect(arr).toHaveLength(3);
    expect(arr[0]).toBe("draft");
  });

  it("accepts an array of numbers", () => {
    const arr: JsonArray = [1, 2, 3];
    expect(arr[2]).toBe(3);
  });

  it("accepts an array of objects", () => {
    const arr: JsonArray = [{ id: "a" }, { id: "b" }];
    expect(arr).toHaveLength(2);
  });

  it("accepts a nested array", () => {
    const arr: JsonArray = [[1, 2], [3, 4]];
    expect((arr[0] as JsonArray)[1]).toBe(2);
  });

  it("accepts null inside an array", () => {
    const arr: JsonArray = [null, "ok"];
    expect(arr[0]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// JsonValue — recursive union
// ---------------------------------------------------------------------------

describe("JsonValue — recursive union covers all JSON primitives", () => {
  it("string is a JsonValue", () => {
    const v: JsonValue = "label";
    expect(typeof v).toBe("string");
    expectTypeOf(v).toMatchTypeOf<JsonValue>();
  });

  it("number is a JsonValue", () => {
    const v: JsonValue = 3.14;
    expect(v).toBeCloseTo(3.14);
  });

  it("boolean is a JsonValue", () => {
    const v: JsonValue = false;
    expect(v).toBe(false);
  });

  it("null is a JsonValue", () => {
    const v: JsonValue = null;
    expect(v).toBeNull();
  });

  it("object is a JsonValue", () => {
    const v: JsonValue = { key: "val" };
    expect((v as JsonObject)["key"]).toBe("val");
  });

  it("array is a JsonValue", () => {
    const v: JsonValue = [1, 2];
    expect((v as JsonArray)).toHaveLength(2);
  });

  it("deeply nested structure is a JsonValue", () => {
    const v: JsonValue = {
      level1: {
        level2: [{ leaf: true }, null, 42],
      },
    };
    const l1 = (v as JsonObject)["level1"] as JsonObject;
    const l2 = l1["level2"] as JsonArray;
    expect(l2).toHaveLength(3);
    expect((l2[0] as JsonObject)["leaf"]).toBe(true);
    expect(l2[1]).toBeNull();
    expect(l2[2]).toBe(42);
  });
});
