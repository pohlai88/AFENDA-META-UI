/**
 * Engine v2 — Semantic Rules
 * ============================
 * Checks that CHECK constraint SQL expressions match expected business formulas.
 * Uses sql-normalizer for tolerance against whitespace/case/quoting differences.
 */

import { RULE_TYPES, SEVERITIES } from '../engine/rule-types.mjs';
import { normalize } from '../extractors/sql-normalizer.mjs';

/**
 * @typedef {import('../engine/rule-types.mjs').Rule} Rule
 */

/**
 * Create a rule that verifies a CHECK constraint's SQL matches the expected formula.
 *
 * @param {string} id - Rule ID (e.g. "SO-002-semantic")
 * @param {string} table - Table name
 * @param {string} constraintName - CHECK constraint name
 * @param {string} expectedExpr - Expected SQL expression
 * @param {string} description - Business rule description
 * @returns {Rule}
 */
export function constraintSemanticRule(id, table, constraintName, expectedExpr, description) {
  return {
    id,
    table,
    type: RULE_TYPES.CONSTRAINT_SEMANTIC,
    severity: SEVERITIES.ERROR,
    description,
    check(ctx) {
      const t = ctx.schema.tables[table];
      if (!t) {
        return { pass: false, message: `Table "${table}" not found in schema` };
      }

      const constraint = t.checks.find((c) => c.name === constraintName);
      if (!constraint) {
        return {
          pass: false,
          message: `Constraint "${constraintName}" not found — cannot verify semantics`,
        };
      }

      const actualNorm = normalize(constraint.sql);
      const expectedNorm = normalize(expectedExpr);

      // Also create a variant that strips Drizzle interpolation artifacts
      // ${table.column} in templates becomes just the column identifier
      const actualCleaned = cleanDrizzleInterpolation(actualNorm);
      const expectedCleaned = cleanDrizzleInterpolation(expectedNorm);

      if (actualCleaned === expectedCleaned) {
        return { pass: true };
      }

      return {
        pass: false,
        message: `Semantic drift in "${constraintName}":\n      Expected: ${expectedNorm}\n      Actual:   ${actualNorm}`,
      };
    },
  };
}

/**
 * Clean Drizzle template interpolation artifacts.
 * In the raw source, ${table.columnName} appears. After extraction (sql`...`),
 * the template still contains these patterns as-is.
 *
 * @param {string} expr
 * @returns {string}
 */
function cleanDrizzleInterpolation(expr) {
  // Remove ${table.xxx} → xxx (extract just the column reference)
  return expr.replace(/\$\{table\.(\w+)\}/g, '$1')
    // Also handle ${xxx.yyy} patterns
    .replace(/\$\{\w+\.(\w+)\}/g, '$1');
}
