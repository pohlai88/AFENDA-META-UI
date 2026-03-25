/**
 * useSuggestions Hook
 * ====================
 * Manages validation failure state and personalized suggestions.
 * Integrates with form validation lifecycle.
 */

import { useCallback, useMemo, useState } from "react";
import type { PersonalizedSuggestion, UserContext } from "./suggestionGenerator";
import {
  extractSuggestionsFromResponse,
  generatePersonalizedSuggestions,
} from "./suggestionGenerator";

export interface SuggestionsState {
  fieldValue: string;
  suggestions: PersonalizedSuggestion[];
  isLoading: boolean;
  errorMessage?: string;
}

export interface UseSuggestionsOptions {
  userContext?: UserContext;
  maxSuggestions?: number;
  enableFrontendGeneration?: boolean; // if backend doesn't provide suggestions
}

export function useSuggestions({
  userContext,
  maxSuggestions = 3,
  enableFrontendGeneration = true,
}: UseSuggestionsOptions = {}) {
  const [state, setState] = useState<SuggestionsState>({
    fieldValue: "",
    suggestions: [],
    isLoading: false,
  });

  /**
   * Call when async validation fails
   * Handles both backend-provided suggestions and frontend generation
   */
  const handleValidationFailure = useCallback(
    (fieldValue: string, errorMessage?: string, backendSuggestions?: string[]) => {
      setState((prev) => ({
        ...prev,
        fieldValue,
        errorMessage,
        isLoading: false,
      }));

      // If backend provided suggestions, use them
      if (backendSuggestions && backendSuggestions.length > 0) {
        const suggestions: PersonalizedSuggestion[] = backendSuggestions.map((value) => ({
          value,
          reason: "server suggestion",
          personalizationLevel: "generic" as const,
        }));

        setState((prev) => ({
          ...prev,
          suggestions: suggestions.slice(0, maxSuggestions),
        }));
        return;
      }

      // Otherwise, generate frontend suggestions
      if (enableFrontendGeneration) {
        const suggestions = generatePersonalizedSuggestions({
          baseValue: fieldValue,
          userContext,
          count: maxSuggestions,
        });

        setState((prev) => ({
          ...prev,
          suggestions,
        }));
      }
    },
    [userContext, maxSuggestions, enableFrontendGeneration]
  );

  /**
   * Call when validation succeeds
   */
  const clearSuggestions = useCallback(() => {
    setState({
      fieldValue: "",
      suggestions: [],
      isLoading: false,
    });
  }, []);

  /**
   * Call when validation is in-flight
   */
  const setLoading = useCallback((fieldValue: string) => {
    setState((prev) => ({
      ...prev,
      fieldValue,
      isLoading: true,
      errorMessage: undefined,
    }));
  }, []);

  return {
    ...state,
    handleValidationFailure,
    clearSuggestions,
    setLoading,
  };
}

/**
 * Alternative: Hook for extracting suggestions from validation response
 * Use when you have full control over the response object
 */
export function useSuggestionsFromResponse(
  response: { valid: boolean; message?: string; suggestions?: string[] } | null,
  fieldValue: string,
  options: UseSuggestionsOptions = {}
) {
  const suggestions = useMemo(() => {
    if (!response || response.valid) {
      return [];
    }

    return extractSuggestionsFromResponse(response, fieldValue, options.userContext).slice(
      0,
      options.maxSuggestions ?? 3
    );
  }, [response, fieldValue, options]);

  return {
    suggestions,
    hasError: response?.valid === false,
    errorMessage: response?.message,
  };
}
