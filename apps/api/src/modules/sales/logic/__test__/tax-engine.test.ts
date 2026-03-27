/**
 * Tax Engine Tests
 * =================
 * Comprehensive test coverage for tax computation engine.
 *
 * Test Categories:
 * 1. computeLineTaxes - Single line tax calculation
 * 2. computeOrderTaxes - Multi-line aggregation
 * 3. mapTax - Fiscal position tax mapping
 * 4. detectFiscalPosition - Auto-detection logic
 * 5. Tax-included decomposition
 * 6. Invariants and edge cases
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Decimal } from "decimal.js";
import {
  computeLineTaxes,
  computeOrderTaxes,
  mapTax,
  detectFiscalPosition,
  type TaxEngineContext,
  type TaxRate,
  type FiscalPosition,
  type Partner,
  type OrderLine,
} from "../tax-engine.js";

describe("Tax Engine", () => {
  let context: TaxEngineContext;
  let standardTax: TaxRate;
  let vatTax: TaxRate;
  let cityTax: TaxRate;
  let compoundTax: TaxRate;
  let cgstTax: TaxRate;
  let sgstTax: TaxRate;

  beforeEach(() => {
    // Standard 10% sales tax (tax-excluded)
    standardTax = {
      id: "tax-standard",
      name: "Standard Sales Tax 10%",
      typeTaxUse: "sale",
      amountType: "percent",
      amount: "10",
      priceInclude: false,
      sequence: 10,
    };

    // VAT 20% (tax-included)
    vatTax = {
      id: "tax-vat",
      name: "VAT 20%",
      typeTaxUse: "sale",
      amountType: "percent",
      amount: "20",
      priceInclude: true,
      sequence: 10,
    };

    // City tax 5% (tax-excluded)
    cityTax = {
      id: "tax-city",
      name: "City Tax 5%",
      typeTaxUse: "sale",
      amountType: "percent",
      amount: "5",
      priceInclude: false,
      sequence: 20,
    };

    // CGST 9% (Central Goods and Services Tax - India)
    cgstTax = {
      id: "tax-cgst",
      name: "CGST 9%",
      typeTaxUse: "sale",
      amountType: "percent",
      amount: "9",
      priceInclude: false,
      sequence: 10,
    };

    // SGST 9% (State Goods and Services Tax - India)
    sgstTax = {
      id: "tax-sgst",
      name: "SGST 9%",
      typeTaxUse: "sale",
      amountType: "percent",
      amount: "9",
      priceInclude: false,
      sequence: 20,
    };

    // Compound GST 18% (group tax)
    compoundTax = {
      id: "tax-gst",
      name: "GST 18%",
      typeTaxUse: "sale",
      amountType: "group",
      amount: "18",
      priceInclude: false,
      sequence: 10,
      children: [cgstTax, sgstTax],
    };

    context = {
      taxes: new Map([
        [standardTax.id, standardTax],
        [vatTax.id, vatTax],
        [cityTax.id, cityTax],
        [compoundTax.id, compoundTax],
        [cgstTax.id, cgstTax],
        [sgstTax.id, sgstTax],
      ]),
      fiscalPositions: new Map(),
    };
  });

  // ─────────────────────────────────────────────────────────────────────────
  // computeLineTaxes
  // ─────────────────────────────────────────────────────────────────────────

  describe("computeLineTaxes", () => {
    it("computes correctly with no taxes", () => {
      const result = computeLineTaxes(context, "100", "2", "0", []);

      expect(result.base.toFixed(2)).toBe("200.00");
      expect(result.taxLines.length).toBe(0);
      expect(result.total.toFixed(2)).toBe("200.00");
    });

    it("computes single tax-excluded tax (standard 10%)", () => {
      const result = computeLineTaxes(context, "100", "2", "0", [standardTax.id]);

      expect(result.base.toFixed(2)).toBe("200.00");
      expect(result.taxLines.length).toBe(1);
      expect(result.taxLines[0].taxId).toBe("tax-standard");
      expect(result.taxLines[0].amount.toFixed(2)).toBe("20.00");
      expect(result.total.toFixed(2)).toBe("220.00");
    });

    it("computes single tax-included tax (VAT 20%)", () => {
      const result = computeLineTaxes(context, "120", "1", "0", [vatTax.id]);

      // Price includes VAT: 120 = base + 20% tax
      // base = 120 / 1.2 = 100
      // tax = 100 * 0.2 = 20
      expect(result.base.toFixed(2)).toBe("100.00");
      expect(result.taxLines.length).toBe(1);
      expect(result.taxLines[0].taxId).toBe("tax-vat");
      expect(result.taxLines[0].amount.toFixed(2)).toBe("20.00");
      expect(result.total.toFixed(2)).toBe("120.00");
    });

    it("computes multiple tax-excluded taxes (standard 10% + city 5%)", () => {
      const result = computeLineTaxes(context, "100", "1", "0", [standardTax.id, cityTax.id]);

      expect(result.base.toFixed(2)).toBe("100.00");
      expect(result.taxLines.length).toBe(2);

      const standardLine = result.taxLines.find((t) => t.taxId === "tax-standard");
      const cityLine = result.taxLines.find((t) => t.taxId === "tax-city");

      expect(standardLine?.amount.toFixed(2)).toBe("10.00");
      expect(cityLine?.amount.toFixed(2)).toBe("5.00");
      expect(result.total.toFixed(2)).toBe("115.00");
    });

    it("applies discount correctly before tax", () => {
      // $100 unit price, qty 2, 10% discount, 10% tax
      // Subtotal: 100 * 2 * 0.9 = 180
      // Tax: 180 * 0.1 = 18
      // Total: 198
      const result = computeLineTaxes(context, "100", "2", "10", [standardTax.id]);

      expect(result.base.toFixed(2)).toBe("180.00");
      expect(result.taxLines[0].amount.toFixed(2)).toBe("18.00");
      expect(result.total.toFixed(2)).toBe("198.00");
    });

    it("expands compound taxes (GST = CGST + SGST)", () => {
      const result = computeLineTaxes(context, "100", "1", "0", [compoundTax.id]);

      expect(result.base.toFixed(2)).toBe("100.00");
      expect(result.taxLines.length).toBe(2); // Expanded to CGST + SGST

      const cgstLine = result.taxLines.find((t) => t.taxId === "tax-cgst");
      const sgstLine = result.taxLines.find((t) => t.taxId === "tax-sgst");

      expect(cgstLine?.amount.toFixed(2)).toBe("9.00");
      expect(sgstLine?.amount.toFixed(2)).toBe("9.00");
      expect(result.total.toFixed(2)).toBe("118.00");
    });

    it("handles decimal precision correctly", () => {
      // Unit price $33.33, qty 3, 10% tax
      // Subtotal: 33.33 * 3 = 99.99
      // Tax: 99.99 * 0.1 = 9.999 → rounds to 10.00
      const result = computeLineTaxes(context, "33.33", "3", "0", [standardTax.id]);

      expect(result.base.toFixed(2)).toBe("99.99");
      expect(result.taxLines[0].amount.toFixed(2)).toBe("10.00");
      expect(result.total.toFixed(2)).toBe("109.99");
    });

    it("handles both tax-included and tax-excluded taxes", () => {
      // $120 price (includes VAT 20%), qty 1
      // Base after VAT extraction: 100
      // Then apply 10% standard tax on base
      // Total: 100 + 20 (VAT) + 10 (standard) = 130
      const result = computeLineTaxes(context, "120", "1", "0", [vatTax.id, standardTax.id]);

      expect(result.base.toFixed(2)).toBe("100.00");
      expect(result.taxLines.length).toBe(2);

      const vatLine = result.taxLines.find((t) => t.taxId === "tax-vat");
      const standardLine = result.taxLines.find((t) => t.taxId === "tax-standard");

      expect(vatLine?.amount.toFixed(2)).toBe("20.00");
      expect(standardLine?.amount.toFixed(2)).toBe("10.00");
      expect(result.total.toFixed(2)).toBe("130.00");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // computeOrderTaxes
  // ─────────────────────────────────────────────────────────────────────────

  describe("computeOrderTaxes", () => {
    it("aggregates taxes across multiple lines", () => {
      const lines: OrderLine[] = [
        { priceUnit: "100", quantity: "1", discount: "0", taxIds: [standardTax.id] },
        { priceUnit: "200", quantity: "1", discount: "0", taxIds: [standardTax.id] },
        { priceUnit: "50", quantity: "2", discount: "0", taxIds: [standardTax.id] },
      ];

      const result = computeOrderTaxes(context, lines);

      // Line 1: 100 * 1 = 100, tax = 10
      // Line 2: 200 * 1 = 200, tax = 20
      // Line 3: 50 * 2 = 100, tax = 10
      // Subtotal: 400, Tax: 40, Total: 440
      expect(result.subtotal.toFixed(2)).toBe("400.00");
      expect(result.tax.toFixed(2)).toBe("40.00");
      expect(result.total.toFixed(2)).toBe("440.00");
      expect(result.taxLines.length).toBe(1);
      expect(result.taxLines[0].amount.toFixed(2)).toBe("40.00");
    });

    it("aggregates different taxes separately", () => {
      const lines: OrderLine[] = [
        { priceUnit: "100", quantity: "1", discount: "0", taxIds: [standardTax.id] },
        { priceUnit: "100", quantity: "1", discount: "0", taxIds: [cityTax.id] },
      ];

      const result = computeOrderTaxes(context, lines);

      expect(result.subtotal.toFixed(2)).toBe("200.00");
      expect(result.taxLines.length).toBe(2);

      const standardLine = result.taxLines.find((t) => t.taxId === "tax-standard");
      const cityLine = result.taxLines.find((t) => t.taxId === "tax-city");

      expect(standardLine?.amount.toFixed(2)).toBe("10.00");
      expect(cityLine?.amount.toFixed(2)).toBe("5.00");
      expect(result.total.toFixed(2)).toBe("215.00");
    });

    it("handles mixed tax-included and tax-excluded across lines", () => {
      const lines: OrderLine[] = [
        { priceUnit: "120", quantity: "1", discount: "0", taxIds: [vatTax.id] }, // Included
        { priceUnit: "100", quantity: "1", discount: "0", taxIds: [standardTax.id] }, // Excluded
      ];

      const result = computeOrderTaxes(context, lines);

      // Line 1: 120 with VAT → base 100, tax 20, total 120
      // Line 2: 100 with 10% standard → base 100, tax 10, total 110
      // Order: subtotal 200, tax 30, total 230
      expect(result.subtotal.toFixed(2)).toBe("200.00");
      expect(result.tax.toFixed(2)).toBe("30.00");
      expect(result.total.toFixed(2)).toBe("230.00");
    });

    it("handles empty line array", () => {
      const result = computeOrderTaxes(context, []);

      expect(result.subtotal.toFixed(2)).toBe("0.00");
      expect(result.tax.toFixed(2)).toBe("0.00");
      expect(result.total.toFixed(2)).toBe("0.00");
      expect(result.taxLines.length).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // mapTax
  // ─────────────────────────────────────────────────────────────────────────

  describe("mapTax", () => {
    it("returns original tax when no fiscal position", () => {
      const result = mapTax(context, standardTax.id, {
        id: "fp-1",
        name: "No Mapping",
        autoApply: false,
        vatRequired: false,
      });

      expect(result).toBe(standardTax.id);
    });

    it("returns original tax when no mapping found", () => {
      const fiscalPosition: FiscalPosition = {
        id: "fp-1",
        name: "EU VAT",
        autoApply: true,
        vatRequired: true,
        taxMaps: [{ taxSrcId: "other-tax", taxDestId: vatTax.id }],
      };

      const result = mapTax(context, standardTax.id, fiscalPosition);

      expect(result).toBe(standardTax.id);
    });

    it("maps tax to destination tax", () => {
      const fiscalPosition: FiscalPosition = {
        id: "fp-1",
        name: "US → EU",
        autoApply: true,
        vatRequired: false,
        taxMaps: [{ taxSrcId: standardTax.id, taxDestId: vatTax.id }],
      };

      const result = mapTax(context, standardTax.id, fiscalPosition);

      expect(result).toBe(vatTax.id);
    });

    it("maps tax to null (exemption)", () => {
      const fiscalPosition: FiscalPosition = {
        id: "fp-exempt",
        name: "Tax Exempt",
        autoApply: true,
        vatRequired: false,
        taxMaps: [{ taxSrcId: standardTax.id, taxDestId: null }],
      };

      const result = mapTax(context, standardTax.id, fiscalPosition);

      expect(result).toBeNull();
    });

    it("applies tax mapping in computeLineTaxes", () => {
      const fiscalPosition: FiscalPosition = {
        id: "fp-1",
        name: "Exempt Position",
        autoApply: false,
        vatRequired: false,
        taxMaps: [
          { taxSrcId: standardTax.id, taxDestId: null }, // Exempt
        ],
      };

      const result = computeLineTaxes(context, "100", "1", "0", [standardTax.id], fiscalPosition);

      // Tax should be exempted
      expect(result.base.toFixed(2)).toBe("100.00");
      expect(result.taxLines.length).toBe(0);
      expect(result.total.toFixed(2)).toBe("100.00");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // detectFiscalPosition
  // ─────────────────────────────────────────────────────────────────────────

  describe("detectFiscal Position", () => {
    let domesticPosition: FiscalPosition;
    let internationalPosition: FiscalPosition;
    let californiaPosition: FiscalPosition;
    let vatRequiredPosition: FiscalPosition;

    beforeEach(() => {
      domesticPosition = {
        id: "fp-domestic",
        name: "Domestic",
        countryId: 1, // US
        autoApply: true,
        vatRequired: false,
      };

      internationalPosition = {
        id: "fp-international",
        name: "International",
        countryId: 2, // Non-US
        autoApply: true,
        vatRequired: false,
      };

      californiaPosition = {
        id: "fp-california",
        name: "California",
        countryId: 1, // US
        stateIds: "5", // CA state ID
        autoApply: true,
        vatRequired: false,
      };

      vatRequiredPosition = {
        id: "fp-vat",
        name: "VAT Required",
        countryId: 2,
        autoApply: true,
        vatRequired: true,
      };

      context.fiscalPositions = new Map([
        [domesticPosition.id, domesticPosition],
        [internationalPosition.id, internationalPosition],
        [californiaPosition.id, californiaPosition],
        [vatRequiredPosition.id, vatRequiredPosition],
      ]);
    });

    it("returns explicit fiscal position if set", () => {
      const partner: Partner = {
        id: "partner-1",
        countryId: 1,
        defaultFiscalPositionId: internationalPosition.id,
      };

      const result = detectFiscalPosition(context, partner);

      expect(result?.id).toBe(internationalPosition.id);
    });

    it("auto-detects by country match", () => {
      const partner: Partner = {
        id: "partner-1",
        countryId: 1, // US
      };

      const result = detectFiscalPosition(context, partner);

      expect(result?.id).toBe(domesticPosition.id);
    });

    it("auto-detects by state match", () => {
      const partner: Partner = {
        id: "partner-1",
        countryId: 1, // US
        stateId: 5, // CA
      };

      const result = detectFiscalPosition(context, partner);

      // californ iaPosition is more specific (country + state)
      expect(result?.id).toBe(californiaPosition.id);
    });

    it("matches non-VAT-required position when VAT missing", () => {
      const partner: Partner = {
        id: "partner-1",
        countryId: 2, // Matches both international and VAT-required positions
        vat: undefined, // No VAT number
      };

      const result = detectFiscalPosition(context, partner);

      // Should match internationalPosition (no VAT required)
      // vatRequiredPosition should NOT match (VAT required but missing)
      expect(result?.id).toBe(internationalPosition.id);
    });

    it("matches fiscal position when VAT required and provided", () => {
      const partner: Partner = {
        id: "partner-1",
        countryId: 2,
        vat: "GB123456789",
      };

      const result = detectFiscalPosition(context, partner);

      expect(result?.id).toBe(vatRequiredPosition.id);
    });

    it("returns undefined when no match", () => {
      const partner: Partner = {
        id: "partner-1",
        countryId: 999, // No fiscal position for this country
      };

      const result = detectFiscalPosition(context, partner);

      expect(result).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Invariants
  // ─────────────────────────────────────────────────────────────────────────

  describe("Tax Invariants", () => {
    it("INV-1: Total = Base + Sum(Taxes)", () => {
      const result = computeLineTaxes(context, "100", "1", "0", [standardTax.id, cityTax.id]);

      const taxSum = result.taxLines.reduce((sum, line) => sum.plus(line.amount), new Decimal(0));
      const expectedTotal = result.base.plus(taxSum);

      expect(result.total.toFixed(2)).toBe(expectedTotal.toFixed(2));
    });

    it("INV-2: Tax-included decomposition is reversible", () => {
      // Start with $120 including 20% VAT
      const result = computeLineTaxes(context, "120", "1", "0", [vatTax.id]);

      // base + tax should equal original gross
      const reconstructed = result.base.plus(
        result.taxLines.reduce((sum, t) => sum.plus(t.amount), new Decimal(0))
      );

      expect(reconstructed.toFixed(2)).toBe("120.00");
      expect(result.base.toFixed(2)).toBe("100.00");
      expect(result.taxLines[0].amount.toFixed(2)).toBe("20.00");
    });

    it("INV-3: Order total equals sum of line totals", () => {
      const lines: OrderLine[] = [
        { priceUnit: "100", quantity: "1", discount: "0", taxIds: [standardTax.id] }, // 110
        { priceUnit: "200", quantity: "1", discount: "0", taxIds: [cityTax.id] }, // 210
      ];

      const orderResult = computeOrderTaxes(context, lines);

      const line1 = computeLineTaxes(context, "100", "1", "0", [standardTax.id]);
      const line2 = computeLineTaxes(context, "200", "1", "0", [cityTax.id]);

      const manualTotal = line1.total.plus(line2.total);

      expect(orderResult.total.toFixed(2)).toBe(manualTotal.toFixed(2));
    });

    it("INV-4: Discount applied before tax, not on tax", () => {
      // $100 price, 10% discount, 10% tax
      // Correct: (100 * 0.9) * 1.1 = 99
      // Wrong: (100 * 1.1) * 0.9 = 99 (same result, but semantically different)

      const result = computeLineTaxes(context, "100", "1", "10", [standardTax.id]);

      const expectedBase = new Decimal(100).mul(0.9); // 90
      const expectedTax = expectedBase.mul(0.1); // 9
      const expectedTotal = expectedBase.plus(expectedTax); // 99

      expect(result.base.toFixed(2)).toBe(expectedBase.toFixed(2));
      expect(result.taxLines[0].amount.toFixed(2)).toBe(expectedTax.toFixed(2));
      expect(result.total.toFixed(2)).toBe(expectedTotal.toFixed(2));
    });
  });
});
