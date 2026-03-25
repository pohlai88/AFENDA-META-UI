/**
 * Conditional Rules
 * =================
 * Evaluates field visibility conditions and required-value checks.
 * Used by both schema compilation and visibility policy.
 *
 * Framework-agnostic — no React dependencies.
 */

import type { FieldShowIfCondition, LeafFieldConfig } from "../../index.js";
import type { DynamicFormValues } from "../types.js";
import { joinPath, getValueByPath } from "../path/pathToolkit.js";

export interface ConditionalRule {
  fieldName: string;
  scopePath: string;
  conditions: FieldShowIfCondition[];
  valueType: "leaf" | "array";
  leafField?: LeafFieldConfig;
}

export function resolveConditionFieldPath(conditionField: string, scopePath: string): string {
  if (!scopePath || conditionField.includes(".")) {
    return conditionField;
  }

  return joinPath(scopePath, conditionField);
}

export function isConditionSatisfied(
  condition: FieldShowIfCondition,
  values: DynamicFormValues,
  scopePath = ""
): boolean {
  const controllingPath = resolveConditionFieldPath(condition.field, scopePath);
  const controllingValue = getValueByPath(values, controllingPath);

  if (condition.equals !== undefined && controllingValue !== condition.equals) {
    return false;
  }

  if (condition.notEquals !== undefined && controllingValue === condition.notEquals) {
    return false;
  }

  return true;
}

export function hasRequiredValue(field: LeafFieldConfig, value: unknown): boolean {
  if (field.type === "boolean") {
    return value === true;
  }

  if (field.type === "one2many") {
    return Array.isArray(value) && value.length > 0;
  }

  if (field.type === "date" || field.type === "datetime" || field.type === "time") {
    if (value instanceof Date) {
      return !Number.isNaN(value.getTime());
    }

    return typeof value === "string" && value.trim().length > 0;
  }

  if (field.type === "many2one") {
    if (typeof value === "number") {
      return Number.isFinite(value);
    }

    return typeof value === "string" && value.trim().length > 0;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return value != null;
}
