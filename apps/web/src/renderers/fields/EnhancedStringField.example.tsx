/**
 * StringField with Personalized Suggestions
 * ==========================================
 * Example integration showing how to enhance StringField components
 * with personalized fallback suggestions when async validation fails.
 *
 * This file demonstrates the full pattern for integrating suggestions
 * into your form fields.
 */

import React from "react";
import { useController, type FieldValues, type UseControllerProps } from "react-hook-form";
import type { PersonalizedSuggestion, UserContext } from "./suggestionGenerator";
import { useSuggestions } from "./useSuggestions";
import { SuggestionPrompt, FieldWithSuggestions } from "./SuggestionPrompt";
import type { AsyncFieldValidationConfig } from "./index";

/**
 * Enhanced StringField props supporting suggestions
 */
export interface EnhancedStringFieldProps<T extends FieldValues> extends UseControllerProps<T> {
  label: string;
  placeholder?: string;
  required?: boolean;
  help_text?: string;
  asyncValidate?: AsyncFieldValidationConfig;
  userContext?: UserContext; // for personalization
  onSuggestionSelect?: (suggestion: string) => void;
  suggestionVariant?: "inline" | "compact" | "block";
  className?: string;
}

/**
 * Example implementation of a StringField with suggestions
 *
 * Usage:
 * ```tsx
 * <EnhancedStringFieldWithSuggestions
 *   control={form.control}
 *   name="username"
 *   label="Username"
 *   placeholder="Enter your username"
 *   asyncValidate={{
 *     url: "/api/validate/username",
 *     method: "POST",
 *     debounceMs: 400,
 *     enableSuggestions: true,
 *     suggestionVariant: "compact",
 *   }}
 *   userContext={{
 *     firstName: "John",
 *     lastName: "Doe",
 *     location: "San Francisco",
 *     preferences: { favoriteTeam: "Warriors" },
 *   }}
 * />
 * ```
 */
export function EnhancedStringFieldWithSuggestions<T extends FieldValues>({
  label,
  placeholder,
  required,
  help_text,
  asyncValidate,
  userContext,
  onSuggestionSelect,
  suggestionVariant = "compact",
  className,
  ...controllerProps
}: EnhancedStringFieldProps<T>) {
  const { field, fieldState } = useController(controllerProps);
  const { suggestions, handleValidationFailure, clearSuggestions, setLoading } = useSuggestions({
    userContext,
    maxSuggestions: asyncValidate?.enableSuggestions ? 3 : 0,
    enableFrontendGeneration: true,
  });

  /**
   * Handle suggestion click - populate field with suggested value
   */
  const handleSuggestionClick = React.useCallback(
    (suggestion: string) => {
      field.onChange(suggestion);
      onSuggestionSelect?.(suggestion);
      // Clear suggestions when user selects one
      clearSuggestions();
    },
    [field, onSuggestionSelect, clearSuggestions]
  );

  /**
   * Demo: Simulate async validation on blur
   * In a real implementation, this would be handled by React Hook Form's
   * async validator, but showing the pattern here for clarity
   */
  const handleBlur = React.useCallback(async () => {
    field.onBlur();

    if (!asyncValidate?.enableSuggestions || !field.value) {
      return;
    }

    setLoading(field.value as string);

    try {
      const response = await fetch(asyncValidate.url, {
        method: asyncValidate.method || "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: field.value }),
      });

      const data = (await response.json()) as Record<string, unknown>;

      if (!data.valid) {
        const errorMessage = (data.message as string) || "Value is invalid";
        const backendSuggestions = data.suggestions as string[] | undefined;

        handleValidationFailure(field.value as string, errorMessage, backendSuggestions);
      } else {
        clearSuggestions();
      }
    } catch (error) {
      console.error("Validation error:", error);
      handleValidationFailure(field.value as string, "Validation failed");
    }
  }, [field, asyncValidate, setLoading, handleValidationFailure, clearSuggestions]);

  return (
    <FieldWithSuggestions
      fieldId={controllerProps.name}
      label={label}
      error={fieldState.error?.message}
      suggestions={suggestions}
      onSuggestionClick={handleSuggestionClick}
      suggestionVariant={suggestionVariant}
    >
      <input
        id={controllerProps.name}
        type="text"
        placeholder={placeholder}
        required={required}
        {...field}
        onBlur={handleBlur}
        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
          fieldState.error ? "border-red-500" : "border-gray-300"
        }`}
        aria-describedby={help_text ? `${controllerProps.name}-help` : undefined}
      />

      {help_text && (
        <p id={`${controllerProps.name}-help`} className="mt-1 text-sm text-gray-500">
          {help_text}
        </p>
      )}
    </FieldWithSuggestions>
  );
}

/**
 * Minimal example - just the suggestions popup without full field wrapper
 */
export function StringFieldWithSuggestionsPopup<T extends FieldValues>({
  label,
  placeholder,
  asyncValidate,
  userContext,
  className,
  ...controllerProps
}: EnhancedStringFieldProps<T>) {
  const { field, fieldState } = useController(controllerProps);
  const { suggestions, handleValidationFailure } = useSuggestions({
    userContext,
    enableFrontendGeneration: true,
  });

  const handleSuggestionClick = (suggestion: string) => {
    field.onChange(suggestion);
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-900 mb-1">{label}</label>

      <input
        type="text"
        placeholder={placeholder}
        {...field}
        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
          fieldState.error ? "border-red-500" : "border-gray-300"
        }`}
      />

      {fieldState.error && <p className="mt-1 text-sm text-red-600">{fieldState.error.message}</p>}

      {suggestions.length > 0 && (
        <SuggestionPrompt
          suggestions={suggestions}
          onSuggestionClick={handleSuggestionClick}
          variant="compact"
          className="mt-2"
        />
      )}
    </div>
  );
}

/**
 * ============================================================================
 * INTEGRATION PATTERN: Using in your form
 * ============================================================================
 *
 * ```tsx
 * import { useForm } from "react-hook-form";
 * import { EnhancedStringFieldWithSuggestions } from "./EnhancedStringField";
 * import { usePermissions } from "~/bootstrap/permissions-context";
 *
 * export function RegistrationForm() {
 *   const { control } = useForm();
 *   const { userId, role } = usePermissions();
 *
 *   const userContext = {
 *     userId,
 *     firstName: "John",
 *     lastName: "Doe",
 *     location: "Ho Chi Minh City",
 *     preferences: {
 *       favoriteTeam: "Manchester United",
 *     },
 *   };
 *
 *   return (
 *     <form>
 *       <EnhancedStringFieldWithSuggestions
 *         control={control}
 *         name="username"
 *         label="Username"
 *         placeholder="Enter your username"
 *         asyncValidate={{
 *           url: "/api/check-username",
 *           method: "POST",
 *           debounceMs: 400,
 *           enableSuggestions: true,
 *           suggestionVariant: "compact",
 *         }}
 *         userContext={userContext}
 *       />
 *     </form>
 *   );
 * }
 * ```
 */
