/**
 * Async Validation with Suggestions Integration
 * ==============================================
 * Extends the async validation system to capture and provide suggestions
 * when validation fails, working with both backend-provided and
 * frontend-generated suggestions.
 */

import type { PersonalizedSuggestion, UserContext } from "./suggestionGenerator";
import { extractSuggestionsFromResponse } from "./suggestionGenerator";
import { generatePersonalizedSuggestions } from "./suggestionGenerator";

/**
 * Extended validation response that includes suggestions metadata
 */
export interface ValidationResponseWithSuggestions {
  valid: boolean;
  message?: string;
  suggestions?: string[]; // from backend
  // Metadata about suggestions handling
  _suggestionsMeta?: {
    source: "backend" | "frontend";
    count: number;
  };
}

/**
 * Context needed to generate personalized suggestions
 */
export interface AsyncValidationContext {
  fieldValue: string;
  fieldPath: string;
  userContext?: UserContext;
  enableSuggestions?: boolean;
}

/**
 * Result from async validation including suggestions
 */
export interface AsyncValidationResultWithSuggestions {
  message: string | null;
  suggestions?: PersonalizedSuggestion[];
  _suggestionsMeta?: ValidationResponseWithSuggestions["_suggestionsMeta"];
  cacheable: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/**
 * Parse backend response and extract/generate suggestions
 */
export function parseValidationResponseWithSuggestions(
  response: unknown,
  _context: AsyncValidationContext
): ValidationResponseWithSuggestions {
  const asRecord = isRecord(response) ? response : {};

  const valid = typeof asRecord.valid === "boolean" ? asRecord.valid : true;
  const message = typeof asRecord.message === "string" ? asRecord.message : undefined;
  const suggestions = isStringArray(asRecord.suggestions) ? asRecord.suggestions : undefined;

  return {
    valid,
    message,
    suggestions,
    _suggestionsMeta: suggestions
      ? {
          source: "backend",
          count: suggestions.length,
        }
      : undefined,
  };
}

/**
 * Extract personalized suggestions from validation outcome
 * Called after validation completes to prepare suggestions for UI
 */
export function extractPersonalizedSuggestions(
  response: ValidationResponseWithSuggestions,
  context: AsyncValidationContext,
  maxCount: number = 3
): PersonalizedSuggestion[] {
  if (!context.enableSuggestions || response.valid) {
    return [];
  }

  const backendSuggestions = (response.suggestions ?? []).map((value) => ({
    value,
    reason: "server suggestion",
    personalizationLevel: "generic" as const,
  }));

  if (backendSuggestions.length >= maxCount) {
    return backendSuggestions.slice(0, maxCount);
  }

  const frontendSuggestions = extractSuggestionsFromResponse(
    {
      valid: response.valid,
      message: response.message,
      suggestions: undefined,
    },
    context.fieldValue,
    context.userContext
  );

  const merged = new Map<string, PersonalizedSuggestion>();

  for (const suggestion of backendSuggestions) {
    merged.set(suggestion.value, suggestion);
  }

  for (const suggestion of frontendSuggestions) {
    if (merged.size >= maxCount) {
      break;
    }

    if (!merged.has(suggestion.value)) {
      merged.set(suggestion.value, suggestion);
    }
  }

  // If no backend suggestions were provided, fallback to frontend-only generation.
  if (merged.size === 0) {
    return generatePersonalizedSuggestions({
      baseValue: context.fieldValue,
      userContext: context.userContext,
      count: maxCount,
    });
  }

  return Array.from(merged.values()).slice(0, maxCount);
}

/**
 * Cache key builder that includes suggestions metadata
 * Ensures suggestion-aware caching strategy
 */
export function buildAsyncValidationCacheKeyWithSuggestions(
  cacheScope: string,
  fieldPath: string,
  url: string,
  method: string,
  value: unknown,
  includeSuggestions: boolean
): string {
  const valueStr = typeof value === "string" ? value : String(value);
  const suggestionFlag = includeSuggestions ? ":+sug" : ":no-sug";

  return `${cacheScope}::${fieldPath}::${method}::${url}::${valueStr}${suggestionFlag}`;
}

/**
 * Stored cache value that includes suggestions metadata
 */
export interface CachedValidationWithSuggestions {
  message: string | null;
  suggestions?: PersonalizedSuggestion[];
}

/**
 * Hook for managing async validation that preserves suggestion state
 * Used within form field components
 */
export interface AsyncValidationStateWithSuggestions {
  validating: boolean;
  valid?: boolean;
  message?: string;
  suggestions?: PersonalizedSuggestion[];
  lastCheckedValue?: string;
}

export function createAsyncValidationStateWithSuggestions(): AsyncValidationStateWithSuggestions {
  return {
    validating: false,
  };
}

/**
 * Transform a standard fetch response into validation result with suggestions
 * This bridges the async validation pipeline with suggestion generation
 */
export async function transformFetchResponseToValidationWithSuggestions(
  response: Response,
  context: AsyncValidationContext
): Promise<AsyncValidationResultWithSuggestions> {
  let data: unknown;
  let parseFailed = false;

  try {
    data = await response.json();
  } catch {
    data = {};
    parseFailed = true;
  }

  const validation = parseValidationResponseWithSuggestions(data, context);

  const suggestions = extractPersonalizedSuggestions(validation, context);
  const suggestionsMeta: ValidationResponseWithSuggestions["_suggestionsMeta"] = suggestions.length
    ? {
        source:
          validation.suggestions && validation.suggestions.length > 0 ? "backend" : "frontend",
        count: suggestions.length,
      }
    : undefined;

  if (!response.ok) {
    if (!validation.message) {
      return {
        message: "Validation failed.",
        cacheable: false,
      };
    }

    const message = validation.message || "Validation failed.";

    return {
      message,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      _suggestionsMeta: suggestionsMeta,
      cacheable: Boolean(validation.message) && !parseFailed,
    };
  }

  if (!validation.valid) {
    return {
      message: validation.message || "Invalid value.",
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      _suggestionsMeta: suggestionsMeta,
      cacheable: !parseFailed,
    };
  }

  if (parseFailed) {
    return {
      message: "Validation failed.",
      cacheable: false,
    };
  }

  return {
    message: null,
    cacheable: true,
  };
}
