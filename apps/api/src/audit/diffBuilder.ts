/**
 * Diff Builder
 * ============
 * Compares two record snapshots and produces a list of FieldChanges.
 * Uses MetaField metadata to determine sensitivity level.
 */

import type { MetaField, SensitivityLevel, FieldChange } from "@afenda/meta-types";

/**
 * Deep-equal comparison for primitive and JSON-serializable values.
 * Returns true if the values are semantically identical.
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => valuesEqual(item, b[i]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => valuesEqual(aObj[key], bObj[key]));
  }

  return false;
}

/** Resolve the sensitivity level for a field from its metadata. */
function getFieldSensitivity(
  fieldName: string,
  fieldsMap: Map<string, MetaField>
): SensitivityLevel {
  const meta = fieldsMap.get(fieldName);
  return meta?.audit?.sensitivityLevel ?? "low";
}

/**
 * Build a diff between two record snapshots.
 *
 * @param oldRecord - Previous record state (empty `{}` for creates)
 * @param newRecord - New record state (empty `{}` for deletes)
 * @param fields    - MetaField definitions for the model
 * @returns Array of field-level changes
 */
export function buildDiff(
  oldRecord: Record<string, unknown>,
  newRecord: Record<string, unknown>,
  fields: MetaField[]
): FieldChange[] {
  const fieldsMap = new Map(fields.map((f) => [f.name, f]));
  const changes: FieldChange[] = [];
  const allKeys = new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]);

  for (const key of allKeys) {
    const oldValue = oldRecord[key];
    const newValue = newRecord[key];

    if (valuesEqual(oldValue, newValue)) continue;

    changes.push({
      field: key,
      oldValue,
      newValue,
      sensitivity: getFieldSensitivity(key, fieldsMap),
    });
  }

  return changes;
}
