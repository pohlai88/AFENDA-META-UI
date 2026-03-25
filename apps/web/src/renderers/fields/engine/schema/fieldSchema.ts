/**
 * Field Schema
 * ============
 * Generates Zod schemas for individual leaf fields based on field type,
 * required rules, and custom validation.
 *
 * Framework-agnostic — depends only on Zod and meta-types.
 */

import { z } from "zod";
import type { LeafFieldConfig } from "../../index.js";

export function getBaseSchemaForField(field: LeafFieldConfig): z.ZodTypeAny {
  switch (field.type) {
    case "boolean":
      return z.boolean();

    case "integer":
    case "float":
    case "currency":
    case "decimal": {
      let numberSchema = z.number({ error: "Please enter a valid number." });

      if (field.validate?.min !== undefined) {
        numberSchema = numberSchema.min(
          field.validate.min,
          `Value must be at least ${field.validate.min}.`
        );
      }

      if (field.validate?.max !== undefined) {
        numberSchema = numberSchema.max(
          field.validate.max,
          `Value must be at most ${field.validate.max}.`
        );
      }

      return numberSchema;
    }

    case "date":
    case "datetime":
    case "time":
      return z.union([z.string(), z.date()]);

    case "many2one":
      return z.union([z.string(), z.number()]);

    case "one2many":
      return z.array(z.record(z.string(), z.unknown()));

    default: {
      if (field.validate?.pattern) {
        return z.string().regex(field.validate.pattern, "Invalid format.");
      }

      return z.unknown();
    }
  }
}

export function applyFieldRequiredRule(
  field: LeafFieldConfig,
  schema: z.ZodTypeAny,
  isConditionallyVisible: boolean
): z.ZodTypeAny {
  if (!field.required || isConditionallyVisible) {
    return schema.optional().nullable();
  }

  if (field.type === "boolean") {
    return z.boolean().refine((value) => value === true, "This field is required.");
  }

  if (field.type === "one2many") {
    return (schema as z.ZodArray<z.ZodTypeAny>).min(1, "This field is required.");
  }

  if (field.type === "date" || field.type === "datetime" || field.type === "time") {
    return schema.refine((value) => {
      if (value instanceof Date) {
        return !Number.isNaN(value.getTime());
      }

      if (typeof value === "string") {
        return value.trim().length > 0;
      }

      return false;
    }, "This field is required.");
  }

  if (field.type === "many2one") {
    return schema.refine((value) => {
      if (typeof value === "number") {
        return Number.isFinite(value);
      }

      if (typeof value === "string") {
        return value.trim().length > 0;
      }

      return false;
    }, "This field is required.");
  }

  if (
    field.type === "string" ||
    field.type === "text" ||
    field.type === "email" ||
    field.type === "url" ||
    field.type === "phone"
  ) {
    return z
      .string({ error: "This field is required." })
      .min(1, "This field is required.")
      .refine((value) => (schema as z.ZodTypeAny).safeParse(value).success, "Invalid format.");
  }

  return schema;
}

export function applyCustomRule(field: LeafFieldConfig, schema: z.ZodTypeAny): z.ZodTypeAny {
  if (!field.validate?.custom) {
    return schema;
  }

  return schema.superRefine((value, ctx) => {
    const customMessage = field.validate?.custom?.(value);
    if (customMessage) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: customMessage });
    }
  });
}
