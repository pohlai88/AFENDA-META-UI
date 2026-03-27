import { describe, expect, it } from "vitest";

import { emit } from "../emitter.js";

describe("truth emitter ordering", () => {
  it("prioritizes dependency orderIndex over kind/model fallback ordering", () => {
    const sql = emit(
      [
        {
          model: "sales_order",
          kind: "trigger" as const,
          orderIndex: 20,
          sql: "-- second\nSELECT 2;",
        },
        {
          model: "sales_order",
          kind: "check" as const,
          orderIndex: 10,
          sql: "-- first\nSELECT 1;",
        },
      ],
      new Date("2026-03-27T00:00:00.000Z")
    );

    expect(sql.indexOf("-- first")).toBeLessThan(sql.indexOf("-- second"));
  });
});
