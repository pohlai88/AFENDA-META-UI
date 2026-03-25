/**
 * Rating Field Component
 * ======================
 * Star rating input (1–5 stars).
 *
 * Features:
 * - Hover preview (highlight stars up to cursor)
 * - Click to set rating, click same star to clear
 * - Keyboard accessible (Arrow keys, Home, End)
 * - Read-only display with filled/empty stars
 */

import React, { useState } from "react";
import { StarIcon } from "lucide-react";
import type { RendererFieldProps } from "./index.js";
import { FieldWrapper } from "./FieldWrapper.js";
import { cn } from "~/lib/utils";

const MAX_STARS = 5;

export function RatingField({ field, value, onChange, readonly }: RendererFieldProps) {
  const fieldId = React.useId();
  const controlId = `rating-${field.name}-${fieldId}`;
  const [hovered, setHovered] = useState<number | null>(null);
  const current = typeof value === "number" ? Math.round(Math.min(MAX_STARS, Math.max(0, value))) : 0;

  const displayRating = hovered ?? current;

  const handleKeyDown = (e: React.KeyboardEvent, star: number) => {
    if (readonly) return;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange?.(Math.min(MAX_STARS, star + 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange?.(Math.max(1, star - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange?.(1);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange?.(MAX_STARS);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onChange?.(0);
    }
  };

  return (
    <FieldWrapper field={field}>
      <div
        id={controlId}
        className="flex gap-0.5"
        role={readonly ? undefined : "radiogroup"}
        aria-label={field.label}
        aria-required={field.required || undefined}
        onMouseLeave={() => setHovered(null)}
      >
        {Array.from({ length: MAX_STARS }, (_, i) => i + 1).map((star) => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            role={readonly ? undefined : "radio"}
            aria-checked={readonly ? undefined : current === star}
            aria-label={`${star} star${star !== 1 ? "s" : ""}`}
            onClick={() => !readonly && onChange?.(star === current ? 0 : star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onKeyDown={(e) => handleKeyDown(e, star)}
            className={cn(
              "rounded p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
              !readonly && "cursor-pointer hover:scale-110",
              readonly && "cursor-default"
            )}
          >
            <StarIcon
              className={cn(
                "h-6 w-6 transition-colors",
                displayRating >= star
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-muted-foreground"
              )}
            />
          </button>
        ))}
        {!readonly && current > 0 && (
          <button
            type="button"
            onClick={() => onChange?.(0)}
            className="ml-1 text-xs text-muted-foreground hover:text-foreground"
            aria-label="Clear rating"
          >
            Clear
          </button>
        )}
      </div>
      {!readonly && (
        <span className="text-xs text-muted-foreground mt-1 block">
          {current > 0 ? `${current} / ${MAX_STARS}` : "Not rated"}
        </span>
      )}
    </FieldWrapper>
  );
}
