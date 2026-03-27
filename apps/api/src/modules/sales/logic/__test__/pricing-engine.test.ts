import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";

import {
  applyPriceFormula,
  filterItemsForProduct,
  getBasePrice,
  resolvePrice,
  type Pricelist,
  type PricelistItem,
  type PricedProduct,
} from "../pricing-engine.js";

// ── Test fixtures ──────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<PricedProduct> = {}): PricedProduct {
  return {
    id: "prod-1",
    productTmplId: "tmpl-1",
    categoryId: "cat-1",
    listPrice: "100.00",
    standardPrice: "60.00",
    ...overrides,
  };
}

function makeItem(overrides: Partial<PricelistItem> = {}): PricelistItem {
  return {
    id: "item-1",
    appliedOn: "global",
    productTmplId: null,
    productId: null,
    categId: null,
    minQuantity: "1",
    dateStart: null,
    dateEnd: null,
    computePrice: "formula",
    fixedPrice: null,
    percentPrice: null,
    base: "list_price",
    basePricelistId: null,
    priceSurcharge: "0",
    priceDiscount: "0",
    priceRound: null,
    priceMinMargin: "0",
    priceMaxMargin: "0",
    sequence: 10,
    isActive: true,
    ...overrides,
  };
}

function makePricelist(items: PricelistItem[], overrides: Partial<Pricelist> = {}): Pricelist {
  return {
    id: "pl-1",
    discountPolicy: "with_discount",
    isActive: true,
    items,
    ...overrides,
  };
}

// ── resolvePrice – no rule ─────────────────────────────────────────────────

describe("resolvePrice – no matching rule", () => {
  it("returns list_price when pricelist has no items", () => {
    const result = resolvePrice({
      pricelist: makePricelist([]),
      product: makeProduct(),
    });
    expect(result.price.toFixed(2)).toBe("100.00");
    expect(result.matchedItem).toBeNull();
    expect(result.appliedOn).toBe("no_rule");
  });

  it("returns list_price when all items are inactive", () => {
    const result = resolvePrice({
      pricelist: makePricelist([makeItem({ isActive: false })]),
      product: makeProduct(),
    });
    expect(result.price.toFixed(2)).toBe("100.00");
    expect(result.appliedOn).toBe("no_rule");
  });
});

// ── resolvePrice – global formula ─────────────────────────────────────────

describe("resolvePrice – global formula rules", () => {
  it("returns list_price unchanged when formula has zero discount and surcharge", () => {
    const result = resolvePrice({
      pricelist: makePricelist([makeItem()]),
      product: makeProduct(),
    });
    expect(result.price.toFixed(2)).toBe("100.00");
    expect(result.appliedOn).toBe("global");
  });

  it("applies a 10% discount via priceDiscount", () => {
    const result = resolvePrice({
      pricelist: makePricelist([makeItem({ priceDiscount: "10" })]),
      product: makeProduct(),
    });
    expect(result.price.toFixed(2)).toBe("90.00");
  });

  it("applies a surcharge via priceSurcharge", () => {
    const result = resolvePrice({
      pricelist: makePricelist([makeItem({ priceSurcharge: "15" })]),
      product: makeProduct(),
    });
    expect(result.price.toFixed(2)).toBe("115.00");
  });

  it("applies combined discount and surcharge", () => {
    // 100 * (1 - 20/100) + 5 = 80 + 5 = 85
    const result = resolvePrice({
      pricelist: makePricelist([makeItem({ priceDiscount: "20", priceSurcharge: "5" })]),
      product: makeProduct(),
    });
    expect(result.price.toFixed(2)).toBe("85.00");
  });
});

// ── resolvePrice – fixed price ────────────────────────────────────────────

describe("resolvePrice – fixed price rules", () => {
  it("returns the fixed price regardless of list price", () => {
    const result = resolvePrice({
      pricelist: makePricelist([makeItem({ computePrice: "fixed", fixedPrice: "79.99" })]),
      product: makeProduct(),
    });
    expect(result.price.toFixed(2)).toBe("79.99");
  });

  it("returns zero when fixedPrice is 0", () => {
    const result = resolvePrice({
      pricelist: makePricelist([makeItem({ computePrice: "fixed", fixedPrice: "0" })]),
      product: makeProduct(),
    });
    expect(result.price.toFixed(2)).toBe("0.00");
  });
});

// ── resolvePrice – percentage rules ───────────────────────────────────────

describe("resolvePrice – percentage rules", () => {
  it("applies a 15% discount (VIP pricelist scenario)", () => {
    // percentPrice = 15 means 15% off → price = 100 * (1 - 0.15) = 85
    const result = resolvePrice({
      pricelist: makePricelist([
        makeItem({ computePrice: "percentage", percentPrice: "15", base: "list_price" }),
      ]),
      product: makeProduct(),
    });
    expect(result.price.toFixed(2)).toBe("85.00");
  });

  it("handling 0% discount returns full base price", () => {
    const result = resolvePrice({
      pricelist: makePricelist([
        makeItem({ computePrice: "percentage", percentPrice: "0", base: "list_price" }),
      ]),
      product: makeProduct(),
    });
    expect(result.price.toFixed(2)).toBe("100.00");
  });

  it("handles 100% discount → price is zero (no negative)", () => {
    const result = resolvePrice({
      pricelist: makePricelist([
        makeItem({ computePrice: "percentage", percentPrice: "100", base: "list_price" }),
      ]),
      product: makeProduct(),
    });
    expect(result.price.toFixed(2)).toBe("0.00");
  });
});

// ── resolvePrice – standard_price base ───────────────────────────────────

describe("resolvePrice – standard_price base", () => {
  it("uses standardPrice as base when base = standard_price", () => {
    // standard_price is 60, no discount → price = 60
    const result = resolvePrice({
      pricelist: makePricelist([makeItem({ base: "standard_price" })]),
      product: makeProduct({ standardPrice: "60.00" }),
    });
    expect(result.price.toFixed(2)).toBe("60.00");
  });

  it("falls back to listPrice when standardPrice is null", () => {
    const result = resolvePrice({
      pricelist: makePricelist([makeItem({ base: "standard_price" })]),
      product: makeProduct({ standardPrice: null }),
    });
    expect(result.price.toFixed(2)).toBe("100.00");
  });
});

// ── resolvePrice – specificity / priority ─────────────────────────────────

describe("resolvePrice – specificity priority", () => {
  const globalItem = makeItem({
    id: "global-item",
    appliedOn: "global",
    computePrice: "fixed",
    fixedPrice: "100.00",
    sequence: 10,
  });
  const variantItem = makeItem({
    id: "variant-item",
    appliedOn: "product_variant",
    productId: "prod-1",
    computePrice: "fixed",
    fixedPrice: "75.00",
    sequence: 20,
  });
  const templateItem = makeItem({
    id: "template-item",
    appliedOn: "product_template",
    productTmplId: "tmpl-1",
    computePrice: "fixed",
    fixedPrice: "85.00",
    sequence: 20,
  });
  const categoryItem = makeItem({
    id: "category-item",
    appliedOn: "product_category",
    categId: "cat-1",
    computePrice: "fixed",
    fixedPrice: "90.00",
    sequence: 20,
  });

  it("variant rule beats global rule", () => {
    const result = resolvePrice({
      pricelist: makePricelist([globalItem, variantItem]),
      product: makeProduct(),
    });
    expect(result.price.toFixed(2)).toBe("75.00");
    expect(result.appliedOn).toBe("product_variant");
  });

  it("template rule beats category rule", () => {
    const result = resolvePrice({
      pricelist: makePricelist([categoryItem, templateItem]),
      product: makeProduct(),
    });
    expect(result.price.toFixed(2)).toBe("85.00");
    expect(result.appliedOn).toBe("product_template");
  });

  it("category rule beats global rule", () => {
    const result = resolvePrice({
      pricelist: makePricelist([globalItem, categoryItem]),
      product: makeProduct(),
    });
    expect(result.price.toFixed(2)).toBe("90.00");
    expect(result.appliedOn).toBe("product_category");
  });

  it("variant rule beats all other tiers", () => {
    const result = resolvePrice({
      pricelist: makePricelist([globalItem, categoryItem, templateItem, variantItem]),
      product: makeProduct(),
    });
    expect(result.price.toFixed(2)).toBe("75.00");
    expect(result.appliedOn).toBe("product_variant");
  });

  it("variant item NOT matched when productId differs", () => {
    const result = resolvePrice({
      pricelist: makePricelist([globalItem, variantItem]),
      product: makeProduct({ id: "prod-other" }),
    });
    expect(result.price.toFixed(2)).toBe("100.00");
    expect(result.appliedOn).toBe("global");
  });
});

// ── resolvePrice – sequence tiebreaking ───────────────────────────────────

describe("resolvePrice – sequence tiebreaking within same tier", () => {
  it("lower sequence wins when two global rules match", () => {
    const item10 = makeItem({ id: "i1", computePrice: "fixed", fixedPrice: "50.00", sequence: 10 });
    const item20 = makeItem({ id: "i2", computePrice: "fixed", fixedPrice: "80.00", sequence: 20 });
    const result = resolvePrice({
      pricelist: makePricelist([item20, item10]),
      product: makeProduct(),
    });
    expect(result.price.toFixed(2)).toBe("50.00");
  });
});

// ── resolvePrice – date range filtering ───────────────────────────────────

describe("resolvePrice – date range filtering", () => {
  const jan1 = new Date("2026-01-01");
  const feb1 = new Date("2026-02-01");
  const mar1 = new Date("2026-03-01");

  it("matches when date is within range", () => {
    const item = makeItem({
      computePrice: "fixed",
      fixedPrice: "55.00",
      dateStart: jan1,
      dateEnd: mar1,
    });
    const result = resolvePrice({
      pricelist: makePricelist([item]),
      product: makeProduct(),
      priceDate: feb1,
    });
    expect(result.price.toFixed(2)).toBe("55.00");
  });

  it("no match when date is before dateStart", () => {
    const item = makeItem({
      computePrice: "fixed",
      fixedPrice: "55.00",
      dateStart: feb1,
      dateEnd: mar1,
    });
    const result = resolvePrice({
      pricelist: makePricelist([item]),
      product: makeProduct(),
      priceDate: jan1,
    });
    expect(result.appliedOn).toBe("no_rule");
    expect(result.price.toFixed(2)).toBe("100.00");
  });

  it("no match when date is after dateEnd", () => {
    const item = makeItem({
      computePrice: "fixed",
      fixedPrice: "55.00",
      dateStart: jan1,
      dateEnd: feb1,
    });
    const result = resolvePrice({
      pricelist: makePricelist([item]),
      product: makeProduct(),
      priceDate: mar1,
    });
    expect(result.appliedOn).toBe("no_rule");
  });

  it("matches when dateStart is null (open start)", () => {
    const item = makeItem({ computePrice: "fixed", fixedPrice: "55.00", dateEnd: mar1 });
    const result = resolvePrice({
      pricelist: makePricelist([item]),
      product: makeProduct(),
      priceDate: jan1,
    });
    expect(result.price.toFixed(2)).toBe("55.00");
  });
});

// ── resolvePrice – minimum quantity ───────────────────────────────────────

describe("resolvePrice – minimum quantity filtering", () => {
  it("matches when quantity equals minQuantity", () => {
    const item = makeItem({ computePrice: "fixed", fixedPrice: "70.00", minQuantity: "10" });
    const result = resolvePrice({
      pricelist: makePricelist([item]),
      product: makeProduct(),
      quantity: "10",
    });
    expect(result.price.toFixed(2)).toBe("70.00");
  });

  it("no match when quantity is below minQuantity", () => {
    const item = makeItem({ computePrice: "fixed", fixedPrice: "70.00", minQuantity: "10" });
    const result = resolvePrice({
      pricelist: makePricelist([item]),
      product: makeProduct(),
      quantity: "5",
    });
    expect(result.appliedOn).toBe("no_rule");
  });

  it("applies bulk pricing tier: global 1+ at $100, bulk 10+ at $80", () => {
    const regular = makeItem({
      id: "r",
      computePrice: "fixed",
      fixedPrice: "100.00",
      minQuantity: "1",
      sequence: 20,
    });
    const bulk = makeItem({
      id: "b",
      computePrice: "fixed",
      fixedPrice: "80.00",
      minQuantity: "10",
      sequence: 10,
    });
    const result = resolvePrice({
      pricelist: makePricelist([regular, bulk]),
      product: makeProduct(),
      quantity: "15",
    });
    // Both match at qty=15; bulk has lower sequence → wins
    expect(result.price.toFixed(2)).toBe("80.00");
  });
});

// ── resolvePrice – pricelist chaining ─────────────────────────────────────

describe("resolvePrice – pricelist chaining", () => {
  it("resolves price from a chained base pricelist", () => {
    const basePricelist: Pricelist = makePricelist(
      [makeItem({ computePrice: "fixed", fixedPrice: "80.00" })],
      { id: "base-pl" }
    );

    const chainedItem = makeItem({
      computePrice: "formula",
      base: "pricelist",
      basePricelistId: "base-pl",
      priceDiscount: "10", // 10% off the base pricelist price
      priceSurcharge: "0",
    });

    const result = resolvePrice({
      pricelist: makePricelist([chainedItem]),
      product: makeProduct(),
      resolveBasePricelist: (id) => (id === "base-pl" ? basePricelist : null),
    });
    // base = 80, discount 10% → 72
    expect(result.price.toFixed(2)).toBe("72.00");
  });

  it("falls back to list_price when base pricelist not found", () => {
    const item = makeItem({
      computePrice: "formula",
      base: "pricelist",
      basePricelistId: "missing-pl",
    });
    const result = resolvePrice({
      pricelist: makePricelist([item]),
      product: makeProduct(),
      resolveBasePricelist: () => null,
    });
    // Falls back to list_price = 100, formula discount = 0 → 100
    expect(result.price.toFixed(2)).toBe("100.00");
  });

  it("falls back to list_price when basePricelistId is null", () => {
    const item = makeItem({ computePrice: "formula", base: "pricelist", basePricelistId: null });
    const result = resolvePrice({
      pricelist: makePricelist([item]),
      product: makeProduct(),
    });
    expect(result.price.toFixed(2)).toBe("100.00");
  });
});

// ── resolvePrice – rounding ───────────────────────────────────────────────

describe("resolvePrice – rounding", () => {
  it("rounds price up to nearest 0.05", () => {
    // 99.98 / 0.05 = 1999.6 → ROUND_HALF_UP → 2000 → 2000 × 0.05 = 100.00
    const result = resolvePrice({
      pricelist: makePricelist([makeItem({ priceRound: "0.05" })]),
      product: makeProduct({ listPrice: "99.98" }),
    });
    expect(result.price.toFixed(2)).toBe("100.00");
  });

  it("rounds down to nearest 0.10", () => {
    // list=99.94, round=0.10 → 99.90
    const result = resolvePrice({
      pricelist: makePricelist([makeItem({ priceRound: "0.10" })]),
      product: makeProduct({ listPrice: "99.94" }),
    });
    expect(result.price.toFixed(2)).toBe("99.90");
  });
});

// ── resolvePrice – margin clamping ────────────────────────────────────────

describe("resolvePrice – margin clamping", () => {
  it("clamps price up to cost + minMargin when price would be too low", () => {
    // cost=60, minMargin=20 → floor=80; formula would give 100*0.1=10 → clamped to 80
    const result = resolvePrice({
      pricelist: makePricelist([makeItem({ priceDiscount: "90", priceMinMargin: "20" })]),
      product: makeProduct({ listPrice: "100.00", standardPrice: "60.00" }),
    });
    expect(result.price.toFixed(2)).toBe("80.00");
  });

  it("clamps price down to cost + maxMargin when price would be too high", () => {
    // cost=60, maxMargin=50 → ceiling=110; formula gives 100*1.2=120 → clamped to 110
    const result = resolvePrice({
      pricelist: makePricelist([makeItem({ priceSurcharge: "20", priceMaxMargin: "50" })]),
      product: makeProduct({ listPrice: "100.00", standardPrice: "60.00" }),
    });
    expect(result.price.toFixed(2)).toBe("110.00");
  });

  it("does not clamp when both margins are 0 (disabled)", () => {
    const result = resolvePrice({
      pricelist: makePricelist([makeItem({ priceMinMargin: "0", priceMaxMargin: "0" })]),
      product: makeProduct(),
    });
    expect(result.price.toFixed(2)).toBe("100.00");
  });
});

// ── filterItemsForProduct ─────────────────────────────────────────────────

describe("filterItemsForProduct", () => {
  it("returns empty array when no items match", () => {
    const items = filterItemsForProduct([], makeProduct(), 1, null);
    expect(items).toHaveLength(0);
  });

  it("excludes inactive items", () => {
    const items = filterItemsForProduct([makeItem({ isActive: false })], makeProduct(), 1, null);
    expect(items).toHaveLength(0);
  });

  it("sorts by specificity descending then sequence ascending", () => {
    const global1 = makeItem({ id: "g", appliedOn: "global", sequence: 10 });
    const cat1 = makeItem({
      id: "c",
      appliedOn: "product_category",
      categId: "cat-1",
      sequence: 5,
    });
    const variant1 = makeItem({
      id: "v",
      appliedOn: "product_variant",
      productId: "prod-1",
      sequence: 20,
    });

    const result = filterItemsForProduct([global1, variant1, cat1], makeProduct(), 1, null);
    // variant(4) > category(2) > global(1)
    expect(result[0]!.id).toBe("v");
    expect(result[1]!.id).toBe("c");
    expect(result[2]!.id).toBe("g");
  });
});

// ── applyPriceFormula ─────────────────────────────────────────────────────

describe("applyPriceFormula", () => {
  it("fixed: ignores base price and returns fixedPrice", () => {
    const item = makeItem({ computePrice: "fixed", fixedPrice: "49.99" });
    const price = applyPriceFormula(item, new Decimal("100"), makeProduct());
    expect(price.toFixed(2)).toBe("49.99");
  });

  it("percentage: 25% off base price 200 = 150", () => {
    const item = makeItem({ computePrice: "percentage", percentPrice: "25" });
    const price = applyPriceFormula(item, new Decimal("200"), makeProduct());
    expect(price.toFixed(2)).toBe("150.00");
  });

  it("formula: 10% discount + 5 surcharge on base 100 = 95", () => {
    const item = makeItem({ priceDiscount: "10", priceSurcharge: "5" });
    const price = applyPriceFormula(item, new Decimal("100"), makeProduct());
    expect(price.toFixed(2)).toBe("95.00");
  });

  it("price floors at 0, never goes negative", () => {
    const item = makeItem({ computePrice: "percentage", percentPrice: "150" });
    const price = applyPriceFormula(item, new Decimal("100"), makeProduct());
    expect(price.toFixed(2)).toBe("0.00");
  });
});

// ── getBasePrice ──────────────────────────────────────────────────────────

describe("getBasePrice", () => {
  it("returns listPrice for list_price base", () => {
    const item = makeItem({ base: "list_price" });
    const price = getBasePrice(item, makeProduct(), () => null, 0);
    expect(price.toFixed(2)).toBe("100.00");
  });

  it("returns standardPrice for standard_price base", () => {
    const item = makeItem({ base: "standard_price" });
    const price = getBasePrice(item, makeProduct({ standardPrice: "60.00" }), () => null, 0);
    expect(price.toFixed(2)).toBe("60.00");
  });

  it("returns listPrice at max depth (depth > 5)", () => {
    const item = makeItem({ base: "pricelist", basePricelistId: "some-pl" });
    const price = getBasePrice(item, makeProduct(), () => null, 6);
    expect(price.toFixed(2)).toBe("100.00");
  });
});
