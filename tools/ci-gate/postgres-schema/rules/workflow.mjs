/**
 * Engine v2 — Workflow Rules
 * ============================
 * Validates status enum coverage against expected business states.
 */

import { RULE_TYPES, SEVERITIES } from '../engine/rule-types.mjs';

/**
 * @typedef {import('../engine/rule-types.mjs').Rule} Rule
 */

/**
 * Create a rule that checks whether a status enum column covers all expected states.
 *
 * @param {string} id - Rule ID
 * @param {string} table - Table name
 * @param {string} statusColumn - Column name holding the status enum
 * @param {string[]} expectedStates - Expected enum values
 * @param {string} enumRef - Name of the enum variable (e.g. "orderStatusEnum")
 * @param {string} description - Business rule description
 * @returns {Rule}
 */
export function stateMachineRule(id, table, statusColumn, expectedStates, enumRef, description) {
  return {
    id,
    table,
    type: RULE_TYPES.STATE_MACHINE,
    severity: SEVERITIES.ERROR,
    description,
    check(ctx) {
      const t = ctx.schema.tables[table];
      if (!t) {
        return { pass: false, message: `Table "${table}" not found in schema` };
      }

      // Find the enum column
      const enumCol = t.enumColumns.find(
        (e) => e.name === statusColumn || e.enumRef === enumRef
      );

      if (!enumCol) {
        return {
          pass: false,
          message: `Status column "${statusColumn}" (enum: ${enumRef}) not found on table "${table}"`,
        };
      }

      // If we have actual values from the extractor, check coverage
      if (enumCol.values && enumCol.values.length > 0) {
        const missing = expectedStates.filter((s) => !enumCol.values.includes(s));
        if (missing.length > 0) {
          return {
            pass: false,
            message: `Missing states in ${enumRef}: ${missing.join(', ')}`,
          };
        }
      }

      // If enum values aren't resolved (static extraction limitation),
      // pass if the column reference to the right enum exists
      return { pass: true };
    },
  };
}
