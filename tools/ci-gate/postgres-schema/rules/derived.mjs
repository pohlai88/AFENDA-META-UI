/**
 * Engine v2 — Derived Field Protection Rules
 * =============================================
 * Warns if financial/computed columns exist without a CHECK constraint
 * protecting their derivation formula.
 */

import { RULE_TYPES, SEVERITIES } from '../engine/rule-types.mjs';

/**
 * @typedef {import('../engine/rule-types.mjs').Rule} Rule
 */

/**
 * Financial column name patterns that typically need formula protection.
 */
const DERIVED_COLUMN_PATTERNS = [
  /total/i,
  /amount/i,
  /balance/i,
  /margin/i,
  /profit/i,
  /cost_subtotal/i,
  /subtotal/i,
];

/**
 * Convert snake_case to camelCase (e.g. "base_amount" → "baseAmount").
 *
 * @param {string} s
 * @returns {string}
 */
function toCamel(s) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Create a rule that warns if derived/computed financial columns exist
 * without a corresponding CHECK constraint protecting them.
 *
 * @param {string} table - Table name
 * @returns {Rule}
 */
export function derivedFieldProtectionRule(table) {
  return {
    id: `DERIVED-${table}`,
    table,
    type: RULE_TYPES.DERIVED,
    severity: SEVERITIES.WARN,
    description: `Financial/computed columns on "${table}" should have protective CHECK constraints`,
    check(ctx) {
      const t = ctx.schema.tables[table];
      if (!t) {
        return { pass: false, message: `Table "${table}" not found in schema` };
      }

      // Exclude enum columns — they are type-constrained, not financial
      const enumColNames = new Set(t.enumColumns.map((e) => e.name));

      const derivedColumns = t.columns.filter(
        (col) =>
          DERIVED_COLUMN_PATTERNS.some((pattern) => pattern.test(col)) &&
          !enumColNames.has(col)
      );

      if (derivedColumns.length === 0) {
        return { pass: true };
      }

      // Check by constraint name OR by CHECK SQL referencing ${table.camelName}
      const unprotected = [];

      for (const col of derivedColumns) {
        const camel = toCamel(col);
        const hasCheck =
          t.checks.some((c) => c.name.includes(col)) ||
          t.checks.some((c) => c.sql.includes(`table.${camel}`));

        if (!hasCheck) {
          unprotected.push(col);
        }
      }

      if (unprotected.length === 0) {
        return { pass: true };
      }

      return {
        pass: false,
        message: `Unprotected derived columns: ${unprotected.join(', ')}`,
      };
    },
  };
}
