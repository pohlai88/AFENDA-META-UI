import { describe, expect, it } from "vitest";

import {
  buildAppliedRuleIdChain,
  pickWinningPricelistItem,
  sortPricelistItemCandidates,
} from "../resolvePricelistRule.js";

describe("pickWinningPricelistItem", () => {
  it("prefers product_variant over global at equal sequence", () => {
    const winner = pickWinningPricelistItem([
      { id: "g1", appliedOn: "global", sequence: 10 },
      { id: "v1", appliedOn: "product_variant", sequence: 10 },
    ]);
    expect(winner?.id).toBe("v1");
  });

  it("uses sequence as tie-breaker within the same applied_on band", () => {
    const winner = pickWinningPricelistItem([
      { id: "a", appliedOn: "product_category", sequence: 20 },
      { id: "b", appliedOn: "product_category", sequence: 5 },
    ]);
    expect(winner?.id).toBe("b");
  });

  it("returns null for empty candidates", () => {
    expect(pickWinningPricelistItem([])).toBeNull();
  });
});

describe("sortPricelistItemCandidates", () => {
  it("orders by narrowing then sequence", () => {
    const sorted = sortPricelistItemCandidates([
      { id: "g", appliedOn: "global", sequence: 1 },
      { id: "t", appliedOn: "product_template", sequence: 99 },
      { id: "v", appliedOn: "product_variant", sequence: 50 },
    ]).map((c) => c.id);
    expect(sorted).toEqual(["v", "t", "g"]);
  });
});

describe("buildAppliedRuleIdChain", () => {
  it("appends winner to optional chain", () => {
    expect(buildAppliedRuleIdChain("w", ["a", "b"])).toEqual(["a", "b", "w"]);
  });
});
