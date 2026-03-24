import React from "react";
import type { FieldProps } from "./index.js";
import { FieldWrapper, getFieldHelpTextId } from "./FieldWrapper.js";

export function BooleanField({ field, value, onChange, readonly }: FieldProps) {
  const inputId = React.useId();
  const controlId = `boolean-${field.name}-${inputId}`;
  const helpTextId = field.help_text ? getFieldHelpTextId(field.name) : undefined;

  return (
    <FieldWrapper field={field} htmlFor={controlId}>
      <label
        htmlFor={controlId}
        className={`flex items-center gap-2 ${readonly ? "cursor-default" : "cursor-pointer"}`}
      >
        <input
          id={controlId}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={readonly}
          required={field.required}
          aria-required={field.required || undefined}
          aria-readonly={readonly || undefined}
          aria-describedby={helpTextId}
          className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <span className="text-sm text-foreground">{field.label}</span>
      </label>
    </FieldWrapper>
  );
}
