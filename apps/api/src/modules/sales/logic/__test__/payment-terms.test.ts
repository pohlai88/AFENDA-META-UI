/**
 * Payment Terms Engine Tests
 * ===========================
 * Comprehensive test coverage for payment term computation
 */

import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";

import {
  computeDueDates,
  type PaymentTerm,
  type PaymentTermLine,
  validatePaymentTerm,
} from "../payment-terms.js";

// ───────────────────────────────────────────────────────────────────────────
// Test Fixtures
// ───────────────────────────────────────────────────────────────────────────

const createLine = (overrides: Partial<PaymentTermLine>): PaymentTermLine => ({
  id: "line-1",
  paymentTermId: "term-1",
  valueType: "balance",
  value: "0",
  days: 0,
  dayOfMonth: null,
  endOfMonth: false,
  sequence: 10,
  ...overrides,
});

const createTerm = (name: string, lines: PaymentTermLine[]): PaymentTerm => ({
  id: "term-1",
  name,
  note: null,
  isActive: true,
  lines,
});

// ───────────────────────────────────────────────────────────────────────────
// computeDueDates Tests
// ───────────────────────────────────────────────────────────────────────────

describe("Payment Terms Engine", () => {
  describe("computeDueDates", () => {
    describe("Simple Payment Terms", () => {
      it("computes immediate payment (0 days)", () => {
        const term = createTerm("Immediate", [
          createLine({ valueType: "balance", value: "0", days: 0, sequence: 10 }),
        ]);

        const invoiceDate = new Date("2026-01-15");
        const total = new Decimal(1000);

        const installments = computeDueDates(invoiceDate, term, total);

        expect(installments).toHaveLength(1);
        expect(installments[0]!.dueDate).toEqual(new Date("2026-01-15"));
        expect(installments[0]!.amount.toString()).toBe("1000");
        expect(installments[0]!.percentage.toString()).toBe("100");
      });

      it("computes Net 30 (full balance in 30 days)", () => {
        const term = createTerm("Net 30", [
          createLine({ valueType: "balance", value: "0", days: 30, sequence: 10 }),
        ]);

        const invoiceDate = new Date("2026-01-15");
        const total = new Decimal(1000);

        const installments = computeDueDates(invoiceDate, term, total);

        expect(installments).toHaveLength(1);
        expect(installments[0]!.dueDate).toEqual(new Date("2026-02-14"));
        expect(installments[0]!.amount.toString()).toBe("1000");
        expect(installments[0]!.percentage.toString()).toBe("100");
      });

      it("computes Net 60", () => {
        const term = createTerm("Net 60", [
          createLine({ valueType: "balance", value: "0", days: 60, sequence: 10 }),
        ]);

        const invoiceDate = new Date("2026-01-15");
        const total = new Decimal(5000);

        const installments = computeDueDates(invoiceDate, term, total);

        expect(installments).toHaveLength(1);
        expect(installments[0]!.dueDate).toEqual(new Date("2026-03-16"));
        expect(installments[0]!.amount.toString()).toBe("5000");
      });
    });

    describe("Percentage-Based Terms", () => {
      it("computes 50/50 split", () => {
        const term = createTerm("50/50", [
          createLine({ valueType: "percent", value: "50", days: 0, sequence: 10 }),
          createLine({ valueType: "balance", value: "0", days: 30, sequence: 20 }),
        ]);

        const invoiceDate = new Date("2026-01-15");
        const total = new Decimal(1000);

        const installments = computeDueDates(invoiceDate, term, total);

        expect(installments).toHaveLength(2);

        // First installment: 50% immediately
        expect(installments[0]!.dueDate).toEqual(new Date("2026-01-15"));
        expect(installments[0]!.amount.toString()).toBe("500");
        expect(installments[0]!.percentage.toString()).toBe("50");

        // Second installment: remaining 50% in 30 days
        expect(installments[1]!.dueDate).toEqual(new Date("2026-02-14"));
        expect(installments[1]!.amount.toString()).toBe("500");
        expect(installments[1]!.percentage.toString()).toBe("50");
      });

      it("computes 30/30/40 split", () => {
        const term = createTerm("30/30/40", [
          createLine({ valueType: "percent", value: "30", days: 0, sequence: 10 }),
          createLine({ valueType: "percent", value: "30", days: 30, sequence: 20 }),
          createLine({ valueType: "balance", value: "0", days: 60, sequence: 30 }),
        ]);

        const invoiceDate = new Date("2026-01-15");
        const total = new Decimal(10000);

        const installments = computeDueDates(invoiceDate, term, total);

        expect(installments).toHaveLength(3);
        expect(installments[0]!.amount.toString()).toBe("3000"); // 30%
        expect(installments[1]!.amount.toString()).toBe("3000"); // 30%
        expect(installments[2]!.amount.toString()).toBe("4000"); // Remaining 40%

        // Verify total
        const sum = installments.reduce((acc, inst) => acc.plus(inst.amount), new Decimal(0));
        expect(sum.toString()).toBe("10000");
      });

      it("handles percentage rounding correctly", () => {
        const term = createTerm("33% x3", [
          createLine({ valueType: "percent", value: "33.33", days: 0, sequence: 10 }),
          createLine({ valueType: "percent", value: "33.33", days: 30, sequence: 20 }),
          createLine({ valueType: "balance", value: "0", days: 60, sequence: 30 }),
        ]);

        const invoiceDate = new Date("2026-01-15");
        const total = new Decimal(1000);

        const installments = computeDueDates(invoiceDate, term, total);

        expect(installments).toHaveLength(3);
        expect(installments[0]!.amount.toString()).toBe("333.3");
        expect(installments[1]!.amount.toString()).toBe("333.3");
        expect(installments[2]!.amount.toString()).toBe("333.4"); // Balance captures rounding

        // Verify sum equals total
        const sum = installments.reduce((acc, inst) => acc.plus(inst.amount), new Decimal(0));
        expect(sum.toString()).toBe("1000");
      });
    });

    describe("Fixed Amount Terms", () => {
      it("computes fixed deposit + balance", () => {
        const term = createTerm("$500 Deposit + Balance", [
          createLine({ valueType: "fixed", value: "500", days: 0, sequence: 10 }),
          createLine({ valueType: "balance", value: "0", days: 30, sequence: 20 }),
        ]);

        const invoiceDate = new Date("2026-01-15");
        const total = new Decimal(2000);

        const installments = computeDueDates(invoiceDate, term, total);

        expect(installments).toHaveLength(2);
        expect(installments[0]!.amount.toString()).toBe("500"); // Fixed deposit
        expect(installments[1]!.amount.toString()).toBe("1500"); // Remaining balance
      });

      it("caps fixed amount at total", () => {
        const term = createTerm("$1000 Deposit", [
          createLine({ valueType: "fixed", value: "1000", days: 0, sequence: 10 }),
          createLine({ valueType: "balance", value: "0", days: 30, sequence: 20 }),
        ]);

        const invoiceDate = new Date("2026-01-15");
        const total = new Decimal(800); // Total < fixed amount

        const installments = computeDueDates(invoiceDate, term, total);

        expect(installments).toHaveLength(2);
        expect(installments[0]!.amount.toString()).toBe("800"); // Capped at total
        expect(installments[1]!.amount.toString()).toBe("0"); // Nothing remaining
      });
    });

    describe("Day-of-Month Rules", () => {
      it("moves to specified day within same month", () => {
        const term = createTerm("Due 25th", [
          createLine({
            valueType: "balance",
            value: "0",
            days: 0,
            dayOfMonth: 25,
            sequence: 10,
          }),
        ]);

        const invoiceDate = new Date("2026-01-10"); // 10th of month
        const total = new Decimal(1000);

        const installments = computeDueDates(invoiceDate, term, total);

        expect(installments[0]!.dueDate).toEqual(new Date("2026-01-25")); // Moved to 25th
      });

      it("moves to next month if day already passed", () => {
        const term = createTerm("Due 10th", [
          createLine({
            valueType: "balance",
            value: "0",
            days: 0,
            dayOfMonth: 10,
            sequence: 10,
          }),
        ]);

        const invoiceDate = new Date("2026-01-20"); // 20th of month (after 10th)
        const total = new Decimal(1000);

        const installments = computeDueDates(invoiceDate, term, total);

        expect(installments[0]!.dueDate).toEqual(new Date("2026-02-10")); // Next month's 10th
      });

      it("handles day_of_month in months with fewer days (Feb 31 → Feb 28)", () => {
        const term = createTerm("Due 31st", [
          createLine({
            valueType: "balance",
            value: "0",
            days: 0,
            dayOfMonth: 31,
            sequence: 10,
          }),
        ]);

        const invoiceDate = new Date("2026-02-01"); // February
        const total = new Decimal(1000);

        const installments = computeDueDates(invoiceDate, term, total);

        expect(installments[0]!.dueDate).toEqual(new Date("2026-02-28")); // Feb has 28 days
      });

      it("combines days offset with day_of_month", () => {
        const term = createTerm("30 days + 15th", [
          createLine({
            valueType: "balance",
            value: "0",
            days: 30,
            dayOfMonth: 15,
            sequence: 10,
          }),
        ]);

        const invoiceDate = new Date("2026-01-05");
        const total = new Decimal(1000);

        const installments = computeDueDates(invoiceDate, term, total);

        // 2026-01-05 + 30 days = 2026-02-04
        // Then move to 15th of that month = 2026-02-15
        expect(installments[0]!.dueDate).toEqual(new Date("2026-02-15"));
      });
    });

    describe("End-of-Month Rules", () => {
      it("moves to last day of month (31st)", () => {
        const term = createTerm("EOM", [
          createLine({
            valueType: "balance",
            value: "0",
            days: 0,
            endOfMonth: true,
            sequence: 10,
          }),
        ]);

        const invoiceDate = new Date("2026-01-15");
        const total = new Decimal(1000);

        const installments = computeDueDates(invoiceDate, term, total);

        expect(installments[0]!.dueDate).toEqual(new Date("2026-01-31")); // Jan has 31 days
      });

      it("handles February end-of-month (28th)", () => {
        const term = createTerm("EOM", [
          createLine({
            valueType: "balance",
            value: "0",
            days: 0,
            endOfMonth: true,
            sequence: 10,
          }),
        ]);

        const invoiceDate = new Date("2026-02-10");
        const total = new Decimal(1000);

        const installments = computeDueDates(invoiceDate, term, total);

        expect(installments[0]!.dueDate).toEqual(new Date("2026-02-28")); // Feb 2026 has 28 days
      });

      it("combines days offset with end_of_month", () => {
        const term = createTerm("30 + EOM", [
          createLine({
            valueType: "balance",
            value: "0",
            days: 30,
            endOfMonth: true,
            sequence: 10,
          }),
        ]);

        const invoiceDate = new Date("2026-01-05");
        const total = new Decimal(1000);

        const installments = computeDueDates(invoiceDate, term, total);

        // 2026-01-05 + 30 days = 2026-02-04
        // Then move to end of February = 2026-02-28
        expect(installments[0]!.dueDate).toEqual(new Date("2026-02-28"));
      });
    });

    describe("Complex Terms", () => {
      it("computes 2/10 Net 30 (early payment discount)", () => {
        // If paid within 10 days: 2% discount (pay 98%)
        // Else: full amount due in 30 days
        const term = createTerm("2/10 Net 30", [
          createLine({ valueType: "percent", value: "98", days: 10, sequence: 10 }),
          createLine({ valueType: "balance", value: "0", days: 30, sequence: 20 }),
        ]);

        const invoiceDate = new Date("2026-01-15");
        const total = new Decimal(1000);

        const installments = computeDueDates(invoiceDate, term, total);

        expect(installments).toHaveLength(2);

        // Early payment option: 98% in 10 days
        expect(installments[0]!.dueDate).toEqual(new Date("2026-01-25"));
        expect(installments[0]!.amount.toString()).toBe("980");

        // Or pay remaining 2% by day 30
        expect(installments[1]!.dueDate).toEqual(new Date("2026-02-14"));
        expect(installments[1]!.amount.toString()).toBe("20");
      });

      it("computes progressive payment schedule", () => {
        const term = createTerm("Progressive", [
          createLine({ valueType: "fixed", value: "1000", days: 0, sequence: 10 }), // Deposit
          createLine({ valueType: "percent", value: "50", days: 30, sequence: 20 }), // 50% midpoint
          createLine({ valueType: "balance", value: "0", days: 60, sequence: 30 }), // Final
        ]);

        const invoiceDate = new Date("2026-01-01");
        const total = new Decimal(10000);

        const installments = computeDueDates(invoiceDate, term, total);

        expect(installments).toHaveLength(3);
        expect(installments[0]!.amount.toString()).toBe("1000"); // $1000 deposit
        expect(installments[1]!.amount.toString()).toBe("5000"); // 50% of $10k
        expect(installments[2]!.amount.toString()).toBe("4000"); // Remaining

        const sum = installments.reduce((acc, inst) => acc.plus(inst.amount), new Decimal(0));
        expect(sum.toString()).toBe("10000");
      });
    });

    describe("Edge Cases", () => {
      it("throws error for term with no lines", () => {
        const term = createTerm("Empty", []);
        const invoiceDate = new Date("2026-01-15");
        const total = new Decimal(1000);

        expect(() => computeDueDates(invoiceDate, term, total)).toThrow(
          'Payment term "Empty" has no lines defined'
        );
      });

      it("handles zero total amount", () => {
        const term = createTerm("Net 30", [
          createLine({ valueType: "balance", value: "0", days: 30, sequence: 10 }),
        ]);

        const invoiceDate = new Date("2026-01-15");
        const total = new Decimal(0);

        const installments = computeDueDates(invoiceDate, term, total);

        expect(installments).toHaveLength(1);
        expect(installments[0]!.amount.toString()).toBe("0");
        expect(installments[0]!.percentage.toString()).toBe("0");
      });

      it("handles decimal amounts with financial precision", () => {
        const term = createTerm("50/50", [
          createLine({ valueType: "percent", value: "50", days: 0, sequence: 10 }),
          createLine({ valueType: "balance", value: "0", days: 30, sequence: 20 }),
        ]);

        const invoiceDate = new Date("2026-01-15");
        const total = new Decimal("1234.56");

        const installments = computeDueDates(invoiceDate, term, total);

        expect(installments).toHaveLength(2);
        expect(installments[0]!.amount.toString()).toBe("617.28"); // 50%
        expect(installments[1]!.amount.toString()).toBe("617.28"); // Remaining 50%

        const sum = installments.reduce((acc, inst) => acc.plus(inst.amount), new Decimal(0));
        expect(sum.toString()).toBe("1234.56");
      });

      it("validates installment sum equals total", () => {
        // This should fail because 100% + 1% = 101%
        const term = createTerm("Invalid", [
          createLine({ valueType: "percent", value: "100", days: 0, sequence: 10 }),
          createLine({ valueType: "percent", value: "1", days: 30, sequence: 20 }),
        ]);

        const invoiceDate = new Date("2026-01-15");
        const total = new Decimal(1000);

        // Should cap second installment to remaining (0)
        const installments = computeDueDates(invoiceDate, term, total);
        expect(installments[0]!.amount.toString()).toBe("1000");
        expect(installments[1]!.amount.toString()).toBe("0");
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // validatePaymentTerm Tests
  // ───────────────────────────────────────────────────────────────────────────

  describe("validatePaymentTerm", () => {
    it("accepts valid term with balance line", () => {
      const term = createTerm("Valid", [
        createLine({ valueType: "balance", value: "0", days: 30, sequence: 10 }),
      ]);

      const result = validatePaymentTerm(term);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects term with no lines", () => {
      const term = createTerm("Empty", []);

      const result = validatePaymentTerm(term);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Payment term must have at least one line");
    });

    it("rejects term without balance line", () => {
      const term = createTerm("No Balance", [
        createLine({ valueType: "percent", value: "50", days: 0, sequence: 10 }),
        createLine({ valueType: "percent", value: "50", days: 30, sequence: 20 }),
      ]);

      const result = validatePaymentTerm(term);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'At least one line must use valueType "balance" to capture remaining amount'
      );
    });

    it("rejects duplicate sequence numbers", () => {
      const term = createTerm("Duplicate Seq", [
        createLine({ valueType: "percent", value: "50", days: 0, sequence: 10 }),
        createLine({ valueType: "balance", value: "0", days: 30, sequence: 10 }), // Duplicate!
      ]);

      const result = validatePaymentTerm(term);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Payment term lines must have unique sequence numbers");
    });

    it("rejects percent > 100", () => {
      const term = createTerm("Invalid Percent", [
        createLine({ valueType: "percent", value: "150", days: 0, sequence: 10 }),
        createLine({ valueType: "balance", value: "0", days: 30, sequence: 20 }),
      ]);

      const result = validatePaymentTerm(term);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Line sequence 10: percent value must be 0-100, got 150");
    });

    it("rejects negative percent", () => {
      const term = createTerm("Negative Percent", [
        createLine({ valueType: "percent", value: "-10", days: 0, sequence: 10 }),
        createLine({ valueType: "balance", value: "0", days: 30, sequence: 20 }),
      ]);

      const result = validatePaymentTerm(term);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Line sequence 10: percent value must be 0-100, got -10");
    });

    it("rejects negative fixed amount", () => {
      const term = createTerm("Negative Fixed", [
        createLine({ valueType: "fixed", value: "-500", days: 0, sequence: 10 }),
        createLine({ valueType: "balance", value: "0", days: 30, sequence: 20 }),
      ]);

      const result = validatePaymentTerm(term);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Line sequence 10: fixed value must be non-negative, got -500"
      );
    });

    it("rejects negative days", () => {
      const term = createTerm("Negative Days", [
        createLine({ valueType: "balance", value: "0", days: -10, sequence: 10 }),
      ]);

      const result = validatePaymentTerm(term);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Line sequence 10: days must be non-negative, got -10");
    });

    it("rejects invalid day_of_month", () => {
      const term = createTerm("Invalid DOM", [
        createLine({
          valueType: "balance",
          value: "0",
          days: 0,
          dayOfMonth: 35,
          sequence: 10,
        }),
      ]);

      const result = validatePaymentTerm(term);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Line sequence 10: day_of_month must be 1-31, got 35");
    });

    it("accepts valid multi-line term", () => {
      const term = createTerm("Valid Multi", [
        createLine({ valueType: "percent", value: "50", days: 0, sequence: 10 }),
        createLine({ valueType: "balance", value: "0", days: 30, sequence: 20 }),
      ]);

      const result = validatePaymentTerm(term);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
