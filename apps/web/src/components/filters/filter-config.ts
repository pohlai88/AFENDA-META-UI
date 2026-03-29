import type { MetaField } from "@afenda/meta-types/schema";
import type { FilterCondition } from "~/hooks/useModel";

export type FilterOperatorOption = {
  value: FilterCondition["op"];
  label: string;
};

type FilterFieldKind = "string" | "number" | "boolean" | "enum";
export type FilterValueInputKind =
  | "none"
  | "boolean"
  | "enum-single"
  | "enum-multi"
  | "number"
  | "text";

export type ParsedConditionValue = string | number | string[] | undefined;

const OPERATORS_BY_KIND: Record<FilterFieldKind, FilterOperatorOption[]> = {
  string: [
    { value: "eq", label: "equals" },
    { value: "neq", label: "not equals" },
    { value: "like", label: "contains" },
    { value: "ilike", label: "contains (case-insensitive)" },
    { value: "is_null", label: "is empty" },
    { value: "is_not_null", label: "is not empty" },
  ],
  number: [
    { value: "eq", label: "equals" },
    { value: "neq", label: "not equals" },
    { value: "gt", label: "greater than" },
    { value: "gte", label: "greater than or equal" },
    { value: "lt", label: "less than" },
    { value: "lte", label: "less than or equal" },
    { value: "is_null", label: "is empty" },
    { value: "is_not_null", label: "is not empty" },
  ],
  boolean: [{ value: "eq", label: "equals" }],
  enum: [
    { value: "eq", label: "equals" },
    { value: "neq", label: "not equals" },
    { value: "in", label: "is one of" },
  ],
};

const NUMBER_FIELD_TYPES: ReadonlySet<MetaField["type"]> = new Set([
  "integer",
  "decimal",
  "currency",
  "float",
]);

function isNumberFieldType(type: MetaField["type"]): boolean {
  return NUMBER_FIELD_TYPES.has(type);
}

export function getFilterFieldKind(field?: MetaField): FilterFieldKind {
  if (!field) {
    return "string";
  }

  if (field.type === "boolean") {
    return "boolean";
  }

  if (field.type === "enum") {
    return "enum";
  }

  if (isNumberFieldType(field.type)) {
    return "number";
  }

  return "string";
}

export function getOperatorsForField(field?: MetaField): FilterOperatorOption[] {
  return OPERATORS_BY_KIND[getFilterFieldKind(field)];
}

export function needsValue(operator: FilterCondition["op"]): boolean {
  return operator !== "is_null" && operator !== "is_not_null";
}

export function sanitizeLikeValue(rawValue: string): string {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return "";
  }

  const withoutLeading = trimmed.replace(/^%+/, "");
  const withoutBoth = withoutLeading.replace(/%+$/, "");
  if (!withoutBoth) {
    return "";
  }

  return `%${withoutBoth}%`;
}

export function getDisplayValue(condition: FilterCondition): string {
  if (condition.value == null) {
    return "";
  }

  if (condition.op === "like" || condition.op === "ilike") {
    return String(condition.value).replace(/^%+/, "").replace(/%+$/, "");
  }

  return String(condition.value);
}

export function parseConditionValue(
  field: MetaField,
  operator: FilterCondition["op"],
  rawValue: string
): ParsedConditionValue {
  if (operator === "like" || operator === "ilike") {
    return sanitizeLikeValue(rawValue);
  }

  if (field.type === "enum" && operator === "in") {
    return rawValue
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }

  if (isNumberFieldType(field.type)) {
    if (!rawValue.trim()) {
      return undefined;
    }

    const numericValue = Number(rawValue);
    return Number.isNaN(numericValue) ? undefined : numericValue;
  }

  return rawValue;
}

export function getValueInputKind(
  field: MetaField,
  operator: FilterCondition["op"]
): FilterValueInputKind {
  if (!needsValue(operator)) {
    return "none";
  }

  if (field.type === "boolean") {
    return "boolean";
  }

  if (field.type === "enum" && field.options) {
    return operator === "in" ? "enum-multi" : "enum-single";
  }

  if (isNumberFieldType(field.type)) {
    return "number";
  }

  return "text";
}

export function getEnumInValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function toggleEnumInValue(currentValue: unknown, nextValue: string): string[] {
  const current = getEnumInValues(currentValue);
  if (current.includes(nextValue)) {
    return current.filter((item) => item !== nextValue);
  }

  return [...current, nextValue];
}

export function selectVisibleEnumInValues(
  currentValue: unknown,
  visibleValues: string[]
): string[] {
  const current = getEnumInValues(currentValue);
  const merged = new Set([...current, ...visibleValues]);
  return Array.from(merged);
}

export function filterEnumOptions(
  options: NonNullable<MetaField["options"]>,
  query: string
): NonNullable<MetaField["options"]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) => {
    const label = option.label.toLowerCase();
    const value = String(option.value).toLowerCase();
    return label.includes(normalizedQuery) || value.includes(normalizedQuery);
  });
}

export function buildConditionSummary(condition: FilterCondition, fields: MetaField[]): string {
  const field = fields.find((candidate) => candidate.name === condition.field);
  const operators = getOperatorsForField(field);
  const operatorLabel =
    operators.find((operator) => operator.value === condition.op)?.label ?? condition.op;
  const fieldLabel = field?.label ?? condition.field;

  if (!needsValue(condition.op)) {
    return `${fieldLabel} ${operatorLabel}`;
  }

  if (Array.isArray(condition.value)) {
    return `${fieldLabel} ${operatorLabel} ${condition.value.join(", ")}`;
  }

  return `${fieldLabel} ${operatorLabel} ${String(condition.value ?? "")}`.trim();
}
