import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";

import {
  computeLineSubtotal,
  computeMRR,
  computeNextInvoiceDate,
  detectSubscriptionExpiry,
  isFinanciallyEqual,
  subscriptionStateMachine,
  validateSubscription,
  type ValidateSubscriptionInput,
} from "../subscription-engine.js";

describe("subscription engine", () => {
  describe("line helpers", () => {
    it("computes line subtotal with discount", () => {
      const subtotal = computeLineSubtotal(new Decimal("2"), new Decimal("100"), new Decimal("10"));
      expect(subtotal.toFixed(2)).toBe("180.00");
    });

    it("compares values within financial tolerance", () => {
      expect(isFinanciallyEqual(new Decimal("100.00"), new Decimal("100.009"))).toBe(true);
      expect(isFinanciallyEqual(new Decimal("100.00"), new Decimal("100.02"))).toBe(false);
    });
  });

  describe("validateSubscription", () => {
    const baseInput: ValidateSubscriptionInput = {
      subscription: {
        id: "sub-1",
        status: "active",
        dateStart: new Date("2026-01-01T00:00:00.000Z"),
        dateEnd: null,
        nextInvoiceDate: new Date("2026-02-01T00:00:00.000Z"),
        recurringTotal: "180.00",
        mrr: "180.00",
        arr: "2160.00",
        closeReasonId: null,
      },
      lines: [
        {
          id: "line-1",
          productId: "prod-1",
          quantity: "2.0000",
          priceUnit: "100.00",
          discount: "10.00",
          subtotal: "180.00",
        },
      ],
      template: {
        billingPeriod: "monthly",
        billingDay: 5,
      },
    };

    it("passes for a valid subscription", () => {
      const result = validateSubscription(baseInput);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.lineChecks).toHaveLength(1);
      expect(result.lineChecks[0]?.subtotalValid).toBe(true);
    });

    it("fails when no lines exist", () => {
      const result = validateSubscription({ ...baseInput, lines: [] });
      expect(result.valid).toBe(false);
      expect(result.issues.some((issue) => issue.code === "SUB-1")).toBe(true);
    });

    it("fails when next invoice date is before start date", () => {
      const result = validateSubscription({
        ...baseInput,
        subscription: {
          ...baseInput.subscription,
          nextInvoiceDate: new Date("2025-12-31T00:00:00.000Z"),
        },
      });

      expect(result.valid).toBe(false);
      expect(result.issues.some((issue) => issue.code === "SUB-3")).toBe(true);
    });

    it("fails when line subtotal mismatches formula", () => {
      const result = validateSubscription({
        ...baseInput,
        lines: [{ ...baseInput.lines[0], subtotal: "150.00" }],
      });

      expect(result.valid).toBe(false);
      expect(result.issues.some((issue) => issue.code === "SUB-7")).toBe(true);
    });

    it("fails when ARR is not MRR × 12", () => {
      const result = validateSubscription({
        ...baseInput,
        subscription: {
          ...baseInput.subscription,
          arr: "2100.00",
        },
      });

      expect(result.valid).toBe(false);
      expect(result.issues.some((issue) => issue.code === "SUB-6")).toBe(true);
    });

    it("fails when cancelled subscription has no close reason", () => {
      const result = validateSubscription({
        ...baseInput,
        subscription: {
          ...baseInput.subscription,
          status: "cancelled",
          dateEnd: new Date("2026-02-10T00:00:00.000Z"),
          closeReasonId: null,
        },
      });

      expect(result.valid).toBe(false);
      expect(result.issues.some((issue) => issue.code === "SUB-10")).toBe(true);
    });
  });

  describe("computeMRR", () => {
    it("normalizes monthly subscriptions", () => {
      const result = computeMRR({
        lines: [{ subtotal: "300.00" }, { subtotal: "50.00" }],
        billingPeriod: "monthly",
      });

      expect(result.lineTotal.toFixed(2)).toBe("350.00");
      expect(result.mrr.toFixed(2)).toBe("350.00");
      expect(result.arr.toFixed(2)).toBe("4200.00");
    });

    it("normalizes yearly subscriptions", () => {
      const result = computeMRR({
        lines: [{ subtotal: "1200.00" }],
        billingPeriod: "yearly",
      });

      expect(result.mrr.toFixed(2)).toBe("100.00");
      expect(result.arr.toFixed(2)).toBe("1200.00");
    });
  });

  describe("computeNextInvoiceDate", () => {
    it("computes monthly billing date with billing day", () => {
      const date = computeNextInvoiceDate({
        currentDate: new Date("2026-01-10T00:00:00.000Z"),
        billingPeriod: "monthly",
        billingDay: 5,
      });

      expect(date.getUTCMonth()).toBe(1);
      expect(date.getUTCDate()).toBe(5);
    });

    it("clamps billing day to month end", () => {
      const date = computeNextInvoiceDate({
        currentDate: new Date("2026-01-30T00:00:00.000Z"),
        billingPeriod: "monthly",
        billingDay: 31,
      });

      expect(date.getUTCMonth()).toBe(1);
      expect(date.getUTCDate()).toBe(28);
    });

    it("computes weekly billing without day override", () => {
      const date = computeNextInvoiceDate({
        currentDate: new Date("2026-01-10T00:00:00.000Z"),
        billingPeriod: "weekly",
        billingDay: 15,
      });

      expect(date.getUTCDate()).toBe(17);
    });
  });

  describe("detectSubscriptionExpiry", () => {
    it("marks active subscriptions with reached end date as expiring", () => {
      const result = detectSubscriptionExpiry({
        subscription: {
          status: "active",
          dateStart: new Date("2026-01-01T00:00:00.000Z"),
          dateEnd: new Date("2026-02-01T00:00:00.000Z"),
        },
        evaluatedAt: new Date("2026-02-02T00:00:00.000Z"),
      });

      expect(result.shouldExpire).toBe(true);
      expect(result.expired).toBe(false);
    });

    it("does not expire draft subscriptions", () => {
      const result = detectSubscriptionExpiry({
        subscription: {
          status: "draft",
          dateStart: new Date("2026-01-01T00:00:00.000Z"),
          dateEnd: new Date("2026-02-01T00:00:00.000Z"),
        },
        evaluatedAt: new Date("2026-02-02T00:00:00.000Z"),
      });

      expect(result.shouldExpire).toBe(false);
    });
  });

  describe("subscriptionStateMachine", () => {
    it("allows draft to active when guard context is valid", () => {
      expect(
        subscriptionStateMachine.canTransition("draft", "active", {
          hasLines: true,
          startDateValid: true,
        })
      ).toBe(true);
    });

    it("blocks draft to active when guard context fails", () => {
      expect(
        subscriptionStateMachine.canTransition("draft", "active", {
          hasLines: false,
          startDateValid: true,
        })
      ).toBe(false);
    });

    it("allows active to cancelled when close reason exists", () => {
      expect(
        subscriptionStateMachine.canTransition("active", "cancelled", {
          hasCloseReason: true,
        })
      ).toBe(true);
    });
  });
});
