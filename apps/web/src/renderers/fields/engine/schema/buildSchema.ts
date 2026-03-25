/**
 * Schema Builder
 * ==============
 * Compiles FieldConfig[] into Zod schemas with conditional logic,
 * array constraints, and form-level validation rules.
 *
 * Framework-agnostic — reusable for server-side validation.
 */

import { z } from "zod";
import type {
  FieldConfig,
  FieldShowIfCondition,
  FormConfig,
  FormLevelValidationRule,
} from "../../index.js";
import { isFieldArrayConfig, isFieldGroupConfig } from "../../index.js";
import type { DynamicFormValues } from "../types.js";
import { joinPath, getValueByPath } from "../path/pathToolkit.js";
import {
  isConditionSatisfied,
  hasRequiredValue,
  type ConditionalRule,
} from "./conditionalRules.js";
import { getBaseSchemaForField, applyFieldRequiredRule, applyCustomRule } from "./fieldSchema.js";

export interface SchemaBuildResult {
  shape: Record<string, z.ZodTypeAny>;
  rules: ConditionalRule[];
}

export function buildObjectShape(
  fields: FieldConfig[],
  inheritedConditions: FieldShowIfCondition[] = [],
  basePath = ""
): SchemaBuildResult {
  const shape: Record<string, z.ZodTypeAny> = {};
  const rules: ConditionalRule[] = [];

  fields.forEach((field) => {
    const effectiveConditions = field.showIf
      ? [...inheritedConditions, field.showIf]
      : inheritedConditions;

    if (isFieldGroupConfig(field)) {
      const nestedResult = buildObjectShape(
        field.fields,
        effectiveConditions,
        joinPath(basePath, field.name)
      );
      shape[field.name] = z.object(nestedResult.shape);
      rules.push(...nestedResult.rules);
      return;
    }

    if (isFieldArrayConfig(field)) {
      const itemShape = buildObjectShape(field.fields);
      let itemSchema: z.ZodTypeAny = z.object(itemShape.shape);

      if (itemShape.rules.length > 0) {
        itemSchema = itemSchema.superRefine((itemValues, ctx) => {
          const normalizedValues = itemValues as DynamicFormValues;

          itemShape.rules.forEach((rule) => {
            if (!rule.leafField || !rule.leafField.required) {
              return;
            }

            const isVisible = rule.conditions.every((condition) =>
              isConditionSatisfied(condition, normalizedValues)
            );
            if (!isVisible) {
              return;
            }

            if (!hasRequiredValue(rule.leafField, normalizedValues[rule.fieldName])) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [rule.fieldName],
                message: "This field is required.",
              });
            }
          });
        });
      }

      let arraySchema: z.ZodTypeAny = z.array(itemSchema);

      if (field.minItems !== undefined) {
        arraySchema = (arraySchema as z.ZodArray<z.ZodTypeAny>).min(
          field.minItems,
          `At least ${field.minItems} item(s) required.`
        );
      }

      if (field.maxItems !== undefined) {
        arraySchema = (arraySchema as z.ZodArray<z.ZodTypeAny>).max(
          field.maxItems,
          `At most ${field.maxItems} item(s) allowed.`
        );
      }

      if (field.required && effectiveConditions.length === 0) {
        arraySchema = (arraySchema as z.ZodArray<z.ZodTypeAny>).min(1, "This field is required.");
      } else {
        arraySchema = arraySchema.optional().nullable();
      }

      shape[field.name] = arraySchema;

      if (field.required && effectiveConditions.length > 0) {
        rules.push({
          fieldName: joinPath(basePath, field.name),
          scopePath: basePath,
          conditions: effectiveConditions,
          valueType: "array",
        });
      }

      return;
    }

    const baseSchema = getBaseSchemaForField(field);
    const withRequired = applyFieldRequiredRule(field, baseSchema, effectiveConditions.length > 0);
    const withCustom = applyCustomRule(field, withRequired);

    shape[field.name] = withCustom;

    if (field.required && effectiveConditions.length > 0) {
      rules.push({
        fieldName: joinPath(basePath, field.name),
        scopePath: basePath,
        conditions: effectiveConditions,
        valueType: "leaf",
        leafField: field,
      });
    }
  });

  return { shape, rules };
}

function applyFormLevelRules(
  schema: z.ZodTypeAny,
  formLevelValidate: FormLevelValidationRule[] | undefined
) {
  if (!formLevelValidate || formLevelValidate.length === 0) {
    return schema;
  }

  return schema.superRefine((values, ctx) => {
    const normalizedValues = values as DynamicFormValues;

    formLevelValidate.forEach((rule) => {
      if (rule.rule === "endAfterStart") {
        const startValue = getValueByPath(normalizedValues, rule.startField);
        const endValue = getValueByPath(normalizedValues, rule.endField);

        if (!startValue || !endValue) {
          return;
        }

        const startDate = new Date(String(startValue));
        const endDate = new Date(String(endValue));

        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
          return;
        }

        if (endDate <= startDate) {
          ctx.addIssue({
            path: rule.endField.split("."),
            code: z.ZodIssueCode.custom,
            message: rule.message || `${rule.endField} must be after ${rule.startField}`,
          });
        }

        return;
      }

      if (rule.rule === "custom" && rule.customFn) {
        const errorMessage = rule.customFn(normalizedValues);

        if (errorMessage) {
          ctx.addIssue({
            path: [],
            code: z.ZodIssueCode.custom,
            message: errorMessage,
          });
        }
      }
    });
  });
}

export function buildZodSchemaFromFieldConfig(fields: FieldConfig[]) {
  return buildZodSchemaFromFormConfig({ fields });
}

export function buildZodSchemaFromFormConfig(form: FormConfig | FieldConfig[]) {
  const normalizedForm: FormConfig = Array.isArray(form) ? { fields: form } : form;

  const compiled = buildObjectShape(normalizedForm.fields);
  let objectSchema: z.ZodTypeAny = z.object(compiled.shape);

  if (compiled.rules.length > 0) {
    objectSchema = objectSchema.superRefine((values, ctx) => {
      const normalizedValues = values as DynamicFormValues;

      compiled.rules.forEach((rule) => {
        const isVisible = rule.conditions.every((condition) =>
          isConditionSatisfied(condition, normalizedValues, rule.scopePath)
        );
        if (!isVisible) {
          return;
        }

        const value = getValueByPath(normalizedValues, rule.fieldName);

        if (rule.valueType === "array") {
          if (!Array.isArray(value) || value.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: rule.fieldName.split("."),
              message: "This field is required.",
            });
          }

          return;
        }

        if (!rule.leafField) {
          return;
        }

        if (!hasRequiredValue(rule.leafField, value)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: rule.fieldName.split("."),
            message: "This field is required.",
          });
        }
      });
    });
  }

  return applyFormLevelRules(objectSchema, normalizedForm.formLevelValidate);
}

export const generateSchema = buildZodSchemaFromFormConfig;
