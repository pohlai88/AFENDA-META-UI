import { z } from "zod";
import type { FieldType } from "@afenda/meta-types";
import type {
  FieldArrayConfig,
  FieldConfig,
  FieldGroupConfig,
  FormConfig,
  FormLevelValidationRule,
  LeafFieldConfig,
} from "./index.js";

const serverShowIfSchema = z
  .object({
    field: z.string().min(1, "Controlling field is required"),
    equals: z.unknown().optional(),
    notEquals: z.unknown().optional(),
  })
  .optional();

const serverValidateSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
  })
  .optional();

const serverAsyncValidateSchema = z
  .object({
    url: z.string().min(1, "asyncValidate.url is required"),
    method: z.enum(["GET", "POST"]).optional(),
    message: z.string().optional(),
    debounceMs: z.number().int().nonnegative().optional(),
    cacheTtlMs: z.number().int().nonnegative().optional(),
    requestShape: z.enum(["legacy", "contract-v1"]).optional(),
    finalCheckOnSubmit: z.boolean().optional(),
  })
  .optional();

const serverToFieldTypeMap: Record<string, FieldType> = {
  text: "text",
  number: "integer",
  boolean: "boolean",
  date: "date",
};

const supportedLeafFieldTypes = new Set<FieldType>([
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
  "enum",
  "many2one",
  "one2many",
]);

function normalizeFieldType(inputType: string): FieldType {
  const mappedType = serverToFieldTypeMap[inputType] ?? (inputType as FieldType);

  if (!supportedLeafFieldTypes.has(mappedType)) {
    throw new Error(`Unsupported field type: ${inputType}`);
  }

  return mappedType;
}

function parsePattern(rawPattern?: string): RegExp | undefined {
  if (!rawPattern) {
    return undefined;
  }

  try {
    return new RegExp(rawPattern);
  } catch {
    throw new Error(`Invalid regex pattern: ${rawPattern}`);
  }
}

function parseLeafFieldConfig(rawField: Record<string, unknown>): LeafFieldConfig {
  const parsed = z
    .object({
      type: z.string().min(1, "Field type is required"),
      name: z.string().min(1, "Field name is required"),
      label: z.string().min(1, "Field label is required"),
      required: z.boolean().optional(),
      help_text: z.string().optional(),
      readonly: z.boolean().optional(),
      widget: z.string().optional(),
      showIf: serverShowIfSchema,
      validate: serverValidateSchema,
      asyncValidate: serverAsyncValidateSchema,
    })
    .parse(rawField);

  const type = normalizeFieldType(parsed.type);
  const pattern = parsePattern(parsed.validate?.pattern);

  return {
    type,
    name: parsed.name,
    label: parsed.label,
    required: parsed.required,
    help_text: parsed.help_text,
    readonly: parsed.readonly,
    widget: parsed.widget,
    showIf: parsed.showIf,
    validate: {
      min: parsed.validate?.min,
      max: parsed.validate?.max,
      pattern,
    },
    asyncValidate: parsed.asyncValidate,
  } as LeafFieldConfig;
}

function parseGroupFieldConfig(rawGroup: Record<string, unknown>): FieldGroupConfig {
  const parsed = z
    .object({
      type: z.literal("group"),
      name: z.string().min(1, "Group name is required"),
      label: z.string().optional(),
      showIf: serverShowIfSchema,
      fields: z.array(z.unknown()),
    })
    .parse(rawGroup);

  return {
    type: "group",
    name: parsed.name,
    label: parsed.label,
    showIf: parsed.showIf,
    fields: parseFieldConfigs(parsed.fields),
  };
}

function parseArrayFieldConfig(rawArray: Record<string, unknown>): FieldArrayConfig {
  const parsed = z
    .object({
      type: z.literal("array"),
      name: z.string().min(1, "Array field name is required"),
      label: z.string().optional(),
      required: z.boolean().optional(),
      itemLabel: z.string().optional(),
      minItems: z.number().int().nonnegative().optional(),
      maxItems: z.number().int().nonnegative().optional(),
      showIf: serverShowIfSchema,
      fields: z.array(z.unknown()),
    })
    .parse(rawArray);

  if (
    parsed.minItems !== undefined &&
    parsed.maxItems !== undefined &&
    parsed.minItems > parsed.maxItems
  ) {
    throw new Error(
      `Invalid array constraints for ${parsed.name}: minItems cannot be greater than maxItems.`
    );
  }

  return {
    type: "array",
    name: parsed.name,
    label: parsed.label,
    required: parsed.required,
    itemLabel: parsed.itemLabel,
    minItems: parsed.minItems,
    maxItems: parsed.maxItems,
    showIf: parsed.showIf,
    fields: parseFieldConfigs(parsed.fields),
  };
}

function parseSingleFieldConfig(raw: unknown): FieldConfig {
  const asRecord = z.record(z.string(), z.unknown()).parse(raw);

  if (asRecord.type === "group") {
    return parseGroupFieldConfig(asRecord);
  }

  if (asRecord.type === "array") {
    return parseArrayFieldConfig(asRecord);
  }

  return parseLeafFieldConfig(asRecord);
}

export function parseFieldConfigs(configJson: unknown[]): FieldConfig[] {
  return z.array(z.unknown()).parse(configJson).map(parseSingleFieldConfig);
}

function parseFormLevelValidationRules(input: unknown): FormLevelValidationRule[] {
  const rawRules = z.array(z.unknown()).parse(input);

  return rawRules.map((rawRule) => {
    const ruleRecord = z.record(z.string(), z.unknown()).parse(rawRule);

    if (ruleRecord.rule === "endAfterStart") {
      const parsed = z
        .object({
          rule: z.literal("endAfterStart"),
          startField: z.string().min(1, "startField is required"),
          endField: z.string().min(1, "endField is required"),
          message: z.string().optional(),
        })
        .parse(ruleRecord);

      return parsed;
    }

    if (ruleRecord.rule === "custom") {
      const parsed = z
        .object({
          rule: z.literal("custom"),
          message: z.string().optional(),
          customFn: z.unknown().optional(),
        })
        .parse(ruleRecord);

      if (parsed.customFn !== undefined && typeof parsed.customFn !== "function") {
        throw new Error("customFn must be a function when provided.");
      }

      return {
        rule: "custom",
        message: parsed.message,
        customFn: parsed.customFn as
          | ((values: Record<string, unknown>) => string | null)
          | undefined,
      };
    }

    if (ruleRecord.rule === "async") {
      const parsed = z
        .object({
          rule: z.literal("async"),
          startField: z.string().optional(),
          endField: z.string().optional(),
          targetField: z.string().optional(),
          asyncValidate: z.object({
            url: z.string().min(1, "asyncValidate.url is required"),
            method: z.enum(["GET", "POST"]).optional(),
            message: z.string().optional(),
            debounceMs: z.number().int().nonnegative().optional(),
            cacheTtlMs: z.number().int().nonnegative().optional(),
            requestShape: z.enum(["legacy", "contract-v1"]).optional(),
            finalCheckOnSubmit: z.boolean().optional(),
          }),
        })
        .parse(ruleRecord);

      return parsed;
    }

    throw new Error(`Unsupported form-level validation rule: ${String(ruleRecord.rule)}`);
  });
}

export function parseFormConfig(configJson: unknown[] | unknown): FormConfig {
  if (Array.isArray(configJson)) {
    return { fields: parseFieldConfigs(configJson) };
  }

  const parsed = z
    .object({
      fields: z.array(z.unknown()),
      formLevelValidate: z.array(z.unknown()).optional(),
    })
    .parse(configJson);

  return {
    fields: parseFieldConfigs(parsed.fields),
    formLevelValidate: parsed.formLevelValidate
      ? parseFormLevelValidationRules(parsed.formLevelValidate)
      : undefined,
  };
}
