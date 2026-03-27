/**
 * Engine v2 — Structural Rules
 * ==============================
 * Checks for existence and naming of CHECK constraints, FKs, and indexes.
 */

import { RULE_TYPES, SEVERITIES } from "../engine/rule-types.mjs";

/**
 * @typedef {import('../engine/rule-types.mjs').Rule} Rule
 */

/**
 * Create a rule that checks whether a named CHECK, UNIQUE, or generic constraint exists.
 *
 * @param {string} id - Rule ID (e.g. "SO-001-chk_sales_orders_amount_untaxed_non_negative")
 * @param {string} table - Table name
 * @param {string} constraintName - Expected constraint name
 * @param {string} description - Business rule description
 * @returns {Rule}
 */
export function constraintExistsRule(id, table, constraintName, description) {
  return {
    id,
    table,
    type: RULE_TYPES.CONSTRAINT_EXISTS,
    severity: SEVERITIES.ERROR,
    description,
    check(ctx) {
      const t = ctx.schema.tables[table];
      if (!t) {
        return { pass: false, message: `Table "${table}" not found in schema` };
      }

      // Search in checks and indexes (unique indexes are treated as constraints)
      const inChecks = t.checks.some((c) => c.name === constraintName);
      const inIndexes = t.indexes.some((i) => i.name === constraintName);

      if (inChecks || inIndexes) {
        return { pass: true };
      }

      return {
        pass: false,
        message: `Missing constraint: "${constraintName}"`,
      };
    },
  };
}

/**
 * Create a rule that checks whether a named FK exists.
 *
 * @param {string} id - Rule ID
 * @param {string} table - Table name
 * @param {string} fkName - Expected FK name
 * @param {string} description - Business rule description
 * @returns {Rule}
 */
export function fkExistsRule(id, table, fkName, description) {
  return {
    id,
    table,
    type: RULE_TYPES.CONSTRAINT_EXISTS,
    severity: SEVERITIES.ERROR,
    description,
    check(ctx) {
      const t = ctx.schema.tables[table];
      if (!t) {
        return { pass: false, message: `Table "${table}" not found in schema` };
      }

      if (t.fks.some((f) => f.name === fkName)) {
        return { pass: true };
      }

      return {
        pass: false,
        message: `Missing foreign key: "${fkName}"`,
      };
    },
  };
}

/**
 * Create a rule that checks whether a named index exists.
 *
 * @param {string} id - Rule ID
 * @param {string} table - Table name
 * @param {string} indexName - Expected index name
 * @param {string} description - Business rule description
 * @returns {Rule}
 */
export function indexExistsRule(id, table, indexName, description) {
  return {
    id,
    table,
    type: RULE_TYPES.CONSTRAINT_EXISTS,
    severity: SEVERITIES.ERROR,
    description,
    check(ctx) {
      const t = ctx.schema.tables[table];
      if (!t) {
        return { pass: false, message: `Table "${table}" not found in schema` };
      }

      if (t.indexes.some((i) => i.name === indexName)) {
        return { pass: true };
      }

      return {
        pass: false,
        message: `Missing index: "${indexName}"`,
      };
    },
  };
}

/**
 * Create a rule that warns if any constraint/FK/index name doesn't follow
 * the naming convention: {chk|fk|uq|idx}_{qualifiedName}_{subject}
 *
 * @param {string} table - Table name
 * @returns {Rule}
 */
export function namingConventionRule(table) {
  // Tables already starting with "sales_" keep their name as-is;
  // others get "sales_" prepended (e.g. "partners" → "sales_partners").
  const prefix = table.startsWith("sales_") ? table : `sales_${table}`;

  return {
    id: `NAMING-${table}`,
    table,
    type: RULE_TYPES.CONSTRAINT_EXISTS,
    severity: SEVERITIES.WARN,
    description: `All constraints/indexes on "${table}" should follow naming convention`,
    check(ctx) {
      const t = ctx.schema.tables[table];
      if (!t) {
        return { pass: false, message: `Table "${table}" not found in schema` };
      }

      const violations = [];
      const prefixRe = /^(chk|fk|uq|idx)_/;

      for (const c of t.checks) {
        if (!prefixRe.test(c.name) || !c.name.includes(prefix)) {
          violations.push(`check: ${c.name}`);
        }
      }
      for (const f of t.fks) {
        if (!prefixRe.test(f.name) || !f.name.includes(prefix)) {
          violations.push(`fk: ${f.name}`);
        }
      }
      for (const i of t.indexes) {
        if (!prefixRe.test(i.name) || !i.name.includes(prefix)) {
          violations.push(`index: ${i.name}`);
        }
      }

      if (violations.length === 0) {
        return { pass: true };
      }

      return {
        pass: false,
        message: `${violations.length} naming violation(s): ${violations.slice(0, 5).join(", ")}${violations.length > 5 ? "..." : ""}`,
      };
    },
  };
}
