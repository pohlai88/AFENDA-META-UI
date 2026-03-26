/**
 * Field component dispatcher
 * ==========================
 * Picks the right input component for a MetaField based on:
 *   1. field.widget (explicit override - takes priority)
 *   2. field.type (default mapping)
 */

import React from "react";
import type { FieldType, MetaField } from "@afenda/meta-types";
import { StringField } from "./StringField.js";
import { BooleanField } from "./BooleanField.js";
import { EnumField } from "./EnumField.js";
import { DateField } from "./DateField.js";
import { RelationField } from "./RelationField.js";
import { One2ManyField } from "./One2ManyField.js";
import { CurrencyField } from "./CurrencyField.js";
import { TagsField } from "./TagsField.js";
import { JsonField } from "./JsonField.js";
import { ColorField } from "./ColorField.js";
import { RatingField } from "./RatingField.js";
import { RichTextField } from "./RichTextField.js";
import { PhoneField } from "./PhoneField.js";
import { AddressField } from "./AddressField.js";
import { SignatureField } from "./SignatureField.js";
import { FieldRenderer, registerWidget, unregisterWidget } from "./FieldRenderer.js";
import { DynamicForm } from "./DynamicForm.js";
import {
  DynamicFormRHF,
  DynamicZodForm,
  buildZodSchemaFromFieldConfig,
  buildZodSchemaFromFormConfig,
  generateSchema,
  invalidateAllAsyncValidationCaches,
  invalidateAsyncFieldValidationValue,
  invalidateAsyncValidationCacheByScope,
} from "./DynamicFormRHF.js";
import { parseFieldConfigs, parseFormConfig } from "./parseFieldConfigs.js";
import { ServerDrivenForm } from "./ServerDrivenForm.js";

type MetaFieldOfType<T extends FieldType> = Omit<MetaField, "type"> & { type: T };

export type FieldCustomValidator = (value: unknown) => string | null;

export interface FieldValidationRules {
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: FieldCustomValidator;
}

export interface FieldShowIfCondition {
  field: string;
  equals?: unknown;
  notEquals?: unknown;
}

export interface AsyncFieldValidationConfig {
  url: string;
  method?: "GET" | "POST";
  message?: string;
  debounceMs?: number;
  cacheTtlMs?: number;
  requestShape?: "legacy" | "contract-v1";
  finalCheckOnSubmit?: boolean;
  enableSuggestions?: boolean; // whether to collect/display suggestions on validation failure
  suggestionVariant?: "inline" | "compact" | "block"; // UI variant for suggestions
}

export interface AsyncFormValidationConfig {
  url: string;
  method?: "GET" | "POST";
  message?: string;
  debounceMs?: number;
  cacheTtlMs?: number;
  requestShape?: "legacy" | "contract-v1";
  finalCheckOnSubmit?: boolean;
}

export interface EndAfterStartValidationRule {
  rule: "endAfterStart";
  startField: string;
  endField: string;
  message?: string;
}

export interface CustomFormValidationRule {
  rule: "custom";
  message?: string;
  customFn?: (values: Record<string, unknown>) => string | null;
}

export interface AsyncFormValidationRule {
  rule: "async";
  startField?: string;
  endField?: string;
  targetField?: string;
  asyncValidate: AsyncFormValidationConfig;
}

export type FormLevelValidationRule =
  | EndAfterStartValidationRule
  | CustomFormValidationRule
  | AsyncFormValidationRule;

type LeafFieldConfigByType<T extends FieldType> = MetaFieldOfType<T> & {
  validate?: FieldValidationRules;
  showIf?: FieldShowIfCondition;
  asyncValidate?: AsyncFieldValidationConfig;
};

export type LeafFieldConfig = {
  [K in FieldType]: LeafFieldConfigByType<K>;
}[FieldType];

export interface FieldGroupConfig {
  type: "group";
  name: string;
  label?: string;
  fields: FieldConfig[];
  showIf?: FieldShowIfCondition;
}

export interface FieldArrayConfig {
  type: "array";
  name: string;
  label?: string;
  required?: boolean;
  itemLabel?: string;
  fields: FieldConfig[];
  minItems?: number;
  maxItems?: number;
  showIf?: FieldShowIfCondition;
}

// ---------------------------------------------------------------------------
// Discriminated field configs/values
// ---------------------------------------------------------------------------

export type FieldConfig = LeafFieldConfig | FieldGroupConfig | FieldArrayConfig;

export interface FormConfig {
  fields: FieldConfig[];
  formLevelValidate?: FormLevelValidationRule[];
}

type FieldValueByType<T extends FieldType> = T extends "boolean"
  ? boolean
  : T extends "integer" | "float" | "currency" | "decimal"
    ? number | null
    : T extends "date" | "datetime" | "time"
      ? string | Date | null
      : T extends "many2one"
        ? string | number | null
        : T extends "one2many"
          ? Record<string, unknown>[]
          : unknown;

export type DiscriminatedFieldProps = {
  [K in FieldType]: {
    field: MetaFieldOfType<K>;
    value?: FieldValueByType<K>;
    onChange?: (value: FieldValueByType<K>) => void;
    readonly?: boolean;
    invalid?: boolean;
  };
}[FieldType];

export type FieldProps = DiscriminatedFieldProps;

export function isFieldGroupConfig(field: FieldConfig): field is FieldGroupConfig {
  return field.type === "group";
}

export function isFieldArrayConfig(field: FieldConfig): field is FieldArrayConfig {
  return field.type === "array";
}

export function isLeafFieldConfig(field: FieldConfig): field is LeafFieldConfig {
  return field.type !== "group" && field.type !== "array";
}

export type BooleanFieldProps = {
  field: MetaFieldOfType<"boolean">;
  value?: boolean;
  onChange?: (checked: boolean) => void;
  readonly?: boolean;
};

// Compatibility props for existing renderer call sites.
export interface RendererFieldProps {
  field: MetaField;
  value: unknown;
  onChange?: (val: unknown) => void;
  readonly: boolean;
  invalid?: boolean;
}

type DiscriminatedPropsFor<T extends FieldType> = Extract<
  DiscriminatedFieldProps,
  { field: { type: T } }
>;
type NumericFieldType = "integer" | "float" | "currency" | "decimal";
type DateLikeFieldType = "date" | "datetime" | "time";
type FallbackFieldType = Exclude<
  FieldType,
  "boolean" | NumericFieldType | DateLikeFieldType | "many2one" | "one2many"
>;

function normalizeToDiscriminatedProps(
  props: RendererFieldProps | DiscriminatedFieldProps
): DiscriminatedFieldProps {
  const { field, value, onChange, readonly = false, invalid } = props;
  const emitChange = (next: unknown) => onChange?.(next as never);

  switch (field.type) {
    case "boolean":
      return {
        field: field as MetaFieldOfType<"boolean">,
        value: typeof value === "boolean" ? value : Boolean(value),
        onChange: (checked: boolean) => emitChange(checked),
        readonly,
        invalid,
      };

    case "integer": {
      const normalized: DiscriminatedPropsFor<"integer"> = {
        field: field as MetaFieldOfType<"integer">,
        value: typeof value === "number" || value == null ? value : Number(value),
        onChange: (next: number | null) => emitChange(next),
        readonly,
        invalid,
      };

      return normalized;
    }

    case "float": {
      const normalized: DiscriminatedPropsFor<"float"> = {
        field: field as MetaFieldOfType<"float">,
        value: typeof value === "number" || value == null ? value : Number(value),
        onChange: (next: number | null) => emitChange(next),
        readonly,
        invalid,
      };

      return normalized;
    }

    case "currency": {
      const normalized: DiscriminatedPropsFor<"currency"> = {
        field: field as MetaFieldOfType<"currency">,
        value: typeof value === "number" || value == null ? value : Number(value),
        onChange: (next: number | null) => emitChange(next),
        readonly,
        invalid,
      };

      return normalized;
    }

    case "decimal": {
      const normalized: DiscriminatedPropsFor<"decimal"> = {
        field: field as MetaFieldOfType<"decimal">,
        value: typeof value === "number" || value == null ? value : Number(value),
        onChange: (next: number | null) => emitChange(next),
        readonly,
        invalid,
      };

      return normalized;
    }

    case "date": {
      const normalized: DiscriminatedPropsFor<"date"> = {
        field: field as MetaFieldOfType<"date">,
        value:
          value == null || typeof value === "string" || value instanceof Date
            ? value
            : String(value),
        onChange: (next: string | Date | null) => emitChange(next),
        readonly,
        invalid,
      };

      return normalized;
    }

    case "datetime": {
      const normalized: DiscriminatedPropsFor<"datetime"> = {
        field: field as MetaFieldOfType<"datetime">,
        value:
          value == null || typeof value === "string" || value instanceof Date
            ? value
            : String(value),
        onChange: (next: string | Date | null) => emitChange(next),
        readonly,
        invalid,
      };

      return normalized;
    }

    case "time": {
      const normalized: DiscriminatedPropsFor<"time"> = {
        field: field as MetaFieldOfType<"time">,
        value:
          value == null || typeof value === "string" || value instanceof Date
            ? value
            : String(value),
        onChange: (next: string | Date | null) => emitChange(next),
        readonly,
        invalid,
      };

      return normalized;
    }

    case "many2one": {
      const normalized: DiscriminatedPropsFor<"many2one"> = {
        field: field as MetaFieldOfType<"many2one">,
        value:
          value == null || typeof value === "string" || typeof value === "number"
            ? value
            : String(value),
        onChange: (next: string | number | null) => emitChange(next),
        readonly,
        invalid,
      };

      return normalized;
    }

    case "one2many": {
      const normalized: DiscriminatedPropsFor<"one2many"> = {
        field: field as MetaFieldOfType<"one2many">,
        value: Array.isArray(value) ? value : [],
        onChange: (next: Record<string, unknown>[]) => emitChange(next),
        readonly,
        invalid,
      };

      return normalized;
    }

    default: {
      const normalized = {
        field: field as MetaFieldOfType<FallbackFieldType>,
        value,
        onChange: (next: unknown) => emitChange(next),
        readonly,
        invalid,
      } as DiscriminatedFieldProps;

      return normalized;
    }
  }
}

export function FieldDispatcher(props: RendererFieldProps | DiscriminatedFieldProps) {
  return <FieldRenderer {...normalizeToDiscriminatedProps(props)} />;
}

// Re-export all field components for direct use
export {
  StringField,
  BooleanField,
  EnumField,
  DateField,
  RelationField,
  One2ManyField,
  CurrencyField,
  TagsField,
  JsonField,
  ColorField,
  RatingField,
  RichTextField,
  PhoneField,
  AddressField,
  SignatureField,
  FieldRenderer,
  registerWidget,
  unregisterWidget,
  DynamicForm,
  DynamicFormRHF,
  DynamicZodForm,
  buildZodSchemaFromFieldConfig,
  buildZodSchemaFromFormConfig,
  generateSchema,
  invalidateAllAsyncValidationCaches,
  invalidateAsyncFieldValidationValue,
  invalidateAsyncValidationCacheByScope,
  parseFieldConfigs,
  parseFormConfig,
  ServerDrivenForm,
};

// Export suggestion utilities
export {
  generatePersonalizedSuggestions,
  extractSuggestionsFromResponse,
  type PersonalizedSuggestion,
  type UserContext,
  type SuggestionConfig,
  type ValidationResponse,
  type EnhancedValidationResponse,
} from "./suggestionGenerator.js";

export {
  useSuggestions,
  useSuggestionsFromResponse,
  type SuggestionsState,
  type UseSuggestionsOptions,
} from "./useSuggestions.js";

export {
  SuggestionPrompt,
  FieldWithSuggestions,
  type SuggestionPromptProps,
  type FieldWithSuggestionsProps,
} from "./SuggestionPrompt.js";
