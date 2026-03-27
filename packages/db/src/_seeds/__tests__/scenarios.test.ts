import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";

import { runScenario, TestScenario } from "../scenarios.js";

type ScenarioFn = () => ReturnType<(typeof TestScenario)[keyof typeof TestScenario]>;

const scenarioEntries = Object.entries(TestScenario) as [string, ScenarioFn][];

function getScenariosByTag(tag: string): [string, ScenarioFn][] {
  return scenarioEntries.filter(([, scenarioFn]) => {
    const result = runScenario(scenarioFn);
    return (result.tags as readonly string[]).includes(tag);
  });
}

describe("TestScenario DSL", () => {
  describe.each(scenarioEntries)("%s", (_name, scenarioFn) => {
    it("satisfies shared metadata contract", () => {
      const result = runScenario(scenarioFn);

      expect(typeof result.scenarioName).toBe("string");
      expect(result.scenarioName.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(result.tags)).toBe(true);
      expect(result.tags.length).toBeGreaterThan(0);
      expect(result.tags.every((t) => typeof t === "string" && t.trim().length > 0)).toBe(true);
      expect(typeof result.expectedOutcome).toBe("string");
      expect(result.expectedOutcome.trim().length).toBeGreaterThan(0);
    });

    it("keeps known monetary fields non-negative", () => {
      const result = runScenario(scenarioFn) as Record<string, unknown>;

      if ("order" in result) {
        const order = result.order as {
          amountUntaxed?: string;
          amountTax?: string;
          amountTotal?: string;
        };

        if (order.amountUntaxed) {
          expect(new Decimal(order.amountUntaxed).greaterThanOrEqualTo(0)).toBe(true);
        }
        if (order.amountTax) {
          expect(new Decimal(order.amountTax).greaterThanOrEqualTo(0)).toBe(true);
        }
        if (order.amountTotal) {
          expect(new Decimal(order.amountTotal).greaterThanOrEqualTo(0)).toBe(true);
        }
      }

      if ("line" in result) {
        const line = result.line as { subtotal?: string };
        if (line.subtotal) {
          expect(new Decimal(line.subtotal).greaterThanOrEqualTo(0)).toBe(true);
        }
      }

      if ("lines" in result) {
        const lines = result.lines as Array<{ subtotal?: string }>;
        for (const line of lines) {
          if (line.subtotal) {
            expect(new Decimal(line.subtotal).greaterThanOrEqualTo(0)).toBe(true);
          }
        }
      }
    });
  });

  it("highValueOrder keeps order totals internally consistent", () => {
    const result = runScenario(TestScenario.highValueOrder);
    const untaxed = new Decimal(result.order.amountUntaxed);
    const tax = new Decimal(result.order.amountTax);
    const total = new Decimal(result.order.amountTotal);

    expect(total.equals(untaxed.plus(tax))).toBe(true);

    const lineSum = result.lines.reduce((sum, line) => sum.plus(line.subtotal), new Decimal(0));
    expect(lineSum.equals(untaxed)).toBe(true);
  });

  it("overdueDelivery sets a delivery date in the past", () => {
    const result = runScenario(TestScenario.overdueDelivery);
    expect(result.order.deliveryDate).toBeInstanceOf(Date);
    expect(result.order.deliveryDate!.getTime()).toBeLessThan(Date.now());
  });

  it("filters scenarios by tag for targeted execution", () => {
    const salesScenarios = getScenariosByTag("sales");
    const edgeScenarios = getScenariosByTag("edge");
    const logisticsScenarios = getScenariosByTag("logistics");

    expect(salesScenarios.map(([name]) => name)).toEqual([
      "highValueOrder",
      "creditCheckedPriceOverride",
    ]);
    expect(edgeScenarios.map(([name]) => name)).toEqual(["discountEdgeCase"]);
    expect(logisticsScenarios.map(([name]) => name)).toEqual(["overdueDelivery"]);
  });

  it("runs only filtered scenarios and preserves metadata contract", () => {
    const selected = getScenariosByTag("discount");
    expect(selected.length).toBeGreaterThan(0);

    const selectedNames = selected.map(([name]) => name);
    expect(selectedNames).toContain("highValueOrder");
    expect(selectedNames).toContain("discountEdgeCase");

    for (const [name, scenarioFn] of selected) {
      const result = runScenario(scenarioFn);
      expect((result.tags as readonly string[]).includes("discount")).toBe(true);
      expect(result.scenarioName.length).toBeGreaterThan(0);
      expect(result.expectedOutcome.length).toBeGreaterThan(0);
      expect(["highValueOrder", "discountEdgeCase"]).toContain(name);
    }
  });

  it("creditCheckedPriceOverride enforces governance invariants", () => {
    const result = runScenario(TestScenario.creditCheckedPriceOverride);

    expect(result.order.creditCheckPassed).toBe(true);
    expect(result.order.creditCheckAt).toBeInstanceOf(Date);
    expect(result.order.creditCheckBy).toBe(1);
    expect(result.order.exchangeRateUsed).toBe("1.000000");
    expect(result.order.exchangeRateSource).toBeTruthy();

    const listedAt = new Decimal(result.line.priceListedAt ?? "0");
    const soldAt = new Decimal(result.line.priceUnit);
    expect(soldAt.lessThan(listedAt)).toBe(true);
    expect(result.line.priceOverrideReason).toBeTruthy();
    expect(result.line.priceApprovedBy).toBe(1);
  });
});
