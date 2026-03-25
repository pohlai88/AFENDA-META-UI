import React from "react";
import { format, isValid, parseISO } from "date-fns";
import type { RendererFieldProps } from "./index.js";
import { FieldWrapper, getFieldHelpTextId } from "./FieldWrapper.js";

interface DateFieldProps extends RendererFieldProps {
  dateOnly?: boolean;
}

export const DateField = React.memo(function DateField({
  field,
  value,
  onChange,
  readonly = false,
  dateOnly = false,
}: DateFieldProps) {
  const inputId = React.useId();
  const controlId = `date-${field.name}-${inputId}`;
  const helpTextId = field.help_text ? getFieldHelpTextId(field.name) : undefined;
  const type = dateOnly ? "date" : "datetime-local";

  const formatValue = (v: unknown): string => {
    if (!v) {
      return "";
    }

    try {
      const dt =
        typeof v === "string"
          ? parseISO(v)
          : v instanceof Date
            ? v
            : new Date(v as string | number);

      if (!isValid(dt)) {
        return "";
      }

      return dateOnly ? format(dt, "yyyy-MM-dd") : format(dt, "yyyy-MM-dd'T'HH:mm");
    } catch {
      return "";
    }
  };

  return (
    <FieldWrapper field={field} required={field.required} htmlFor={controlId}>
      <input
        id={controlId}
        type={type}
        value={formatValue(value)}
        required={field.required}
        aria-required={field.required || undefined}
        onChange={(e) => {
          const v = e.target.value;
          onChange?.(v ? new Date(v).toISOString() : null);
        }}
        disabled={readonly}
        aria-readonly={readonly || undefined}
        aria-describedby={helpTextId}
        className={`w-full rounded border px-3 py-2 text-sm ${
          readonly ? "bg-muted" : "bg-background"
        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
      />
    </FieldWrapper>
  );
});
