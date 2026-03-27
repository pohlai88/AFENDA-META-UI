/**
 * Engine v2 — Audit Rules
 * =========================
 * Validates presence of shared column sets: timestamp, audit, soft-delete.
 * All severity=warn (advisory) since some tables deliberately omit soft-delete.
 */

import { RULE_TYPES, SEVERITIES } from '../engine/rule-types.mjs';

/**
 * @typedef {import('../engine/rule-types.mjs').Rule} Rule
 */

/**
 * Create a rule that warns if ...timestampColumns is missing.
 *
 * @param {string} table - Table name
 * @returns {Rule}
 */
export function timestampColumnsRule(table) {
  return {
    id: `AUDIT-ts-${table}`,
    table,
    type: RULE_TYPES.AUDIT,
    severity: SEVERITIES.WARN,
    description: `Table "${table}" should spread ...timestampColumns (createdAt/updatedAt)`,
    check(ctx) {
      const t = ctx.schema.tables[table];
      if (!t) {
        return { pass: false, message: `Table "${table}" not found in schema` };
      }

      return {
        pass: t.hasTimestampColumns,
        message: t.hasTimestampColumns ? undefined : 'Missing ...timestampColumns spread',
      };
    },
  };
}

/**
 * Create a rule that warns if ...auditColumns is missing.
 *
 * @param {string} table - Table name
 * @returns {Rule}
 */
export function auditColumnsRule(table) {
  return {
    id: `AUDIT-ac-${table}`,
    table,
    type: RULE_TYPES.AUDIT,
    severity: SEVERITIES.WARN,
    description: `Table "${table}" should spread ...auditColumns (createdBy/updatedBy)`,
    check(ctx) {
      const t = ctx.schema.tables[table];
      if (!t) {
        return { pass: false, message: `Table "${table}" not found in schema` };
      }

      return {
        pass: t.hasAuditColumns,
        message: t.hasAuditColumns ? undefined : 'Missing ...auditColumns spread',
      };
    },
  };
}

/**
 * Create a rule that warns if ...softDeleteColumns is missing.
 *
 * @param {string} table - Table name
 * @returns {Rule}
 */
export function softDeleteRule(table) {
  return {
    id: `AUDIT-sd-${table}`,
    table,
    type: RULE_TYPES.AUDIT,
    severity: SEVERITIES.WARN,
    description: `Table "${table}" should spread ...softDeleteColumns (deletedAt)`,
    check(ctx) {
      const t = ctx.schema.tables[table];
      if (!t) {
        return { pass: false, message: `Table "${table}" not found in schema` };
      }

      return {
        pass: t.hasSoftDeleteColumns,
        message: t.hasSoftDeleteColumns ? undefined : 'Missing ...softDeleteColumns spread',
      };
    },
  };
}

/**
 * Create all 3 audit rules for a table.
 * Pass `{ skipSoftDelete: true }` for tables where soft-delete is intentionally omitted
 * (e.g. immutable history/log tables, junction tables).
 *
 * @param {string} table - Table name
 * @param {{ skipSoftDelete?: boolean }} [opts]
 * @returns {Rule[]}
 */
export function allAuditRules(table, opts) {
  const rules = [timestampColumnsRule(table), auditColumnsRule(table)];

  if (!opts?.skipSoftDelete) {
    rules.push(softDeleteRule(table));
  }

  return rules;
}
