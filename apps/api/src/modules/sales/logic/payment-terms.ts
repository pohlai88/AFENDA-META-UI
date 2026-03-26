/**
 * Payment Terms Engine
 * ====================
 * Computes due dates and installments for invoice payment terms
 *
 * Features:
 * - Balance, percentage, and fixed amount installments
 * - Day-of-month and end-of-month rules
 * - Multi-installment support (e.g., 50% now, 50% in 30 days)
 * - Financial precision with Decimal.js
 *
 * @module payment-terms
 */

import { Decimal } from "decimal.js";

// ───────────────────────────────────────────────────────────────────────────
// Type Definitions
// ───────────────────────────────────────────────────────────────────────────

export type PaymentTermValueType = "balance" | "percent" | "fixed";

export interface PaymentTermLine {
  id: string;
  paymentTermId: string;
  valueType: PaymentTermValueType;
  value: string; // Decimal string
  days: number;
  dayOfMonth: number | null;
  endOfMonth: boolean;
  sequence: number;
}

export interface PaymentTerm {
  id: string;
  name: string;
  note?: string | null;
  isActive: boolean;
  lines: PaymentTermLine[];
}

export interface DueDateInstallment {
  dueDate: Date;
  amount: Decimal;
  percentage: Decimal;
  lineSequence: number;
}

// ───────────────────────────────────────────────────────────────────────────
// Core Function
// ───────────────────────────────────────────────────────────────────────────

/**
 * Compute due dates and installment amounts for a payment term.
 *
 * Algorithm:
 * 1. Sort lines by sequence
 * 2. For each line:
 *    a. Calculate due date: invoice_date + days
 *    b. Apply day_of_month rule if set (move to specific day)
 *    c. Apply end_of_month rule if set (move to last day of month)
 *    d. Calculate installment amount:
 *       - balance: remaining amount after previous installments
 *       - percent: total × (value / 100)
 *       - fixed: value (as absolute amount)
 * 3. Ensure sum of installments equals total (handle rounding)
 *
 * @param invoiceDate - The invoice date (baseline for due date calculation)
 * @param term - Payment term with lines
 * @param total - Total invoice amount
 * @returns Array of installments with due dates and amounts
 *
 * @example
 * ```typescript
 * // Net 30: 100% due in 30 days
 * const term = {
 *   id: "1",
 *   name: "Net 30",
 *   lines: [
 *     { valueType: "balance", value: "0", days: 30, sequence: 10, ... }
 *   ]
 * };
 * const installments = computeDueDates(new Date("2026-01-15"), term, new Decimal(1000));
 * // [{ dueDate: 2026-02-14, amount: 1000, percentage: 100 }]
 *
 * // 50/50 Split: 50% now, 50% in 30 days
 * const splitTerm = {
 *   id: "2",
 *   name: "50/50",
 *   lines: [
 *     { valueType: "percent", value: "50", days: 0, sequence: 10, ... },
 *     { valueType: "balance", value: "0", days: 30, sequence: 20, ... }
 *   ]
 * };
 * const splitInstallments = computeDueDates(new Date("2026-01-15"), splitTerm, new Decimal(1000));
 * // [
 * //   { dueDate: 2026-01-15, amount: 500, percentage: 50 },
 * //   { dueDate: 2026-02-14, amount: 500, percentage: 50 }
 * // ]
 * ```
 */
export function computeDueDates(
  invoiceDate: Date,
  term: PaymentTerm,
  total: Decimal
): DueDateInstallment[] {
  if (!term.lines || term.lines.length === 0) {
    throw new Error(`Payment term "${term.name}" has no lines defined`);
  }

  // Sort lines by sequence
  const sortedLines = [...term.lines].sort((a, b) => a.sequence - b.sequence);

  const installments: DueDateInstallment[] = [];
  let remainingAmount = total;

  for (const line of sortedLines) {
    // Calculate base due date
    let dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + line.days);

    // Apply day_of_month rule
    if (line.dayOfMonth !== null) {
      const targetDay = line.dayOfMonth;
      const currentDay = dueDate.getDate();

      if (currentDay > targetDay) {
        // Move to next month
        dueDate.setMonth(dueDate.getMonth() + 1);
      }

      // Set to target day (will auto-adjust for months with fewer days)
      dueDate.setDate(Math.min(targetDay, getLastDayOfMonth(dueDate)));
    }

    // Apply end_of_month rule
    if (line.endOfMonth) {
      dueDate.setDate(getLastDayOfMonth(dueDate));
    }

    // Calculate installment amount
    let amount: Decimal;
    let percentage: Decimal;

    if (line.valueType === "balance") {
      // Remaining amount after all previous installments
      amount = remainingAmount;
      percentage = total.isZero() ? new Decimal(0) : remainingAmount.div(total).mul(100);
    } else if (line.valueType === "percent") {
      // Percentage of total
      const percent = new Decimal(line.value);
      amount = total.mul(percent).div(100);
      percentage = percent;
    } else if (line.valueType === "fixed") {
      // Fixed amount
      amount = new Decimal(line.value);
      percentage = total.isZero() ? new Decimal(0) : amount.div(total).mul(100);
    } else {
      throw new Error(`Unknown value_type: ${line.valueType}`);
    }

    // Ensure we don't exceed remaining amount
    if (amount.gt(remainingAmount)) {
      amount = remainingAmount;
      percentage = total.isZero() ? new Decimal(0) : amount.div(total).mul(100);
    }

    installments.push({
      dueDate,
      amount,
      percentage,
      lineSequence: line.sequence,
    });

    remainingAmount = remainingAmount.minus(amount);
  }

  // Validate: sum of installments should equal total (within rounding tolerance)
  const sum = installments.reduce((acc, inst) => acc.plus(inst.amount), new Decimal(0));
  const difference = total.minus(sum).abs();

  if (difference.gt(0.01)) {
    throw new Error(
      `Payment term installments (${sum.toString()}) do not sum to total (${total.toString()}). Difference: ${difference.toString()}`
    );
  }

  return installments;
}

// ───────────────────────────────────────────────────────────────────────────
// Helper Functions
// ───────────────────────────────────────────────────────────────────────────

/**
 * Get the last day of the month for a given date.
 */
function getLastDayOfMonth(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  // Day 0 of next month = last day of current month
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Validate that a payment term's lines are correctly configured.
 *
 * Rules:
 * - At least one line must exist
 * - Percent values must be 0-100
 * - Days must be non-negative
 * - Sequences must be unique
 * - At least one line must use "balance" to consume remaining amount
 */
export function validatePaymentTerm(term: PaymentTerm): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!term.lines || term.lines.length === 0) {
    errors.push("Payment term must have at least one line");
    return { valid: false, errors };
  }

  // Check for duplicate sequences
  const sequences = term.lines.map((l) => l.sequence);
  const uniqueSequences = new Set(sequences);
  if (sequences.length !== uniqueSequences.size) {
    errors.push("Payment term lines must have unique sequence numbers");
  }

  // Validate each line
  let hasBalance = false;
  for (const line of term.lines) {
    if (line.valueType === "balance") {
      hasBalance = true;
    }

    if (line.valueType === "percent") {
      const val = new Decimal(line.value);
      if (val.lt(0) || val.gt(100)) {
        errors.push(
          `Line sequence ${line.sequence}: percent value must be 0-100, got ${line.value}`
        );
      }
    }

    if (line.valueType === "fixed") {
      const val = new Decimal(line.value);
      if (val.lt(0)) {
        errors.push(
          `Line sequence ${line.sequence}: fixed value must be non-negative, got ${line.value}`
        );
      }
    }

    if (line.days < 0) {
      errors.push(`Line sequence ${line.sequence}: days must be non-negative, got ${line.days}`);
    }

    if (line.dayOfMonth !== null && (line.dayOfMonth < 1 || line.dayOfMonth > 31)) {
      errors.push(
        `Line sequence ${line.sequence}: day_of_month must be 1-31, got ${line.dayOfMonth}`
      );
    }
  }

  if (!hasBalance) {
    errors.push('At least one line must use valueType "balance" to capture remaining amount');
  }

  return { valid: errors.length === 0, errors };
}
