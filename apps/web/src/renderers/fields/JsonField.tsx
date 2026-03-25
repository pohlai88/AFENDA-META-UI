/**
 * JSON Field Component
 * ====================
 * Editable JSON textarea with parse validation and formatting.
 *
 * Features:
 * - Pretty-print formatting (2-space indent)
 * - Live JSON parse error feedback
 * - Format button to auto-prettify
 * - Read-only syntax-highlighted display
 */

import React, { useState } from "react";
import type { RendererFieldProps } from "./index.js";
import { FieldWrapper } from "./FieldWrapper.js";
import { cn } from "~/lib/utils";

export function JsonField({ field, value, onChange, readonly }: RendererFieldProps) {
  const fieldId = React.useId();
  const controlId = `json-${field.name}-${fieldId}`;

  const toText = (v: unknown): string => {
    if (v == null) return "";
    if (typeof v === "string") return v;
    try { return JSON.stringify(v, null, 2); } catch { return String(v); }
  };

  const [text, setText] = useState(() => toText(value));
  const [parseError, setParseError] = useState<string | null>(null);

  const handleChange = (next: string) => {
    setText(next);
    if (next.trim() === "") {
      setParseError(null);
      onChange?.(null);
      return;
    }
    try {
      const parsed = JSON.parse(next);
      setParseError(null);
      onChange?.(parsed);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  const handleFormat = () => {
    try {
      const pretty = JSON.stringify(JSON.parse(text), null, 2);
      setText(pretty);
      setParseError(null);
    } catch {
      // already showing error
    }
  };

  return (
    <FieldWrapper field={field} htmlFor={controlId}>
      {readonly ? (
        <pre className="p-3 rounded-md bg-muted text-sm font-mono overflow-auto max-h-48 whitespace-pre-wrap">
          {text || "—"}
        </pre>
      ) : (
        <div className="space-y-1">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleFormat}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Format JSON
            </button>
          </div>
          <textarea
            id={controlId}
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            rows={8}
            placeholder="{}"
            disabled={readonly}
            className={cn(
              "w-full rounded-md border bg-background p-3 font-mono text-sm resize-y",
              "focus:outline-none focus:ring-2 focus:ring-ring",
              parseError && "border-destructive"
            )}
            aria-invalid={!!parseError || undefined}
            aria-required={field.required || undefined}
          />
          {parseError && (
            <p className="text-xs text-destructive">{parseError}</p>
          )}
        </div>
      )}
    </FieldWrapper>
  );
}
