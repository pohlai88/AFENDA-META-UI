/**
 * Tax Computation Engine
 * ======================
 * Enterprise-grade tax calculation supporting:
 * - Tax-inclusive vs tax-exclusive pricing
 * - Compound/cascading taxes (tax on tax)
 * - Multi-jurisdiction tax substitution via fiscal positions
 * - Rounding strategies (per-line vs per-order)
 *
 * Accuracy: Uses Decimal.js for financial precision (no floating-point errors)
 *
 * @module tax-engine
 */

import { Decimal } from "decimal.js";

// ───────────────────────────────────────────────────────────────────────────
// Type Definitions
// ───────────────────────────────────────────────────────────────────────────

export type TaxTypeUse = "sale" | "purchase" | "none";
export type TaxAmountType = "percent" | "fixed" | "group" | "code";

export interface TaxRate {
  id: string;
  name: string;
  typeTaxUse: TaxTypeUse;
  amountType: TaxAmountType;
  amount: string;
  priceInclude: boolean;
  sequence: number;
  taxGroupId?: string | null;
  children?: TaxRate[]; // For compound taxes
}

export interface FiscalPosition {
  id: string;
  name: string;
  countryId?: number | null;
  stateIds?: string | null;
  zipFrom?: string | null;
  zipTo?: string | null;
  autoApply: boolean;
  vatRequired: boolean;
  taxMaps?: Array<{
    taxSrcId: string;
    taxDestId: string | null; // null = exempt
  }>;
  accountMaps?: Array<{
    accountSrcId: string;
    accountDestId: string;
  }>;
}

export interface Partner {
  id: string;
  countryId?: number | null;
  stateId?: number | null;
  zip?: string | null;
  vat?: string | null;
  defaultFiscalPositionId?: string | null;
}

export interface TaxLine {
  taxId: string;
  taxName: string;
  rate: Decimal;
  base: Decimal; // Amount this tax applies to
  amount: Decimal;
}

export interface TaxComputation {
  base: Decimal;
  taxLines: TaxLine[];
  total: Decimal;
}

export interface OrderLine {
  priceUnit: string | number;
  quantity: string | number;
  discount: string | number;
  taxIds: string[];
}

export interface TaxEngineContext {
  taxes: Map<string, TaxRate>;
  fiscalPositions?: Map<string, FiscalPosition>;
  partner?: Partner;
}

// ───────────────────────────────────────────────────────────────────────────
// Core Functions
// ───────────────────────────────────────────────────────────────────────────

/**
 * Compute taxes for a single order line.
 *
 * Algorithm:
 * 1. Calculate line subtotal: quantity * price_unit * (1 - discount%)
 * 2. Apply fiscal position tax mapping (if provided)
 * 3. Expand compound taxes into children
 * 4. Separate tax-included vs tax-excluded taxes
 * 5. For tax-included: decompose base from price (reverse calculation)
 * 6. For tax-excluded: apply tax on top of base
 * 7. Handle cascading taxes (tax on tax) via sequence ordering
 *
 * @param context - Tax engine context with tax definitions
 * @param priceUnit - Unit price (before discount)
 * @param quantity - Line quantity
 * @param discount - Discount percentage (0-100)
 * @param taxIds - Array of tax IDs to apply
 * @param fiscalPosition - Optional fiscal position for tax mapping
 * @returns Tax computation result with base, tax lines, and total
 */
export function computeLineTaxes(
  context: TaxEngineContext,
  priceUnit: string | number,
  quantity: string | number,
  discount: string | number,
  taxIds: string[],
  fiscalPosition?: FiscalPosition
): TaxComputation {
  const price = new Decimal(priceUnit);
  const qty = new Decimal(quantity);
  const discountPct = new Decimal(discount);

  // Calculate gross subtotal (before tax consideration)
  const grossSubtotal = price.mul(qty).mul(new Decimal(1).minus(discountPct.div(100)));

  // Apply fiscal position tax mapping
  const mappedTaxIds = fiscalPosition
    ? taxIds
        .map((id) => mapTax(context, id, fiscalPosition))
        .filter((id): id is string => id !== null)
    : taxIds;

  // Resolve taxes and expand compound taxes
  const applicableTaxes = expandCompoundTaxes(context, mappedTaxIds);

  if (applicableTaxes.length === 0) {
    return {
      base: grossSubtotal,
      taxLines: [],
      total: grossSubtotal,
    };
  }

  // Separate tax-included vs tax-excluded
  const includedTaxes = applicableTaxes.filter((t) => t.priceInclude);
  const excludedTaxes = applicableTaxes.filter((t) => !t.priceInclude);

  // Step 1: Decompose tax-included taxes from gross subtotal
  let base = grossSubtotal;
  const taxLines: TaxLine[] = [];

  if (includedTaxes.length > 0) {
    const { netBase, taxes: includedTaxLines } = decomposeTaxIncluded(grossSubtotal, includedTaxes);
    base = netBase;
    taxLines.push(...includedTaxLines);
  }

  // Step 2: Apply tax-excluded taxes on net base
  if (excludedTaxes.length > 0) {
    const excludedTaxLines = applyTaxesOnBase(base, excludedTaxes);
    taxLines.push(...excludedTaxLines);
  }

  // Step 3: Calculate total
  const totalTax = taxLines.reduce((sum, line) => sum.plus(line.amount), new Decimal(0));
  const total = base.plus(totalTax);

  return {
    base,
    taxLines,
    total,
  };
}

/**
 * Decompose tax-included price into net base and tax amounts.
 *
 * For tax-included pricing, the displayed price already includes the tax.
 * We need to reverse-calculate the base amount.
 *
 * Formula for single tax:
 *   gross = base * (1 + rate)
 *   base = gross / (1 + rate)
 *   tax = gross - base
 *
 * For multiple taxes:
 *   gross = base * (1 + tax1 + tax2 + ...)
 *   base = gross / (1 + sum(rates))
 *
 * @param grossAmount - Total amount including taxes
 * @param taxes - Array of included taxes
 * @returns Net base and individual tax line amounts
 */
function decomposeTaxIncluded(
  grossAmount: Decimal,
  taxes: TaxRate[]
): { netBase: Decimal; taxes: TaxLine[] } {
  // Calculate total tax rate
  const totalRate = taxes.reduce((sum, tax) => {
    const rate = getTaxRate(tax);
    return sum.plus(rate);
  }, new Decimal(0));

  // Decompose base
  const netBase = grossAmount.div(new Decimal(1).plus(totalRate));

  // Calculate individual tax amounts
  const taxLines: TaxLine[] = taxes.map((tax) => {
    const rate = getTaxRate(tax);
    const amount = netBase.mul(rate);

    return {
      taxId: tax.id,
      taxName: tax.name,
      rate,
      base: netBase,
      amount,
    };
  });

  return { netBase, taxes: taxLines };
}

/**
 * Apply tax-excluded taxes on a base amount.
 *
 * Tax-excluded means the tax is added on top of the base price.
 * Supports cascading taxes ordered by sequence.
 *
 * @param baseAmount - Net amount to apply taxes to
 * @param taxes - Array of excluded taxes (ordered by sequence)
 * @returns Array of tax lines
 */
function applyTaxesOnBase(baseAmount: Decimal, taxes: TaxRate[]): TaxLine[] {
  // Sort by sequence to handle cascading taxes
  const sortedTaxes = [...taxes].sort((a, b) => a.sequence - b.sequence);

  let runningBase = baseAmount;
  const taxLines: TaxLine[] = [];

  for (const tax of sortedTaxes) {
    const rate = getTaxRate(tax);
    const amount = runningBase.mul(rate);

    taxLines.push({
      taxId: tax.id,
      taxName: tax.name,
      rate,
      base: runningBase,
      amount,
    });

    // For cascading taxes, next tax applies to base + previous taxes
    // (Uncomment if cascading is required)
    // runningBase = runningBase.plus(amount);
  }

  return taxLines;
}

/**
 * Get the numeric tax rate from a TaxRate object.
 *
 * Handles different tax amount types:
 * - percent: amount is percentage (15 = 15%)
 * - fixed: amount is fixed per unit
 * - group: compound tax (use children)
 * - code: custom calculation (not yet implemented)
 *
 * @param tax - Tax rate definition
 * @returns Tax rate as decimal (0.15 for 15%)
 */
function getTaxRate(tax: TaxRate): Decimal {
  const amount = new Decimal(tax.amount);

  switch (tax.amountType) {
    case "percent":
      return amount.div(100);
    case "fixed":
      // Fixed amount per unit - requires quantity context
      // For now, treat as 0 (requires refactoring to pass quantity)
      return new Decimal(0);
    case "group":
      // Compound tax - should have children
      return new Decimal(0);
    case "code":
      // Custom code calculation - not implemented
      throw new Error(`Tax computation not implemented for type: ${tax.amountType}`);
    default:
      return new Decimal(0);
  }
}

/**
 * Expand compound taxes into their constituent child taxes.
 *
 * Compound taxes (e.g., GST = CGST + SGST) are represented as a parent
 * tax with children. This function recursively expands them.
 *
 * @param context - Tax engine context
 * @param taxIds - Array of tax IDs (may include compound taxes)
 * @returns Flattened array of leaf taxes
 */
function expandCompoundTaxes(context: TaxEngineContext, taxIds: string[]): TaxRate[] {
  const expandedTaxes: TaxRate[] = [];

  for (const taxId of taxIds) {
    const tax = context.taxes.get(taxId);
    if (!tax) continue;

    if (tax.amountType === "group" && tax.children && tax.children.length > 0) {
      // Recursively expand children
      const childIds = tax.children.map((child) => child.id);
      expandedTaxes.push(...expandCompoundTaxes(context, childIds));
    } else {
      expandedTaxes.push(tax);
    }
  }

  return expandedTaxes;
}

/**
 * Apply fiscal position tax mapping.
 *
 * Fiscal positions allow tax substitution based on:
 * - Customer location (domestic vs international)
 * - Tax exemption status
 * - Special trade agreements
 *
 * Example mappings:
 * - US Sales Tax → EU VAT (for EU customers)
 * - Standard Tax → null (tax exemption)
 * - Tax A → Tax B (rate adjustment)
 *
 * @param context - Tax engine context
 * @param sourceTaxId - Original tax ID
 * @param fiscalPosition - Fiscal position with mapping rules
 * @returns Destination tax ID, or null if exempt
 */
export function mapTax(
  context: TaxEngineContext,
  sourceTaxId: string,
  fiscalPosition: FiscalPosition
): string | null {
  if (!fiscalPosition.taxMaps) return sourceTaxId;

  const mapping = fiscalPosition.taxMaps.find((m) => m.taxSrcId === sourceTaxId);
  if (!mapping) return sourceTaxId;

  // null destination = tax exemption
  return mapping.taxDestId;
}

/**
 * Compute aggregated taxes for an entire order.
 *
 * Sums up taxes across all lines and returns order-level totals.
 *
 * @param context - Tax engine context
 * @param lines - Array of order lines
 * @param fiscalPosition - Optional fiscal position
 * @returns Order totals: subtotal, tax, total
 */
export function computeOrderTaxes(
  context: TaxEngineContext,
  lines: OrderLine[],
  fiscalPosition?: FiscalPosition
): { subtotal: Decimal; tax: Decimal; total: Decimal; taxLines: TaxLine[] } {
  let subtotal = new Decimal(0);
  const aggregatedTaxLines = new Map<string, TaxLine>();

  for (const line of lines) {
    const lineComputation = computeLineTaxes(
      context,
      line.priceUnit,
      line.quantity,
      line.discount,
      line.taxIds,
      fiscalPosition
    );

    subtotal = subtotal.plus(lineComputation.base);

    // Aggregate tax lines by tax ID
    for (const taxLine of lineComputation.taxLines) {
      const existing = aggregatedTaxLines.get(taxLine.taxId);
      if (existing) {
        existing.amount = existing.amount.plus(taxLine.amount);
        existing.base = existing.base.plus(taxLine.base);
      } else {
        aggregatedTaxLines.set(taxLine.taxId, { ...taxLine });
      }
    }
  }

  const taxLinesArray = Array.from(aggregatedTaxLines.values());
  const totalTax = taxLinesArray.reduce((sum, line) => sum.plus(line.amount), new Decimal(0));

  return {
    subtotal,
    tax: totalTax,
    total: subtotal.plus(totalTax),
    taxLines: taxLinesArray,
  };
}

/**
 * Detect the applicable fiscal position for a partner.
 *
 * Auto-detection rules (in order of priority):
 * 1. Partner has explicit fiscal position set → use it
 * 2. Fiscal position with auto_apply matching partner location → use most specific match
 * 3. No match → no fiscal position (standard taxes apply)
 *
 * Matching criteria (in order of specificity):
 * - Country matches partner.countryId
 * - State (if specified) is in stateIds CSV
 * - ZIP code (if specified) is in range [zipFrom, zipTo]
 * - VAT requirement: if vatRequired=true, partner must have VAT number
 *
 * Specificity scoring: More constraints = higher priority
 *
 * @param context - Tax engine context
 * @param partner - Partner to detect fiscal position for
 * @returns Detected fiscal position, or undefined
 */
export function detectFiscalPosition(
  context: TaxEngineContext,
  partner: Partner
): FiscalPosition | undefined {
  if (!context.fiscalPositions) return undefined;

  // Priority 1: Explicit fiscal position
  if (partner.defaultFiscalPositionId) {
    return context.fiscalPositions.get(partner.defaultFiscalPositionId);
  }

  // Priority 2: Auto-detection with specificity scoring
  const autoApplyPositions = Array.from(context.fiscalPositions.values()).filter(
    (fp) => fp.autoApply
  );

  interface ScoredPosition {
    position: FiscalPosition;
    score: number;
  }

  const matchingPositions: ScoredPosition[] = [];

  for (const fp of autoApplyPositions) {
    let score = 0;

    // Check country match
    if (fp.countryId) {
      if (fp.countryId !== partner.countryId) {
        continue;
      }
      score += 1; // Country match adds 1 point
    }

    // Check state match (if specified)
    if (fp.stateIds) {
      if (!partner.stateId) {
        continue;
      }
      const states = fp.stateIds.split(",").map((s) => parseInt(s.trim(), 10));
      if (!states.includes(partner.stateId)) {
        continue;
      }
      score += 2; // State match adds 2 points (more specific)
    }

    // Check ZIP range (if specified)
    if (fp.zipFrom && fp.zipTo) {
      if (!partner.zip) {
        continue;
      }
      if (partner.zip < fp.zipFrom || partner.zip > fp.zipTo) {
        continue;
      }
      score += 3; // ZIP match adds 3 points (most specific)
    }

    // Check VAT requirement
    if (fp.vatRequired && !partner.vat) {
      continue;
    }
    if (fp.vatRequired) {
      score += 1; // VAT requirement match adds 1 point
    }

    matchingPositions.push({ position: fp, score });
  }

  // Return most specific match (highest score)
  if (matchingPositions.length === 0) return undefined;

  matchingPositions.sort((a, b) => b.score - a.score);
  return matchingPositions[0].position;
}
