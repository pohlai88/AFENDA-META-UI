/**
 * Runtime Condition Evaluator
 * ============================
 * Evaluates a ConditionExpression against a plain JS record.
 *
 * This is the runtime mirror of invariant-compiler.ts which produces SQL CHECK
 * constraints. Same logic, different target: JS instead of PostgreSQL.
 *
 * Used by the auto-test generator to verify invariant conditions without a DB.
 */

import type {
  ConditionExpression,
  ConditionGroup,
  FieldCondition,
} from "@afenda/meta-types/schema";

/**
 * Evaluate a ConditionExpression against a record.
 * Returns `true` if the condition is satisfied (invariant holds).
 */
export function evaluateCondition(
  expr: ConditionExpression,
  record: Record<string, unknown>,
): boolean {
  if ("logic" in expr) {
    return evaluateGroup(expr as ConditionGroup, record);
  }
  return evaluateField(expr as FieldCondition, record);
}

function evaluateGroup(
  group: ConditionGroup,
  record: Record<string, unknown>,
): boolean {
  if (group.logic === "and") {
    return group.conditions.every((c) => evaluateCondition(c, record));
  }
  return group.conditions.some((c) => evaluateCondition(c, record));
}

function evaluateField(
  cond: FieldCondition,
  record: Record<string, unknown>,
): boolean {
  const val = record[cond.field];

  switch (cond.operator) {
    case "eq":
      return val === cond.value;
    case "neq":
      return val !== cond.value;
    case "gt":
      return typeof val === "number" && typeof cond.value === "number" && val > cond.value;
    case "gte":
      return typeof val === "number" && typeof cond.value === "number" && val >= cond.value;
    case "lt":
      return typeof val === "number" && typeof cond.value === "number" && val < cond.value;
    case "lte":
      return typeof val === "number" && typeof cond.value === "number" && val <= cond.value;
    case "in": {
      const arr = Array.isArray(cond.value) ? cond.value : [cond.value];
      return arr.includes(val);
    }
    case "not_in": {
      const arr = Array.isArray(cond.value) ? cond.value : [cond.value];
      return !arr.includes(val);
    }
    case "contains":
      return typeof val === "string" && val.includes(String(cond.value ?? ""));
    case "not_contains":
      return typeof val === "string" && !val.includes(String(cond.value ?? ""));
    case "is_empty":
      return val == null;
    case "is_not_empty":
      return val != null;
    default:
      throw new Error(`evaluateCondition: unknown operator "${String(cond.operator)}"`);
  }
}
