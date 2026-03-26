/**
 * Reference Data Logic Tests
 * ===========================
 *
 * Unit tests for sequence generation, currency rates, and UoM conversion
 */

import { describe, it, expect } from "vitest";

import {
  nextVal,
  getRate,
  convert,
  formatSequenceWithDate,
  shouldResetSequence,
  CurrencyRateNotFoundError,
  UomCategoryMismatchError,
  type SequenceContext,
  type CurrencyContext,
  type UomContext,
} from "./reference-data.js";

// ============================================================================
// Sequence Generation Tests
// ============================================================================

describe("nextVal", () => {
  it("generates sequence with prefix, padding, and suffix", () => {
    const context: SequenceContext = {
      sequence: {
        sequenceId: 1,
        prefix: "SO",
        suffix: "/2026",
        padding: 5,
        step: 1,
        nextNumber: 42,
        resetPeriod: "never",
      },
    };

    const result = nextVal(context);

    expect(result.sequence).toBe("SO00042/2026");
    expect(result.nextNumber).toBe(43);
  });

  it("generates sequence without prefix or suffix", () => {
    const context: SequenceContext = {
      sequence: {
        sequenceId: 1,
        prefix: null,
        suffix: null,
        padding: 3,
        step: 1,
        nextNumber: 7,
        resetPeriod: "never",
      },
    };

    const result = nextVal(context);

    expect(result.sequence).toBe("007");
    expect(result.nextNumber).toBe(8);
  });

  it("increments by custom step", () => {
    const context: SequenceContext = {
      sequence: {
        sequenceId: 1,
        prefix: "INV",
        suffix: null,
        padding: 4,
        step: 10,
        nextNumber: 100,
        resetPeriod: "never",
      },
    };

    const result = nextVal(context);

    expect(result.sequence).toBe("INV0100");
    expect(result.nextNumber).toBe(110);
  });

  it("handles large numbers exceeding padding", () => {
    const context: SequenceContext = {
      sequence: {
        sequenceId: 1,
        prefix: "PO",
        suffix: null,
        padding: 3,
        step: 1,
        nextNumber: 12345,
        resetPeriod: "never",
      },
    };

    const result = nextVal(context);

    expect(result.sequence).toBe("PO12345");
    expect(result.nextNumber).toBe(12346);
  });
});

describe("formatSequenceWithDate", () => {
  it("formats yearly sequence with year suffix", () => {
    const date = new Date("2026-03-26");
    const result = formatSequenceWithDate("SO00042", "yearly", date);
    expect(result).toBe("SO00042/2026");
  });

  it("formats monthly sequence with year-month suffix", () => {
    const date = new Date("2026-03-26");
    const result = formatSequenceWithDate("SO00042", "monthly", date);
    expect(result).toBe("SO00042/2026-03");
  });

  it("returns sequence unchanged for never reset period", () => {
    const date = new Date("2026-03-26");
    const result = formatSequenceWithDate("SO00042", "never", date);
    expect(result).toBe("SO00042");
  });
});

describe("shouldResetSequence", () => {
  it("returns true when year changes for yearly reset", () => {
    const lastDate = new Date("2025-12-31");
    const currentDate = new Date("2026-01-01");
    expect(shouldResetSequence(lastDate, "yearly", currentDate)).toBe(true);
  });

  it("returns false when same year for yearly reset", () => {
    const lastDate = new Date("2026-01-15");
    const currentDate = new Date("2026-03-26");
    expect(shouldResetSequence(lastDate, "yearly", currentDate)).toBe(false);
  });

  it("returns true when month changes for monthly reset", () => {
    const lastDate = new Date("2026-02-28");
    const currentDate = new Date("2026-03-01");
    expect(shouldResetSequence(lastDate, "monthly", currentDate)).toBe(true);
  });

  it("returns false when same month for monthly reset", () => {
    const lastDate = new Date("2026-03-01");
    const currentDate = new Date("2026-03-26");
    expect(shouldResetSequence(lastDate, "monthly", currentDate)).toBe(false);
  });

  it("returns true when year changes even if same month for monthly reset", () => {
    const lastDate = new Date("2025-03-26");
    const currentDate = new Date("2026-03-26");
    expect(shouldResetSequence(lastDate, "monthly", currentDate)).toBe(true);
  });

  it("always returns false for never reset period", () => {
    const lastDate = new Date("2020-01-01");
    const currentDate = new Date("2026-03-26");
    expect(shouldResetSequence(lastDate, "never", currentDate)).toBe(false);
  });
});

// ============================================================================
// Currency Rate Tests
// ============================================================================

describe("getRate", () => {
  it("returns exact match for date", () => {
    const context: CurrencyContext = {
      currency: { code: "USD", decimalPlaces: 2 },
      rates: [
        { rate: "1.10", effectiveDate: "2026-03-01" },
        { rate: "1.15", effectiveDate: "2026-03-20" },
        { rate: "1.12", effectiveDate: "2026-03-26" },
      ],
    };

    const rate = getRate(context, "2026-03-26");
    expect(rate.toString()).toBe("1.12");
  });

  it("returns most recent rate before date", () => {
    const context: CurrencyContext = {
      currency: { code: "EUR", decimalPlaces: 2 },
      rates: [
        { rate: "1.10", effectiveDate: "2026-03-01" },
        { rate: "1.15", effectiveDate: "2026-03-15" },
        { rate: "1.20", effectiveDate: "2026-03-30" },
      ],
    };

    const rate = getRate(context, "2026-03-26");
    expect(rate.toString()).toBe("1.15");
  });

  it("throws error when no rates exist", () => {
    const context: CurrencyContext = {
      currency: { code: "GBP", decimalPlaces: 2 },
      rates: [],
    };

    expect(() => getRate(context, "2026-03-26")).toThrow(CurrencyRateNotFoundError);
  });

  it("throws error when date is before all rates", () => {
    const context: CurrencyContext = {
      currency: { code: "JPY", decimalPlaces: 0 },
      rates: [
        { rate: "110.50", effectiveDate: "2026-03-20" },
        { rate: "111.00", effectiveDate: "2026-03-25" },
      ],
    };

    expect(() => getRate(context, "2026-03-15")).toThrow(CurrencyRateNotFoundError);
  });

  it("handles rates in unsorted order", () => {
    const context: CurrencyContext = {
      currency: { code: "CAD", decimalPlaces: 2 },
      rates: [
        { rate: "1.35", effectiveDate: "2026-03-25" },
        { rate: "1.30", effectiveDate: "2026-03-01" },
        { rate: "1.33", effectiveDate: "2026-03-15" },
      ],
    };

    const rate = getRate(context, "2026-03-20");
    expect(rate.toString()).toBe("1.33");
  });
});

// ============================================================================
// Unit of Measure Conversion Tests
// ============================================================================

describe("convert", () => {
  it("converts between same category units (kg to tons)", () => {
    const context: UomContext = {
      fromUom: {
        uomId: 1,
        categoryId: 1, // Weight
        factor: "1.0",
        rounding: "0.0001",
      },
      toUom: {
        uomId: 2,
        categoryId: 1, // Weight
        factor: "1000.0",
        rounding: "0.0001",
      },
    };

    const result = convert(context, "5");
    expect(result.toString()).toBe("0.005");
  });

  it("converts small units to reference unit (grams to kg)", () => {
    const context: UomContext = {
      fromUom: {
        uomId: 3,
        categoryId: 1, // Weight
        factor: "0.001",
        rounding: "0.01",
      },
      toUom: {
        uomId: 1,
        categoryId: 1, // Weight
        factor: "1.0",
        rounding: "0.0001",
      },
    };

    const result = convert(context, "5000");
    expect(result.toString()).toBe("5");
  });

  it("returns same quantity when converting to same UoM", () => {
    const context: UomContext = {
      fromUom: {
        uomId: 1,
        categoryId: 1,
        factor: "1.0",
        rounding: "0.0001",
      },
      toUom: {
        uomId: 1,
        categoryId: 1,
        factor: "1.0",
        rounding: "0.0001",
      },
    };

    const result = convert(context, "42.5");
    expect(result.toString()).toBe("42.5");
  });

  it("rounds result to target UoM precision", () => {
    const context: UomContext = {
      fromUom: {
        uomId: 1,
        categoryId: 1,
        factor: "1.0",
        rounding: "0.0001",
      },
      toUom: {
        uomId: 2,
        categoryId: 1,
        factor: "3.0",
        rounding: "0.01", // 2 decimal places
      },
    };

    const result = convert(context, "10");
    expect(result.toString()).toBe("3.33");
  });

  it("throws error when categories do not match", () => {
    const context: UomContext = {
      fromUom: {
        uomId: 1,
        categoryId: 1, // Weight
        factor: "1.0",
        rounding: "0.0001",
      },
      toUom: {
        uomId: 10,
        categoryId: 2, // Volume
        factor: "1.0",
        rounding: "0.0001",
      },
    };

    expect(() => convert(context, "5")).toThrow(UomCategoryMismatchError);
  });

  it("handles conversion with dozen to units (12:1 ratio)", () => {
    const context: UomContext = {
      fromUom: {
        uomId: 20,
        categoryId: 5, // Unit count
        factor: "12.0", // 1 dozen = 12 units
        rounding: "1",
      },
      toUom: {
        uomId: 21,
        categoryId: 5, // Unit count
        factor: "1.0", // 1 unit (reference)
        rounding: "1",
      },
    };

    const result = convert(context, "5"); // 5 dozen
    expect(result.toString()).toBe("60"); // 60 units
  });

  it("handles conversion with units to dozen (1:12 ratio)", () => {
    const context: UomContext = {
      fromUom: {
        uomId: 21,
        categoryId: 5,
        factor: "1.0", // 1 unit (reference)
        rounding: "1",
      },
      toUom: {
        uomId: 20,
        categoryId: 5,
        factor: "12.0", // 1 dozen = 12 units
        rounding: "0.01",
      },
    };

    const result = convert(context, "25"); // 25 units
    expect(result.toString()).toBe("2.08"); // 2.08 dozen
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Reference Data Integration", () => {
  it("sequence + currency rate workflow", () => {
    // Generate invoice sequence
    const seqContext: SequenceContext = {
      sequence: {
        sequenceId: 1,
        prefix: "INV",
        suffix: "",
        padding: 5,
        step: 1,
        nextNumber: 1001,
        resetPeriod: "yearly",
      },
    };

    const { sequence, nextNumber } = nextVal(seqContext);
    const formattedSeq = formatSequenceWithDate(sequence, "yearly", new Date("2026-03-26"));

    expect(formattedSeq).toBe("INV01001/2026");
    expect(nextNumber).toBe(1002);

    // Get exchange rate for invoice currency
    const currContext: CurrencyContext = {
      currency: { code: "EUR", decimalPlaces: 2 },
      rates: [
        { rate: "1.10", effectiveDate: "2026-03-01" },
        { rate: "1.15", effectiveDate: "2026-03-25" },
      ],
    };

    const rate = getRate(currContext, "2026-03-26");
    expect(rate.toString()).toBe("1.15");
  });

  it("UoM conversion for product quantities", () => {
    // Order received in tons, warehouse manages in kg
    const tonToKg: UomContext = {
      fromUom: {
        uomId: 2,
        categoryId: 1,
        factor: "1000.0", // 1 ton = 1000 kg
        rounding: "0.001",
      },
      toUom: {
        uomId: 1,
        categoryId: 1,
        factor: "1.0", // 1 kg (reference)
        rounding: "0.001",
      },
    };

    const orderedQty = convert(tonToKg, "2.5"); // 2.5 tons
    expect(orderedQty.toString()).toBe("2500"); // 2500 kg

    // Shipped in boxes, each box = 25 kg
    const kgToBoxes: UomContext = {
      fromUom: {
        uomId: 1,
        categoryId: 1,
        factor: "1.0", // 1 kg
        rounding: "0.001",
      },
      toUom: {
        uomId: 3,
        categoryId: 1,
        factor: "25.0", // 1 box = 25 kg
        rounding: "1",
      },
    };

    const boxQty = convert(kgToBoxes, orderedQty.toString());
    expect(boxQty.toString()).toBe("100"); // 100 boxes
  });
});
