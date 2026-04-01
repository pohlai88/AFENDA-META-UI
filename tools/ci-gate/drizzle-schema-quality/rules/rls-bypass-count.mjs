import { RULE_IDS } from "../rule-ids.mjs";
import { toRepoRelative, isRlsOptionalPath } from "../config.mjs";

const TABLE_RE =
  /(?:\w+Schema\.table|pgTable)\(\s*["']([^"']+)["']/g;

/** Optional second arg, e.g. `tenantIsolationPolicies("users", securityTenantSqlColumn)`. */
const TENANT_POLICIES_RE =
  /tenantIsolationPolicies\(\s*["']([^"']+)["']\s*(?:,\s*[^)]+)?\)/g;
const BYPASS_RE = /serviceBypassPolicy\(\s*["']([^"']+)["']\s*\)/g;

/** Files where some tables use catalog/append-only RLS instead of `tenantIsolationPolicies`. */
const TENANT_PACK_SHORTFILE = new Map([
  ["packages/db/src/schema/sales/subscription.ts", 2],
]);

/**
 * @param {string} content
 * @param {string} absolutePath
 * @returns {import('../rule-ids.mjs').Finding[]}
 */
export function run(content, absolutePath) {
  const file = toRepoRelative(absolutePath);
  const tables = [...content.matchAll(TABLE_RE)].map((m) => m[1]);
  const n = tables.length;
  if (n === 0) return [];

  const rlsTenant = [...content.matchAll(TENANT_POLICIES_RE)].map((m) => m[1]);
  const rlsBypass = [...content.matchAll(BYPASS_RE)].map((m) => m[1]);

  /** Allowlisted domains (core, security, meta, reference) may omit RLS helpers. */
  if (rlsTenant.length === 0 && rlsBypass.length === 0) {
    if (isRlsOptionalPath(file)) return [];
    return [
      {
        ruleId: RULE_IDS.RLS_ZERO_POLICIES,
        file,
        table: "*",
        message: [
          `File declares ${n} table(s) but has no tenantIsolationPolicies("…") or serviceBypassPolicy("…") calls.`,
          "Add per-table RLS helpers or move tables into an allowlisted path (see drizzle-schema-quality/config.mjs RLS_OPTIONAL_PATH_PREFIXES).",
        ].join(" "),
      },
    ];
  }

  const short = TENANT_PACK_SHORTFILE.get(file) ?? 0;
  const tenantExpected = n - short;
  if (rlsTenant.length === tenantExpected && rlsBypass.length === n) return [];

  /**
   * Under RLS_OPTIONAL_PATH_PREFIXES, global tables (no tenant_id) legitimately omit
   * tenantIsolationPolicies; only tenant-scoped tables add helpers. Still require paired
   * tenant + bypass counts so every policy set is service-bypassable.
   */
  if (isRlsOptionalPath(file)) {
    if (rlsTenant.length !== rlsBypass.length) {
      return [
        {
          ruleId: RULE_IDS.RLS_COUNT_MISMATCH,
          file,
          table: "*",
          message: [
            `On allowlisted paths, tenantIsolationPolicies and serviceBypassPolicy must appear in pairs per table that has RLS.`,
            `Got tenantIsolationPolicies=${rlsTenant.length}, serviceBypassPolicy=${rlsBypass.length} (${n} table(s) in file).`,
          ].join(" "),
        },
      ];
    }
    return [];
  }

  return [
    {
      ruleId: RULE_IDS.RLS_COUNT_MISMATCH,
      file,
      table: "*",
      message: [
        `Expected tenantIsolationPolicies for ${tenantExpected} of ${n} table(s) and serviceBypassPolicy for each table.`,
        `Got tenantIsolationPolicies=${rlsTenant.length}, serviceBypassPolicy=${rlsBypass.length}.`,
      ].join(" "),
    },
  ];
}
