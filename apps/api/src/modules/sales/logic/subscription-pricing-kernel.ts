import type { SubscriptionBillingPeriod, SubscriptionLine, SubscriptionTemplate } from "@afenda/db/schema/sales";

import {
  computeMRR,
  type MRRComputationInput,
  type MRRComputationResult,
} from "./subscription-engine.js";

/** Snapshot discriminator for migrations and replay tooling. */
export const SUBSCRIPTION_PRICING_SNAPSHOT_V1 = "subscription.pricing_snapshot.v1" as const;

export interface SubscriptionPricingSnapshotV1 {
  readonly kind: typeof SUBSCRIPTION_PRICING_SNAPSHOT_V1;
  readonly billingPeriod: SubscriptionBillingPeriod;
  readonly billingDay: number;
  readonly lineIds: readonly string[];
  readonly aggregates: {
    readonly recurringTotal: string;
    readonly mrr: string;
    readonly arr: string;
  };
  readonly computedAt: string;
}

export interface BuildSubscriptionPricingSnapshotInput {
  template: Pick<SubscriptionTemplate, "billingPeriod" | "billingDay">;
  lines: Array<Pick<SubscriptionLine, "id">>;
  mrrResult: MRRComputationResult;
  computedAt?: Date;
}

/**
 * Immutable JSON payload stored on `subscriptions.pricing_snapshot` and each
 * `subscription_pricing_resolutions.snapshot` row after a pricing lock.
 */
export function buildSubscriptionPricingSnapshotV1(
  input: BuildSubscriptionPricingSnapshotInput
): SubscriptionPricingSnapshotV1 {
  const computedAt = input.computedAt ?? new Date();
  return {
    kind: SUBSCRIPTION_PRICING_SNAPSHOT_V1,
    billingPeriod: input.template.billingPeriod,
    billingDay: input.template.billingDay,
    lineIds: input.lines.map((l) => l.id),
    aggregates: {
      recurringTotal: input.mrrResult.lineTotal.toDecimalPlaces(2).toString(),
      mrr: input.mrrResult.mrr.toString(),
      arr: input.mrrResult.arr.toString(),
    },
    computedAt: computedAt.toISOString(),
  };
}

/**
 * Pipeline stage 1 — pure pricing resolution from line economics + billing period.
 * Callers persist outputs only inside a deliberate lock (activate, renew, repricing command).
 */
export function resolveSubscriptionPricingAggregate(
  input: MRRComputationInput
): MRRComputationResult {
  return computeMRR(input);
}

/**
 * Pipeline stage 2 — billing calendar tick via {@link computeNextInvoiceDate}.
 * Pass `billingAnchorDate` for UTC anchor-aligned monthly/quarterly/yearly/weekly grids; omit for legacy behavior.
 */
export { computeNextInvoiceDate } from "./subscription-engine.js";
