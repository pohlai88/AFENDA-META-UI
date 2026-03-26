/**
 * Engine v2 — Tenant Rules
 * ==========================
 * Validates tenant isolation primitives: column, FK, index, RLS policies, service bypass.
 */

import { RULE_TYPES, SEVERITIES } from "../engine/rule-types.mjs";

/**
 * @typedef {import('../engine/rule-types.mjs').Rule} Rule
 */

/**
 * Compute the policy-qualified name for a table.
 * Tables already starting with "sales_" keep their name as-is.
 * Others get "sales_" prepended (e.g. "partners" → "sales_partners").
 *
 * @param {string} table
 * @returns {string}
 */
function qualifyName(table) {
  if (table.startsWith("sales_")) {
    return table;
  }
  return `sales_${table}`;
}

/**
 * Create a rule that checks whether tenant_id column exists.
 *
 * @param {string} table - Table name
 * @returns {Rule}
 */
export function tenantColumnRule(table) {
  return {
    id: `TENANT-col-${table}`,
    table,
    type: RULE_TYPES.TENANT,
    severity: SEVERITIES.ERROR,
    description: `Table "${table}" must have a tenant_id column`,
    check(ctx) {
      const t = ctx.schema.tables[table];
      if (!t) {
        return { pass: false, message: `Table "${table}" not found in schema` };
      }

      if (t.columns.includes("tenant_id")) {
        return { pass: true };
      }

      return { pass: false, message: "Missing tenant_id column" };
    },
  };
}

/**
 * Create a rule that checks whether the tenant FK exists.
 *
 * @param {string} table - Table name
 * @param {string} [qualifiedName] - Policy-qualified name (e.g. "sales_orders"). Defaults to "sales_{table}" unless table already starts with "sales_"
 * @returns {Rule}
 */
export function tenantFkRule(table, qualifiedName) {
  const qn = qualifiedName || qualifyName(table);
  const fkName = `fk_${qn}_tenant`;
  return {
    id: `TENANT-fk-${table}`,
    table,
    type: RULE_TYPES.TENANT,
    severity: SEVERITIES.ERROR,
    description: `Table "${table}" must have FK "${fkName}" to tenants`,
    check(ctx) {
      const t = ctx.schema.tables[table];
      if (!t) {
        return { pass: false, message: `Table "${table}" not found in schema` };
      }

      if (t.fks.some((f) => f.name === fkName)) {
        return { pass: true };
      }

      return { pass: false, message: `Missing FK: "${fkName}"` };
    },
  };
}

/**
 * Create a rule that checks whether the tenant index exists.
 *
 * @param {string} table - Table name
 * @param {string} [qualifiedName] - Policy-qualified name
 * @returns {Rule}
 */
export function tenantIndexRule(table, qualifiedName) {
  const qn = qualifiedName || qualifyName(table);
  const idxName = `idx_${qn}_tenant`;
  return {
    id: `TENANT-idx-${table}`,
    table,
    type: RULE_TYPES.TENANT,
    severity: SEVERITIES.ERROR,
    description: `Table "${table}" must have index "${idxName}" on tenant_id`,
    check(ctx) {
      const t = ctx.schema.tables[table];
      if (!t) {
        return { pass: false, message: `Table "${table}" not found in schema` };
      }

      if (t.indexes.some((i) => i.name === idxName)) {
        return { pass: true };
      }

      return { pass: false, message: `Missing index: "${idxName}"` };
    },
  };
}

/**
 * Create a rule that checks whether tenantIsolationPolicies() is spread.
 *
 * @param {string} table - Table name
 * @param {string} [qualifiedName] - Policy-qualified name
 * @returns {Rule}
 */
export function tenantRlsRule(table, qualifiedName) {
  const qn = qualifiedName || qualifyName(table);
  return {
    id: `TENANT-rls-${table}`,
    table,
    type: RULE_TYPES.TENANT,
    severity: SEVERITIES.ERROR,
    description: `Table "${table}" must use tenantIsolationPolicies("${qn}")`,
    check(ctx) {
      const t = ctx.schema.tables[table];
      if (!t) {
        return { pass: false, message: `Table "${table}" not found in schema` };
      }

      if (t.hasTenantIsolation) {
        return { pass: true };
      }

      return {
        pass: false,
        message: `Missing ...tenantIsolationPolicies("${qn}") spread`,
      };
    },
  };
}

/**
 * Create a rule that checks whether serviceBypassPolicy() is present.
 *
 * @param {string} table - Table name
 * @param {string} [qualifiedName] - Policy-qualified name
 * @returns {Rule}
 */
export function serviceBypassRule(table, qualifiedName) {
  const qn = qualifiedName || qualifyName(table);
  return {
    id: `TENANT-bypass-${table}`,
    table,
    type: RULE_TYPES.TENANT,
    severity: SEVERITIES.ERROR,
    description: `Table "${table}" must use serviceBypassPolicy("${qn}")`,
    check(ctx) {
      const t = ctx.schema.tables[table];
      if (!t) {
        return { pass: false, message: `Table "${table}" not found in schema` };
      }

      if (t.hasServiceBypass) {
        return { pass: true };
      }

      return {
        pass: false,
        message: `Missing serviceBypassPolicy("${qn}")`,
      };
    },
  };
}

/**
 * Create all 5 tenant rules for a table.
 *
 * @param {string} table - Table name
 * @param {string} [qualifiedName] - Policy-qualified name
 * @returns {Rule[]}
 */
export function allTenantRules(table, qualifiedName) {
  return [
    tenantColumnRule(table),
    tenantFkRule(table, qualifiedName),
    tenantIndexRule(table, qualifiedName),
    tenantRlsRule(table, qualifiedName),
    serviceBypassRule(table, qualifiedName),
  ];
}
