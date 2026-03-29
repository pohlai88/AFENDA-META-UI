import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {{ rules?: Record<string, { severity?: string }> } | null} */
let cachedMatrix = null;

/**
 * @returns {{ rules: Record<string, { severity: string, description?: string }> }}
 */
export function loadRulesMatrix() {
  if (cachedMatrix) return cachedMatrix;
  const p = join(__dirname, "rules-matrix.json");
  cachedMatrix = JSON.parse(readFileSync(p, "utf8"));
  return cachedMatrix;
}

/**
 * @param {string} ruleId
 * @returns {import('./rule-ids.mjs').Severity}
 */
export function getSeverityForRuleId(ruleId) {
  const row = loadRulesMatrix().rules?.[ruleId];
  if (row?.severity === "error" || row?.severity === "warn") return row.severity;
  return "warn";
}

export function normalizePathForKey(p) {
  return p.replace(/\\/g, "/").replace(/^\.?\//, "");
}

/**
 * Stable baseline / dashboard key: `file::table::ruleId` (use `*` when not table-scoped).
 *
 * @param {string} file - repo-relative posix
 * @param {string} [table] - logical table name or `*`
 * @param {string} ruleId
 */
export function buildFindingKey(file, table, ruleId) {
  const t = table && table.length > 0 ? table : "*";
  return `${normalizePathForKey(file)}::${t}::${ruleId}`;
}

/**
 * @param {Array<Omit<import('./rule-ids.mjs').Finding, 'severity'|'key'> & { severity?: import('./rule-ids.mjs').Severity, table?: string }>} raw
 * @returns {import('./rule-ids.mjs').Finding[]}
 */
export function finalizeFindings(raw) {
  return raw.map((f) => {
    const table = f.table ?? "*";
    const severity = getSeverityForRuleId(f.ruleId);
    const key = buildFindingKey(f.file, table, f.ruleId);
    return {
      ruleId: f.ruleId,
      severity,
      file: normalizePathForKey(f.file),
      table,
      key,
      message: f.message,
      line: f.line,
    };
  });
}
