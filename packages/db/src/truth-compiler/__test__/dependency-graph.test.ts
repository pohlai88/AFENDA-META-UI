import { describe, expect, it } from "vitest";

import { buildDependencyGraph, detectCycle, topologicalSort } from "../dependency-graph.js";
import { normalize } from "../normalizer.js";
import { COMPILER_INPUT } from "../truth-config.js";

describe("truth dependency graph", () => {
  it("builds deterministic topological ordering", () => {
    const normalized = normalize(COMPILER_INPUT);
    const graph = buildDependencyGraph(normalized);

    expect(graph.nodes.size).toBeGreaterThan(0);
    expect(graph.order).toEqual(topologicalSort(graph.nodes));

    const salesOrderEntityIndex = graph.order.indexOf("entity:sales_order");
    const salesOrderInvariantIndex = graph.order.indexOf(
      "invariant:sales.sales_order.confirmed_amount_positive"
    );

    expect(salesOrderEntityIndex).toBeGreaterThanOrEqual(0);
    expect(salesOrderInvariantIndex).toBeGreaterThan(salesOrderEntityIndex);
  });

  it("detects cycles with actionable path diagnostics", () => {
    const cyclicNodes = new Map([
      [
        "entity:a",
        {
          id: "entity:a",
          kind: "entity" as const,
          dependsOn: ["invariant:b"],
        },
      ],
      [
        "invariant:b",
        {
          id: "invariant:b",
          kind: "invariant" as const,
          dependsOn: ["entity:a"],
        },
      ],
    ]);

    const cycle = detectCycle(cyclicNodes);

    expect(cycle.cyclePath.length).toBeGreaterThan(0);
    expect(cycle.message).toContain("dependency-graph cycle detected");
    expect(cycle.message).toContain("entity:a");
    expect(cycle.message).toContain("invariant:b");
  });
});
