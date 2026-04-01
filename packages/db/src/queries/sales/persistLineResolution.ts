import { Decimal } from "decimal.js";
import { and, eq, max } from "drizzle-orm";

import type { Database } from "../../drizzle/db.js";
import {
  type PriceResolutionInputSnapshot,
  priceResolutions,
} from "../../schema/sales/pricingTruth.js";
import { appendPriceResolutionEvent } from "./priceResolutionEvents.js";
import { ensurePricingDecisionHeadForDocument } from "./documentPricingDecision.js";

export class PersistLineResolutionError extends Error {
  constructor(
    readonly code: "OVERRIDE_APPROVER_REQUIRED" | "INVALID_EXCHANGE_PAIR",
    message: string
  ) {
    super(message);
    this.name = "PersistLineResolutionError";
  }
}

/** True when `finalPrice` is strictly greater than `basePrice` (money strings, scale-aware). */
export function finalPriceExceedsBasePrice(finalPrice: string, basePrice: string): boolean {
  return new Decimal(finalPrice).gt(basePrice);
}

export type PersistLineResolutionInput = {
  tenantId: number;
  orderId: string;
  lineId: string;
  createdBy: number;
  updatedBy: number;
  inputSnapshot: PriceResolutionInputSnapshot | Record<string, unknown>;
  appliedRuleIds: string[];
  basePrice: string;
  finalPrice: string;
  currencyId: number;
  exchangeRate?: string | null;
  exchangeRateSource?: string | null;
  /** Required when final price is strictly above base (matches DB check). */
  overrideApprovedBy?: number | null;
  /** Defaults to DB column default (`v1`) when omitted. */
  pricingEngineVersion?: string;
  /**
   * Document-level decision head. When omitted, ensures `decision_version = max` exists (creates v1 if needed).
   */
  pricingDecisionId?: string;
  lockedAt?: Date | null;
  /**
   * When omitted, uses `max(resolution_version) + 1` for this line key.
   * When set, must be unused or insert will fail on unique constraint.
   */
  resolutionVersion?: number;
};

export type PersistLineResolutionResult = {
  resolutionId: string;
  resolutionVersion: number;
};

function assertExchangePair(
  rate: string | null | undefined,
  source: string | null | undefined
): { exchangeRate: string | null; exchangeRateSource: string | null } {
  const hasRate = rate != null && rate !== "";
  const hasSource = source != null && source !== "";
  if (hasRate !== hasSource) {
    throw new PersistLineResolutionError(
      "INVALID_EXCHANGE_PAIR",
      "exchangeRate and exchangeRateSource must both be set or both omitted"
    );
  }
  return {
    exchangeRate: hasRate ? rate! : null,
    exchangeRateSource: hasSource ? source! : null,
  };
}

/**
 * Inserts a `price_resolutions` row (new or next `resolution_version`).
 * Sets `override_approved_by` when `final_price` exceeds `base_price` (requires `overrideApprovedBy`).
 * Appends a `recomputed` event when `resolution_version` is greater than 1 (v1 only gets DB-triggered `resolved`).
 */
export async function persistLineResolution(
  db: Database,
  input: PersistLineResolutionInput
): Promise<PersistLineResolutionResult> {
  const { exchangeRate, exchangeRateSource } = assertExchangePair(
    input.exchangeRate,
    input.exchangeRateSource
  );

  const needsApprover = finalPriceExceedsBasePrice(input.finalPrice, input.basePrice);
  const overrideApprovedBy = needsApprover ? input.overrideApprovedBy : null;
  if (needsApprover && (overrideApprovedBy == null || overrideApprovedBy <= 0)) {
    throw new PersistLineResolutionError(
      "OVERRIDE_APPROVER_REQUIRED",
      "overrideApprovedBy is required when final_price exceeds base_price"
    );
  }

  const pricingDecisionId =
    input.pricingDecisionId ??
    (
      await ensurePricingDecisionHeadForDocument(db, {
        tenantId: input.tenantId,
        orderId: input.orderId,
        actorUserId: input.createdBy,
        pricingEngineVersion: input.pricingEngineVersion,
      })
    ).pricingDecisionId;

  let resolutionVersion = input.resolutionVersion;
  if (resolutionVersion == null) {
    const [agg] = await db
      .select({ maxV: max(priceResolutions.resolutionVersion) })
      .from(priceResolutions)
      .where(
        and(
          eq(priceResolutions.tenantId, input.tenantId),
          eq(priceResolutions.orderId, input.orderId),
          eq(priceResolutions.lineId, input.lineId)
        )
      );
    const maxV = agg?.maxV;
    const n = maxV == null ? 0 : typeof maxV === "number" ? maxV : Number(maxV);
    resolutionVersion = n + 1;
  }

  const [row] = await db
    .insert(priceResolutions)
    .values({
      tenantId: input.tenantId,
      orderId: input.orderId,
      lineId: input.lineId,
      pricingDecisionId,
      resolutionVersion,
      inputSnapshot: input.inputSnapshot as PriceResolutionInputSnapshot & Record<string, unknown>,
      appliedRuleIds: input.appliedRuleIds,
      basePrice: input.basePrice,
      finalPrice: input.finalPrice,
      currencyId: input.currencyId,
      exchangeRate,
      exchangeRateSource,
      overrideApprovedBy: overrideApprovedBy ?? null,
      pricingEngineVersion: input.pricingEngineVersion,
      lockedAt: input.lockedAt ?? null,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
    })
    .returning({
      id: priceResolutions.id,
      resolutionVersion: priceResolutions.resolutionVersion,
    });

  if (!row) {
    throw new Error("persistLineResolution: insert returned no row");
  }

  if (resolutionVersion > 1) {
    await appendPriceResolutionEvent(db, {
      tenantId: input.tenantId,
      resolutionId: row.id,
      eventType: "recomputed",
      createdBy: input.createdBy,
      payload: {
        resolution_version: resolutionVersion,
        previous_version: resolutionVersion - 1,
      },
    });
  }

  return { resolutionId: row.id, resolutionVersion: row.resolutionVersion };
}
