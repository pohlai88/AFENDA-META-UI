import { describe, expect, it } from "vitest";

import { FINALIZE_PRICING_DECISION_MIN_RESOLUTION_COUNT } from "../documentPricingDecision.js";
import {
  assertEveryLinePricingSucceeded,
  assertLineOutputsSufficientForFinalize,
  buildSalesOrderPricingLinePersistDrafts,
  buildSalesOrderPricingLinePersistInput,
  evaluateSalesOrderPricingLinesPure,
  PricingDecisionInvariantError,
} from "../pricingDecisionEngine.js";
import type { PricelistItemRuleInput } from "../pricingResolveEngine.js";

const asOf = new Date("2026-01-15T12:00:00.000Z");

function globalFixedRule(
  pl: string,
  id: string,
  price: string,
  productId: string,
  tmpl: string
): PricelistItemRuleInput {
  return {
    id,
    pricelistId: pl,
    appliedOn: "product_variant",
    productTmplId: null,
    productId,
    categId: null,
    minQuantity: "1",
    dateStart: null,
    dateEnd: null,
    effectiveFrom: new Date("2020-01-01T00:00:00.000Z"),
    effectiveTo: null,
    supersededBy: null,
    computePrice: "fixed",
    fixedPrice: price,
    percentPrice: null,
    base: "list_price",
    basePricelistId: null,
    priceSurcharge: "0",
    priceDiscount: "0",
    priceRound: null,
    sequence: 10,
    isActive: true,
  };
}

describe("evaluateSalesOrderPricingLinesPure", () => {
  it("returns allSucceeded when every line resolves", () => {
    const pl = "11111111-1111-4111-8111-111111111111";
    const pid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001";
    const rules = [globalFixedRule(pl, "r1", "10.00", pid, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001")];
    const r = evaluateSalesOrderPricingLinesPure([
      {
        lineId: "L1",
        uomId: 1,
        date: "2026-01-15",
        context: {
          tenantId: 1,
          pricelistId: pl,
          productId: pid,
          productTemplateId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001",
          categoryIds: [],
          quantity: "2",
          asOf,
          currencyId: 1,
          rules,
          productFacts: { listPrice: "99.00", standardPrice: "80.00" },
        },
      },
    ]);
    expect(r.allSucceeded).toBe(true);
    expect(r.successCount).toBe(1);
    expect(r.lineResults[0]?.ok).toBe(true);
  });
});

describe("assertLineOutputsSufficientForFinalize", () => {
  it("throws when empty and min is 1", () => {
    expect(() => assertLineOutputsSufficientForFinalize([])).toThrow(PricingDecisionInvariantError);
  });

  it("passes when count meets FINALIZE_PRICING_DECISION_MIN_RESOLUTION_COUNT", () => {
    expect(() =>
      assertLineOutputsSufficientForFinalize([{ x: 1 }], {
        minCount: FINALIZE_PRICING_DECISION_MIN_RESOLUTION_COUNT,
      })
    ).not.toThrow();
  });
});

describe("assertEveryLinePricingSucceeded", () => {
  it("throws when any line failed", () => {
    expect(() =>
      assertEveryLinePricingSucceeded([
        {
          lineId: "a",
          ok: true,
          resolution: {
            ok: true,
            finalUnitPrice: "1",
            unitPriceAfterRule: "1",
            basePrice: "1",
            winningRuleId: null,
            appliedRuleIds: [],
            rulePath: [],
            discountBreakdown: [],
            roundingApplied: null,
            trace: [],
          },
        },
        { lineId: "b", ok: false, failure: { ok: false, code: "PRICELIST_CYCLE", message: "x", trace: [] } },
      ])
    ).toThrow(PricingDecisionInvariantError);
  });
});

describe("buildSalesOrderPricingLinePersistInput", () => {
  it("embeds pricing_snapshot and applied_rule_ids", () => {
    const pl = "22222222-2222-4222-8222-222222222222";
    const pid = "cccccccc-cccc-4ccc-8ccc-cccccccc0001";
    const rules = [globalFixedRule(pl, "r2", "25.50", pid, "dddddddd-dddd-4ddd-8ddd-dddddddd0001")];
    const { lineResults } = evaluateSalesOrderPricingLinesPure([
      {
        lineId: "L1",
        uomId: 1,
        date: "2026-01-15",
        context: {
          tenantId: 1,
          pricelistId: pl,
          productId: pid,
          productTemplateId: "dddddddd-dddd-4ddd-8ddd-dddddddd0001",
          categoryIds: [],
          quantity: "1",
          asOf,
          currencyId: 42,
          rules,
          productFacts: { listPrice: "100.00", standardPrice: "1.00" },
        },
      },
    ]);
    const hit = lineResults[0];
    expect(hit?.ok).toBe(true);
    if (!hit?.ok) return;
    const row = buildSalesOrderPricingLinePersistInput({
      lineId: "L1",
      resolution: hit.resolution,
      pricelistId: pl,
      currencyId: 42,
      productId: pid,
      quantity: "1",
      uomId: 1,
      date: "2026-01-15",
    });
    expect(row.basePrice).toBe(hit.resolution.basePrice);
    expect(row.finalPrice).toBe(hit.resolution.finalUnitPrice);
    expect(row.appliedRuleIds).toContain("r2");
    expect((row.inputSnapshot as { pricing_snapshot?: unknown }).pricing_snapshot).toBeDefined();
  });
});

describe("buildSalesOrderPricingLinePersistDrafts", () => {
  it("builds outputs for successes only when not requiring all", () => {
    const pl = "33333333-3333-4333-8333-333333333333";
    const good = "eeeeeeee-eeee-4eee-8eee-eeeeeeee0001";
    const bad = "99999999-9999-4999-8999-999999999999";
    const tmpl = "ffffffff-ffff-4fff-8fff-ffffffff0001";
    const rules: PricelistItemRuleInput[] = [
      globalFixedRule(pl, "rg", "5.00", good, tmpl),
      {
        id: "broken",
        pricelistId: pl,
        appliedOn: "product_variant",
        productTmplId: null,
        productId: bad,
        categId: null,
        minQuantity: "1",
        dateStart: null,
        dateEnd: null,
        effectiveFrom: new Date("2020-01-01T00:00:00.000Z"),
        effectiveTo: null,
        supersededBy: null,
        computePrice: "fixed",
        fixedPrice: null,
        percentPrice: null,
        base: "list_price",
        basePricelistId: null,
        priceSurcharge: "0",
        priceDiscount: "0",
        priceRound: null,
        sequence: 5,
        isActive: true,
      },
    ];
    const { lineOutputs, lineResults } = buildSalesOrderPricingLinePersistDrafts(
      [
        {
          lineId: "ok",
          uomId: 1,
          date: "2026-01-15",
          context: {
            tenantId: 1,
            pricelistId: pl,
            productId: good,
            productTemplateId: tmpl,
            categoryIds: [],
            quantity: "1",
            asOf,
            currencyId: 1,
            rules,
            productFacts: { listPrice: "10.00", standardPrice: "1" },
          },
        },
        {
          lineId: "bad",
          uomId: 1,
          date: "2026-01-15",
          context: {
            tenantId: 1,
            pricelistId: pl,
            productId: bad,
            productTemplateId: tmpl,
            categoryIds: [],
            quantity: "1",
            asOf,
            currencyId: 1,
            rules,
            productFacts: { listPrice: "10.00", standardPrice: "1" },
          },
        },
      ],
      { requireAllSucceeded: false }
    );
    expect(lineResults.filter((r) => r.ok)).toHaveLength(1);
    expect(lineOutputs).toHaveLength(1);
    expect(lineOutputs[0]?.lineId).toBe("ok");
  });
});
