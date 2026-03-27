import { SALES_INVARIANT_REGISTRIES } from "@afenda/db";
import type {
  ConditionExpression,
  ConditionGroup,
  FieldCondition,
  InvariantRegistry,
  InvariantTriggerOperation,
  InvariantViolation,
} from "@afenda/meta-types";

type Comparable = boolean | number | string | null | undefined;

export interface InvariantEnforcementInput {
  model: string;
  operation: InvariantTriggerOperation;
  record: Record<string, unknown>;
  registries?: InvariantRegistry[];
}

export interface InvariantEnforcementResult {
  passed: boolean;
  violations: InvariantViolation[];
  errors: InvariantViolation[];
  warnings: InvariantViolation[];
}

function isConditionGroup(expr: ConditionExpression): expr is ConditionGroup {
  return "logic" in expr;
}

function normalizeComparable(value: unknown): Comparable {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed !== "" && /^-?\d+(\.\d+)?$/u.test(trimmed)) {
      return Number(trimmed);
    }
    return value;
  }
  return String(value);
}

function evaluateFieldCondition(
  condition: FieldCondition,
  record: Record<string, unknown>
): boolean {
  const actual = record[condition.field];
  const normalizedActual = normalizeComparable(actual);
  const normalizedExpected = normalizeComparable(condition.value);

  switch (condition.operator) {
    case "eq":
      return Object.is(normalizedActual, normalizedExpected);
    case "neq":
      return !Object.is(normalizedActual, normalizedExpected);
    case "gt":
      return Number(normalizedActual) > Number(normalizedExpected);
    case "gte":
      return Number(normalizedActual) >= Number(normalizedExpected);
    case "lt":
      return Number(normalizedActual) < Number(normalizedExpected);
    case "lte":
      return Number(normalizedActual) <= Number(normalizedExpected);
    case "in": {
      const expectedValues = Array.isArray(condition.value) ? condition.value : [condition.value];
      return expectedValues
        .map(normalizeComparable)
        .some((expected) => Object.is(normalizedActual, expected));
    }
    case "not_in": {
      const expectedValues = Array.isArray(condition.value) ? condition.value : [condition.value];
      return !expectedValues
        .map(normalizeComparable)
        .some((expected) => Object.is(normalizedActual, expected));
    }
    case "contains":
      if (typeof actual === "string") {
        return actual.includes(String(condition.value ?? ""));
      }
      if (Array.isArray(actual)) {
        return actual.some((entry) => Object.is(normalizeComparable(entry), normalizedExpected));
      }
      return false;
    case "not_contains":
      if (typeof actual === "string") {
        return !actual.includes(String(condition.value ?? ""));
      }
      if (Array.isArray(actual)) {
        return !actual.some((entry) => Object.is(normalizeComparable(entry), normalizedExpected));
      }
      return true;
    case "is_empty":
      return actual === null || actual === undefined;
    case "is_not_empty":
      return actual !== null && actual !== undefined;
    default: {
      const exhaustive: never = condition.operator;
      throw new Error(`Unknown invariant operator: ${String(exhaustive)}`);
    }
  }
}

function evaluateCondition(expr: ConditionExpression, record: Record<string, unknown>): boolean {
  if (isConditionGroup(expr)) {
    const results = expr.conditions.map((condition) => evaluateCondition(condition, record));
    return expr.logic === "and" ? results.every(Boolean) : results.some(Boolean);
  }

  return evaluateFieldCondition(expr, record);
}

export function evaluateInvariants(input: InvariantEnforcementInput): InvariantEnforcementResult {
  const registries = input.registries ?? SALES_INVARIANT_REGISTRIES;
  const registry = registries.find(
    (candidate: InvariantRegistry) => candidate.model === input.model
  );

  if (!registry) {
    return {
      passed: true,
      violations: [],
      errors: [],
      warnings: [],
    };
  }

  const violations = registry.invariants
    .filter((invariant) => invariant.triggerOn.includes(input.operation))
    .flatMap((invariant) => {
      if (evaluateCondition(invariant.condition, input.record)) {
        return [];
      }

      return [
        {
          invariantId: invariant.id,
          severity: invariant.severity,
          message: invariant.description,
          context: {
            model: input.model,
            operation: input.operation,
          },
        } satisfies InvariantViolation,
      ];
    });

  const errors = violations.filter(
    (violation: InvariantViolation) =>
      violation.severity === "fatal" || violation.severity === "error"
  );
  const warnings = violations.filter(
    (violation: InvariantViolation) => violation.severity === "warning"
  );

  return {
    passed: errors.length === 0,
    violations,
    errors,
    warnings,
  };
}
