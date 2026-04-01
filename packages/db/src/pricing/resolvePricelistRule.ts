import { PRICELIST_APPLIED_ON_PRECEDENCE } from "../schema/sales/pricingTruth.js";
import type { PricelistAppliedOn } from "../schema/sales/_enums.js";

/**
 * Minimal inputs for deterministic pricelist rule selection (narrowing + tie-break).
 * Load matching rows from `pricelist_items` in SQL; pass them here as candidates.
 */
export type PricelistItemRuleCandidate = {
  id: string;
  appliedOn: PricelistAppliedOn;
  sequence: number;
};

function precedenceRank(appliedOn: PricelistAppliedOn): number {
  return PRICELIST_APPLIED_ON_PRECEDENCE[appliedOn];
}

/** Sort: narrower scope first, then lower `sequence` wins. */
export function sortPricelistItemCandidates<T extends PricelistItemRuleCandidate>(candidates: T[]): T[] {
  return [...candidates].sort((a, b) => {
    const pa = precedenceRank(a.appliedOn);
    const pb = precedenceRank(b.appliedOn);
    if (pa !== pb) return pa - pb;
    return a.sequence - b.sequence;
  });
}

/** First candidate after canonical sort, or null if empty. */
export function pickWinningPricelistItem<T extends PricelistItemRuleCandidate>(candidates: T[]): T | null {
  const sorted = sortPricelistItemCandidates(candidates);
  return sorted[0] ?? null;
}

/** Ordered rule ids for `applied_rule_ids` (extensible for base-pricelist chains). */
export function buildAppliedRuleIdChain(winnerId: string, chain: string[] = []): string[] {
  return [...chain, winnerId];
}
