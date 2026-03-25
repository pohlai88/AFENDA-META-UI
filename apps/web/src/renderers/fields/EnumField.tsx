import React from "react";
import type { RendererFieldProps } from "./index.js";
import { FieldWrapper, getFieldHelpTextId } from "./FieldWrapper.js";

export function EnumField({ field, value, onChange, readonly, invalid }: RendererFieldProps) {
  const inputId = React.useId();
  const controlId = `enum-${field.name}-${inputId}`;
  const helpTextId = field.help_text ? getFieldHelpTextId(field.name) : undefined;
  const options = React.useMemo(
    () =>
      (field.options ?? []).map((option) => ({
        value: String(option.value),
        label: option.label,
      })),
    [field.options]
  );
  const resolvedValue = value == null ? "" : String(value);
  const emptyOptionLabel = field.placeholder ?? "-- Select --";

  return (
    <FieldWrapper field={field} required={field.required} htmlFor={controlId}>
      {readonly && <input type="hidden" name={field.name} value={resolvedValue} />}
      <select
        id={controlId}
        value={resolvedValue}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={readonly}
        required={field.required}
        aria-required={field.required || undefined}
        aria-readonly={readonly || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={helpTextId}
        className={`w-full rounded border px-3 py-2 text-sm ${
          readonly ? "bg-muted" : "bg-background"
        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
      >
        {!field.required && <option value="">{emptyOptionLabel}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}
