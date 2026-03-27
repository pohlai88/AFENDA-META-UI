/**
 * @module truth-compiler/emitter
 * @description Assembles compiler output segments into a single deterministic SQL bundle.
 *
 * Sort order guarantees stable git diffs regardless of declaration order:
 *   comment → check → function → trigger
 *   within each kind: lexicographic by model name, then by SQL text
 *
 * @layer db/truth-compiler
 */

import type { SqlSegment, SqlSegmentKind } from "./types.js";

const KIND_ORDER: Record<SqlSegmentKind, number> = {
  comment: 0,
  check: 1,
  function: 2,
  trigger: 3,
};

const HEADER = `-- =============================================================================
-- TRUTH COMPILER OUTPUT — AFENDA META ENGINE
-- =============================================================================
-- DO NOT EDIT MANUALLY.
-- Regenerate with: pnpm --filter @afenda/db truth:generate
-- Diff check:      pnpm --filter @afenda/db truth:check
-- =============================================================================`;

/** Deterministic comparator for stable SQL bundle ordering. */
function compareSegments(a: SqlSegment, b: SqlSegment): number {
  const kindDiff = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  if (kindDiff !== 0) return kindDiff;
  const modelDiff = a.model.localeCompare(b.model, "en", { sensitivity: "base" });
  if (modelDiff !== 0) return modelDiff;
  return a.sql.localeCompare(b.sql, "en", { sensitivity: "base" });
}

/**
 * Assembles all pipeline output segments into a single SQL bundle string.
 *
 * The output is deterministic: identical inputs always produce identical output
 * (modulo the generated-at timestamp). Pass `generatedAt` explicitly in
 * diff-check mode to pin the timestamp for fair comparison.
 */
export function emit(segments: SqlSegment[], generatedAt?: Date): string {
  const sorted = [...segments].sort(compareSegments);
  const timestamp = (generatedAt ?? new Date()).toISOString();
  const blocks = sorted.map((s) => s.sql.trimEnd());

  return [HEADER, `-- Generated at: ${timestamp}`, "", ...blocks, ""].join("\n");
}
