import { describe, expect, it } from "vitest";

import { TRUTH_INVARIANT_CATALOG } from "../truthSystemInvariants.js";

describe("truthSystemInvariants", () => {
  it("catalog ids are unique and stable", () => {
    const ids = TRUTH_INVARIANT_CATALOG.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("INV-SO-001");
    expect(ids).toContain("INV-SO-004");
  });
});
