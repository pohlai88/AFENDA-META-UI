import React from "react";
import type { RendererFieldProps } from "./index.js";
import { FieldWrapper } from "./FieldWrapper.js";
import { Button } from "@afenda/ui";

function usePreviewSrc(value: unknown): string | null {
  const [previewSrc, setPreviewSrc] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof value === "string" && value.trim().length > 0) {
      setPreviewSrc(value);
      return;
    }

    if (value instanceof File) {
      const objectUrl = URL.createObjectURL(value);
      setPreviewSrc(objectUrl);
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }

    setPreviewSrc(null);
  }, [value]);

  return previewSrc;
}

export function ImageField({ field, value, onChange, readonly }: RendererFieldProps) {
  const inputId = React.useId();
  const controlId = `image-${field.name}-${inputId}`;
  const previewSrc = usePreviewSrc(value);

  if (readonly) {
    return (
      <FieldWrapper field={field} htmlFor={controlId}>
        {previewSrc ? (
          <img src={previewSrc} alt={field.label} className="h-24 w-24 rounded-md border object-cover" />
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </FieldWrapper>
    );
  }

  return (
    <FieldWrapper field={field} htmlFor={controlId}>
      <div className="space-y-2">
        <input
          id={controlId}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const nextFile = e.target.files?.[0] ?? null;
            onChange?.(nextFile);
          }}
          required={field.required}
          aria-required={field.required || undefined}
        />
        {previewSrc && (
          <div className="space-y-2">
            <img src={previewSrc} alt={field.label} className="h-24 w-24 rounded-md border object-cover" />
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange?.(null)}>
              Clear
            </Button>
          </div>
        )}
      </div>
    </FieldWrapper>
  );
}
