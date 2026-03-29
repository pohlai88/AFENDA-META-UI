/**
 * @module schema/field-types.schema
 * @description Zod schemas for core metadata model: field types, conditions, and field definitions.
 * @layer truth-contract
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Field Type
// ---------------------------------------------------------------------------

export const FieldTypeSchema = z.enum([
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
]);

// ---------------------------------------------------------------------------
// Options & Relations
// ---------------------------------------------------------------------------

export const OptionItemSchema = z.object({
  value: z.union([z.string(), z.number()]),
  label: z.string(),
  color: z.string().optional(),
  icon: z.string().optional(),
  disabled: z.boolean().optional(),
});

export const RelationConfigSchema = z.object({
  model: z.string(),
  display_field: z.string().optional(),
  value_field: z.string().optional(),
  foreign_key: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Condition DSL
// ---------------------------------------------------------------------------

export const ConditionOperatorSchema = z.enum([
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
]);

export const FieldConditionSchema = z.object({
  field: z.string(),
  operator: ConditionOperatorSchema,
  value: z.unknown().optional(),
});

export const ConditionGroupSchema: z.ZodType<{
  logic: "and" | "or";
  conditions: (
    | { field: string; operator: z.infer<typeof ConditionOperatorSchema>; value?: unknown }
    | { logic: "and" | "or"; conditions: unknown[] }
  )[];
}> = z.lazy(() =>
  z.object({
    logic: z.enum(["and", "or"]),
    conditions: z.array(z.union([FieldConditionSchema, ConditionGroupSchema])),
  })
);

export const ConditionExpressionSchema = z.union([FieldConditionSchema, ConditionGroupSchema]);

// ---------------------------------------------------------------------------
// Business Type
// ---------------------------------------------------------------------------

export const BusinessTypeSchema = z.enum([
  "email",
  "phone",
  "person_name",
  "address",
  "postal_code",
  "city",
  "country",
  "country_code",
  "currency_code",
  "currency_amount",
  "tax_id",
  "company_id",
  "company_name",
  "status",
  "document_ref",
  "serial_number",
  "url",
  "ip_address",
  "percentage",
  "quantity",
  "weight",
  "dimensions",
  "iban",
  "swift_code",
  "bank_account",
  "vat_number",
  "social_security",
  "coordinates",
  "timezone",
]);

// ---------------------------------------------------------------------------
// Field Sub-Schemas
// ---------------------------------------------------------------------------

export const ComputeConfigSchema = z.object({
  formula: z.string(),
  dependsOn: z.array(z.string()),
  stored: z.boolean(),
});

export const FieldConstraintsSchema = z.object({
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  patternMessage: z.string().optional(),
});

export const FieldI18nSchema = z.object({
  label: z.record(z.string(), z.string()),
  helpText: z.record(z.string(), z.string()).optional(),
  placeholder: z.record(z.string(), z.string()).optional(),
});

export const FieldAuditConfigSchema = z.object({
  trackChanges: z.boolean(),
  sensitivityLevel: z.enum(["low", "medium", "high"]),
});

// ---------------------------------------------------------------------------
// MetaField — full field definition
// ---------------------------------------------------------------------------

export const MetaFieldSchema = z.object({
  name: z.string(),
  type: FieldTypeSchema,
  label: z.string(),
  widget: z.string().optional(),
  required: z.boolean().optional(),
  readonly: z.boolean().optional(),
  hidden: z.boolean().optional(),
  unique: z.boolean().optional(),
  sortable: z.boolean().optional(),
  filterable: z.boolean().optional(),
  options: z.array(OptionItemSchema).optional(),
  relation: RelationConfigSchema.optional(),
  placeholder: z.string().optional(),
  help_text: z.string().optional(),
  order: z.number().optional(),
  span: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  visibleIf: ConditionExpressionSchema.optional(),
  requiredIf: ConditionExpressionSchema.optional(),
  readonlyIf: ConditionExpressionSchema.optional(),
  id: z.string().optional(),
  businessType: BusinessTypeSchema.optional(),
  compute: ComputeConfigSchema.optional(),
  defaultValue: z.unknown().optional(),
  constraints: FieldConstraintsSchema.optional(),
  policyTags: z.array(z.string()).optional(),
  i18n: FieldI18nSchema.optional(),
  audit: FieldAuditConfigSchema.optional(),
});
