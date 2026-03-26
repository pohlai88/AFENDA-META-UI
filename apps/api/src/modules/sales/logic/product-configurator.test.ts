import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";

import {
  buildCombinationIndices,
  generateVariantMatrix,
  getVariantPrice,
  validateVariantCombination,
  type AttributeLine,
} from "./product-configurator.js";

// ── Fixtures ───────────────────────────────────────────────────────────────

const SIZE_ATTR_ID = "attr-size-001";
const COLOR_ATTR_ID = "attr-color-002";

const SIZE_S = { id: "val-s-001", name: "S", priceExtra: "0.00" };
const SIZE_M = { id: "val-m-002", name: "M", priceExtra: "0.00" };
const SIZE_L = { id: "val-l-003", name: "L", priceExtra: "2.00" };
const COLOR_RED = { id: "val-red-004", name: "Red", priceExtra: "0.00" };
const COLOR_BLUE = { id: "val-blue-005", name: "Blue", priceExtra: "1.00" };

const sizeAttrLine: AttributeLine = {
  attributeId: SIZE_ATTR_ID,
  sequence: 1,
  values: [SIZE_S, SIZE_M, SIZE_L],
};

const colorAttrLine: AttributeLine = {
  attributeId: COLOR_ATTR_ID,
  sequence: 2,
  values: [COLOR_RED, COLOR_BLUE],
};

// ── generateVariantMatrix ───────────────────────────────────────────────────

describe("generateVariantMatrix", () => {
  it("returns single empty combination for template with no attribute lines", () => {
    const result = generateVariantMatrix([]);
    expect(result).toHaveLength(1);
    expect(result[0].attributeValueIds).toEqual([]);
    expect(result[0].priceExtra.toNumber()).toBe(0);
  });

  it("returns one combination per value for single attribute line", () => {
    const result = generateVariantMatrix([sizeAttrLine]);
    expect(result).toHaveLength(3); // S, M, L
  });

  it("returns Cartesian product for two attribute lines (3×2 = 6)", () => {
    const result = generateVariantMatrix([sizeAttrLine, colorAttrLine]);
    expect(result).toHaveLength(6);
  });

  it("each combination contains one value per attribute line", () => {
    const result = generateVariantMatrix([sizeAttrLine, colorAttrLine]);
    for (const combo of result) {
      expect(combo.attributeValueIds).toHaveLength(2);
    }
  });

  it("sorts attribute lines by sequence before expansion", () => {
    // Pass color (seq=2) before size (seq=1) — result order should still start with size values
    const result = generateVariantMatrix([colorAttrLine, sizeAttrLine]);
    expect(result).toHaveLength(6);
    // First value in each combo should be from the lower-sequence attribute (size)
    const sizeValIds = [SIZE_S.id, SIZE_M.id, SIZE_L.id];
    expect(sizeValIds).toContain(result[0].attributeValueIds[0]);
  });

  it("covers all combinations exactly once (no duplicates)", () => {
    const result = generateVariantMatrix([sizeAttrLine, colorAttrLine]);
    const keys = result.map((c) => c.attributeValueIds.join(","));
    const unique = new Set(keys);
    expect(unique.size).toBe(6);
  });

  it("accumulates price_extra across attribute lines", () => {
    // L (2.00) + Blue (1.00) = 3.00
    const result = generateVariantMatrix([sizeAttrLine, colorAttrLine]);
    const lBlue = result.find(
      (c) => c.attributeValueIds.includes(SIZE_L.id) && c.attributeValueIds.includes(COLOR_BLUE.id)
    );
    expect(lBlue).toBeDefined();
    expect(lBlue!.priceExtra.toNumber()).toBe(3.0);
  });

  it("price_extra is 0 when all values have zero surcharge (S + Red)", () => {
    const result = generateVariantMatrix([sizeAttrLine, colorAttrLine]);
    const sRed = result.find(
      (c) =>
        c.attributeValueIds.includes(SIZE_S.id) && c.attributeValueIds.includes(COLOR_RED.id)
    );
    expect(sRed!.priceExtra.toNumber()).toBe(0);
  });

  it("handles a single attribute line with one value", () => {
    const line: AttributeLine = {
      attributeId: SIZE_ATTR_ID,
      sequence: 1,
      values: [SIZE_S],
    };
    const result = generateVariantMatrix([line]);
    expect(result).toHaveLength(1);
    expect(result[0].attributeValueIds).toEqual([SIZE_S.id]);
  });

  it("returns Cartesian product for three attribute lines (2×2×2 = 8)", () => {
    const materialAttrLine: AttributeLine = {
      attributeId: "attr-material-003",
      sequence: 3,
      values: [
        { id: "val-cotton", name: "Cotton", priceExtra: "0.00" },
        { id: "val-polyester", name: "Polyester", priceExtra: "0.50" },
      ],
    };
    const twoColorLine: AttributeLine = {
      attributeId: COLOR_ATTR_ID,
      sequence: 2,
      values: [COLOR_RED, COLOR_BLUE],
    };
    const twoSizeLine: AttributeLine = {
      attributeId: SIZE_ATTR_ID,
      sequence: 1,
      values: [SIZE_S, SIZE_M],
    };
    const result = generateVariantMatrix([twoSizeLine, twoColorLine, materialAttrLine]);
    expect(result).toHaveLength(8);
  });
});

// ── getVariantPrice ────────────────────────────────────────────────────────

describe("getVariantPrice", () => {
  it("returns base price when no extras", () => {
    const price = getVariantPrice("29.99", []);
    expect(price.toNumber()).toBe(29.99);
  });

  it("adds a single price_extra to base price", () => {
    const price = getVariantPrice("29.99", ["2.00"]);
    expect(price.toNumber()).toBe(31.99);
  });

  it("adds multiple price_extras to base price", () => {
    // 29.99 + 2.00 (L) + 1.00 (Blue) = 32.99
    const price = getVariantPrice("29.99", ["2.00", "1.00"]);
    expect(price.toNumber()).toBe(32.99);
  });

  it("accepts Decimal inputs", () => {
    const price = getVariantPrice(new Decimal("1299.99"), [new Decimal("0.00")]);
    expect(price.toNumber()).toBe(1299.99);
  });

  it("maintains exact decimal precision without float drift", () => {
    // Known floating-point issue: 0.1 + 0.2 = 0.30000000000000004 in IEEE 754
    const price = getVariantPrice("0.10", ["0.20"]);
    expect(price.toFixed(2)).toBe("0.30");
  });

  it("handles zero base price with extras", () => {
    const price = getVariantPrice("0.00", ["5.00", "3.50"]);
    expect(price.toNumber()).toBe(8.5);
  });

  it("handles large financial amounts precisely", () => {
    const price = getVariantPrice("99999.99", ["0.01"]);
    expect(price.toFixed(2)).toBe("100000.00");
  });
});

// ── buildCombinationIndices ────────────────────────────────────────────────

describe("buildCombinationIndices", () => {
  it("returns empty string for empty array", () => {
    expect(buildCombinationIndices([])).toBe("");
  });

  it("returns single ID for single-value array", () => {
    expect(buildCombinationIndices(["abc"]).length).toBeGreaterThan(0);
  });

  it("sorts IDs alphabetically for deterministic output", () => {
    const a = buildCombinationIndices(["val-z", "val-a", "val-m"]);
    const b = buildCombinationIndices(["val-m", "val-z", "val-a"]);
    expect(a).toBe(b);
    expect(a).toBe("val-a,val-m,val-z");
  });

  it("produces different strings for different combinations", () => {
    const combo1 = buildCombinationIndices([SIZE_S.id, COLOR_RED.id]);
    const combo2 = buildCombinationIndices([SIZE_S.id, COLOR_BLUE.id]);
    expect(combo1).not.toBe(combo2);
  });
});

// ── validateVariantCombination ─────────────────────────────────────────────

describe("validateVariantCombination", () => {
  const lines = [sizeAttrLine, colorAttrLine];

  it("accepts a valid complete combination (S + Red)", () => {
    const result = validateVariantCombination(lines, [SIZE_S.id, COLOR_RED.id]);
    expect(result.valid).toBe(true);
  });

  it("accepts a valid complete combination (L + Blue)", () => {
    const result = validateVariantCombination(lines, [SIZE_L.id, COLOR_BLUE.id]);
    expect(result.valid).toBe(true);
  });

  it("rejects a value that does not belong to any attribute line", () => {
    const result = validateVariantCombination(lines, [SIZE_S.id, "unknown-value-id"]);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toMatch(/does not belong/);
    }
  });

  it("rejects when a value from an extra unrecognized attribute is included", () => {
    const result = validateVariantCombination(lines, [
      SIZE_S.id,
      COLOR_RED.id,
      "unknown-value-id",
    ]);
    expect(result.valid).toBe(false);
  });

  it("rejects duplicate attribute (two sizes selected)", () => {
    const result = validateVariantCombination(lines, [SIZE_S.id, SIZE_M.id, COLOR_RED.id]);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toMatch(/[Dd]uplicate/);
    }
  });

  it("rejects missing attribute (only size selected, no color)", () => {
    const result = validateVariantCombination(lines, [SIZE_M.id]);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toMatch(/[Mm]issing/);
    }
  });

  it("rejects empty selection when attribute lines exist", () => {
    const result = validateVariantCombination(lines, []);
    expect(result.valid).toBe(false);
  });

  it("accepts empty selection when no attribute lines (non-configurable product)", () => {
    const result = validateVariantCombination([], []);
    expect(result.valid).toBe(true);
  });

  it("rejects when extra values provided for non-configurable product", () => {
    const result = validateVariantCombination([], [SIZE_S.id]);
    expect(result.valid).toBe(false);
  });

  it("handles single-attribute template correctly", () => {
    const result = validateVariantCombination([sizeAttrLine], [SIZE_L.id]);
    expect(result.valid).toBe(true);
  });

  it("rejects incomplete combination for single-attribute template when value list is empty", () => {
    const result = validateVariantCombination([sizeAttrLine], []);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toMatch(/[Mm]issing/);
    }
  });
});

// ── Integration: matrix + price ────────────────────────────────────────────

describe("generateVariantMatrix + getVariantPrice integration", () => {
  it("computes correct price for all 6 T-Shirt variants", () => {
    const matrix = generateVariantMatrix([sizeAttrLine, colorAttrLine]);
    const BASE_PRICE = "29.99";
    const prices = matrix.map((combo) =>
      getVariantPrice(BASE_PRICE, [combo.priceExtra.toString()])
    );

    // S+Red: 29.99+0 = 29.99, S+Blue: 29.99+1 = 30.99
    // M+Red: 29.99+0 = 29.99, M+Blue: 29.99+1 = 30.99
    // L+Red: 29.99+2 = 31.99, L+Blue: 29.99+3 = 32.99
    const expectedPrices = [29.99, 30.99, 29.99, 30.99, 31.99, 32.99];
    const actualSorted = prices.map((p) => p.toNumber()).sort((a, b) => a - b);
    const expectedSorted = expectedPrices.sort((a, b) => a - b);
    expect(actualSorted).toEqual(expectedSorted);
  });

  it("all generated combinations pass validateVariantCombination", () => {
    const matrix = generateVariantMatrix([sizeAttrLine, colorAttrLine]);
    for (const combo of matrix) {
      const result = validateVariantCombination(
        [sizeAttrLine, colorAttrLine],
        combo.attributeValueIds
      );
      expect(result.valid).toBe(true);
    }
  });
});
