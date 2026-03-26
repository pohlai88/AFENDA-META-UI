import React from "react";
import type { RendererFieldProps } from "./index.js";
import { FieldWrapper, getFieldHelpTextId } from "./FieldWrapper.js";

export function PhoneField({ field, value, onChange, readonly }: RendererFieldProps) {
  const inputId = React.useId();
  const controlId = `phone-${field.name}-${inputId}`;
  const helpTextId = field.help_text ? getFieldHelpTextId(field.name) : undefined;

  return (
    <FieldWrapper field={field} required={field.required} htmlFor={controlId}>
      <input
        id={controlId}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder={field.placeholder ?? "+1 555 123 4567"}
        value={typeof value === "string" ? value : String(value ?? "")}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={readonly}
        required={field.required}
        aria-required={field.required || undefined}
        aria-readonly={readonly || undefined}
        aria-describedby={helpTextId}
        style={inputStyle(readonly)}
      />
    </FieldWrapper>
  );
}

function inputStyle(readonly: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "0.4rem 0.6rem",
    border: `1px solid ${readonly ? "#e0e0e0" : "#ccc"}`,
    borderRadius: 4,
    fontSize: "0.9rem",
    background: readonly ? "#f8f8f8" : "#fff",
    color: readonly ? "#666" : undefined,
    boxSizing: "border-box",
  };
}
