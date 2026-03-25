/**
 * SuggestionPrompt Component
 * ===========================
 * Displays personalized suggestions when validation fails.
 * Provides quick-click alternatives to reduce user friction.
 */

import React from "react";
import type { PersonalizedSuggestion } from "./suggestionGenerator";

export interface SuggestionPromptProps {
  suggestions: PersonalizedSuggestion[];
  onSuggestionClick: (suggestion: string) => void;
  loading?: boolean;
  className?: string;
  variant?: "inline" | "compact" | "block";
  showReasons?: boolean;
}

/**
 * Color-codes personalization level for quick visual recognition
 */
function getPersonalizationBadge(level: string): {
  label: string;
  bgClass: string;
  textClass: string;
} {
  const badges: Record<string, { label: string; bgClass: string; textClass: string }> = {
    generic: {
      label: "Generic",
      bgClass: "bg-gray-100",
      textClass: "text-gray-700",
    },
    "user-derived": {
      label: "Your Data",
      bgClass: "bg-blue-50",
      textClass: "text-blue-700",
    },
    "location-based": {
      label: "Location",
      bgClass: "bg-green-50",
      textClass: "text-green-700",
    },
    "preference-based": {
      label: "Your Preference",
      bgClass: "bg-purple-50",
      textClass: "text-purple-700",
    },
  };

  return badges[level] || badges.generic;
}

/**
 * Inline variant: suggestions on same line with minimal spacing
 */
function InlineVariant({
  suggestions,
  onSuggestionClick,
  showReasons,
}: Omit<SuggestionPromptProps, "variant">) {
  if (suggestions.length === 0) return null;

  return (
    <div className="text-xs text-gray-600 mt-1">
      <span className="font-medium">Try one of these:</span>
      {suggestions.map((suggestion, idx) => (
        <button
          key={suggestion.value}
          type="button"
          onClick={() => onSuggestionClick(suggestion.value)}
          className="ml-2 text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus:ring-1 focus:ring-blue-500 px-1"
          title={suggestion.reason}
        >
          {suggestion.value}
          {idx < suggestions.length - 1 ? "," : ""}
        </button>
      ))}
    </div>
  );
}

/**
 * Compact variant: pills/badges with optional reason tooltips
 */
function CompactVariant({
  suggestions,
  onSuggestionClick,
  showReasons,
}: Omit<SuggestionPromptProps, "variant">) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {suggestions.map((suggestion) => {
        const badge = getPersonalizationBadge(suggestion.personalizationLevel);

        return (
          <button
            key={suggestion.value}
            type="button"
            onClick={() => onSuggestionClick(suggestion.value)}
            className={`text-xs px-2 py-1 rounded transition-colors ${badge.bgClass} ${badge.textClass} hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-offset-1`}
            title={suggestion.reason}
          >
            <span className="font-mono font-medium">{suggestion.value}</span>
            {showReasons && (
              <>
                <span className="mx-1 text-gray-400">•</span>
                <span className="text-xs opacity-75">{suggestion.reason}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Block variant: full-width suggestion cards with detailed reasoning
 */
function BlockVariant({
  suggestions,
  onSuggestionClick,
  showReasons,
}: Omit<SuggestionPromptProps, "variant">) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mt-3 space-y-2 border-l-2 border-blue-300 bg-blue-50 p-3 rounded">
      <p className="text-xs font-medium text-gray-700">Suggested alternatives:</p>
      <div className="space-y-1">
        {suggestions.map((suggestion) => {
          const badge = getPersonalizationBadge(suggestion.personalizationLevel);

          return (
            <button
              key={suggestion.value}
              type="button"
              onClick={() => onSuggestionClick(suggestion.value)}
              className="w-full text-left px-2 py-1 rounded bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-medium text-gray-900">
                  {suggestion.value}
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${badge.bgClass} ${badge.textClass}`}
                >
                  {badge.label}
                </span>
              </div>
              {showReasons && <p className="text-xs text-gray-600 mt-0.5">{suggestion.reason}</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Main component: renders suggestions based on variant
 */
export function SuggestionPrompt({
  suggestions,
  onSuggestionClick,
  loading = false,
  className = "",
  variant = "compact",
  showReasons = false,
}: SuggestionPromptProps) {
  if (loading) {
    return (
      <div className={`text-xs text-gray-500 animate-pulse ${className}`}>
        Checking alternatives...
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  const props = { suggestions, onSuggestionClick, showReasons };

  return (
    <div className={className}>
      {variant === "inline" && <InlineVariant {...props} />}
      {variant === "compact" && <CompactVariant {...props} />}
      {variant === "block" && <BlockVariant {...props} />}
    </div>
  );
}

/**
 * Wrapper component for form fields with integrated error + suggestions
 */
export interface FieldWithSuggestionsProps {
  fieldId: string;
  label: string;
  error?: string;
  suggestions?: PersonalizedSuggestion[];
  onSuggestionClick?: (suggestion: string) => void;
  loading?: boolean;
  children: React.ReactNode;
  suggestionVariant?: "inline" | "compact" | "block";
}

export function FieldWithSuggestions({
  fieldId,
  label,
  error,
  suggestions = [],
  onSuggestionClick,
  loading = false,
  children,
  suggestionVariant = "compact",
}: FieldWithSuggestionsProps) {
  return (
    <div className="form-group">
      <label htmlFor={fieldId} className="block text-sm font-medium text-gray-900 mb-1">
        {label}
      </label>

      {children}

      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {suggestions && suggestions.length > 0 && (
        <SuggestionPrompt
          suggestions={suggestions}
          onSuggestionClick={onSuggestionClick || (() => {})}
          loading={loading}
          variant={suggestionVariant}
          showReasons={true}
          className="mt-1"
        />
      )}
    </div>
  );
}
