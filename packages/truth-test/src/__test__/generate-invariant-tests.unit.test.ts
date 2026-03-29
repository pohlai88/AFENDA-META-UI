import { generateInvariantTests } from "../auto/generate-invariant-tests.js";

const syntheticRegistries = [
  {
    model: "sales_order",
    invariants: [
      {
        id: "or_invariant",
        targetModel: "sales_order",
        description: "either active status or positive amount",
        severity: "error",
        triggerOn: ["create", "update"],
        condition: {
          logic: "or",
          conditions: [
            { field: "status", operator: "eq", value: "active" },
            { field: "amount_total", operator: "gt", value: 0 },
          ],
        },
      },
      {
        id: "and_invariant",
        targetModel: "sales_order",
        description: "status must not be cancelled and reference must be present",
        severity: "warning",
        triggerOn: ["create", "update"],
        condition: {
          logic: "and",
          conditions: [
            { field: "status", operator: "neq", value: "cancelled" },
            { field: "reference", operator: "is_not_empty" },
          ],
        },
      },
      {
        id: "all_operators_or",
        targetModel: "sales_order",
        description: "exercise OR synthesis across all operators",
        severity: "error",
        triggerOn: ["create", "update"],
        condition: {
          logic: "or",
          conditions: [
            { field: "eq_field", operator: "eq", value: "ok" },
            { field: "neq_field", operator: "neq", value: "blocked" },
            { field: "gt_field", operator: "gt", value: 10 },
            { field: "gte_field", operator: "gte", value: 5 },
            { field: "lt_field", operator: "lt", value: 10 },
            { field: "lte_field", operator: "lte", value: 7 },
            { field: "in_field", operator: "in", value: ["a", "b"] },
            { field: "not_in_field", operator: "not_in", value: ["x", "y"] },
            { field: "contains_field", operator: "contains", value: "SO" },
            { field: "not_contains_field", operator: "not_contains", value: "BAD" },
            { field: "empty_field", operator: "is_empty" },
            { field: "not_empty_field", operator: "is_not_empty" },
          ],
        },
      },
      {
        id: "all_operators_and",
        targetModel: "sales_order",
        description: "exercise AND synthesis across all operators",
        severity: "warning",
        triggerOn: ["create", "update"],
        condition: {
          logic: "and",
          conditions: [
            { field: "eq_field2", operator: "eq", value: "ok" },
            { field: "neq_field2", operator: "neq", value: "blocked" },
            { field: "gt_field2", operator: "gt", value: 10 },
            { field: "gte_field2", operator: "gte", value: 5 },
            { field: "lt_field2", operator: "lt", value: 10 },
            { field: "lte_field2", operator: "lte", value: 7 },
            { field: "in_field2", operator: "in", value: ["a", "b"] },
            { field: "not_in_field2", operator: "not_in", value: ["x", "y"] },
            { field: "contains_field2", operator: "contains", value: "SO" },
            { field: "not_contains_field2", operator: "not_contains", value: "BAD" },
            { field: "empty_field2", operator: "is_empty" },
            { field: "not_empty_field2", operator: "is_not_empty" },
          ],
        },
      },
      {
        id: "single_invariant",
        targetModel: "sales_order",
        description: "code contains SO",
        severity: "error",
        triggerOn: ["create"],
        condition: {
          field: "code",
          operator: "contains",
          value: "SO",
        },
      },
    ],
  },
] as any;

generateInvariantTests(syntheticRegistries);
