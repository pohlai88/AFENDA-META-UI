/**
 * Declarative shared-column naming policy: regex + severity. The evaluator only
 * applies these rules; tune governance by editing this catalog and the allowlist.
 */

export type SharedColumnPatternSeverity = "critical" | "informational";

export interface SharedColumnPattern {
  readonly regex: RegExp;
  readonly severity: SharedColumnPatternSeverity;
}

function pattern(regex: RegExp, severity: SharedColumnPatternSeverity): SharedColumnPattern {
  return Object.freeze({ regex, severity });
}

/** Ordered rule set; if a name matches multiple rules, the effective severity is the strictest (critical wins). */
export const SHARED_COLUMN_PATTERNS: readonly SharedColumnPattern[] = Object.freeze([
  // Timestamps & actors — align with column-kit primitives
  pattern(/At$/, "critical"),
  pattern(/On$/, "critical"),
  pattern(/By$/, "critical"),
  pattern(/^created/i, "critical"),
  pattern(/^updated/i, "critical"),
  pattern(/^deleted/i, "critical"),
  // Lifecycle / soft-state wording — often domain-specific; warn first
  pattern(/^archived/i, "informational"),
  pattern(/^purged/i, "informational"),
  pattern(/^revoked/i, "informational"),
  pattern(/^is[A-Z]/, "informational"),
  pattern(/Flag$/i, "informational"),
  pattern(/Status$/i, "informational"),
  pattern(/Version$/i, "informational"),
  pattern(/^source/i, "informational"),
  pattern(/^origin/i, "informational"),
  pattern(/^correlation/i, "informational"),
]);

/** Flat regex list for tooling that only needs patterns (same order as `SHARED_COLUMN_PATTERNS`). */
export const SHARED_COLUMN_PATTERN_REGEXES: readonly RegExp[] = Object.freeze(
  SHARED_COLUMN_PATTERNS.map((p) => p.regex)
);

/** Domain columns exempt from “unexpected shared-style” checks (not fingerprint keys). */
export const SHARED_COLUMN_ALLOWLIST: readonly string[] = Object.freeze(["orderStatus", "schemaVersion"]);

export function sharedColumnPatternSeverity(columnName: string): SharedColumnPatternSeverity | null {
  let critical = false;
  let informational = false;
  for (const { regex, severity } of SHARED_COLUMN_PATTERNS) {
    if (regex.test(columnName)) {
      if (severity === "critical") critical = true;
      else informational = true;
    }
  }
  if (critical) return "critical";
  if (informational) return "informational";
  return null;
}

export function columnNameMatchesSharedColumnPattern(columnName: string): boolean {
  return sharedColumnPatternSeverity(columnName) !== null;
}
