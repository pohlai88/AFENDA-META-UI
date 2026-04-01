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

/**
 * Persist on `tax_resolutions.tax_engine_version` and line snapshots.
 * Bump when fiscal auto-pick ordering, group-child ordering, included/excluded staging, or rounding contract changes.
 */
export const TAX_ENGINE_VERSION = "v2" as const;

// ───────────────────────────────────────────────────────────────────────────
// Type Definitions
// ───────────────────────────────────────────────────────────────────────────

export type TaxTypeUse = "sale" | "purchase" | "none";
export type TaxAmountType = "percent" | "fixed" | "group" | "code";
/** Mirrors `sales.tax_computation_method` — drives deterministic math in this engine. */
export type TaxComputationMethod = "flat" | "compound" | "included" | "group";

export interface TaxRate {
  id: string;
  name: string;
  typeTaxUse: TaxTypeUse;
  amountType: TaxAmountType;
  amount: string;
  priceInclude: boolean;
  /** When set, must agree with `price_include` on the DB row (`included` ⇔ true). */
  computationMethod?: TaxComputationMethod;
  sequence: number;
  taxGroupId?: string | null;
  children?: TaxRate[]; // For compound taxes
}

export interface FiscalPosition {
  id: string;
  name: string;
  countryId?: number | null;
  /** Subdivision keys (`reference.states.state_id`) allowed for this position; empty/omit = any state. */
  allowedStateIds?: number[];
  zipFrom?: number | null;
  zipTo?: number | null;
  autoApply: boolean;
  vatRequired: boolean;
  /** Lower value = higher precedence among tied specificity (matches `fiscal_positions.sequence`). */
  sequence?: number;
  effectiveFrom?: string | Date | null;
  effectiveTo?: string | Date | null;
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

/** Outcome of auto_apply fiscal matching (single winner + audit flags). */
export interface AutoApplyFiscalPickResult {
  position: FiscalPosition | undefined;
  /**
   * True when ≥2 candidates tied on (specificity, sequence, effective_from) before the UUID tie-break.
   * Persist as `tax_resolutions.resolution_strategy = 'ambiguous'` when recording.
   */
  ambiguous: boolean;
  /** All matching auto_apply positions after filtering, ordered best → worst (final comparator order). */
  orderedMatchingIds: string[];
}

// ───────────────────────────────────────────────────────────────────────────
// Core Functions
// ───────────────────────────────────────────────────────────────────────────

function sortTaxRatesForEvaluation(a: TaxRate, b: TaxRate): number {
  if (a.sequence !== b.sequence) return a.sequence - b.sequence;
  return a.id.localeCompare(b.id);
}

/** Best-effort numeric bucket for postal codes (leading digit run); aligns with `fiscal_positions.zip_*` ints. */
function normalizePostalCodeToInt(zip: string): number | undefined {
  const m = zip.match(/\d+/);
  if (!m) return undefined;
  const n = Number.parseInt(m[0], 10);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Compute taxes for a single order line.
 *
 * Algorithm:
 * 1. Calculate line subtotal: quantity * price_unit * (1 - discount%)
 * 2. Apply fiscal position tax mapping (if provided)
 * 3. Expand compound taxes into children
 * 4. Separate tax-included vs tax-excluded taxes
 * 5. For tax-included: decompose base from gross using Σ rates (see `decomposeTaxIncluded`)
 * 6. For tax-excluded: apply on net base after included extraction; `compound` extends base per sequence
 * 7. Evaluation order: `sequence ASC`, `id ASC` (stable under `TAX_ENGINE_VERSION`)
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

  // Separate tax-included vs tax-excluded (prefer explicit computation method; fall back to legacy flag)
  const includedTaxes = applicableTaxes
    .filter(
      (t) => t.computationMethod === "included" || (t.computationMethod === undefined && t.priceInclude)
    )
    .sort(sortTaxRatesForEvaluation);
  const excludedTaxes = applicableTaxes
    .filter(
      (t) => !(t.computationMethod === "included" || (t.computationMethod === undefined && t.priceInclude))
    )
    .sort(sortTaxRatesForEvaluation);

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
 * Multiple included percent taxes: gross = base * (1 + Σ rate_i);
 * base = gross / (1 + Σ rate_i); line amount_i = base * rate_i (line order = evaluation sort).
 * Excluded taxes run on net base after this step; `compound` only applies in the excluded phase.
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
  const sortedTaxes = [...taxes].sort(sortTaxRatesForEvaluation);

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

    if (tax.computationMethod === "compound") {
      runningBase = runningBase.plus(amount);
    }
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

    const children = tax.children;
    const isGroup =
      tax.amountType === "group" &&
      (tax.computationMethod === "group" || tax.computationMethod === undefined) &&
      children != null &&
      children.length > 0;

    if (isGroup) {
      const orderedChildren = [...children].sort(sortTaxRatesForEvaluation);
      const childIds = orderedChildren.map((child) => child.id);
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

function isFiscalPositionEffectiveAt(fp: FiscalPosition, asOf: Date): boolean {
  if (fp.effectiveFrom != null && fp.effectiveFrom !== "") {
    const from = new Date(fp.effectiveFrom);
    if (!Number.isNaN(from.getTime()) && asOf < from) return false;
  }
  if (fp.effectiveTo != null && fp.effectiveTo !== "") {
    const to = new Date(fp.effectiveTo);
    if (!Number.isNaN(to.getTime()) && asOf > to) return false;
  }
  return true;
}

function fiscalEffectiveFromMs(fp: FiscalPosition): number {
  if (fp.effectiveFrom == null || fp.effectiveFrom === "") return Number.NEGATIVE_INFINITY;
  const t = new Date(fp.effectiveFrom).getTime();
  return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
}

interface ScoredFiscalPosition {
  position: FiscalPosition;
  /** Count of geography dimensions constrained on the row and satisfied (0–3: country, state, zip). */
  specificity: number;
}

/** When partner is VAT-registered, prefer `vat_required` positions over generic country matches at the same geography tier. */
function fiscalVatPreferenceScore(fp: FiscalPosition, partner: Partner): number {
  if (!partner.vat) return 0;
  return fp.vatRequired ? 1 : 0;
}

function compareAutoApplyFiscalCandidates(
  a: ScoredFiscalPosition,
  b: ScoredFiscalPosition,
  partner: Partner
): number {
  if (b.specificity !== a.specificity) return b.specificity - a.specificity;
  const seqA = a.position.sequence ?? 10;
  const seqB = b.position.sequence ?? 10;
  if (seqA !== seqB) return seqA - seqB;
  const tA = fiscalEffectiveFromMs(a.position);
  const tB = fiscalEffectiveFromMs(b.position);
  if (tA !== tB) return tB - tA;
  const vA = fiscalVatPreferenceScore(a.position, partner);
  const vB = fiscalVatPreferenceScore(b.position, partner);
  if (vB !== vA) return vB - vA;
  return a.position.id.localeCompare(b.position.id);
}

/**
 * Auto_apply fiscal positions only. Deterministic ordering:
 * `specificity DESC`, `sequence ASC`, `effective_from DESC`,
 * VAT preference (when partner.vat set: `vat_required` rows before others), `id ASC`.
 * Set `ambiguous` when ≥2 rows tie on all keys before UUID.
 */
export function pickAutoApplyFiscalPosition(
  context: TaxEngineContext,
  partner: Partner,
  options?: { asOf?: Date }
): AutoApplyFiscalPickResult {
  if (!context.fiscalPositions) {
    return { position: undefined, ambiguous: false, orderedMatchingIds: [] };
  }

  const asOf = options?.asOf ?? new Date();
  const autoApplyPositions = Array.from(context.fiscalPositions.values()).filter((fp) => fp.autoApply);

  const matching: ScoredFiscalPosition[] = [];

  for (const fp of autoApplyPositions) {
    if (!isFiscalPositionEffectiveAt(fp, asOf)) continue;

    let specificity = 0;

    if (fp.countryId != null) {
      if (fp.countryId !== partner.countryId) continue;
      specificity += 1;
    }

    if (fp.allowedStateIds && fp.allowedStateIds.length > 0) {
      if (partner.stateId === undefined || partner.stateId === null) continue;
      if (!fp.allowedStateIds.includes(partner.stateId)) continue;
      specificity += 1;
    }

    if (fp.zipFrom != null && fp.zipTo != null) {
      if (!partner.zip) continue;
      const zipNum = normalizePostalCodeToInt(partner.zip);
      if (zipNum === undefined || zipNum < fp.zipFrom || zipNum > fp.zipTo) continue;
      specificity += 1;
    }

    if (fp.vatRequired && !partner.vat) continue;

    matching.push({ position: fp, specificity });
  }

  if (matching.length === 0) {
    return { position: undefined, ambiguous: false, orderedMatchingIds: [] };
  }

  matching.sort((x, y) => compareAutoApplyFiscalCandidates(x, y, partner));
  const orderedMatchingIds = matching.map((m) => m.position.id);

  const winner = matching[0]!;
  const winnerSeq = winner.position.sequence ?? 10;
  const winnerEff = fiscalEffectiveFromMs(winner.position);
  const winnerVatPref = fiscalVatPreferenceScore(winner.position, partner);
  const tiedForKey = matching.filter(
    (m) =>
      m.specificity === winner.specificity &&
      (m.position.sequence ?? 10) === winnerSeq &&
      fiscalEffectiveFromMs(m.position) === winnerEff &&
      fiscalVatPreferenceScore(m.position, partner) === winnerVatPref
  );
  const ambiguous = tiedForKey.length > 1;

  return {
    position: winner.position,
    ambiguous,
    orderedMatchingIds,
  };
}

/**
 * Detect the applicable fiscal position for a partner.
 *
 * 1. Explicit `defaultFiscalPositionId` wins (no auto_apply pass).
 * 2. Else `pickAutoApplyFiscalPosition` (see ordering + ambiguity contract).
 *
 * @param options.asOf - Evaluation instant for `effective_from` / `effective_to` on fiscal rows (replay).
 */
export function detectFiscalPosition(
  context: TaxEngineContext,
  partner: Partner,
  options?: { asOf?: Date }
): FiscalPosition | undefined {
  if (!context.fiscalPositions) return undefined;

  if (partner.defaultFiscalPositionId) {
    return context.fiscalPositions.get(partner.defaultFiscalPositionId) ?? undefined;
  }

  return pickAutoApplyFiscalPosition(context, partner, options).position;
}
