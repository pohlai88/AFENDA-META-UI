/**
 * Policy Context Builder
 * ======================
 * Transforms a PolicyContext (rich, nested) into a flat key-value map
 * that the DSL evaluator can consume.
 *
 * Flattening rules:
 *   record.status             → "status"
 *   record.address.city       → "address_city"
 *   relatedRecords.lines[i].x → "lines_x" (aggregated)
 *   actor.uid                 → "actor_uid"
 *   actor.roles               → "actor_roles" (array)
 *   operation                 → "operation"
 *   previousRecord.status     → "prev_status"
 */

import type { PolicyContext } from "@afenda/meta-types";

/**
 * Flatten an object into dot-delimited keys with `_` separator.
 * Arrays are flattened per-element as `key_N_subkey`.
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix: string,
  target: Record<string, unknown>
): void {
  for (const [key, value] of Object.entries(obj)) {
    const flatKey = prefix ? `${prefix}_${key}` : key;

    if (value === null || value === undefined) {
      target[flatKey] = value;
      continue;
    }

    if (Array.isArray(value)) {
      target[flatKey] = value;

      // Also create aggregated arrays for numeric sub-fields
      // e.g. lines[].amount → lines_amount = [100, 200, 300]
      if (value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
        const sampleKeys = Object.keys(value[0] as Record<string, unknown>);
        for (const subKey of sampleKeys) {
          const aggKey = `${flatKey}_${subKey}`;
          target[aggKey] = value.map((item) => (item as Record<string, unknown>)[subKey]);
        }
      }
      continue;
    }

    if (typeof value === "object" && !(value instanceof Date)) {
      flattenObject(value as Record<string, unknown>, flatKey, target);
      continue;
    }

    target[flatKey] = value;
  }
}

/**
 * Build a flat context map from a PolicyContext.
 * This is the bridge between the structured context and the DSL evaluator.
 */
export function buildPolicyContext(ctx: PolicyContext): Record<string, unknown> {
  const flat: Record<string, unknown> = {};

  // Record fields (top-level access: status, total_amount, etc.)
  flattenObject(ctx.record, "", flat);

  // Related records (lines_amount, lines_quantity, etc.)
  if (ctx.relatedRecords) {
    for (const [relation, records] of Object.entries(ctx.relatedRecords)) {
      flat[relation] = records;

      // Aggregate sub-fields
      if (records.length > 0) {
        const sampleKeys = Object.keys(records[0]);
        for (const key of sampleKeys) {
          flat[`${relation}_${key}`] = records.map((r) => r[key]);
        }
      }
    }
  }

  // Actor
  flat["actor_uid"] = ctx.actor.uid;
  flat["actor_roles"] = ctx.actor.roles;

  // Operation
  flat["operation"] = ctx.operation;

  // Previous record (for update diffs)
  if (ctx.previousRecord) {
    flattenObject(ctx.previousRecord, "prev", flat);
  }

  // Model name
  flat["model"] = ctx.model;

  return flat;
}
