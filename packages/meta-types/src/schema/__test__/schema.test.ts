/**
 * Schema Zod contract tests — MetaField, FieldType, ConditionExpression.
 *
 * Design intent: every valid/invalid Zod parse case here is a contract.
 * Failures mean the schema was changed in a way that breaks consumers.
 * Fix the code, not the test.
 */
import { describe, expect, it } from "vitest";

import {
  ConditionExpressionSchema,
  ConditionGroupSchema,
  ConditionOperatorSchema,
  FieldConditionSchema,
  FieldTypeSchema,
  MetaFieldSchema,
} from "../field-types.schema.js";

// ---------------------------------------------------------------------------
// FieldTypeSchema — enum validation
// ---------------------------------------------------------------------------

describe("FieldTypeSchema", () => {
  it("parses every declared field-type variant", () => {
    const validTypes = [
      "string",
      "text",
      "integer",
      "float",
      "currency",
      "decimal",
      "boolean",
      "date",
      "datetime",
      "time",
      "email",
      "url",
      "phone",
      "address",
      "signature",
      "password",
      "uuid",
      "json",
      "enum",
      "many2one",
      "one2many",
      "many2many",
      "file",
      "image",
      "computed",
      "tags",
      "richtext",
      "color",
      "rating",
    ] as const;

    for (const ft of validTypes) {
      const result = FieldTypeSchema.safeParse(ft);
      expect(result.success, `FieldType '${ft}' should parse successfully`).toBe(true);
    }
  });

  it("rejects an unknown field type", () => {
    expect(FieldTypeSchema.safeParse("geolocation").success).toBe(false);
    expect(FieldTypeSchema.safeParse("multiselect").success).toBe(false);
    expect(FieldTypeSchema.safeParse("").success).toBe(false);
    expect(FieldTypeSchema.safeParse(null).success).toBe(false);
    expect(FieldTypeSchema.safeParse(42).success).toBe(false);
  });

  it("provides 29 total variants (exhaustiveness gate)", () => {
    // This count acts as a gate: adding or removing types without updating tests fails here.
    expect(FieldTypeSchema.options).toHaveLength(29);
  });
});

// ---------------------------------------------------------------------------
// ConditionOperatorSchema — enum validation
// ---------------------------------------------------------------------------

describe("ConditionOperatorSchema", () => {
  it("parses all 12 condition operators", () => {
    const operators = [
      "eq",
      "neq",
      "gt",
      "gte",
      "lt",
      "lte",
      "in",
      "not_in",
      "contains",
      "not_contains",
      "is_empty",
      "is_not_empty",
    ] as const;

    for (const op of operators) {
      const result = ConditionOperatorSchema.safeParse(op);
      expect(result.success, `Operator '${op}' should parse successfully`).toBe(true);
    }
  });

  it("rejects unknown operators", () => {
    expect(ConditionOperatorSchema.safeParse("between").success).toBe(false);
    expect(ConditionOperatorSchema.safeParse("equals").success).toBe(false);
    expect(ConditionOperatorSchema.safeParse("LIKE").success).toBe(false);
  });

  it("provides exactly 12 operator variants (exhaustiveness gate)", () => {
    expect(ConditionOperatorSchema.options).toHaveLength(12);
  });
});

// ---------------------------------------------------------------------------
// FieldConditionSchema
// ---------------------------------------------------------------------------

describe("FieldConditionSchema", () => {
  it("parses a minimal field condition (no value)", () => {
    const result = FieldConditionSchema.safeParse({
      field: "status",
      operator: "is_empty",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.field).toBe("status");
      expect(result.data.operator).toBe("is_empty");
      expect(result.data.value).toBeUndefined();
    }
  });

  it("parses a condition with a string value", () => {
    const result = FieldConditionSchema.safeParse({
      field: "department",
      operator: "eq",
      value: "sales",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.value).toBe("sales");
    }
  });

  it("parses a condition with a number value", () => {
    const result = FieldConditionSchema.safeParse({
      field: "amount",
      operator: "gt",
      value: 1000,
    });
    expect(result.success).toBe(true);
  });

  it("parses a condition with an array value (for 'in' operator)", () => {
    const result = FieldConditionSchema.safeParse({
      field: "status",
      operator: "in",
      value: ["draft", "submitted"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required field", () => {
    expect(FieldConditionSchema.safeParse({ operator: "eq", value: "x" }).success).toBe(false);
  });

  it("rejects missing operator", () => {
    expect(FieldConditionSchema.safeParse({ field: "status", value: "draft" }).success).toBe(false);
  });

  it("rejects invalid operator", () => {
    expect(
      FieldConditionSchema.safeParse({ field: "x", operator: "LIKE", value: "%" }).success
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ConditionGroupSchema — recursive DSL
// ---------------------------------------------------------------------------

describe("ConditionGroupSchema", () => {
  it("parses a flat AND condition group", () => {
    const result = ConditionGroupSchema.safeParse({
      logic: "and",
      conditions: [
        { field: "status", operator: "eq", value: "draft" },
        { field: "amount", operator: "gt", value: 500 },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.logic).toBe("and");
      expect(result.data.conditions).toHaveLength(2);
    }
  });

  it("parses an OR condition group", () => {
    const result = ConditionGroupSchema.safeParse({
      logic: "or",
      conditions: [
        { field: "status", operator: "eq", value: "approved" },
        { field: "status", operator: "eq", value: "rejected" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("parses a nested condition group (AND of (OR))", () => {
    const result = ConditionGroupSchema.safeParse({
      logic: "and",
      conditions: [
        {
          logic: "or",
          conditions: [
            { field: "role", operator: "eq", value: "manager" },
            { field: "role", operator: "eq", value: "admin" },
          ],
        },
        { field: "region", operator: "in", value: ["EU", "US"] },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("parses an empty conditions array (empty group is valid)", () => {
    const result = ConditionGroupSchema.safeParse({ logic: "and", conditions: [] });
    expect(result.success).toBe(true);
  });

  it("rejects invalid logic operator", () => {
    expect(ConditionGroupSchema.safeParse({ logic: "xor", conditions: [] }).success).toBe(false);
  });

  it("rejects missing logic field", () => {
    expect(
      ConditionGroupSchema.safeParse({ conditions: [{ field: "x", operator: "eq" }] }).success
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ConditionExpressionSchema — union: FieldCondition | ConditionGroup
// ---------------------------------------------------------------------------

describe("ConditionExpressionSchema", () => {
  it("parses a simple field condition as an expression", () => {
    const result = ConditionExpressionSchema.safeParse({
      field: "active",
      operator: "eq",
      value: true,
    });
    expect(result.success).toBe(true);
  });

  it("parses a condition group as an expression", () => {
    const result = ConditionExpressionSchema.safeParse({
      logic: "and",
      conditions: [{ field: "x", operator: "eq", value: 1 }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an arbitrary plain object", () => {
    expect(ConditionExpressionSchema.safeParse({ invalid: true }).success).toBe(false);
  });

  it("rejects null", () => {
    expect(ConditionExpressionSchema.safeParse(null).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// MetaFieldSchema — full field definition
// ---------------------------------------------------------------------------

describe("MetaFieldSchema — minimal valid field", () => {
  it("parses a minimal required-fields-only MetaField", () => {
    const result = MetaFieldSchema.safeParse({
      name: "amount",
      type: "currency",
      label: "Amount",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("amount");
      expect(result.data.type).toBe("currency");
      expect(result.data.required).toBeUndefined();
    }
  });

  it("rejects a field missing the name", () => {
    const result = MetaFieldSchema.safeParse({ type: "string", label: "Test" });
    expect(result.success).toBe(false);
  });

  it("rejects a field missing the type", () => {
    const result = MetaFieldSchema.safeParse({ name: "foo", label: "Foo" });
    expect(result.success).toBe(false);
  });

  it("rejects a field missing the label", () => {
    const result = MetaFieldSchema.safeParse({ name: "foo", type: "string" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid type enum value", () => {
    const result = MetaFieldSchema.safeParse({
      name: "x",
      type: "geolocation",
      label: "X",
    });
    expect(result.success).toBe(false);
  });
});

describe("MetaFieldSchema — optional fields", () => {
  it("parses a boolean field with all optional flags", () => {
    const result = MetaFieldSchema.safeParse({
      name: "active",
      type: "boolean",
      label: "Active",
      required: true,
      readonly: false,
      hidden: false,
      sortable: true,
      filterable: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.required).toBe(true);
      expect(result.data.sortable).toBe(true);
    }
  });

  it("parses a span value within allowed set (1|2|3|4)", () => {
    for (const span of [1, 2, 3, 4] as const) {
      const result = MetaFieldSchema.safeParse({
        name: "f",
        type: "string",
        label: "F",
        span,
      });
      expect(result.success, `span=${span} should be valid`).toBe(true);
    }
  });

  it("rejects invalid span value", () => {
    const result = MetaFieldSchema.safeParse({
      name: "f",
      type: "string",
      label: "F",
      span: 5,
    });
    expect(result.success).toBe(false);
  });
});

describe("MetaFieldSchema — relation field", () => {
  it("parses a many2one field with relation config", () => {
    const result = MetaFieldSchema.safeParse({
      name: "partner_id",
      type: "many2one",
      label: "Partner",
      relation: {
        model: "res.partner",
        display_field: "name",
        value_field: "id",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.relation?.model).toBe("res.partner");
    }
  });

  it("parses an enum field with options", () => {
    const result = MetaFieldSchema.safeParse({
      name: "status",
      type: "enum",
      label: "Status",
      options: [
        { value: "draft", label: "Draft" },
        { value: "confirmed", label: "Confirmed", color: "#00c0ef" },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.options).toHaveLength(2);
      expect(result.data.options![1]!.color).toBe("#00c0ef");
    }
  });
});

describe("MetaFieldSchema — condition fields (visibleIf / requiredIf / readonlyIf)", () => {
  it("parses a field with a visibleIf condition", () => {
    const result = MetaFieldSchema.safeParse({
      name: "vat",
      type: "string",
      label: "VAT",
      visibleIf: { field: "country", operator: "eq", value: "EU" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visibleIf).toMatchObject({ field: "country" });
    }
  });

  it("parses a field with nested condition group for requiredIf", () => {
    const result = MetaFieldSchema.safeParse({
      name: "approval_note",
      type: "text",
      label: "Approval Note",
      requiredIf: {
        logic: "and",
        conditions: [
          { field: "amount", operator: "gte", value: 50000 },
          { field: "status", operator: "eq", value: "submitted" },
        ],
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("MetaFieldSchema — audit config", () => {
  it("parses a field with audit config", () => {
    const result = MetaFieldSchema.safeParse({
      name: "salary",
      type: "currency",
      label: "Salary",
      audit: {
        trackChanges: true,
        sensitivityLevel: "high",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.audit?.sensitivityLevel).toBe("high");
    }
  });

  it("rejects audit config with invalid sensitivity level", () => {
    const result = MetaFieldSchema.safeParse({
      name: "data",
      type: "json",
      label: "Data",
      audit: {
        trackChanges: true,
        sensitivityLevel: "critical",
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("MetaFieldSchema — computed field", () => {
  it("parses a computed field with formula config", () => {
    const result = MetaFieldSchema.safeParse({
      name: "total",
      type: "computed",
      label: "Total",
      compute: {
        formula: "qty * unit_price",
        dependsOn: ["qty", "unit_price"],
        stored: true,
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.compute?.formula).toBe("qty * unit_price");
      expect(result.data.compute?.dependsOn).toContain("qty");
    }
  });
});

describe("MetaFieldSchema — constraints", () => {
  it("parses a string field with length constraints", () => {
    const result = MetaFieldSchema.safeParse({
      name: "code",
      type: "string",
      label: "Code",
      constraints: {
        required: true,
        minLength: 3,
        maxLength: 20,
        pattern: "^[A-Z0-9]+$",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.constraints?.minLength).toBe(3);
    }
  });
});
