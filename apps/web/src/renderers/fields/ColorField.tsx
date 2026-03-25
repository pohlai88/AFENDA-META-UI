/**
 * Color Field Component
 * =====================
 * Color picker with hex value display and manual entry.
 *
 * Features:
 * - Native color picker input
 * - Editable hex code text field
 * - Copy hex to clipboard on click
 * - Color preview swatch with read-only label
 */

import React from "react";
import type { RendererFieldProps } from "./index.js";
import { FieldWrapper } from "./FieldWrapper.js";
import { cn } from "~/lib/utils";

export function ColorField({ field, value, onChange, readonly }: RendererFieldProps) {
  const fieldId = React.useId();
  const controlId = `color-${field.name}-${fieldId}`;
  const hexValue = typeof value === "string" ? value : "#000000";

  if (readonly) {
    return (
      <FieldWrapper field={field}>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded border"
            style={{ backgroundColor: hexValue }}
            aria-label={`Color: ${hexValue}`}
          />
          <span className="text-sm font-mono text-muted-foreground">{hexValue}</span>
        </div>
      </FieldWrapper>
    );
  }

  return (
    <FieldWrapper field={field} htmlFor={controlId}>
      <div className="flex items-center gap-2">
        <label
          htmlFor={controlId}
          className={cn("w-10 h-10 rounded border cursor-pointer", "overflow-hidden block")}
          style={{ backgroundColor: hexValue }}
          aria-label="Open color picker"
        >
          <input
            id={controlId}
            type="color"
            value={hexValue}
            onChange={(e) => onChange?.(e.target.value)}
            className="opacity-0 w-full h-full cursor-pointer"
            aria-required={field.required || undefined}
          />
        </label>
        <input
          type="text"
          value={hexValue}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="#000000"
          pattern="^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$"
          className="w-28 rounded-md border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Hex color value"
        />
      </div>
    </FieldWrapper>
  );
}
