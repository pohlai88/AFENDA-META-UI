/**
 * Stable rule IDs for baselines, dashboards, and regressions.
 * Severities are defined in rules-matrix.json (see severity.mjs).
 * @readonly
 */
export const RULE_IDS = /** @type {const} */ ({
  RLS_COUNT_MISMATCH: "RLS_COUNT_MISMATCH",
  /** Tables exist but file has zero tenantIsolationPolicies/serviceBypassPolicy (non-allowlisted paths). */
  RLS_ZERO_POLICIES: "RLS_ZERO_POLICIES",
  FK_TENANT_ORDER: "FK_TENANT_ORDER",
  INDEX_ANONYMOUS: "INDEX_ANONYMOUS",
  UNIQUE_INDEX_ANONYMOUS: "UNIQUE_INDEX_ANONYMOUS",
  TABLE_PARSE_ERROR: "TABLE_PARSE_ERROR",
  RELATIONS_DRIFT: "RELATIONS_DRIFT",
  ZOD_PARITY: "ZOD_PARITY",
  /** Phase 2 — not emitted yet */
  ORPHAN_UUID_COLUMN: "ORPHAN_UUID_COLUMN",
});

/**
 * @typedef {"error" | "warn"} Severity
 */

/**
 * @typedef {Object} Finding
 * @property {string} ruleId
 * @property {Severity} severity
 * @property {string} file - repo-relative posix path
 * @property {string} table - logical table name or `*` when file-scoped
 * @property {string} key - stable id: `file::table::ruleId`
 * @property {string} message
 * @property {number} [line]
 */
