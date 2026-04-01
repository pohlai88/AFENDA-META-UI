import { describe, expect, it } from "vitest";

import {
  analyzeSalesTruthImpact,
  buildSalesTruthImpactEventMetadata,
  findSalesTruthEdges,
  propagateSalesTruthLock,
  replaySalesTruthDerivations,
  resolveSalesTruthDependencies,
  validateSalesTruthGraph,
} from "../truth-graph-engine.js";

describe("sales truth graph api adapter", () => {
  it("resolves deterministic dependency traversal for truth layer", () => {
    const result = resolveSalesTruthDependencies("sales_orders", {
      layer: "truth",
      role: ["composition", "derivation"],
      includeStart: false,
    });

    expect(result.nodes).toEqual([
      "sale_order_option_lines",
      "sale_order_tax_summary",
      "sales_order_document_truth_links",
      "sales_order_lines",
      "sales_order_price_resolutions",
      "sales_order_pricing_decisions",
    ]);
    expect(result.edges.map((edge) => edge.id)).toContain("order_derives_tax_summary");
  });

  it("supports impact, replay, and lock propagation contracts", () => {
    const impact = analyzeSalesTruthImpact("tax_rates");
    const replay = replaySalesTruthDerivations("sales_orders");
    const locks = propagateSalesTruthLock("sales_orders");

    expect(impact.nodes).toContain("sale_order_tax_summary");
    expect(replay.edges.every((edge) => edge.edge.role === "derivation")).toBe(true);
    expect(locks.edges.every((edge) => edge.edge.execution?.lockPropagation === true)).toBe(true);
  });

  it("finds semantic edges via execution/role filters", () => {
    const edges = findSalesTruthEdges({
      layer: "truth",
      role: "derivation",
      affectsAccounting: true,
    });

    expect(edges.length).toBeGreaterThan(0);
    expect(edges.some((edge) => edge.id === "truth_binding_derives_accounting_postings")).toBe(true);
  });

  it("validates constrained truth graph acyclic contract", () => {
    const validation = validateSalesTruthGraph("truth");
    expect(validation.isValid).toBe(true);
    expect(validation.cycles).toEqual([]);
  });

  it("builds event metadata for persistence from truth impact traversal", () => {
    const meta = buildSalesTruthImpactEventMetadata("subscriptions", "activate");
    expect(meta.truthImpact.graphLayer).toBe("truth");
    expect(meta.truthImpact.operation).toBe("activate");
    expect(meta.truthImpact.startTable).toBe("subscriptions");
    expect(meta.truthImpact.impactedNodes.length).toBeGreaterThan(0);
    expect(meta.truthImpact.impactedEdgeIds.length).toBeGreaterThan(0);
  });
});
