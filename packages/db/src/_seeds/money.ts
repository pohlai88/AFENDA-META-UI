import { Decimal } from "decimal.js";

/**
 * Shared invariant-safe money utilities for seeds, factories, and tests.
 * Enterprise-grade: precise decimal math, type safety, and extensibility.
 */

export type MoneyString = `${number}.${number}`; // formatted 2-decimal string

/** Format a Decimal or number as a 2-decimal string suitable for DB columns. */
export function money(value: Decimal.Value): MoneyString {
  return new Decimal(value).toFixed(2) as MoneyString;
}

/** Locale-aware currency formatter for UI display. */
export function formatCurrency(
  value: Decimal.Value,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(new Decimal(value).toNumber());
}

/** Invariant: subtotal = (qty × price) - discount. Clamped at zero to prevent negatives. */
export function calcLineSubtotal(
  qty: Decimal.Value,
  price: Decimal.Value,
  discount: Decimal.Value
): Decimal {
  const subtotal = new Decimal(qty).mul(price).minus(discount);
  return Decimal.max(subtotal, 0);
}

/**
 * Invariants:
 *   amountUntaxed = SUM(line subtotals)
 *   amountTax     = amountUntaxed × taxRate
 *   amountTotal   = amountUntaxed + amountTax
 */
export function calcOrderTotals(
  lineSubtotals: Decimal.Value[],
  taxRate: Decimal.Value = 0.1,
  currency: string = "USD",
  locale: string = "en-US"
): {
  amountUntaxed: MoneyString;
  amountTax: MoneyString;
  amountTotal: MoneyString;
  display: { untaxed: string; tax: string; total: string };
  raw: { untaxed: Decimal; tax: Decimal; total: Decimal };
} {
  const untaxed = lineSubtotals.reduce<Decimal>(
    (sum, value) => sum.plus(value),
    new Decimal(0)
  );
  const tax = untaxed.mul(taxRate);
  const total = untaxed.plus(tax);

  return {
    amountUntaxed: money(untaxed),
    amountTax: money(tax),
    amountTotal: money(total),
    display: {
      untaxed: formatCurrency(untaxed, currency, locale),
      tax: formatCurrency(tax, currency, locale),
      total: formatCurrency(total, currency, locale),
    },
    raw: { untaxed, tax, total },
  };
}
