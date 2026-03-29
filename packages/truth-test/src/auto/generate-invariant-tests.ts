/**
 * Invariant Condition Test Generator
 * ====================================
 * Consumes InvariantRegistry[] from truth-config and generates
 * valid/invalid record tests against each invariant's ConditionExpression.
 *
 * For each invariant, we:
 *   1. Parse the condition tree
 *   2. Synthesize records that satisfy the condition (invariant holds)
 *   3. Synthesize records that violate the condition (invariant fails)
 *   4. Verify the runtime evaluator agrees
 *
 * No DB required — pure condition evaluation.
 */

import { describe, test, expect } from "vitest";
import type {
  ConditionExpression,
  ConditionGroup,
  FieldCondition,
} from "@afenda/meta-types/schema";
import type { InvariantDefinition, InvariantRegistry } from "@afenda/meta-types/policy";
import { evaluateCondition } from "./evaluate-condition.js";

// ---------------------------------------------------------------------------
// Record synthesis from conditions
// ---------------------------------------------------------------------------

interface SynthesizedCase {
  label: string;
  record: Record<string, unknown>;
  expectedResult: boolean;
}

/**
 * Generate the "violating" value for a field condition.
 * Returns a value that makes the condition evaluate to false.
 */
function violatingValue(cond: FieldCondition): unknown {
  switch (cond.operator) {
    case "eq":
      return cond.value === "active" ? "__NOT_ACTIVE__" : "__MISMATCH__";
    case "neq":
      return cond.value; // exact match violates neq
    case "gt":
      return typeof cond.value === "number" ? cond.value - 1 : 0;
    case "gte":
      return typeof cond.value === "number" ? cond.value - 1 : -1;
    case "lt":
      return typeof cond.value === "number" ? cond.value + 1 : 999;
    case "lte":
      return typeof cond.value === "number" ? cond.value + 1 : 999;
    case "in":
      return "__NOT_IN_LIST__";
    case "not_in": {
      const arr = Array.isArray(cond.value) ? cond.value : [cond.value];
      return arr[0]; // pick first value from the list
    }
    case "contains":
      return ""; // empty string contains nothing
    case "not_contains":
      return String(cond.value ?? ""); // exact match violates not_contains
    case "is_empty":
      return "non-null-value"; // non-null violates is_empty
    case "is_not_empty":
      return null; // null violates is_not_empty
    default:
      return undefined;
  }
}

/**
 * Generate the "satisfying" value for a field condition.
 * Returns a value that makes the condition evaluate to true.
 */
function satisfyingValue(cond: FieldCondition): unknown {
  switch (cond.operator) {
    case "eq":
      return cond.value;
    case "neq":
      return cond.value === "active" ? "draft" : "__DIFFERENT__";
    case "gt":
      return typeof cond.value === "number" ? cond.value + 1 : 1;
    case "gte":
      return cond.value;
    case "lt":
      return typeof cond.value === "number" ? cond.value - 1 : -1;
    case "lte":
      return cond.value;
    case "in": {
      const arr = Array.isArray(cond.value) ? cond.value : [cond.value];
      return arr[0];
    }
    case "not_in":
      return "__NOT_IN_LIST__";
    case "contains":
      return `prefix${String(cond.value ?? "")}suffix`;
    case "not_contains":
      return "clean_string";
    case "is_empty":
      return null;
    case "is_not_empty":
      return "non-null-value";
    default:
      return "default-value";
  }
}

/**
 * Generate test cases for an invariant.
 *
 * For OR-logic invariants: at least one branch must be true.
 *   - Valid: each branch individually true
 *   - Invalid: ALL branches false simultaneously
 *
 * For AND-logic invariants: all branches must be true.
 *   - Valid: all branches true
 *   - Invalid: each branch individually false
 */
function synthesizeCases(inv: InvariantDefinition): SynthesizedCase[] {
  const cases: SynthesizedCase[] = [];
  const condition = inv.condition;

  if ("logic" in condition) {
    const group = condition as ConditionGroup;
    const leaves = group.conditions.filter(
      (c): c is FieldCondition => !("logic" in c),
    );

    if (group.logic === "or") {
      // OR: valid if ANY branch passes
      // Generate one valid case per branch
      for (const leaf of leaves) {
        const record: Record<string, unknown> = {};
        // Satisfy this leaf, violate others
        for (const other of leaves) {
          record[other.field] = violatingValue(other);
        }
        record[leaf.field] = satisfyingValue(leaf);

        cases.push({
          label: `valid: ${leaf.field} ${leaf.operator} ${formatValue(leaf.value)}`,
          record,
          expectedResult: true,
        });
      }

      // Generate the violation case: ALL branches fail
      const violationRecord: Record<string, unknown> = {};
      for (const leaf of leaves) {
        violationRecord[leaf.field] = violatingValue(leaf);
      }
      cases.push({
        label: `violation: all branches fail`,
        record: violationRecord,
        expectedResult: false,
      });
    } else {
      // AND: valid only if ALL branches pass
      // Generate the valid case: all branches true
      const validRecord: Record<string, unknown> = {};
      for (const leaf of leaves) {
        validRecord[leaf.field] = satisfyingValue(leaf);
      }
      cases.push({
        label: `valid: all conditions satisfied`,
        record: validRecord,
        expectedResult: true,
      });

      // Generate one violation per branch
      for (const leaf of leaves) {
        const record: Record<string, unknown> = {};
        for (const other of leaves) {
          record[other.field] = satisfyingValue(other);
        }
        record[leaf.field] = violatingValue(leaf);

        cases.push({
          label: `violation: ${leaf.field} ${leaf.operator} ${formatValue(leaf.value)} fails`,
          record,
          expectedResult: false,
        });
      }
    }
  } else {
    // Single field condition
    const leaf = condition as FieldCondition;
    cases.push({
      label: `valid: ${leaf.field} satisfies ${leaf.operator}`,
      record: { [leaf.field]: satisfyingValue(leaf) },
      expectedResult: true,
    });
    cases.push({
      label: `violation: ${leaf.field} violates ${leaf.operator}`,
      record: { [leaf.field]: violatingValue(leaf) },
      expectedResult: false,
    });
  }

  return cases;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return `"${value}"`;
  return String(value);
}

// ---------------------------------------------------------------------------
// Test generator
// ---------------------------------------------------------------------------

/**
 * Generate exhaustive invariant condition tests from registries.
 * Call this inside a test file — it registers describe/test blocks via Vitest.
 */
export function generateInvariantTests(
  registries: InvariantRegistry[],
): void {
  describe("auto → invariant conditions", () => {
    for (const registry of registries) {
      describe(`model: ${registry.model}`, () => {
        for (const inv of registry.invariants) {
          describe(`${inv.id} [${inv.severity}]`, () => {
            const cases = synthesizeCases(inv);

            // Metadata tests
            test("has required fields", () => {
              expect(inv.id).toBeTruthy();
              expect(inv.targetModel).toBe(registry.model);
              expect(inv.condition).toBeDefined();
              expect(inv.triggerOn.length).toBeGreaterThan(0);
            });

            // Condition evaluation tests
            for (const tc of cases) {
              test(tc.label, () => {
                const result = evaluateCondition(inv.condition, tc.record);
                expect(result).toBe(tc.expectedResult);
              });
            }
          });
        }
      });
    }
  });
}
