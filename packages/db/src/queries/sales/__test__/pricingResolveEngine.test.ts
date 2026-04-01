import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";

import {
  applyLineDiscountsSequential,
  applyRoundingPolicy,
  buildPricingSnapshot,
  DEFAULT_MAX_PRICELIST_DEPTH,
  pickWinningRule,
  resolveOrderPricing,
  resolvePrice,
  selectApplicableRules,
  type PricelistItemRuleInput,
  type ResolvePriceContext,
} from "../pricingResolveEngine.js";

const asOf = new Date("2026-01-15T12:00:00.000Z");

function baseCtx(overrides: Partial<ResolvePriceContext> & Pick<ResolvePriceContext, "pricelistId" | "rules">): ResolvePriceContext {
  return {
    tenantId: 1,
    productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001",
    productTemplateId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001",
    categoryIds: ["cccccccc-cccc-4ccc-8ccc-cccccccc0001"],
    quantity: "1",
    asOf,
    currencyId: 1,
    productFacts: { listPrice: "100.00", standardPrice: "80.00" },
    discountPolicy: "with_discount",
    ...overrides,
  } as ResolvePriceContext;
}

function rule(p: Partial<PricelistItemRuleInput> & Pick<PricelistItemRuleInput, "id" | "pricelistId" | "appliedOn">): PricelistItemRuleInput {
  return {
    id: p.id,
    pricelistId: p.pricelistId,
    appliedOn: p.appliedOn,
    productTmplId: p.productTmplId ?? null,
    productId: p.productId ?? null,
    categId: p.categId ?? null,
    minQuantity: p.minQuantity ?? "1",
    dateStart: p.dateStart ?? null,
    dateEnd: p.dateEnd ?? null,
    effectiveFrom: p.effectiveFrom ?? new Date("2020-01-01T00:00:00.000Z"),
    effectiveTo: p.effectiveTo ?? null,
    supersededBy: p.supersededBy ?? null,
    computePrice: p.computePrice ?? "percentage",
    fixedPrice: p.fixedPrice ?? null,
    percentPrice: p.percentPrice ?? "100",
    base: p.base ?? "list_price",
    basePricelistId: p.basePricelistId ?? null,
    priceSurcharge: p.priceSurcharge ?? "0",
    priceDiscount: p.priceDiscount ?? "0",
    priceRound: p.priceRound ?? null,
    sequence: p.sequence ?? 10,
    isActive: p.isActive ?? true,
  };
}

describe("pickWinningRule / precedence", () => {
  const pl = "11111111-1111-4111-8111-111111111111";
  it("prefers product_variant over global (lower precedence rank)", () => {
    const rules = [
      rule({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001",
        pricelistId: pl,
        appliedOn: "global",
        sequence: 1,
        percentPrice: "50",
      }),
      rule({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001",
        pricelistId: pl,
        appliedOn: "product_variant",
        productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001",
        sequence: 99,
        percentPrice: "90",
      }),
    ];
    const ctx = baseCtx({ pricelistId: pl, rules });
    expect(pickWinningRule(pl, ctx)?.id).toBe("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001");
  });

  it("tie-breaks by sequence then id", () => {
    const pl = "22222222-2222-4222-8222-222222222222";
    const rules = [
      rule({
        id: "zzzzzzzz-zzzz-4zzz-8zzz-zzzzzzzz0002",
        pricelistId: pl,
        appliedOn: "global",
        sequence: 20,
        percentPrice: "80",
      }),
      rule({
        id: "yyyyyyyy-yyyy-4yyy-8yyy-yyyyyyyy0001",
        pricelistId: pl,
        appliedOn: "global",
        sequence: 10,
        percentPrice: "80",
      }),
    ];
    const ctx = baseCtx({ pricelistId: pl, rules });
    expect(pickWinningRule(pl, ctx)?.id).toBe("yyyyyyyy-yyyy-4yyy-8yyy-yyyyyyyy0001");
  });

  it("excludes superseded rows", () => {
    const pl = "33333333-3333-4333-8333-333333333333";
    const rules = [
      rule({
        id: "old-old-old-old-old-old-old-old-old",
        pricelistId: pl,
        appliedOn: "global",
        supersededBy: "new-new-new-new-new-new-new-new",
        percentPrice: "50",
      }),
      rule({
        id: "new-new-new-new-new-new-new-new",
        pricelistId: pl,
        appliedOn: "global",
        percentPrice: "100",
      }),
    ];
    const ctx = baseCtx({ pricelistId: pl, rules });
    const sorted = selectApplicableRules(pl, ctx);
    expect(sorted).toHaveLength(1);
    expect(sorted[0]!.id).toBe("new-new-new-new-new-new-new-new");
  });
});

describe("resolvePrice", () => {
  it("falls back to list price when no rule matches", () => {
    const pl = "44444444-4444-4444-8444-444444444444";
    const r = resolvePrice(
      baseCtx({
        pricelistId: pl,
        rules: [],
      })
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.finalUnitPrice).toBe("100.00");
    expect(r.winningRuleId).toBeNull();
    expect(r.basePrice).toBe("100.00");
  });

  it("applies percentage on list base", () => {
    const pl = "55555555-5555-4555-8555-555555555555";
    const r = resolvePrice(
      baseCtx({
        pricelistId: pl,
        rules: [
          rule({
            id: "rule-rule-rule-rule-rule-rule-rule-1",
            pricelistId: pl,
            appliedOn: "global",
            computePrice: "percentage",
            percentPrice: "80",
            base: "list_price",
          }),
        ],
      })
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.basePrice).toBe("100.00");
    expect(r.unitPriceAfterRule).toBe("80.00");
    expect(r.finalUnitPrice).toBe("80.00");
  });

  it("detects pricelist cycle", () => {
    const plA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0aaa";
    const plB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0bbb";
    const rules = [
      rule({
        id: "r1",
        pricelistId: plA,
        appliedOn: "global",
        base: "pricelist",
        basePricelistId: plB,
        computePrice: "percentage",
        percentPrice: "100",
      }),
      rule({
        id: "r2",
        pricelistId: plB,
        appliedOn: "global",
        base: "pricelist",
        basePricelistId: plA,
        computePrice: "percentage",
        percentPrice: "100",
      }),
    ];
    const r = resolvePrice(baseCtx({ pricelistId: plA, rules, maxPricelistDepth: 8 }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("PRICELIST_CYCLE");
  });

  it("fails when max depth exceeded", () => {
    const ids = Array.from({ length: 7 }, (_, i) => `00000000-0000-4000-8000-00000000000${i}`);
    const rules: PricelistItemRuleInput[] = [];
    for (let i = 0; i < 6; i++) {
      rules.push(
        rule({
          id: `rule-${i}`,
          pricelistId: ids[i]!,
          appliedOn: "global",
          base: "pricelist",
          basePricelistId: ids[i + 1]!,
          computePrice: "percentage",
          percentPrice: "100",
        })
      );
    }
    rules.push(
      rule({
        id: "rule-terminal",
        pricelistId: ids[6]!,
        appliedOn: "global",
        base: "list_price",
        computePrice: "percentage",
        percentPrice: "100",
      })
    );
    const r = resolvePrice(
      baseCtx({
        pricelistId: ids[0]!,
        rules,
        maxPricelistDepth: DEFAULT_MAX_PRICELIST_DEPTH,
      })
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("PRICELIST_DEPTH_EXCEEDED");
  });

  it("chains base pricelist and merges applied_rule ids", () => {
    const plBase = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0b00";
    const plSale = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0a00";
    const rules = [
      rule({
        id: "inner",
        pricelistId: plBase,
        appliedOn: "global",
        base: "list_price",
        computePrice: "fixed",
        fixedPrice: "200.00",
        percentPrice: null,
      }),
      rule({
        id: "outer",
        pricelistId: plSale,
        appliedOn: "global",
        base: "pricelist",
        basePricelistId: plBase,
        computePrice: "percentage",
        percentPrice: "50",
      }),
    ];
    const r = resolvePrice(baseCtx({ pricelistId: plSale, rules }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.appliedRuleIds).toEqual(["inner", "outer"]);
    expect(r.basePrice).toBe("200.00");
    expect(r.finalUnitPrice).toBe("100.00");
  });
});

describe("discounts and rounding", () => {
  it("applies sequential percent discounts", () => {
    const { price, breakdown } = applyLineDiscountsSequential(
      new Decimal("100"),
      "1",
      [
        { sequence: 1, discountPercent: "10", discountAmount: null },
        { sequence: 2, discountPercent: "10", discountAmount: null },
      ],
      "with_discount",
      []
    );
    expect(price.toFixed(2)).toBe("81.00");
    expect(breakdown).toHaveLength(2);
  });

  it("skips discounts when policy without_discount", () => {
    const { price } = applyLineDiscountsSequential(
      new Decimal("100"),
      "1",
      [{ sequence: 1, discountPercent: "50", discountAmount: null }],
      "without_discount",
      []
    );
    expect(price.toFixed(2)).toBe("100.00");
  });

  it("applyRoundingPolicy uses precision", () => {
    const r = applyRoundingPolicy(new Decimal("10.126"), {
      roundingMethod: "round",
      roundingPrecision: 2,
      roundingUnit: null,
    });
    expect(r.toFixed(2)).toBe("10.13");
  });
});

describe("resolveOrderPricing / buildPricingSnapshot", () => {
  it("resolves multiple lines", () => {
    const pl = "77777777-7777-4777-8777-777777777777";
    const rules = [
      rule({
        id: "g1",
        pricelistId: pl,
        appliedOn: "global",
        computePrice: "fixed",
        fixedPrice: "42.00",
        percentPrice: null,
      }),
    ];
    const m = resolveOrderPricing([
      {
        lineId: "L1",
        context: baseCtx({ pricelistId: pl, rules, productId: "p1", productTemplateId: "t1", categoryIds: [] }),
      },
      {
        lineId: "L2",
        context: baseCtx({ pricelistId: pl, rules, productId: "p2", productTemplateId: "t2", categoryIds: [] }),
      },
    ]);
    expect(m.get("L1")?.ok).toBe(true);
    expect(m.get("L2")?.ok).toBe(true);
  });

  it("buildPricingSnapshot is JSON-serializable", () => {
    const pl = "88888888-8888-4888-8888-888888888888";
    const r = resolvePrice(
      baseCtx({
        pricelistId: pl,
        rules: [
          rule({
            id: "snap",
            pricelistId: pl,
            appliedOn: "global",
            fixedPrice: "15.50",
            computePrice: "fixed",
            percentPrice: null,
          }),
        ],
      })
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const snap = buildPricingSnapshot(r);
    expect(JSON.stringify(snap)).toContain("snap");
    expect(snap.final_unit_price).toBe("15.50");
  });
});
