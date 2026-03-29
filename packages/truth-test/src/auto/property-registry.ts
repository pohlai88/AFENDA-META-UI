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

import * as SalesOrderEngine from "../../../../apps/api/src/modules/sales/logic/sales-order-engine.js";
import * as MoneySeedFns from "../../../../packages/db/src/seeds/money.js";
import * as ConsignmentEngine from "../../../../apps/api/src/modules/sales/logic/consignment-engine.js";
import * as SubscriptionEngine from "../../../../apps/api/src/modules/sales/logic/subscription-engine.js";

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

/**
 * Discover property-test targets by module export names.
 * This mirrors the dynamic schema discovery pattern used in schema-registry.ts.
 */
export function discoverPropertyFunctions(): PureFunctionDef[] {
  const defs: PureFunctionDef[] = [];

  // ---------------------------------------------------------------------------
  // Sales Order Engine
  // ---------------------------------------------------------------------------

  const computeLineSubtotal = (SalesOrderEngine as Record<string, unknown>).computeLineSubtotal;
  if (isFunction(computeLineSubtotal)) {
    defs.push({
      name: "computeLineSubtotal",
      fn: computeLineSubtotal,
      domain: [
        fc.record({
          quantity: fc.integer({ min: 0, max: 10_000 }).map(String),
          priceUnit: domainArbitraries.positiveAmount.map((n) => n.toFixed(2)),
          discount: fc
            .double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true })
            .map((n) => n.toFixed(2)),
        }),
      ],
      properties: ["bounded"],
      bounds: { min: 0, max: Number.MAX_SAFE_INTEGER },
      projectResult: decimalToNumber,
      customProperties: [
        {
          name: "is monotonic with quantity",
          domain: [
            fc
              .tuple(fc.integer({ min: 1, max: 100 }), fc.integer({ min: 1, max: 100 }))
              .filter(([a, b]) => a < b),
            domainArbitraries.positiveAmount,
            domainArbitraries.discountPercent,
          ],
          assert: (pair, price, discount) => {
            const [qty1, qty2] = pair as [number, number];

            const result1 = computeLineSubtotal({
              quantity: String(qty1),
              priceUnit: String(price),
              discount: String(discount),
            });

            const result2 = computeLineSubtotal({
              quantity: String(qty2),
              priceUnit: String(price),
              discount: String(discount),
            });

            expect(decimalToNumber(result2)).toBeGreaterThanOrEqual(decimalToNumber(result1));
          },
        },
        {
          name: "is monotonic with price",
          domain: [
            fc
              .tuple(
                fc.double({ min: 1, max: 1000, noNaN: true, noDefaultInfinity: true }),
                fc.double({ min: 1, max: 1000, noNaN: true, noDefaultInfinity: true }),
              )
              .filter(([a, b]) => a < b),
            domainArbitraries.quantity,
            domainArbitraries.discountPercent,
          ],
          assert: (pair, qty, discount) => {
            const [price1, price2] = pair as [number, number];

            const result1 = computeLineSubtotal({
              quantity: String(qty),
              priceUnit: String(price1),
              discount: String(discount),
            });

            const result2 = computeLineSubtotal({
              quantity: String(qty),
              priceUnit: String(price2),
              discount: String(discount),
            });

            expect(decimalToNumber(result2)).toBeGreaterThanOrEqual(decimalToNumber(result1));
          },
        },
        {
          name: "zero price always yields zero subtotal",
          domain: [domainArbitraries.quantity, domainArbitraries.discountPercent],
          assert: (qty, discount) => {
            const result = computeLineSubtotal({
              quantity: String(qty),
              priceUnit: "0",
              discount: String(discount),
            });

            expect(decimalToNumber(result)).toBe(0);
          },
        },
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
        {
          name: "no discount yields qty × price",
          domain: [domainArbitraries.quantity, domainArbitraries.positiveAmount],
          assert: (qty, price) => {
            const result = computeLineSubtotal({
              quantity: String(qty),
              priceUnit: String(price),
              discount: "0",
            });

            const expected = new Decimal(qty as number).mul(price as number);
            expect(Math.abs(decimalToNumber(result) - expected.toNumber())).toBeLessThan(0.01);
          },
        },
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // Money Utilities
  // ---------------------------------------------------------------------------

  const money = (MoneySeedFns as Record<string, unknown>).money;
  if (isFunction(money)) {
    defs.push({
      name: "money",
      fn: money,
      domain: [fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true })],
      properties: ["idempotent"],
      customProperties: [
        {
          name: "always returns 2 decimal places",
          domain: [
            fc.double({ min: -1_000_000, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
          ],
          assert: (value) => {
            expect(String(money(value))).toMatch(/^-?\d+\.\d{2}$/);
          },
        },
        {
          name: "preserves sign",
          domain: [
            fc.double({ min: -1_000_000, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
          ],
          assert: (value) => {
            const result = String(money(value));
            expect(result.startsWith("-")).toBe((value as number) < 0);
          },
        },
      ],
    });
  }

  const calcLineSubtotal = (MoneySeedFns as Record<string, unknown>).calcLineSubtotal;
  if (isFunction(calcLineSubtotal)) {
    defs.push({
      name: "calcLineSubtotal",
      fn: calcLineSubtotal,
      domain: [
        domainArbitraries.positiveAmount,
        domainArbitraries.positiveAmount,
        fc.double({ min: 0, max: 10_000, noNaN: true, noDefaultInfinity: true }),
      ],
      properties: ["bounded"],
      bounds: { min: 0, max: Number.MAX_SAFE_INTEGER },
      projectResult: decimalToNumber,
      customProperties: [
        {
          name: "zero discount yields qty × price",
          domain: [domainArbitraries.positiveAmount, domainArbitraries.positiveAmount],
          assert: (qty, price) => {
            const result = calcLineSubtotal(qty, price, 0);
            const expected = new Decimal(qty as number).mul(price as number);
            expect(decimalToNumber(result)).toBeCloseTo(expected.toNumber(), 2);
          },
        },
      ],
    });
  }

  const calcOrderTotals = (MoneySeedFns as Record<string, unknown>).calcOrderTotals;
  if (isFunction(calcOrderTotals)) {
    const calcOrderTotalsFn = calcOrderTotals as (
      lineSubtotals: number[],
      taxRate: number,
    ) => OrderTotalsResult;

    // calcOrderTotals returns an object with multiple fields, so we test the raw values for boundedness
    defs.push({
      name: "calcOrderTotals.amountUntaxed",
      fn: ((args: { lineSubtotals: number[]; taxRate: number }) => {
        const result = calcOrderTotalsFn(args.lineSubtotals, args.taxRate);
        return parseFloat(result.amountUntaxed);
      }) as (...args: unknown[]) => unknown,
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
          domain: [
            fc.array(domainArbitraries.positiveAmount, { minLength: 1, maxLength: 100 }),
            domainArbitraries.taxRate,
          ],
          assert: (lineSubtotals, rate) => {
            const result = calcOrderTotalsFn(lineSubtotals as number[], rate as number);
            const untaxed = new Decimal(result.amountUntaxed);
            const tax = new Decimal(result.amountTax);
            const total = new Decimal(result.amountTotal);
            expect(Math.abs(total.minus(untaxed.plus(tax)).toNumber())).toBeLessThanOrEqual(0.01);
          },
        },
        {
          name: "tax amount equals untaxed × tax rate",
          domain: [
            fc.array(domainArbitraries.positiveAmount, { minLength: 1, maxLength: 100 }),
            domainArbitraries.taxRate,
          ],
          assert: (lineSubtotals, rate) => {
            const result = calcOrderTotalsFn(lineSubtotals as number[], rate as number);
            const untaxed = new Decimal(result.amountUntaxed);
            const tax = new Decimal(result.amountTax);
            expect(Math.abs(tax.minus(untaxed.mul(rate as number)).toNumber())).toBeLessThan(0.01);
          },
        },
        {
          name: "all amounts have exactly 2 decimal places",
          domain: [
            fc.array(domainArbitraries.positiveAmount, { minLength: 1, maxLength: 100 }),
            domainArbitraries.taxRate,
          ],
          assert: (lineSubtotals, rate) => {
            const result = calcOrderTotalsFn(lineSubtotals as number[], rate as number);
            expect(result.amountUntaxed).toMatch(/^\d+\.\d{2}$/);
            expect(result.amountTax).toMatch(/^\d+\.\d{2}$/);
            expect(result.amountTotal).toMatch(/^\d+\.\d{2}$/);
          },
        },
        {
          name: "zero tax rate yields tax = 0 and total = untaxed",
          domain: [fc.array(domainArbitraries.positiveAmount, { minLength: 1, maxLength: 100 })],
          assert: (lineSubtotals) => {
            const result = calcOrderTotalsFn(lineSubtotals as number[], 0);
            expect(result.amountTax).toBe("0.00");
            expect(result.amountTotal).toBe(result.amountUntaxed);
          },
        },
        {
          name: "empty lines yields all zeros",
          assert: () => {
            const result = calcOrderTotalsFn([], 0.1);
            expect(result.amountUntaxed).toBe("0.00");
            expect(result.amountTax).toBe("0.00");
            expect(result.amountTotal).toBe("0.00");
          },
        },
        {
          name: "order of lines does not matter",
          domain: [
            fc.array(domainArbitraries.positiveAmount, { minLength: 2, maxLength: 10 }),
            domainArbitraries.taxRate,
          ],
          assert: (lineSubtotals, rate) => {
            const lines = lineSubtotals as number[];
            const result1 = calcOrderTotalsFn(lines, rate as number);
            const result2 = calcOrderTotalsFn([...lines].reverse(), rate as number);
            expect(result2.amountUntaxed).toBe(result1.amountUntaxed);
            expect(result2.amountTax).toBe(result1.amountTax);
            expect(result2.amountTotal).toBe(result1.amountTotal);
          },
        },
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // Consignment Engine (Inventory/Workflow)
  // ---------------------------------------------------------------------------

  const computeExpectedClosingQty = (ConsignmentEngine as Record<string, unknown>)
    .computeExpectedClosingQty;
  if (isFunction(computeExpectedClosingQty)) {
    const computeExpectedClosingQtyFn = computeExpectedClosingQty as (params: {
      opening: Decimal;
      received: Decimal;
      sold: Decimal;
      returned: Decimal;
    }) => unknown;

    defs.push({
      name: "computeExpectedClosingQty",
      fn: ((params: {
        opening: Decimal;
        received: Decimal;
        sold: Decimal;
        returned: Decimal;
      }) => computeExpectedClosingQtyFn(params)) as (...args: unknown[]) => unknown,
      domain: [
        fc.record({
          opening: fc.double({ min: 0, max: 10_000, noNaN: true }).map((n) => new Decimal(n)),
          received: fc.double({ min: 0, max: 10_000, noNaN: true }).map((n) => new Decimal(n)),
          sold: fc.double({ min: 0, max: 10_000, noNaN: true }).map((n) => new Decimal(n)),
          returned: fc.double({ min: 0, max: 10_000, noNaN: true }).map((n) => new Decimal(n)),
        }),
      ],
      properties: ["bounded"],
      bounds: { min: -1_000_000, max: 1_000_000 },
      projectResult: decimalToNumber,
    });
  }

  const consignmentLineSubtotal = (ConsignmentEngine as Record<string, unknown>)
    .computeLineSubtotal;
  if (isFunction(consignmentLineSubtotal)) {
    defs.push({
      name: "consignment.computeLineSubtotal",
      fn: consignmentLineSubtotal,
      domain: [
        fc.double({ min: 0, max: 10_000, noNaN: true }).map((n) => new Decimal(n)),
        fc.double({ min: 0, max: 10_000, noNaN: true }).map((n) => new Decimal(n)),
      ],
      properties: ["bounded", "commutative"],
      bounds: { min: 0, max: Number.MAX_SAFE_INTEGER },
      projectResult: decimalToNumber,
    });
  }

  // ---------------------------------------------------------------------------
  // Subscription Engine (Recurring Revenue)
  // ---------------------------------------------------------------------------

  const subscriptionLineSubtotal = (SubscriptionEngine as Record<string, unknown>)
    .computeLineSubtotal;
  if (isFunction(subscriptionLineSubtotal)) {
    defs.push({
      name: "subscription.computeLineSubtotal",
      fn: subscriptionLineSubtotal,
      domain: [
        fc.double({ min: 0, max: 10_000, noNaN: true }).map((n) => new Decimal(n)),
        fc.double({ min: 0, max: 10_000, noNaN: true }).map((n) => new Decimal(n)),
        fc.double({ min: 0, max: 100, noNaN: true }).map((n) => new Decimal(n)),
      ],
      properties: ["bounded"],
      bounds: { min: 0, max: Number.MAX_SAFE_INTEGER },
      projectResult: decimalToNumber,
    });
  }

  const isFinanciallyEqual = (SubscriptionEngine as Record<string, unknown>).isFinanciallyEqual;
  if (isFunction(isFinanciallyEqual)) {
    defs.push({
      name: "isFinanciallyEqual",
      fn: isFinanciallyEqual,
      domain: [
        fc.double({ min: 0, max: 1_000_000, noNaN: true }).map((n) => new Decimal(n)),
        fc.double({ min: 0, max: 1_000_000, noNaN: true }).map((n) => new Decimal(n)),
      ],
      properties: ["commutative"],
    });
  }

  return defs;
}
