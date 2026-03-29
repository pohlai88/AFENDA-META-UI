/**
 * Priority levels for truth resolution.
 * Extracted from @afenda/meta-types (Phase 2).
 */
export const TRUTH_PRIORITY: Record<string, number> = {
  posted_ledger: 100,
  approved_document: 80,
  draft_document: 50,
  user_input_cache: 20,
};
