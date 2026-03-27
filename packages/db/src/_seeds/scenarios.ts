/**
 * Scenario-based DSL for business-intent test composition.
 */

import { Decimal } from "decimal.js";

import { calcLineSubtotal, calcOrderTotals, money } from "./money.js";
import { SeedFactory } from "./factories.js";

interface ScenarioMeta {
  scenarioName: string;
  tags: readonly string[];
  expectedOutcome: string;
}

type ScenarioResult = ScenarioMeta & Record<string, unknown>;

function assertNonNegativeTotal(amountTotal: string, scenarioName: string): void {
  if (new Decimal(amountTotal).lessThan(0)) {
    throw new Error(`[${scenarioName}] amountTotal must not be negative`);
  }
}

export function runScenario<T extends ScenarioResult>(scenarioFn: () => T): T {
  const result = scenarioFn();

  if (process.env.NODE_ENV !== "test") {
    console.log(`[Scenario] ${result.scenarioName} | tags=${result.tags.join(",")}`);
  }

  return result;
}

export const TestScenario = {
  highValueOrder() {
    const desktopSubtotal = calcLineSubtotal(new Decimal(5), new Decimal(1899.99), new Decimal(50));
    const licenseSubtotal = calcLineSubtotal(
      new Decimal(1),
      new Decimal(4999.99),
      new Decimal(100)
    );

    const lines = [
      SeedFactory.orderLine.desktopLine({
        quantity: "5",
        subtotal: money(desktopSubtotal),
      }),
      SeedFactory.orderLine.licenseLine({
        discount: "100.00",
        subtotal: money(licenseSubtotal),
      }),
    ];

    const { amountUntaxed, amountTax, amountTotal } = calcOrderTotals([
      desktopSubtotal,
      licenseSubtotal,
    ]);
    const order = SeedFactory.salesOrder.build({
      template: "three",
      overrides: {
        amountUntaxed,
        amountTax,
        amountTotal,
        status: "confirmed",
        notes: "High-value scenario with adjusted discount and quantity",
      },
    });

    assertNonNegativeTotal(amountTotal, "High Value Order");

    return {
      scenarioName: "High Value Order",
      tags: ["sales", "discount", "tax"] as const,
      expectedOutcome: "Order totals are recomputed and remain non-negative.",
      order,
      lines,
    };
  },

  discountEdgeCase() {
    const freeItemSubtotal = calcLineSubtotal(
      new Decimal(2),
      new Decimal(599.99),
      new Decimal(599.99)
    );
    const line = SeedFactory.orderLine.monitorLine({
      discount: "599.99",
      subtotal: money(freeItemSubtotal),
    });

    return {
      scenarioName: "Discount Edge Case",
      tags: ["discount", "edge"] as const,
      expectedOutcome: "Line subtotal clamps at zero and never becomes negative.",
      line,
    };
  },

  overdueDelivery() {
    const order = SeedFactory.salesOrder.two({
      deliveryDate: new Date("2020-01-01T00:00:00Z"),
      notes: "Overdue delivery scenario",
    });

    return {
      scenarioName: "Overdue Delivery",
      tags: ["delivery", "logistics"] as const,
      expectedOutcome: "Past delivery date is represented for SLA and alerting tests.",
      order,
    };
  },

  creditCheckedPriceOverride() {
    const order = SeedFactory.salesOrder.one({
      creditCheckPassed: true,
      creditCheckAt: new Date("2024-03-01T08:30:00Z"),
      creditCheckBy: 1,
      creditLimitAtCheck: "50000.00",
      exchangeRateUsed: "1.000000",
      exchangeRateSource: "system_daily",
      notes: "Credit-approved deal with justified price override",
    });

    const line = SeedFactory.orderLine.monitorLine({
      priceListedAt: "699.99",
      priceUnit: "649.99",
      discount: "0.00",
      priceOverrideReason: "Strategic retention discount",
      priceApprovedBy: 1,
      subtotal: money(calcLineSubtotal(new Decimal(2), new Decimal(649.99), new Decimal(0))),
    });

    return {
      scenarioName: "Credit-Checked Price Override",
      tags: ["sales", "credit", "pricing", "approval"] as const,
      expectedOutcome:
        "Order and line satisfy credit-check and price-override governance constraints.",
      order,
      line,
    };
  },
} as const;
