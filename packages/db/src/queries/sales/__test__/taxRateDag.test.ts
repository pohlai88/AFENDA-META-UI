import { describe, expect, it } from "vitest";

import { taxRateChildEdgeWouldCreateCycle } from "../taxRateDag.js";

describe("taxRateChildEdgeWouldCreateCycle", () => {
  it("returns false when no path exists from child to parent", () => {
    const edges = [
      { parentTaxId: "a", childTaxId: "b" },
      { parentTaxId: "b", childTaxId: "c" },
    ];
    expect(taxRateChildEdgeWouldCreateCycle(edges, "x", "y")).toBe(false);
    expect(taxRateChildEdgeWouldCreateCycle(edges, "c", "d")).toBe(false);
  });

  it("detects a cycle when child can reach parent", () => {
    const edges = [
      { parentTaxId: "a", childTaxId: "b" },
      { parentTaxId: "b", childTaxId: "c" },
    ];
    expect(taxRateChildEdgeWouldCreateCycle(edges, "c", "a")).toBe(true);
  });

  it("rejects self-loop", () => {
    expect(taxRateChildEdgeWouldCreateCycle([], "a", "a")).toBe(true);
  });
});
