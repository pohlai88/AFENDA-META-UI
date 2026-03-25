/**
 * Currency Field Component
 * ========================
 * Enhanced currency input with formatting and localization.
 * 
 * Features:
 * - Currency symbol display
 * - Number formatting (1,000.00)
 * - Decimal precision control
 * - Localization support
 * - Read-only formatted display
 */

import React, { useState, useCallback } from "react";
import { Input } from "~/components/ui/input";
import type { RendererFieldProps } from "./index";
import { FieldWrapper } from "./FieldWrapper";

interface CurrencyFieldProps extends RendererFieldProps {
  /** Currency code (ISO 4217) */
  currency?: string;
  /** Locale for formatting */
  locale?: string;
  /** Decimal places (default: 2) */
  decimals?: number;
}

export function CurrencyField({
  field,
  value,
  onChange,
  readonly,
  currency = "USD",
  locale = "en-US",
  decimals = 2,
}: CurrencyFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const numericValue = typeof value === "number" ? value : null;

  // Format as currency for display
  const formattedValue = React.useMemo(() => {
    if (numericValue == null) return "";
    
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numericValue);
  }, [numericValue, locale, currency, decimals]);

  // Show raw number when focused for easier editing
  const displayValue = isFocused
    ? numericValue?.toString() ?? ""
    : formattedValue;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      // Allow empty
      if (inputValue === "") {
        onChange?.(null);
        return;
      }

      // Parse number
      const parsed = parseFloat(inputValue);
      if (!isNaN(parsed)) {
        onChange?.(parsed);
      }
    },
    [onChange]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  return (
    <FieldWrapper field={field}>
      <div className="relative">
        {readonly ? (
          <div className="px-3 py-2 border rounded-md bg-muted text-sm">
            {formattedValue || "—"}
          </div>
        ) : (
          <>
            {!isFocused && numericValue != null && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                {currency}
              </div>
            )}
            <Input
              type="number"
              value={displayValue}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="0.00"
              disabled={readonly}
              step={1 / Math.pow(10, decimals)}
              className={!isFocused && numericValue != null ? "pl-16" : ""}
            />
          </>
        )}
      </div>
    </FieldWrapper>
  );
}
