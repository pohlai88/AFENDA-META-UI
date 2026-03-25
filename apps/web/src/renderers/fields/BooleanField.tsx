import React from "react";
import type { BooleanFieldProps } from "./index.js";
import { FieldWrapper, getFieldHelpTextId } from "./FieldWrapper.js";

export const BooleanField = React.memo(function BooleanField({
  field,
  value = false,
  onChange,
  readonly = false,
}: BooleanFieldProps) {
  const inputId = React.useId();
  const controlId = `boolean-${field.name}-${inputId}`;
  const helpTextId = field.help_text ? getFieldHelpTextId(field.name) : undefined;
  const labelClass = `flex items-center gap-2 ${readonly ? "cursor-default" : "cursor-pointer"}`;

  return (
    <FieldWrapper field={field} htmlFor={controlId}>
      <label htmlFor={controlId} className={labelClass}>
        <input
          id={controlId}
          type="checkbox"
          checked={value}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={readonly}
          required={field.required}
          aria-readonly={readonly || undefined}
          aria-describedby={helpTextId}
          className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <span className="text-sm text-foreground">{field.label}</span>
      </label>
    </FieldWrapper>
  );
});
