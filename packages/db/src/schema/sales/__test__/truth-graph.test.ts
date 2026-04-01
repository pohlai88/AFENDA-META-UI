import { describe, expect, it } from "vitest";

import { SalesTruthGraphEngine, salesTruthGraph, salesTruthGraphEngine } from "../_relations.js";

describe("sales truth graph layering", () => {
  it("keeps core truth, operational, and audit graphs separated", () => {
    expect(Object.keys(salesTruthGraph.truth).length).toBeGreaterThan(0);
    expect(Object.keys(salesTruthGraph.operational).length).toBeGreaterThan(0);
    expect(Object.keys(salesTruthGraph.audit).length).toBeGreaterThan(0);
  });
});

describe("sales truth graph traversal", () => {
  it("resolves deterministic dependencies from sales_orders", () => {
    const result = salesTruthGraphEngine.resolveDependencies("sales_orders", {
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

    expect(result.edges.map((edge) => edge.id)).toEqual([
      "order_composes_lines",
      "order_composes_option_lines",
      "order_composes_truth_links",
      "order_derives_price_resolutions",
      "order_derives_pricing_decisions",
      "order_derives_tax_summary",
      "pricing_decision_derives_price_resolutions",
    ]);
  });

  it("supports impact analysis and replay paths", () => {
    const impact = salesTruthGraphEngine.whatBreaksIf("tax_rates");
    const replay = salesTruthGraphEngine.replay("sales_orders");

    expect(impact.nodes).toContain("sale_order_tax_summary");
    expect(replay.edges.every((edge) => edge.edge.role === "derivation")).toBe(true);
  });

  it("propagates lock only through lockPropagation edges", () => {
    const result = salesTruthGraphEngine.propagateLock("sales_orders");

    expect(result.nodes).toEqual([
      "accounting_decisions",
      "accounting_postings",
      "commission_entries",
      "document_truth_bindings",
      "sales_order_document_truth_links",
    ]);
    expect(result.edges.map((edge) => edge.id)).toEqual([
      "order_composes_truth_links",
      "truth_binding_derives_accounting_decisions",
      "truth_binding_derives_accounting_postings",
      "truth_binding_derives_commission_entries",
      "truth_link_owns_truth_bindings",
    ]);
  });
});

describe("sales truth graph validation", () => {
  it("stays acyclic for constrained truth edges", () => {
    const validation = salesTruthGraphEngine.validateGraph("truth");
    expect(validation.isValid).toBe(true);
    expect(validation.cycles).toEqual([]);
  });

  it("detects cycles when constrained edges loop", () => {
    const engine = new SalesTruthGraphEngine({
      truth: {
        a_derives_b: {
          from: "a",
          to: "b",
          relation: "one-to-many",
          fromField: "id",
          toField: "a_id",
          role: "derivation",
          direction: "forward",
          constraints: { acyclic: true },
        },
        b_derives_a: {
          from: "b",
          to: "a",
          relation: "one-to-many",
          fromField: "id",
          toField: "b_id",
          role: "derivation",
          direction: "forward",
          constraints: { acyclic: true },
        },
      },
      operational: {},
      audit: {},
    });

    const validation = engine.validateGraph("truth");
    expect(validation.isValid).toBe(false);
    expect(validation.cycles.length).toBeGreaterThan(0);
  });
});
