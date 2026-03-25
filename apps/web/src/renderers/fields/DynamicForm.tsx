import React from "react";
import type { FieldType, MetaField } from "@afenda/meta-types";
import type {
  DiscriminatedFieldProps,
  FieldConfig,
  FieldShowIfCondition,
  LeafFieldConfig,
} from "./index.js";
import { isFieldArrayConfig, isFieldGroupConfig } from "./index.js";
import { FieldRenderer } from "./FieldRenderer.js";
import { DynamicArrayField } from "./DynamicArrayField.js";

type MetaFieldOfType<T extends FieldType> = Omit<MetaField, "type"> & { type: T };

interface DynamicFormProps {
  fields: FieldConfig[];
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
  readonly?: boolean;
  validateOnMount?: boolean;
  submitLabel?: string;
  className?: string;
}

const EMPTY_INITIAL_VALUES: Record<string, unknown> = Object.freeze({});

function buildErrorPath(...segments: Array<string | number>): string {
  return segments.map(String).join(".");
}

function isConditionSatisfied(condition: FieldShowIfCondition, values: Record<string, unknown>): boolean {
  const controllingValue = values[condition.field];

  if (condition.equals !== undefined && controllingValue !== condition.equals) {
    return false;
  }

  if (condition.notEquals !== undefined && controllingValue === condition.notEquals) {
    return false;
  }

  return true;
}

function collectLeafFields(fields: FieldConfig[]): LeafFieldConfig[] {
  return fields.flatMap((field) => {
    if (isFieldGroupConfig(field)) {
      return collectLeafFields(field.fields);
    }

    if (isFieldArrayConfig(field)) {
      return [];
    }

    return [field];
  });
}

function getArrayValidationError(field: Extract<FieldConfig, { type: "array" }>, itemCount: number): string | null {
  if (field.required && itemCount === 0) {
    return "At least one item is required.";
  }

  if (field.minItems !== undefined && itemCount < field.minItems) {
    return `At least ${field.minItems} item(s) are required.`;
  }

  if (field.maxItems !== undefined && itemCount > field.maxItems) {
    return `At most ${field.maxItems} item(s) are allowed.`;
  }

  return null;
}

function createFieldRendererProps(
  field: LeafFieldConfig,
  rawValue: unknown,
  onValueChange: (value: unknown) => void,
  readonly: boolean,
  invalid: boolean
): DiscriminatedFieldProps {
  switch (field.type) {
    case "boolean":
      return {
        field: field as MetaFieldOfType<"boolean">,
        value: typeof rawValue === "boolean" ? rawValue : Boolean(rawValue),
        onChange: (value: boolean) => onValueChange(value),
        readonly,
        invalid,
      };

    case "integer":
    case "float":
    case "currency":
    case "decimal":
      return {
        field: field as MetaFieldOfType<"integer" | "float" | "currency" | "decimal">,
        value: typeof rawValue === "number" || rawValue == null ? rawValue : Number(rawValue),
        onChange: (value: number | null) => onValueChange(value),
        readonly,
        invalid,
      } as DiscriminatedFieldProps;

    case "date":
    case "datetime":
    case "time":
      return {
        field: field as MetaFieldOfType<"date" | "datetime" | "time">,
        value: rawValue == null || typeof rawValue === "string" || rawValue instanceof Date
          ? rawValue
          : String(rawValue),
        onChange: (value: string | Date | null) => onValueChange(value),
        readonly,
        invalid,
      } as DiscriminatedFieldProps;

    case "many2one":
      return {
        field: field as MetaFieldOfType<"many2one">,
        value: rawValue == null || typeof rawValue === "string" || typeof rawValue === "number"
          ? rawValue
          : String(rawValue),
        onChange: (value: string | number | null) => onValueChange(value),
        readonly,
        invalid,
      };

    case "one2many":
      return {
        field: field as MetaFieldOfType<"one2many">,
        value: Array.isArray(rawValue) ? rawValue : [],
        onChange: (value: Record<string, unknown>[]) => onValueChange(value),
        readonly,
        invalid,
      };

    default:
      return {
        field,
        value: rawValue,
        onChange: (value: unknown) => onValueChange(value),
        readonly,
        invalid,
      } as DiscriminatedFieldProps;
  }
}

export function DynamicForm({
  fields,
  initialValues,
  onSubmit,
  readonly = false,
  validateOnMount = false,
  submitLabel = "Submit",
  className,
}: DynamicFormProps) {
  const resolvedInitialValues = initialValues ?? EMPTY_INITIAL_VALUES;
  const [values, setValues] = React.useState<Record<string, unknown>>(resolvedInitialValues);
  const [errors, setErrors] = React.useState<Record<string, string | null>>({});
  const leafFields = React.useMemo(() => collectLeafFields(fields), [fields]);
  const leafFieldsByName = React.useMemo(
    () => new Map(leafFields.map((field) => [field.name, field] as const)),
    [leafFields]
  );

  React.useEffect(() => {
    setValues(resolvedInitialValues);
    setErrors({});
  }, [resolvedInitialValues]);

  const getFieldError = React.useCallback((field: LeafFieldConfig, value: unknown): string | null => {
    const isEmpty =
      value == null ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0);

    if (field.required) {
      if (field.type === "boolean") {
        if (value !== true) {
          return "This field is required.";
        }
      } else if (isEmpty) {
        return "This field is required.";
      }
    }

    if (field.validate?.min !== undefined && typeof value === "number" && value < field.validate.min) {
      return `Value must be at least ${field.validate.min}.`;
    }

    if (field.validate?.max !== undefined && typeof value === "number" && value > field.validate.max) {
      return `Value must be at most ${field.validate.max}.`;
    }

    if (field.validate?.pattern && typeof value === "string" && !field.validate.pattern.test(value)) {
      return "Invalid format.";
    }

    if (field.validate?.custom) {
      return field.validate.custom(value);
    }

    return null;
  }, []);

  const validateField = React.useCallback((name: string, value: unknown) => {
    const field = leafFieldsByName.get(name);
    if (!field) {
      return null;
    }

    const nextError = getFieldError(field, value);
    setErrors((prev) => ({ ...prev, [name]: nextError }));
    return nextError;
  }, [leafFieldsByName, getFieldError]);

  const validateAll = React.useCallback((nextValues: Record<string, unknown>) => {
    const nextErrors: Record<string, string | null> = {};

    leafFields.forEach((field) => {
      nextErrors[field.name] = getFieldError(field, nextValues[field.name]);
    });

    const validateArrayFields = (nodes: FieldConfig[], source: Record<string, unknown>, pathPrefix?: string) => {
      nodes.forEach((node) => {
        if (node.showIf && !isConditionSatisfied(node.showIf, source)) {
          return;
        }

        if (isFieldGroupConfig(node)) {
          validateArrayFields(node.fields, source, pathPrefix);
          return;
        }

        if (isFieldArrayConfig(node)) {
          const arrayName = pathPrefix ? buildErrorPath(pathPrefix, node.name) : node.name;
          const items = Array.isArray(source[node.name]) ? (source[node.name] as Record<string, unknown>[]) : [];

          nextErrors[arrayName] = getArrayValidationError(node, items.length);

          items.forEach((item, index) => {
            validateArrayFields(node.fields, item, buildErrorPath(arrayName, index));
          });

          return;
        }

        if (!pathPrefix) {
          return;
        }

        const key = buildErrorPath(pathPrefix, node.name);
        nextErrors[key] = getFieldError(node, source[node.name]);
      });
    };

    validateArrayFields(fields, nextValues);

    setErrors(nextErrors);

    return Object.values(nextErrors).every((error) => !error);
  }, [fields, leafFields, getFieldError]);

  React.useEffect(() => {
    if (validateOnMount) {
      validateAll(resolvedInitialValues);
    }
  }, [resolvedInitialValues, validateAll, validateOnMount]);

  const handleChange = React.useCallback((name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  }, [validateField]);

  const handleSubmit = React.useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (validateAll(values)) {
      onSubmit(values);
    }
  }, [onSubmit, validateAll, values]);

  const renderNodes: (nodes: FieldConfig[], path?: string[]) => React.ReactNode[] = React.useCallback((
    nodes: FieldConfig[],
    path: string[] = []
  ): React.ReactNode[] => {
    return nodes.map((field, index) => {
      const key = [...path, field.name || String(index)].join(".");

      if (field.showIf && !isConditionSatisfied(field.showIf, values)) {
        return null;
      }

      if (isFieldGroupConfig(field)) {
        return (
          <fieldset key={key} className="rounded-md border p-4">
            {field.label && <legend className="px-1 text-sm font-semibold">{field.label}</legend>}
            <div className="space-y-4">{renderNodes(field.fields, [...path, field.name])}</div>
          </fieldset>
        );
      }

      if (isFieldArrayConfig(field)) {
        return (
          <DynamicArrayField
            key={key}
            field={field}
            arrayPath={field.name}
            values={values}
            errors={errors}
            readonly={readonly}
            setValues={setValues}
            setErrors={setErrors}
            validateAll={validateAll}
            getFieldError={getFieldError}
            createFieldRendererProps={createFieldRendererProps}
          />
        );
      }

      const rendererProps = createFieldRendererProps(
        field,
        values[field.name],
        (nextValue) => handleChange(field.name, nextValue),
        readonly || Boolean(field.readonly),
        Boolean(errors[field.name])
      );

      return (
        <div key={key}>
          <FieldRenderer {...rendererProps} />
          {errors[field.name] && (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {errors[field.name]}
            </p>
          )}
        </div>
      );
    });
  }, [errors, getFieldError, handleChange, readonly, validateAll, values]);

  const hasErrors = React.useMemo(
    () => Object.values(errors).some((error) => Boolean(error)),
    [errors]
  );

  return (
    <form onSubmit={handleSubmit} className={className ?? "space-y-4"}>
      {hasErrors && (
        <div className="rounded bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          Please fix the errors below before submitting.
        </div>
      )}

      {renderNodes(fields)}

      {!readonly && (
        <button
          type="submit"
          className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          {submitLabel}
        </button>
      )}
    </form>
  );
}
