/**
 * Condition DSL Runtime
 * =====================
 * Evaluates field-level conditions (visibleIf, requiredIf, readonlyIf) against
 * live form values. Provides a React context + hook so any field renderer can
 * read its computed state without prop-drilling.
 */

import React from "react";
import { useWatch, type Control, type FieldValues } from "react-hook-form";
import type { MetaField, ConditionExpression, FieldCondition, ConditionGroup } from "@afenda/meta-types/schema";
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ComputedFieldState {
  visible: boolean;
  required: boolean;
  readonly: boolean;
}

// ---------------------------------------------------------------------------
// React Context
// ---------------------------------------------------------------------------

const FieldConditionsContext = React.createContext<Map<string, ComputedFieldState>>(new Map());

export const FieldConditionsProvider = FieldConditionsContext.Provider;

/**
 * Returns the computed state for a single field, or null if no conditions apply.
 */
export function useComputedFieldState(fieldName: string): ComputedFieldState | null {
  const states = React.useContext(FieldConditionsContext);
  return states.get(fieldName) ?? null;
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

function isConditionGroup(expr: ConditionExpression): expr is ConditionGroup {
  return "logic" in expr && "conditions" in expr;
}

function evaluateSingle(condition: FieldCondition, values: Record<string, unknown>): boolean {
  const fieldValue = values[condition.field];

  switch (condition.operator) {
    case "eq":
      return fieldValue === condition.value;
    case "neq":
      return fieldValue !== condition.value;
    case "gt":
      return Number(fieldValue) > Number(condition.value);
    case "gte":
      return Number(fieldValue) >= Number(condition.value);
    case "lt":
      return Number(fieldValue) < Number(condition.value);
    case "lte":
      return Number(fieldValue) <= Number(condition.value);
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(fieldValue);
    case "not_in":
      return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
    case "contains":
      return (
        typeof fieldValue === "string" &&
        typeof condition.value === "string" &&
        fieldValue.includes(condition.value)
      );
    case "not_contains":
      return (
        typeof fieldValue === "string" &&
        typeof condition.value === "string" &&
        !fieldValue.includes(condition.value)
      );
    case "is_empty":
      return (
        fieldValue == null ||
        fieldValue === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );
    case "is_not_empty":
      return (
        fieldValue != null &&
        fieldValue !== "" &&
        !(Array.isArray(fieldValue) && fieldValue.length === 0)
      );
    default:
      return true;
  }
}

export function evaluateCondition(
  expression: ConditionExpression,
  values: Record<string, unknown>
): boolean {
  if (isConditionGroup(expression)) {
    const results = expression.conditions.map((c) => evaluateCondition(c, values));
    return expression.logic === "and" ? results.every(Boolean) : results.some(Boolean);
  }
  return evaluateSingle(expression, values);
}

// ---------------------------------------------------------------------------
// Dependency collection
// ---------------------------------------------------------------------------

function collectDeps(expr: ConditionExpression | undefined, deps: Set<string>): void {
  if (!expr) return;
  if (isConditionGroup(expr)) {
    for (const c of expr.conditions) collectDeps(c, deps);
  } else {
    deps.add(expr.field);
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Watches the form fields referenced by conditions and returns a Map of
 * computed states for every field that has at least one condition defined.
 *
 * Fields without any condition expression are NOT included in the Map —
 * their static MetaField properties apply as-is.
 */
export function useFieldConditions(
  fields: MetaField[],
  control: Control<FieldValues>
): Map<string, ComputedFieldState> {
  const depFields = React.useMemo(() => {
    const deps = new Set<string>();
    for (const f of fields) {
      collectDeps(f.visibleIf, deps);
      collectDeps(f.requiredIf, deps);
      collectDeps(f.readonlyIf, deps);
    }
    return Array.from(deps);
  }, [fields]);

  const watchedValues = useWatch({ control, name: depFields });

  return React.useMemo(() => {
    const states = new Map<string, ComputedFieldState>();
    if (depFields.length === 0) return states;

    const values: Record<string, unknown> = {};
    depFields.forEach((name, i) => {
      values[name] = (watchedValues as unknown[])[i];
    });

    for (const f of fields) {
      if (!f.visibleIf && !f.requiredIf && !f.readonlyIf) continue;
      states.set(f.name, {
        visible: f.visibleIf ? evaluateCondition(f.visibleIf, values) : true,
        required: f.requiredIf ? evaluateCondition(f.requiredIf, values) : (f.required ?? false),
        readonly: f.readonlyIf ? evaluateCondition(f.readonlyIf, values) : (f.readonly ?? false),
      });
    }

    return states;
  }, [fields, depFields, watchedValues]);
}
