/**
 * Reference Data Logic
 * ====================
 *
 * Core logic for platform reference data including:
 * - Sequence number generation (atomic document numbering)
 * - Currency rate lookups and conversions
 * - Unit of measure conversions
 *
 * Phase 0: Platform Reference Data (Sales Domain Expansion)
 */

import type { Sequence, Currency, CurrencyRate, UnitOfMeasure } from "@afenda/db/schema/reference";
import { Decimal } from "decimal.js";

// ============================================================================
// Type Definitions
// ============================================================================

export interface NextValInput {
  tenantId: number;
  code: string;
}

export interface NextValResult {
  sequence: string;
  nextNumber: number;
}

export interface GetRateInput {
  currencyCode: string;
  date: string; // ISO 8601 date string YYYY-MM-DD
}

export interface ConvertInput {
  quantity: string | number;
  fromUomId: number;
  toUomId: number;
}

export interface SequenceContext {
  sequence: Pick<
    Sequence,
    "sequenceId" | "prefix" | "suffix" | "padding" | "step" | "nextNumber" | "resetPeriod"
  >;
}

export interface CurrencyContext {
  currency: Pick<Currency, "code" | "decimalPlaces">;
  rates: Array<Pick<CurrencyRate, "rate" | "effectiveDate">>;
}

export interface UomContext {
  fromUom: Pick<UnitOfMeasure, "uomId" | "categoryId" | "factor" | "rounding">;
  toUom: Pick<UnitOfMeasure, "uomId" | "categoryId" | "factor" | "rounding">;
}

// ============================================================================
// Error Classes
// ============================================================================

export class ReferenceDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReferenceDataError";
  }
}

export class SequenceNotFoundError extends ReferenceDataError {
  constructor(tenantId: number, code: string) {
    super(`Sequence not found for tenant ${tenantId} and code "${code}"`);
    this.name = "SequenceNotFoundError";
  }
}

export class CurrencyNotFoundError extends ReferenceDataError {
  constructor(code: string) {
    super(`Currency not found: ${code}`);
    this.name = "CurrencyNotFoundError";
  }
}

export class CurrencyRateNotFoundError extends ReferenceDataError {
  constructor(currencyCode: string, date: string) {
    super(`Currency rate not found for ${currencyCode} on ${date}`);
    this.name = "CurrencyRateNotFoundError";
  }
}

export class UomNotFoundError extends ReferenceDataError {
  constructor(uomId: number) {
    super(`Unit of measure not found: ${uomId}`);
    this.name = "UomNotFoundError";
  }
}

export class UomCategoryMismatchError extends ReferenceDataError {
  constructor(fromCategoryId: number, toCategoryId: number) {
    super(`Cannot convert between different UoM categories: ${fromCategoryId} and ${toCategoryId}`);
    this.name = "UomCategoryMismatchError";
  }
}

// ============================================================================
// Sequence Number Generation
// ============================================================================

/**
 * Generate the next sequence number for document numbering
 *
 * Format: {prefix}{padded-number}{suffix}
 *
 * Example:
 *   prefix="SO", padding=5, nextNumber=42, suffix="/2026"
 *   → "SO00042/2026"
 *
 * This is a pure function that computes the next sequence value.
 * The actual database update (incrementing nextNumber) must be done
 * atomically by the caller using a transaction.
 *
 * @param context - Sequence configuration and state
 * @returns Formatted sequence string and next number to persist
 */
export function nextVal(context: SequenceContext): NextValResult {
  const { sequence } = context;
  const { prefix, suffix, padding, nextNumber } = sequence;

  // Pad the number with leading zeros
  const paddedNumber = String(nextNumber).padStart(padding, "0");

  // Build the final sequence string
  const parts: string[] = [];
  if (prefix) parts.push(prefix);
  parts.push(paddedNumber);
  if (suffix) parts.push(suffix);

  return {
    sequence: parts.join(""),
    nextNumber: nextNumber + sequence.step,
  };
}

// ============================================================================
// Currency Rate Lookup
// ============================================================================

/**
 * Get the exchange rate for a currency on a specific date
 *
 * Lookup strategy:
 * 1. Find exact match for date
 * 2. If not found, use the most recent rate before the date
 * 3. If no rates exist, throw error
 *
 * @param context - Currency and rate data
 * @param date - Target date in YYYY-MM-DD format
 * @returns Exchange rate as Decimal
 */
export function getRate(context: CurrencyContext, date: string): Decimal {
  const { rates } = context;

  if (rates.length === 0) {
    throw new CurrencyRateNotFoundError(context.currency.code, date);
  }

  // Sort rates by effective date descending
  const sortedRates = [...rates].sort((a, b) => {
    if (a.effectiveDate > b.effectiveDate) return -1;
    if (a.effectiveDate < b.effectiveDate) return 1;
    return 0;
  });

  // Find exact match or most recent rate before date
  const matchedRate = sortedRates.find((rate) => rate.effectiveDate <= date);

  if (!matchedRate) {
    throw new CurrencyRateNotFoundError(context.currency.code, date);
  }

  return new Decimal(matchedRate.rate);
}

// ============================================================================
// Unit of Measure Conversion
// ============================================================================

/**
 * Convert quantity between units of measure
 *
 * Formula: result = quantity * (fromUom.factor / toUom.factor)
 *
 * UoM Factor Rules:
 * - reference: factor = 1.0
 * - bigger: factor = base units per this unit (e.g., 1 dozen = 12 units)
 * - smaller: factor = this unit per base unit (e.g., 1 millimeter = 0.001 meters)
 *
 * Examples:
 *   UoM Category: Weight
 *     - kg (reference, factor=1.0)
 *     - ton (bigger, factor=1000.0)
 *     - gram (smaller, factor=0.001)
 *
 *   Convert 5 kg → tons:
 *     5 * (1.0 / 1000.0) = 0.005 tons
 *
 *   Convert 5000 grams → kg:
 *     5000 * (0.001 / 1.0) = 5.0 kg
 *
 * @param context - Source and target UoM definitions
 * @param quantity - Amount to convert
 * @returns Converted quantity rounded to target UoM precision
 */
export function convert(context: UomContext, quantity: string | number): Decimal {
  const { fromUom, toUom } = context;

  // Validate same category
  if (fromUom.categoryId !== toUom.categoryId) {
    throw new UomCategoryMismatchError(fromUom.categoryId, toUom.categoryId);
  }

  // Same UoM = no conversion
  if (fromUom.uomId === toUom.uomId) {
    return new Decimal(quantity);
  }

  const qtyDecimal = new Decimal(quantity);
  const fromFactor = new Decimal(fromUom.factor);
  const toFactor = new Decimal(toUom.factor);

  // Convert to base units, then to target units
  const result = qtyDecimal.mul(fromFactor).div(toFactor);

  // Round to target UoM rounding precision
  const rounding = new Decimal(toUom.rounding);
  return result.toDecimalPlaces(rounding.decimalPlaces(), Decimal.ROUND_HALF_UP);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a sequence number with date-based suffix
 *
 * Common pattern for reset periods:
 * - yearly: /YYYY (e.g., /2026)
 * - monthly: /YYYY-MM (e.g., /2026-03)
 *
 * @param baseSequence - Generated sequence number
 * @param resetPeriod - Period type
 * @param date - Current date
 * @returns Sequence with date suffix
 */
export function formatSequenceWithDate(
  baseSequence: string,
  resetPeriod: "yearly" | "monthly" | "never",
  date: Date = new Date()
): string {
  if (resetPeriod === "never") {
    return baseSequence;
  }

  const year = date.getFullYear();

  if (resetPeriod === "yearly") {
    return `${baseSequence}/${year}`;
  }

  if (resetPeriod === "monthly") {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${baseSequence}/${year}-${month}`;
  }

  return baseSequence;
}

/**
 * Check if a sequence should be reset based on reset period
 *
 * @param lastGeneratedDate - Last sequence generation date
 * @param resetPeriod - Period type
 * @param currentDate - Current date
 * @returns True if sequence should reset to 1
 */
export function shouldResetSequence(
  lastGeneratedDate: Date,
  resetPeriod: "yearly" | "monthly" | "never",
  currentDate: Date = new Date()
): boolean {
  if (resetPeriod === "never") {
    return false;
  }

  const lastYear = lastGeneratedDate.getFullYear();
  const currentYear = currentDate.getFullYear();

  if (resetPeriod === "yearly") {
    return currentYear > lastYear;
  }

  if (resetPeriod === "monthly") {
    const lastMonth = lastGeneratedDate.getMonth();
    const currentMonth = currentDate.getMonth();
    return currentYear > lastYear || (currentYear === lastYear && currentMonth > lastMonth);
  }

  return false;
}
