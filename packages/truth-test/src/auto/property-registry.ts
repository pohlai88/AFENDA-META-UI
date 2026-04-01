/**
 * Dynamic Property Registry
 * =========================
 * Auto-discovers candidate pure functions from known modules and maps them
 * to generic property tests.
 */

import { expect } from "vitest";
import fc from "fast-check";
import type { PureFunctionDef } from "./generate-property-tests.js";
import { domainArbitraries } from "./generate-property-tests.js";
import { Decimal } from "decimal.js";

function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}

function decimalToNumber(value: unknown): number {
  const maybe = value as { toNumber?: () => number };
  return typeof maybe.toNumber === "function" ? maybe.toNumber() : Number(value);
}

interface OrderTotalsResult {
  amountUntaxed: string;
  amountTax: string;
  amountTotal: string;
}

type LineSubtotalInput = {
  quantity: string;
  priceUnit: string;
  discount: string;
};

function computeLineSubtotal(input: LineSubtotalInput): Decimal {
  const quantity = new Decimal(input.quantity);
  const priceUnit = new Decimal(input.priceUnit);
  const discount = new Decimal(input.discount).div(100);
  const gross = quantity.mul(priceUnit);
  const net = gross.mul(new Decimal(1).minus(discount));
  return net.lessThan(0) ? new Decimal(0) : net;
}

function money(value: number): string {
  return new Decimal(value).toDecimalPlaces(2).toFixed(2);
}

function calcLineSubtotal(quantity: number, priceUnit: number, discount: number): Decimal {
  return computeLineSubtotal({
    quantity: String(quantity),
    priceUnit: String(priceUnit),
    discount: String(discount),
  });
}

function calcOrderTotals(lineSubtotals: number[], taxRate: number): OrderTotalsResult {
  const amountUntaxed = lineSubtotals.reduce((sum, value) => sum.plus(value), new Decimal(0));
  const amountTax = amountUntaxed.mul(taxRate);
  const amountTotal = amountUntaxed.plus(amountTax);
  return {
    amountUntaxed: amountUntaxed.toDecimalPlaces(2).toFixed(2),
    amountTax: amountTax.toDecimalPlaces(2).toFixed(2),
    amountTotal: amountTotal.toDecimalPlaces(2).toFixed(2),
  };
}

/**
 * Discover property-test targets by module export names.
 * This mirrors the dynamic schema discovery pattern used in schema-registry.ts.
 */
export function discoverPropertyFunctions(): PureFunctionDef[] {
  const defs: PureFunctionDef[] = [];
  defs.push({
    name: "computeLineSubtotal",
    fn: computeLineSubtotal as (...args: unknown[]) => unknown,
    domain: [
      fc.record({
        quantity: fc.integer({ min: 0, max: 10_000 }).map(String),
        priceUnit: domainArbitraries.positiveAmount.map((n) => n.toFixed(2)),
        discount: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }).map(String),
      }),
    ],
    properties: ["bounded"],
    bounds: { min: 0, max: Number.MAX_SAFE_INTEGER },
    projectResult: decimalToNumber,
    customProperties: [
      {
        name: "zero quantity always yields zero subtotal",
        domain: [domainArbitraries.positiveAmount, domainArbitraries.discountPercent],
        assert: (price, discount) => {
          const result = computeLineSubtotal({
            quantity: "0",
            priceUnit: String(price),
            discount: String(discount),
          });
          expect(decimalToNumber(result)).toBe(0);
        },
      },
      {
        name: "100% discount always yields zero subtotal",
        domain: [domainArbitraries.quantity, domainArbitraries.positiveAmount],
        assert: (qty, price) => {
          const result = computeLineSubtotal({
            quantity: String(qty),
            priceUnit: String(price),
            discount: "100",
          });
          expect(decimalToNumber(result)).toBe(0);
        },
      },
    ],
  });

  defs.push({
    name: "money",
    fn: money as (...args: unknown[]) => unknown,
    domain: [fc.double({ min: -1_000_000, max: 1_000_000, noNaN: true, noDefaultInfinity: true })],
    properties: [],
    customProperties: [
      {
        name: "always returns 2 decimal places",
        domain: [fc.double({ min: -1_000_000, max: 1_000_000, noNaN: true, noDefaultInfinity: true })],
        assert: (value) => {
          expect(String(money(value as number))).toMatch(/^-?\d+\.\d{2}$/);
        },
      },
    ],
  });

  defs.push({
    name: "calcLineSubtotal",
    fn: calcLineSubtotal as (...args: unknown[]) => unknown,
    domain: [
      domainArbitraries.positiveAmount,
      domainArbitraries.positiveAmount,
      fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
    ],
    properties: ["bounded"],
    bounds: { min: 0, max: Number.MAX_SAFE_INTEGER },
    projectResult: decimalToNumber,
  });

  defs.push({
    name: "calcOrderTotals.amountUntaxed",
    fn: ((args: { lineSubtotals: number[]; taxRate: number }) =>
      parseFloat(calcOrderTotals(args.lineSubtotals, args.taxRate).amountUntaxed)) as (
      ...args: unknown[]
    ) => unknown,
    domain: [
      fc.record({
        lineSubtotals: fc.array(fc.double({ min: 0, max: 10_000, noNaN: true }), {
          minLength: 1,
          maxLength: 10,
        }),
        taxRate: fc.double({ min: 0, max: 0.5, noNaN: true }),
      }),
    ],
    properties: ["bounded"],
    bounds: { min: 0, max: Number.MAX_SAFE_INTEGER },
    customProperties: [
      {
        name: "total equals untaxed plus tax",
        domain: [fc.array(domainArbitraries.positiveAmount, { minLength: 1, maxLength: 100 }), domainArbitraries.taxRate],
        assert: (lineSubtotals, rate) => {
          const result = calcOrderTotals(lineSubtotals as number[], rate as number);
          const untaxed = new Decimal(result.amountUntaxed);
          const tax = new Decimal(result.amountTax);
          const total = new Decimal(result.amountTotal);
          expect(Math.abs(total.minus(untaxed.plus(tax)).toNumber())).toBeLessThanOrEqual(0.01);
        },
      },
    ],
  });

  return defs;
}
