import { Decimal } from "decimal.js";
import type {
  Subscription,
  SubscriptionBillingPeriod,
  SubscriptionLine,
  SubscriptionStatus,
  SubscriptionTemplate,
} from "@afenda/db/schema/sales";
import { StateMachine, type TransitionRule } from "../../../utils/state-machine.js";

export type SubscriptionInvariantCode =
  | "SUB-1" // Subscription must have lines
  | "SUB-2" // Start date must be < end date (if end date exists)
  | "SUB-3" // Next invoice date must be >= start date
  | "SUB-4" // Billing day must be valid for period (1-31)
  | "SUB-5" // MRR must equal sum of line totals (monthly normalized)
  | "SUB-6" // ARR must equal MRR × 12
  | "SUB-7" // Line subtotal must match formula: qty × price × (1 - discount/100)
  | "SUB-8" // Negative financial values not allowed
  | "SUB-9" // Paused subscription should have resume reason
  | "SUB-10"; // Cancelled/expired subscription must have close reason

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  code: SubscriptionInvariantCode;
  severity: ValidationSeverity;
  message: string;
  context?: Record<string, unknown>;
}

export interface SubscriptionLineValidation {
  lineId: SubscriptionLine["id"];
  productId: SubscriptionLine["productId"];
  quantity: string;
  priceUnit: string;
  discount: string;
  expectedSubtotal: string;
  actualSubtotal: string;
  subtotalValid: boolean;
}

export interface SubscriptionValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  errors: string[];
  lineChecks: SubscriptionLineValidation[];
}

export interface ValidateSubscriptionInput {
  subscription: Pick<
    Subscription,
    | "id"
    | "status"
    | "dateStart"
    | "dateEnd"
    | "nextInvoiceDate"
    | "recurringTotal"
    | "mrr"
    | "arr"
    | "closeReasonId"
  >;
  lines: Array<
    Pick<SubscriptionLine, "id" | "productId" | "quantity" | "priceUnit" | "discount" | "subtotal">
  >;
  template: Pick<SubscriptionTemplate, "billingPeriod" | "billingDay">;
}

export interface MRRComputationInput {
  lines: Array<Pick<SubscriptionLine, "subtotal">>;
  billingPeriod: SubscriptionBillingPeriod;
}

export interface MRRComputationResult {
  lineTotal: Decimal;
  periodMultiplier: Decimal;
  mrr: Decimal;
  arr: Decimal;
}

export interface NextInvoiceDateInput {
  currentDate: Date;
  lastInvoiced?: Date;
  billingPeriod: SubscriptionBillingPeriod;
  billingDay: number;
  /** When set, calendar periods align to this anchor (UTC calendar); omit to keep legacy behavior. */
  billingAnchorDate?: Date;
}

export interface SubscriptionExpiryInput {
  subscription: Pick<Subscription, "status" | "dateStart" | "dateEnd">;
  evaluatedAt?: Date;
}

export interface SubscriptionExpiryResult {
  currentStatus: SubscriptionStatus;
  expired: boolean;
  shouldExpire: boolean;
  expiryDate: Date | null;
  evaluatedAt: Date;
}

/**
 * Subscription state machine transitions.
 *
 * Lifecycle: draft → active → [paused ⇄ active] → [cancelled | expired]
 *                ↓                    ↓
 *            cancelled          [past_due → active]
 *
 * Guards:
 * - active: requires valid lines and start date
 * - past_due: requires payment failure flag
 * - expired: requires end date reached
 * - cancelled: requires close reason
 */
const SUBSCRIPTION_STATE_MACHINE_RULES: TransitionRule<SubscriptionStatus>[] = [
  {
    from: "draft",
    to: "active",
    guard: (ctx) => {
      const hasLines = ctx.hasLines === true;
      const startDateValid = ctx.startDateValid === true;
      return hasLines && startDateValid;
    },
    description: "Activate subscription after validation (requires lines and valid start date)",
  },
  {
    from: "active",
    to: "paused",
    description: "Pause active subscription (temporary suspension)",
  },
  {
    from: "paused",
    to: "active",
    description: "Resume paused subscription",
  },
  {
    from: "active",
    to: "past_due",
    guard: (ctx) => ctx.paymentFailed === true,
    description: "Mark subscription past due after payment failure",
  },
  {
    from: "past_due",
    to: "active",
    guard: (ctx) => ctx.paymentResolved === true,
    description: "Reactivate subscription after payment resolution",
  },
  {
    from: "past_due",
    to: "cancelled",
    guard: (ctx) => ctx.hasCloseReason === true,
    description: "Cancel past due subscription (requires close reason)",
  },
  {
    from: "draft",
    to: "cancelled",
    guard: (ctx) => ctx.hasCloseReason === true,
    description: "Cancel draft subscription (requires close reason)",
  },
  {
    from: "active",
    to: "cancelled",
    guard: (ctx) => ctx.hasCloseReason === true,
    description: "Cancel active subscription (requires close reason)",
  },
  {
    from: "paused",
    to: "cancelled",
    guard: (ctx) => ctx.hasCloseReason === true,
    description: "Cancel paused subscription (requires close reason)",
  },
  {
    from: "active",
    to: "expired",
    guard: (ctx) => ctx.endDateReached === true,
    description: "Expire subscription when end date reached",
  },
];

export const subscriptionStateMachine = new StateMachine<SubscriptionStatus>(
  SUBSCRIPTION_STATE_MACHINE_RULES
);

/**
 * Financial tolerance for decimal comparisons (±$0.01).
 * Handles rounding differences in multi-line calculations.
 */
const FINANCIAL_TOLERANCE = new Decimal("0.01");

export class SubscriptionEngineError extends Error {
  constructor(
    message: string,
    readonly code?: SubscriptionInvariantCode
  ) {
    super(message);
    this.name = "SubscriptionEngineError";
  }
}

/**
 * Computes line subtotal: quantity × priceUnit × (1 - discount/100).
 *
 * @param quantity - Subscription quantity
 * @param priceUnit - Unit price
 * @param discount - Discount percentage (0-100)
 * @returns Subtotal rounded to 2 decimal places
 */
export function computeLineSubtotal(
  quantity: Decimal,
  priceUnit: Decimal,
  discount: Decimal
): Decimal {
  const discountMultiplier = new Decimal(1).minus(discount.div(100));
  return quantity.mul(priceUnit).mul(discountMultiplier).toDecimalPlaces(2);
}

/**
 * Checks if two decimal amounts are equal within tolerance (±$0.01).
 *
 * @param a - First amount
 * @param b - Second amount
 * @returns True if amounts differ by ≤ $0.01
 */
export function isFinanciallyEqual(a: Decimal, b: Decimal): boolean {
  return a.minus(b).abs().lte(FINANCIAL_TOLERANCE);
}

/**
 * Validates subscription lines and financial calculations.
 *
 * Invariants:
 * - SUB-1: Must have at least one line
 * - SUB-2: dateEnd must be after dateStart (if present)
 * - SUB-3: nextInvoiceDate must be >= dateStart
 * - SUB-4: billingDay must be 1-31
 * - SUB-5: MRR must match normalized line total (±$0.01)
 * - SUB-6: ARR must equal MRR × 12 (±$0.01)
 * - SUB-7: Each line subtotal must match formula (±$0.01)
 * - SUB-8: No negative financial values
 * - SUB-10: Cancelled/expired must have closeReasonId
 *
 * @param input - Subscription, lines, and template
 * @returns Validation result with issues and line checks
 */
export function validateSubscription(
  input: ValidateSubscriptionInput
): SubscriptionValidationResult {
  const { subscription, lines, template } = input;
  const issues: ValidationIssue[] = [];
  const lineChecks: SubscriptionLineValidation[] = [];

  // SUB-1: Must have lines
  if (lines.length === 0) {
    issues.push({
      code: "SUB-1",
      severity: "error",
      message: "Subscription must have at least one line",
      context: { subscriptionId: subscription.id },
    });
  }

  // SUB-2: End date validation
  if (subscription.dateEnd) {
    const startMs = subscription.dateStart.getTime();
    const endMs = subscription.dateEnd.getTime();
    if (endMs <= startMs) {
      issues.push({
        code: "SUB-2",
        severity: "error",
        message: "End date must be after start date",
        context: {
          subscriptionId: subscription.id,
          dateStart: subscription.dateStart.toISOString(),
          dateEnd: subscription.dateEnd.toISOString(),
        },
      });
    }
  }

  // SUB-3: Next invoice date validation
  const startMs = subscription.dateStart.getTime();
  const nextInvoiceMs = subscription.nextInvoiceDate.getTime();
  if (nextInvoiceMs < startMs) {
    issues.push({
      code: "SUB-3",
      severity: "error",
      message: "Next invoice date must be >= start date",
      context: {
        subscriptionId: subscription.id,
        dateStart: subscription.dateStart.toISOString(),
        nextInvoiceDate: subscription.nextInvoiceDate.toISOString(),
      },
    });
  }

  // SUB-4: Billing day validation
  if (template.billingDay < 1 || template.billingDay > 31) {
    issues.push({
      code: "SUB-4",
      severity: "error",
      message: "Billing day must be between 1 and 31",
      context: { billingDay: template.billingDay },
    });
  }

  // SUB-7: Validate line subtotals
  for (const line of lines) {
    const qty = new Decimal(line.quantity);
    const price = new Decimal(line.priceUnit);
    const discount = new Decimal(line.discount);
    const actualSubtotal = new Decimal(line.subtotal);
    const expectedSubtotal = computeLineSubtotal(qty, price, discount);

    const subtotalValid = isFinanciallyEqual(actualSubtotal, expectedSubtotal);

    lineChecks.push({
      lineId: line.id,
      productId: line.productId,
      quantity: line.quantity,
      priceUnit: line.priceUnit,
      discount: line.discount,
      expectedSubtotal: expectedSubtotal.toString(),
      actualSubtotal: line.subtotal,
      subtotalValid,
    });

    if (!subtotalValid) {
      issues.push({
        code: "SUB-7",
        severity: "error",
        message: `Line subtotal mismatch (expected: ${expectedSubtotal}, actual: ${line.subtotal})`,
        context: {
          lineId: line.id,
          productId: line.productId,
          quantity: line.quantity,
          priceUnit: line.priceUnit,
          discount: line.discount,
          expected: expectedSubtotal.toString(),
          actual: line.subtotal,
        },
      });
    }

    // SUB-8: Check for negative values
    if (qty.lt(0) || price.lt(0) || discount.lt(0) || actualSubtotal.lt(0)) {
      issues.push({
        code: "SUB-8",
        severity: "error",
        message: "Negative financial values not allowed",
        context: {
          lineId: line.id,
          quantity: line.quantity,
          priceUnit: line.priceUnit,
          discount: line.discount,
          subtotal: line.subtotal,
        },
      });
    }
  }

  // SUB-5: MRR validation (if lines exist)
  if (lines.length > 0) {
    const computed = computeMRR({ lines, billingPeriod: template.billingPeriod });
    const actualMrr = new Decimal(subscription.mrr);

    if (!isFinanciallyEqual(actualMrr, computed.mrr)) {
      issues.push({
        code: "SUB-5",
        severity: "error",
        message: `MRR mismatch (expected: ${computed.mrr}, actual: ${subscription.mrr})`,
        context: {
          subscriptionId: subscription.id,
          billingPeriod: template.billingPeriod,
          lineTotal: computed.lineTotal.toString(),
          periodMultiplier: computed.periodMultiplier.toString(),
          expectedMrr: computed.mrr.toString(),
          actualMrr: subscription.mrr,
        },
      });
    }
  }

  // SUB-6: ARR validation
  const actualMrr = new Decimal(subscription.mrr);
  const actualArr = new Decimal(subscription.arr);
  const expectedArr = actualMrr.mul(12);

  if (!isFinanciallyEqual(actualArr, expectedArr)) {
    issues.push({
      code: "SUB-6",
      severity: "error",
      message: `ARR must equal MRR × 12 (expected: ${expectedArr}, actual: ${subscription.arr})`,
      context: {
        subscriptionId: subscription.id,
        mrr: subscription.mrr,
        expectedArr: expectedArr.toString(),
        actualArr: subscription.arr,
      },
    });
  }

  // SUB-8: Subscription-level negative values
  if (actualMrr.lt(0) || actualArr.lt(0) || new Decimal(subscription.recurringTotal).lt(0)) {
    issues.push({
      code: "SUB-8",
      severity: "error",
      message: "Subscription financial values cannot be negative",
      context: {
        subscriptionId: subscription.id,
        mrr: subscription.mrr,
        arr: subscription.arr,
        recurringTotal: subscription.recurringTotal,
      },
    });
  }

  // SUB-10: Close reason for cancelled/expired
  const requiresCloseReason = ["cancelled", "expired"].includes(subscription.status);
  if (requiresCloseReason && !subscription.closeReasonId) {
    issues.push({
      code: "SUB-10",
      severity: "error",
      message: `${subscription.status} subscription must have a close reason`,
      context: {
        subscriptionId: subscription.id,
        status: subscription.status,
      },
    });
  }

  const errors = issues.filter((i) => i.severity === "error").map((i) => i.message);

  return {
    valid: errors.length === 0,
    issues,
    errors,
    lineChecks,
  };
}

/**
 * Computes Monthly Recurring Revenue (MRR) and Annual Recurring Revenue (ARR).
 *
 * Algorithm:
 * 1. Sum all line subtotals
 * 2. Normalize to monthly based on billing period:
 *    - Weekly: × (52/12) ≈ 4.333
 *    - Monthly: × 1
 *    - Quarterly: × (1/3) ≈ 0.333
 *    - Yearly: × (1/12) ≈ 0.083
 * 3. ARR = MRR × 12
 *
 * @param input - Lines and billing period
 * @returns MRR/ARR computation result
 */
export function computeMRR(input: MRRComputationInput): MRRComputationResult {
  const lineTotal = input.lines.reduce(
    (sum, line) => sum.plus(new Decimal(line.subtotal)),
    new Decimal(0)
  );

  // Period multipliers to normalize to monthly
  const periodMultipliers: Record<SubscriptionBillingPeriod, Decimal> = {
    weekly: new Decimal(52).div(12), // ~4.333
    monthly: new Decimal(1),
    quarterly: new Decimal(1).div(3), // ~0.333
    yearly: new Decimal(1).div(12), // ~0.083
  };

  const periodMultiplier = periodMultipliers[input.billingPeriod];
  const mrr = lineTotal.mul(periodMultiplier).toDecimalPlaces(2);
  const arr = mrr.mul(12).toDecimalPlaces(2);

  return {
    lineTotal,
    periodMultiplier,
    mrr,
    arr,
  };
}

function monthIndexUtc(d: Date): number {
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

function utcDateWithBillingDay(
  year: number,
  month: number,
  billingDay: number,
  timeFrom: Date
): Date {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(billingDay, lastDay);
  return new Date(
    Date.UTC(
      year,
      month,
      day,
      timeFrom.getUTCHours(),
      timeFrom.getUTCMinutes(),
      timeFrom.getUTCSeconds(),
      timeFrom.getUTCMilliseconds()
    )
  );
}

/**
 * Next invoice on anchor-aligned month grid (monthly / quarterly / yearly), strictly after `base`.
 */
function computeNextInvoiceDateAnchoredCalendar(
  base: Date,
  anchor: Date,
  billingPeriod: Exclude<SubscriptionBillingPeriod, "weekly">,
  billingDay: number
): Date {
  const stepMonths: Record<Exclude<SubscriptionBillingPeriod, "weekly">, number> = {
    monthly: 1,
    quarterly: 3,
    yearly: 12,
  };
  const step = stepMonths[billingPeriod];
  const anchorIdx = monthIndexUtc(anchor);
  let idx = anchorIdx;
  const maxIterations = 1200;
  for (let i = 0; i < maxIterations; i += 1) {
    const y = Math.floor(idx / 12);
    const m = idx % 12;
    const candidate = utcDateWithBillingDay(y, m, billingDay, base);
    if (candidate.getTime() > base.getTime()) {
      return candidate;
    }
    idx += step;
  }
  throw new SubscriptionEngineError(
    "Could not resolve next invoice date on billing anchor grid",
    "SUB-3"
  );
}

function computeNextInvoiceDateAnchoredWeekly(base: Date, anchor: Date): Date {
  const anchorMs = Date.UTC(
    anchor.getUTCFullYear(),
    anchor.getUTCMonth(),
    anchor.getUTCDate(),
    base.getUTCHours(),
    base.getUTCMinutes(),
    base.getUTCSeconds(),
    base.getUTCMilliseconds()
  );
  const periodMs = 7 * 24 * 60 * 60 * 1000;
  const baseMs = base.getTime();
  const n = Math.floor((baseMs - anchorMs) / periodMs) + 1;
  return new Date(anchorMs + n * periodMs);
}

/**
 * Computes the next invoice date based on billing period and billing day.
 *
 * Algorithm:
 * 1. Start from lastInvoiced or currentDate
 * 2. Add period interval (week, month, quarter, year)
 * 3. Set to billingDay (with month-end clamping)
 *
 * When `billingAnchorDate` is set, period boundaries are derived from that anchor (UTC calendar);
 * otherwise the legacy “advance one period from base” behavior is preserved.
 *
 * @param input - Current date, last invoiced, billing config
 * @returns Next invoice date
 */
export function computeNextInvoiceDate(input: NextInvoiceDateInput): Date {
  const baseDate = input.lastInvoiced ? new Date(input.lastInvoiced) : new Date(input.currentDate);

  if (input.billingAnchorDate) {
    const anchor = new Date(input.billingAnchorDate);
    if (input.billingPeriod === "weekly") {
      return computeNextInvoiceDateAnchoredWeekly(baseDate, anchor);
    }
    return computeNextInvoiceDateAnchoredCalendar(
      baseDate,
      anchor,
      input.billingPeriod,
      input.billingDay
    );
  }

  if (input.billingPeriod === "weekly") {
    const weeklyDate = new Date(baseDate);
    weeklyDate.setDate(weeklyDate.getDate() + 7);
    return weeklyDate;
  }

  const monthOffsetByPeriod: Record<Exclude<SubscriptionBillingPeriod, "weekly">, number> = {
    monthly: 1,
    quarterly: 3,
    yearly: 12,
  };

  const monthOffset = monthOffsetByPeriod[input.billingPeriod];
  const monthIndex = baseDate.getFullYear() * 12 + baseDate.getMonth() + monthOffset;
  const targetYear = Math.floor(monthIndex / 12);
  const targetMonth = monthIndex % 12;
  const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(input.billingDay, lastDayOfMonth);

  return new Date(
    targetYear,
    targetMonth,
    targetDay,
    baseDate.getHours(),
    baseDate.getMinutes(),
    baseDate.getSeconds(),
    baseDate.getMilliseconds()
  );
}

/**
 * Detects if a subscription has expired based on end date.
 *
 * @param input - Subscription and evaluation date
 * @returns Expiry detection result
 */
export function detectSubscriptionExpiry(input: SubscriptionExpiryInput): SubscriptionExpiryResult {
  const { subscription } = input;
  const evaluatedAt = input.evaluatedAt ?? new Date();

  const expired = subscription.status === "expired";
  const hasEndDate = subscription.dateEnd !== null;
  const endDateReached = hasEndDate && subscription.dateEnd!.getTime() <= evaluatedAt.getTime();

  const shouldExpire = !expired && subscription.status === "active" && endDateReached;

  return {
    currentStatus: subscription.status as SubscriptionStatus,
    expired,
    shouldExpire,
    expiryDate: subscription.dateEnd,
    evaluatedAt,
  };
}
