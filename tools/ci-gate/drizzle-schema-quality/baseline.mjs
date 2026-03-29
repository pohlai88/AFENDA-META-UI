import { readFileSync, existsSync } from "node:fs";
import { normalizePathForKey } from "./severity.mjs";

/**
 * Canonical format: `baseline.json` with `baseline: { "file::table::ruleId": { ruleId, severity, reason } }`.
 * Short file segment: `hr/foo.ts` → `packages/db/src/schema/hr/foo.ts`.
 *
 * Legacy: `suppress: [{ key } | { ruleId, file, table? }]`.
 *
 * @typedef {{ kind: 'key', normalizedKey: string, ruleId?: string, severity?: string, reason?: string }} KeyedBaselineEntry
 * @typedef {{ kind: 'legacy', ruleId: string, file: string, table?: string }} LegacyBaselineEntry
 * @typedef {KeyedBaselineEntry | LegacyBaselineEntry} UnifiedBaselineEntry
 */

/**
 * @typedef {{ entries: UnifiedBaselineEntry[], loadErrors: string[] }} BaselineLoadResult
 */

/**
 * Normalize a baseline finding key for comparison with `finding.key`.
 * - Must be `path::table::ruleId` (three `::`-separated segments).
 * - If the path does not start with `packages/`, it is prefixed with `packages/db/src/schema/`.
 *
 * @param {string} rawKey
 */
export function normalizeBaselineFindingKey(rawKey) {
  const parts = rawKey.split("::");
  if (parts.length !== 3) {
    return normalizePathForKey(rawKey.trim());
  }
  let [filePart, table, ruleId] = parts;
  filePart = filePart.trim();
  table = table.trim();
  ruleId = ruleId.trim();
  let file = filePart;
  if (!file.startsWith("packages/")) {
    file = `packages/db/src/schema/${file.replace(/^\/+/, "")}`;
  }
  file = normalizePathForKey(file);
  return `${file}::${table}::${ruleId}`;
}

/**
 * @param {string} rawKey
 * @returns {{ file: string, table: string, ruleId: string } | null}
 */
function parseBaselineFindingKey(rawKey) {
  const parts = rawKey.split("::");
  if (parts.length !== 3) return null;
  const file = parts[0].trim();
  const table = parts[1].trim();
  const ruleId = parts[2].trim();
  if (!file || !table || !ruleId) return null;
  return { file, table, ruleId };
}

/**
 * @param {string} baselinePath - absolute path to baseline.json
 * @returns {BaselineLoadResult}
 */
export function loadBaseline(baselinePath) {
  /** @type {string[]} */
  const loadErrors = [];

  if (!baselinePath || !existsSync(baselinePath)) {
    return { entries: [], loadErrors };
  }

  const raw = readFileSync(baselinePath, "utf8");
  const parsed = JSON.parse(raw);

  /** @type {UnifiedBaselineEntry[]} */
  const out = [];

  if (parsed.baseline && typeof parsed.baseline === "object" && !Array.isArray(parsed.baseline)) {
    /** @type {UnifiedBaselineEntry[]} */
    const keyedScratch = [];
    /** @type {string[]} */
    const keyedErrors = [];

    for (const [rawKey, meta] of Object.entries(parsed.baseline)) {
      if (rawKey.startsWith("_")) continue;
      if (!meta || typeof meta !== "object") {
        keyedErrors.push(`baseline: entry ${JSON.stringify(rawKey)} must be an object`);
        continue;
      }
      const parsedKey = parseBaselineFindingKey(rawKey);
      if (!parsedKey) {
        keyedErrors.push(
          `baseline: invalid key (expected file::table::ruleId): ${JSON.stringify(rawKey)}`
        );
        continue;
      }

      const m = /** @type {{ ruleId?: unknown, severity?: unknown, reason?: unknown }} */ (meta);
      if (typeof m.ruleId === "string" && m.ruleId !== parsedKey.ruleId) {
        keyedErrors.push(
          `baseline: ruleId "${m.ruleId}" does not match key suffix "${parsedKey.ruleId}" for ${JSON.stringify(rawKey)}`
        );
        continue;
      }
      if (typeof m.reason !== "string" || m.reason.trim() === "") {
        keyedErrors.push(`baseline: non-empty reason required for ${JSON.stringify(rawKey)}`);
        continue;
      }
      if (m.severity != null && typeof m.severity !== "string") {
        keyedErrors.push(`baseline: severity must be a string for ${JSON.stringify(rawKey)}`);
        continue;
      }

      keyedScratch.push({
        kind: "key",
        normalizedKey: normalizeBaselineFindingKey(rawKey),
        ruleId: typeof m.ruleId === "string" ? m.ruleId : parsedKey.ruleId,
        severity: typeof m.severity === "string" ? m.severity : undefined,
        reason: typeof m.reason === "string" ? m.reason.trim() : undefined,
      });
    }

    if (keyedErrors.length > 0) {
      loadErrors.push(...keyedErrors);
    } else {
      out.push(...keyedScratch);
    }
  }

  const list = Array.isArray(parsed.suppress) ? parsed.suppress : [];
  for (const e of list) {
    if (!e || typeof e !== "object") continue;
    if (typeof /** @type {{ key?: unknown }} */ (e).key === "string") {
      out.push({
        kind: "key",
        normalizedKey: normalizeBaselineFindingKey(/** @type {{ key: string }} */ (e).key),
        ruleId: undefined,
        severity: undefined,
        reason: undefined,
      });
      continue;
    }
    const x = /** @type {{ ruleId?: unknown, file?: unknown, table?: unknown }} */ (e);
    if (typeof x.ruleId === "string" && typeof x.file === "string") {
      out.push({
        kind: "legacy",
        ruleId: x.ruleId,
        file: normalizePathForKey(x.file),
        table: x.table != null ? String(x.table) : undefined,
      });
    }
  }

  return { entries: out, loadErrors };
}

/**
 * @param {import('./rule-ids.mjs').Finding} finding
 * @param {UnifiedBaselineEntry} e
 */
function matchesBaselineEntry(finding, e) {
  if (e.kind === "key") {
    return normalizePathForKey(finding.key) === normalizePathForKey(e.normalizedKey);
  }

  const ruleId = e.ruleId;
  const file = e.file;
  if (ruleId !== finding.ruleId || file !== finding.file) return false;

  const entryTable = e.table != null ? String(e.table) : "*";
  if (entryTable === "*") return true;
  return finding.table === entryTable;
}

/**
 * @param {import('./rule-ids.mjs').Finding} finding
 * @param {UnifiedBaselineEntry[]} entries
 * @returns {UnifiedBaselineEntry | null}
 */
export function findMatchingBaselineEntry(finding, entries) {
  for (const e of entries) {
    if (matchesBaselineEntry(finding, e)) return e;
  }
  return null;
}

/**
 * @param {import('./rule-ids.mjs').Finding} finding
 * @param {UnifiedBaselineEntry[]} entries
 */
export function isSuppressed(finding, entries) {
  return findMatchingBaselineEntry(finding, entries) != null;
}

/**
 * @typedef {{ finding: import('./rule-ids.mjs').Finding, entry: UnifiedBaselineEntry }} SuppressedPair
 * @typedef {{ findings: import('./rule-ids.mjs').Finding[], suppressed: SuppressedPair[] }} BaselineApplyResult
 */

/**
 * @param {import('./rule-ids.mjs').Finding[]} findings
 * @param {UnifiedBaselineEntry[]} baseline
 * @param {{ verbose?: boolean, log?: (s: string) => void }} [options]
 * @returns {BaselineApplyResult}
 */
export function applyBaseline(findings, baseline, options = {}) {
  if (baseline.length === 0) {
    return { findings, suppressed: [] };
  }
  const log = options.log ?? console.log;
  /** @type {SuppressedPair[]} */
  const suppressed = [];
  const out = findings.filter((f) => {
    const entry = findMatchingBaselineEntry(f, baseline);
    if (entry) {
      suppressed.push({ finding: f, entry });
      return false;
    }
    return true;
  });
  if (options.verbose && suppressed.length > 0) {
    for (const { finding, entry } of suppressed) {
      const reason =
        entry.kind === "key" && entry.reason
          ? entry.reason
          : entry.kind === "legacy"
            ? "(legacy suppress entry; add reason via baseline map)"
            : "(no reason)";
      log(`drizzle-schema-quality: suppressed ${finding.key} — ${reason}`);
    }
  }
  return { findings: out, suppressed };
}
