/**
 * **Pricing decision engine (pure)** — composes {@link resolvePrice} into document-level runs and `price_resolutions`
 * payloads without touching the database.
 *
 * ## Truth model (already in schema)
 * - `pricing_decisions` = one logical engine run per sales order (`document_id` = order id).
 * - `price_resolutions` = per–order-line outputs keyed by `pricing_decision_id`.
 * - Finalize invariant: ≥ {@link FINALIZE_PRICING_DECISION_MIN_RESOLUTION_COUNT} row(s) on that decision
 *   (see {@link finalizePricingDecisionIfDraft}).
 *
 * ## Flow
 * 1. Load rules + product facts (DB layer).
 * 2. `evaluateSalesOrderPricingLinesPure` → deterministic per-line results + traces.
 * 3. `buildSalesOrderPricingLinePersistInput` → shapes accepted by {@link runSalesOrderPricingEngine}.
 * 4. Persist + optional finalize via runner / API.
 */
import { Decimal } from "decimal.js";

import type { PriceResolutionInputSnapshot } from "../../schema/sales/pricingTruth.js";

import { FINALIZE_PRICING_DECISION_MIN_RESOLUTION_COUNT } from "./documentPricingDecision.js";
import type { PersistLineResolutionInput } from "./persistLineResolution.js";
import {
  buildPricingSnapshot,
  PRICING_RESOLVE_ENGINE_VERSION,
  resolvePrice,
  type PricingResolutionFailure,
  type PricingResolutionSuccess,
  type ResolvePriceContext,
} from "./pricingResolveEngine.js";

export { FINALIZE_PRICING_DECISION_MIN_RESOLUTION_COUNT };

/** Same shape as {@link import("./pricingEngineRunner.js").PricingEngineLinePersistInput} (avoid runner import cycle). */
export type SalesOrderPricingLinePersistDraft = Omit<
  PersistLineResolutionInput,
  "tenantId" | "orderId" | "pricingDecisionId" | "createdBy" | "updatedBy"
> & { lineId: string };

export type SalesOrderLinePricingEvaluateInput = {
  lineId: string;
  context: ResolvePriceContext;
  uomId: number;
  /** `price_resolutions.input_snapshot.date` (date-only). */
  date: string;
  customerSegment?: string;
  snapshotContext?: NonNullable<PriceResolutionInputSnapshot["context"]>;
};

export type PricingDecisionLineEvaluateResult =
  | { lineId: string; ok: true; resolution: PricingResolutionSuccess }
  | { lineId: string; ok: false; failure: PricingResolutionFailure };

export class PricingDecisionInvariantError extends Error {
  constructor(
    readonly code: "NO_LINE_OUTPUTS_FOR_FINALIZE" | "LINE_PRICING_EVALUATION_FAILED",
    message: string
  ) {
    super(message);
    this.name = "PricingDecisionInvariantError";
  }
}

function finalUnitExceedsBase(finalPrice: string, basePrice: string): boolean {
  return new Decimal(finalPrice).gt(basePrice);
}

/**
 * Fast-fail before persistence when `runSalesOrderPricingEngine` will finalize: DB requires ≥1 `price_resolutions`.
 */
export function assertLineOutputsSufficientForFinalize(
  lineOutputs: ReadonlyArray<unknown>,
  options?: { minCount?: number }
): void {
  const min = options?.minCount ?? FINALIZE_PRICING_DECISION_MIN_RESOLUTION_COUNT;
  if (lineOutputs.length < min) {
    throw new PricingDecisionInvariantError(
      "NO_LINE_OUTPUTS_FOR_FINALIZE",
      `finalize requires at least ${min} line pricing output(s); got ${lineOutputs.length}`
    );
  }
}

/** Strict gate: every line evaluated successfully (use before building persist rows for a full order). */
export function assertEveryLinePricingSucceeded(
  results: ReadonlyArray<PricingDecisionLineEvaluateResult>
): void {
  const failed = results.filter((r): r is Extract<PricingDecisionLineEvaluateResult, { ok: false }> => !r.ok);
  if (failed.length > 0) {
    throw new PricingDecisionInvariantError(
      "LINE_PRICING_EVALUATION_FAILED",
      `pricing resolution failed for line(s): ${failed.map((f) => `${f.lineId}:${f.failure.code}`).join(", ")}`
    );
  }
}

/**
 * Deterministic evaluation for a batch of order lines (same rules catalog is shared via each `context.rules`).
 */
export function evaluateSalesOrderPricingLinesPure(lines: ReadonlyArray<SalesOrderLinePricingEvaluateInput>): {
  lineResults: PricingDecisionLineEvaluateResult[];
  allSucceeded: boolean;
  successCount: number;
  failureCount: number;
} {
  const lineResults: PricingDecisionLineEvaluateResult[] = lines.map((line) => {
    const r = resolvePrice(line.context);
    return r.ok
      ? { lineId: line.lineId, ok: true, resolution: r }
      : { lineId: line.lineId, ok: false, failure: r };
  });
  const successCount = lineResults.filter((x) => x.ok).length;
  return {
    lineResults,
    allSucceeded: lines.length > 0 && successCount === lines.length,
    successCount,
    failureCount: lines.length - successCount,
  };
}

/**
 * Maps a successful {@link resolvePrice} result into a row for {@link runSalesOrderPricingEngine}.
 * Sets `overrideApprovedBy` when final unit strictly exceeds base (matches DB check).
 */
export function buildSalesOrderPricingLinePersistInput(args: {
  lineId: string;
  resolution: PricingResolutionSuccess;
  pricelistId: string;
  currencyId: number;
  productId: string;
  quantity: string;
  uomId: number;
  date: string;
  customerSegment?: string;
  snapshotContext?: NonNullable<PriceResolutionInputSnapshot["context"]>;
  exchangeRate?: string | null;
  exchangeRateSource?: string | null;
  overrideApprovedBy?: number | null;
  pricingEngineVersion?: string;
}): SalesOrderPricingLinePersistDraft {
  const needsOverride = finalUnitExceedsBase(args.resolution.finalUnitPrice, args.resolution.basePrice);
  const ob = args.overrideApprovedBy;
  if (needsOverride && (ob == null || ob <= 0)) {
    throw new PricingDecisionInvariantError(
      "LINE_PRICING_EVALUATION_FAILED",
      "final unit price exceeds base but overrideApprovedBy is missing (required for persist)"
    );
  }

  const snap = {
    product_id: args.productId,
    quantity: args.quantity,
    uom_id: args.uomId,
    pricelist_id: args.pricelistId,
    currency_id: args.currencyId,
    date: args.date,
    pricing_snapshot: buildPricingSnapshot(args.resolution),
    ...(args.customerSegment != null ? { customer_segment: args.customerSegment } : {}),
    ...(args.snapshotContext != null ? { context: args.snapshotContext } : {}),
  } as PriceResolutionInputSnapshot & Record<string, unknown>;

  return {
    lineId: args.lineId,
    inputSnapshot: snap,
    appliedRuleIds: args.resolution.appliedRuleIds,
    basePrice: args.resolution.basePrice,
    finalPrice: args.resolution.finalUnitPrice,
    currencyId: args.currencyId,
    exchangeRate: args.exchangeRate,
    exchangeRateSource: args.exchangeRateSource,
    overrideApprovedBy: needsOverride ? ob! : null,
    pricingEngineVersion: args.pricingEngineVersion ?? PRICING_RESOLVE_ENGINE_VERSION,
  };
}

/**
 * Evaluate → (optionally assert all ok) → build persist drafts. Pure and replayable given the same inputs.
 */
export function buildSalesOrderPricingLinePersistDrafts(
  lines: ReadonlyArray<SalesOrderLinePricingEvaluateInput>,
  options?: { requireAllSucceeded?: boolean }
): { lineResults: PricingDecisionLineEvaluateResult[]; lineOutputs: SalesOrderPricingLinePersistDraft[] } {
  const { lineResults } = evaluateSalesOrderPricingLinesPure(lines);
  if (options?.requireAllSucceeded) {
    assertEveryLinePricingSucceeded(lineResults);
  }
  const lineOutputs: SalesOrderPricingLinePersistDraft[] = [];
  for (const line of lines) {
    const hit = lineResults.find((r) => r.lineId === line.lineId);
    if (!hit?.ok) continue;
    lineOutputs.push(
      buildSalesOrderPricingLinePersistInput({
        lineId: line.lineId,
        resolution: hit.resolution,
        pricelistId: line.context.pricelistId,
        currencyId: line.context.currencyId,
        productId: line.context.productId,
        quantity: line.context.quantity,
        uomId: line.uomId,
        date: line.date,
        customerSegment: line.customerSegment,
        snapshotContext: line.snapshotContext,
      })
    );
  }
  return { lineResults, lineOutputs };
}
