/**
 * Unit tests for the runtime condition evaluator.
 * Verifies all operators work correctly in isolation.
 */

import { describe, test, expect } from "vitest";
import { evaluateCondition } from "../auto/evaluate-condition.js";
import type {
  ConditionExpression,
  FieldCondition,
  ConditionGroup,
} from "@afenda/meta-types/schema";

describe("evaluateCondition", () => {
  describe("field operators", () => {
    test("eq", () => {
      const cond: FieldCondition = { field: "status", operator: "eq", value: "active" };
      expect(evaluateCondition(cond, { status: "active" })).toBe(true);
      expect(evaluateCondition(cond, { status: "draft" })).toBe(false);
    });

    test("neq", () => {
      const cond: FieldCondition = { field: "status", operator: "neq", value: "active" };
      expect(evaluateCondition(cond, { status: "draft" })).toBe(true);
      expect(evaluateCondition(cond, { status: "active" })).toBe(false);
    });

    test("gt", () => {
      const cond: FieldCondition = { field: "amount", operator: "gt", value: 0 };
      expect(evaluateCondition(cond, { amount: 100 })).toBe(true);
      expect(evaluateCondition(cond, { amount: 0 })).toBe(false);
      expect(evaluateCondition(cond, { amount: -1 })).toBe(false);
    });

    test("gte", () => {
      const cond: FieldCondition = { field: "amount", operator: "gte", value: 10 };
      expect(evaluateCondition(cond, { amount: 10 })).toBe(true);
      expect(evaluateCondition(cond, { amount: 11 })).toBe(true);
      expect(evaluateCondition(cond, { amount: 9 })).toBe(false);
    });

    test("lt", () => {
      const cond: FieldCondition = { field: "amount", operator: "lt", value: 100 };
      expect(evaluateCondition(cond, { amount: 50 })).toBe(true);
      expect(evaluateCondition(cond, { amount: 100 })).toBe(false);
    });

    test("lte", () => {
      const cond: FieldCondition = { field: "amount", operator: "lte", value: 100 };
      expect(evaluateCondition(cond, { amount: 100 })).toBe(true);
      expect(evaluateCondition(cond, { amount: 101 })).toBe(false);
    });

    test("in", () => {
      const cond: FieldCondition = { field: "status", operator: "in", value: ["active", "draft"] };
      expect(evaluateCondition(cond, { status: "active" })).toBe(true);
      expect(evaluateCondition(cond, { status: "cancelled" })).toBe(false);
    });

    test("not_in", () => {
      const cond: FieldCondition = { field: "status", operator: "not_in", value: ["active", "draft"] };
      expect(evaluateCondition(cond, { status: "cancelled" })).toBe(true);
      expect(evaluateCondition(cond, { status: "active" })).toBe(false);
    });

    test("contains", () => {
      const cond: FieldCondition = { field: "name", operator: "contains", value: "test" };
      expect(evaluateCondition(cond, { name: "my test name" })).toBe(true);
      expect(evaluateCondition(cond, { name: "no match" })).toBe(false);
    });

    test("not_contains", () => {
      const cond: FieldCondition = { field: "name", operator: "not_contains", value: "test" };
      expect(evaluateCondition(cond, { name: "clean" })).toBe(true);
      expect(evaluateCondition(cond, { name: "test value" })).toBe(false);
    });

    test("is_empty", () => {
      const cond: FieldCondition = { field: "ref", operator: "is_empty" };
      expect(evaluateCondition(cond, { ref: null })).toBe(true);
      expect(evaluateCondition(cond, { ref: undefined })).toBe(true);
      expect(evaluateCondition(cond, {})).toBe(true);
      expect(evaluateCondition(cond, { ref: "value" })).toBe(false);
    });

    test("is_not_empty", () => {
      const cond: FieldCondition = { field: "ref", operator: "is_not_empty" };
      expect(evaluateCondition(cond, { ref: "value" })).toBe(true);
      expect(evaluateCondition(cond, { ref: 0 })).toBe(true);
      expect(evaluateCondition(cond, { ref: null })).toBe(false);
      expect(evaluateCondition(cond, {})).toBe(false);
    });
  });

  describe("group logic", () => {
    test("AND: all must pass", () => {
      const group: ConditionGroup = {
        logic: "and",
        conditions: [
          { field: "status", operator: "eq", value: "active" },
          { field: "amount", operator: "gt", value: 0 },
        ],
      };
      expect(evaluateCondition(group, { status: "active", amount: 100 })).toBe(true);
      expect(evaluateCondition(group, { status: "active", amount: 0 })).toBe(false);
      expect(evaluateCondition(group, { status: "draft", amount: 100 })).toBe(false);
    });

    test("OR: at least one must pass", () => {
      const group: ConditionGroup = {
        logic: "or",
        conditions: [
          { field: "status", operator: "neq", value: "active" },
          { field: "partner_id", operator: "is_not_empty" },
        ],
      };
      expect(evaluateCondition(group, { status: "draft", partner_id: null })).toBe(true);
      expect(evaluateCondition(group, { status: "active", partner_id: "p1" })).toBe(true);
      expect(evaluateCondition(group, { status: "active", partner_id: null })).toBe(false);
    });

    test("nested groups", () => {
      const expr: ConditionGroup = {
        logic: "and",
        conditions: [
          {
            logic: "or",
            conditions: [
              { field: "a", operator: "eq", value: 1 },
              { field: "b", operator: "eq", value: 2 },
            ],
          },
          { field: "c", operator: "gt", value: 0 },
        ],
      };
      expect(evaluateCondition(expr, { a: 1, b: 0, c: 5 })).toBe(true);
      expect(evaluateCondition(expr, { a: 0, b: 2, c: 5 })).toBe(true);
      expect(evaluateCondition(expr, { a: 0, b: 0, c: 5 })).toBe(false);
      expect(evaluateCondition(expr, { a: 1, b: 0, c: 0 })).toBe(false);
    });
  });

  describe("real invariant conditions", () => {
    test("active_has_partner: active + null partner_id → violation", () => {
      const condition: ConditionExpression = {
        logic: "or",
        conditions: [
          { field: "status", operator: "neq", value: "active" },
          { field: "partner_id", operator: "is_not_empty" },
        ],
      };
      // Violation: both branches false
      expect(evaluateCondition(condition, { status: "active", partner_id: null })).toBe(false);
      // Valid: first branch true
      expect(evaluateCondition(condition, { status: "draft", partner_id: null })).toBe(true);
      // Valid: second branch true
      expect(evaluateCondition(condition, { status: "active", partner_id: "uuid" })).toBe(true);
    });

    test("confirmed_amount_positive: sale + amount 0 → violation", () => {
      const condition: ConditionExpression = {
        logic: "or",
        conditions: [
          { field: "status", operator: "neq", value: "sale" },
          { field: "amount_total", operator: "gt", value: 0 },
        ],
      };
      // Violation: status=sale + amount=0
      expect(evaluateCondition(condition, { status: "sale", amount_total: 0 })).toBe(false);
      expect(evaluateCondition(condition, { status: "sale", amount_total: -5 })).toBe(false);
      // Valid: status != sale
      expect(evaluateCondition(condition, { status: "draft", amount_total: 0 })).toBe(true);
      // Valid: amount > 0
      expect(evaluateCondition(condition, { status: "sale", amount_total: 100 })).toBe(true);
    });
  });
});
