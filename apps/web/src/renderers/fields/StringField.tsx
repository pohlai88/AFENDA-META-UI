import React from "react";
import type { RendererFieldProps } from "./index.js";
import { FieldWrapper, getFieldHelpTextId } from "./FieldWrapper.js";

interface StringFieldProps extends RendererFieldProps {
  multiline?: boolean;
  password?: boolean;
  type?: string;
}

export function StringField({
  field,
  value,
  onChange,
  readonly,
  multiline,
  password,
  type,
}: StringFieldProps) {
  const inputId = React.useId();
  const controlId = `string-${field.name}-${inputId}`;
  const helpTextId = field.help_text ? getFieldHelpTextId(field.name) : undefined;
  const typeMap: Record<string, string> = { email: "email", url: "url", number: "number" };
  const inputType = password ? "password" : (typeMap[type ?? ""] ?? "text");

  return (
    <FieldWrapper field={field} required={field.required} htmlFor={controlId}>
      {multiline ? (
        <textarea
          id={controlId}
          value={String(value ?? "")}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={readonly}
          rows={3}
          required={field.required}
          aria-required={field.required || undefined}
          aria-readonly={readonly || undefined}
          aria-multiline="true"
          aria-describedby={helpTextId}
          style={inputStyle(readonly)}
        />
      ) : (
        <input
          id={controlId}
          type={inputType}
          value={String(value ?? "")}
          onChange={(e) =>
            onChange?.(
              type === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value
            )
          }
          disabled={readonly}
          required={field.required}
          aria-required={field.required || undefined}
          aria-readonly={readonly || undefined}
          aria-describedby={helpTextId}
          style={inputStyle(readonly)}
        />
      )}
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
