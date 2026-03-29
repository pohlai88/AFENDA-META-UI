import { describe, expect, it } from "vitest";

import { TRUTH_PRIORITY } from "../graph-constants.js";

describe("TRUTH_PRIORITY", () => {
  it("contains expected truth sources", () => {
    expect(Object.keys(TRUTH_PRIORITY).sort()).toEqual([
      "approved_document",
      "draft_document",
      "posted_ledger",
      "user_input_cache",
    ]);
  });

  it("uses descending authority ordering", () => {
    expect(TRUTH_PRIORITY.posted_ledger).toBeGreaterThan(TRUTH_PRIORITY.approved_document);
    expect(TRUTH_PRIORITY.approved_document).toBeGreaterThan(TRUTH_PRIORITY.draft_document);
    expect(TRUTH_PRIORITY.draft_document).toBeGreaterThan(TRUTH_PRIORITY.user_input_cache);
  });

  it("stores numeric priorities", () => {
    for (const value of Object.values(TRUTH_PRIORITY)) {
      expect(typeof value).toBe("number");
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});
