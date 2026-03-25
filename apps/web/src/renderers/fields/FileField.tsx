import React from "react";
import type { RendererFieldProps } from "./index.js";
import { FieldWrapper } from "./FieldWrapper.js";
import { Button } from "@afenda/ui";

function getFileName(value: unknown): string {
  if (value instanceof File) {
    return value.name;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const segments = trimmed.split("/");
    return segments[segments.length - 1] ?? trimmed;
  }

  return "";
}

export function FileField({ field, value, onChange, readonly }: RendererFieldProps) {
  const inputId = React.useId();
  const controlId = `file-${field.name}-${inputId}`;
  const fileName = getFileName(value);

  if (readonly) {
    return (
      <FieldWrapper field={field} htmlFor={controlId}>
        <div className="text-sm">
          {typeof value === "string" && value ? (
            <a href={value} target="_blank" rel="noreferrer" className="text-primary underline">
              {fileName || value}
            </a>
          ) : (
            <span className="text-muted-foreground">{fileName || "-"}</span>
          )}
        </div>
      </FieldWrapper>
    );
  }

  return (
    <FieldWrapper field={field} htmlFor={controlId}>
      <div className="space-y-2">
        <input
          id={controlId}
          type="file"
          onChange={(e) => {
            const nextFile = e.target.files?.[0] ?? null;
            onChange?.(nextFile);
          }}
          required={field.required}
          aria-required={field.required || undefined}
        />
        {fileName && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground truncate">{fileName}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange?.(null)}>
              Clear
            </Button>
          </div>
        )}
      </div>
    </FieldWrapper>
  );
}
