/**
 * Personalized Suggestion Generator
 * ==================================
 * Generates tailored username/field alternatives based on user context,
 * preferences, and common patterns.
 *
 * Strategies:
 * - User-driven: includes initials, location, year, preferences
 * - Pattern-based: append numbers, underscores, abbreviations
 * - Time-based: current year, season, or timestamps
 */

export interface UserContext {
  userId?: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  location?: string;
  preferences?: {
    favoriteTeam?: string;
    favoriteColor?: string;
    hobby?: string;
  };
}

export interface SuggestionConfig {
  baseValue: string;
  count?: number;
  userContext?: UserContext;
  includeNumbers?: boolean;
  includeUnderscore?: boolean;
  includeYear?: boolean;
  includeInitials?: boolean;
  includeLocation?: boolean;
  patterns?: string[]; // custom patterns like ['{{base}}{{year}}', '{{base}}_{{initials}}']
}

export interface PersonalizedSuggestion {
  value: string;
  reason: string; // e.g. "includes your initials", "with current year"
  personalizationLevel: "generic" | "location-based" | "preference-based" | "user-derived";
}

/**
 * Extract user initials (e.g., "John Doe" → "jd" or "jdoe")
 */
function getUserInitials(
  firstName?: string,
  lastName?: string,
  format: "short" | "long" = "short"
): string | null {
  if (format === "short" && firstName && lastName) {
    return `${firstName.charAt(0).toLowerCase()}${lastName.charAt(0).toLowerCase()}`;
  }

  if (format === "long" && firstName) {
    return (firstName + (lastName || "")).slice(0, 4).toLowerCase();
  }

  return null;
}

/**
 * Extract location abbreviation (e.g., "Ho Chi Minh City" → "hcm")
 */
function getLocationAbbrev(location?: string): string | null {
  if (!location) return null;

  const parts = location.split(/[\s-]+/).filter((p) => p.length > 0);
  if (parts.length === 0) return null;

  return parts.map((p) => p.charAt(0).toLowerCase()).join("");
}

/**
 * Sanitize value for use in suggestions (remove special chars, lowercase)
 */
function sanitize(value: string, maxLength: number = 30): string {
  return value
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .toLowerCase()
    .slice(0, maxLength);
}

/**
 * Generate numeric suffixes (e.g., base1, base2, base123)
 */
function generateNumberVariants(base: string, count: number): PersonalizedSuggestion[] {
  const variants: PersonalizedSuggestion[] = [];
  for (let i = 1; i <= count; i++) {
    variants.push({
      value: `${base}${i}`,
      reason: `with number suffix`,
      personalizationLevel: "generic",
    });
  }
  return variants;
}

/**
 * Generate underscore variants (e.g., base_, base_1, base_xyz)
 */
function generateUnderscoreVariants(
  base: string,
  userContext?: UserContext,
  options?: { includeYear?: boolean }
): PersonalizedSuggestion[] {
  const variants: PersonalizedSuggestion[] = [];

  const includeYear = options?.includeYear !== false;
  const year = new Date().getFullYear();

  if (includeYear) {
    variants.push({
      value: `${base}_${year}`,
      reason: `with current year`,
      personalizationLevel: "user-derived",
    });
  }

  if (userContext?.firstName || userContext?.lastName) {
    const initials = getUserInitials(userContext.firstName, userContext.lastName, "short");
    if (initials) {
      variants.push({
        value: `${base}_${initials}`,
        reason: `with your initials`,
        personalizationLevel: "user-derived",
      });
    }
  }

  if (userContext?.location) {
    const locAbbrev = getLocationAbbrev(userContext.location);
    if (locAbbrev) {
      variants.push({
        value: `${base}_${locAbbrev}`,
        reason: `personalized with your location`,
        personalizationLevel: "location-based",
      });
    }
  }

  if (userContext?.preferences?.favoriteTeam) {
    const team = sanitize(userContext.preferences.favoriteTeam);
    if (team.length > 0) {
      variants.push({
        value: `${base}_${team}`,
        reason: `with your favorite team`,
        personalizationLevel: "preference-based",
      });
    }
  }

  return variants;
}

/**
 * Generate hybrid variants combining multiple personalization layers
 */
function generateHybridVariants(
  base: string,
  userContext?: UserContext,
  options?: { includeYear?: boolean }
): PersonalizedSuggestion[] {
  const variants: PersonalizedSuggestion[] = [];
  const includeYear = options?.includeYear !== false;

  if (!includeYear) {
    return variants;
  }

  const year = new Date().getFullYear();

  if (userContext?.firstName && userContext?.lastName) {
    const initials = getUserInitials(userContext.firstName, userContext.lastName, "short");
    if (initials) {
      variants.push({
        value: `${base}${year}${initials}`,
        reason: `with year and your initials`,
        personalizationLevel: "user-derived",
      });
    }
  }

  if (userContext?.location) {
    const locAbbrev = getLocationAbbrev(userContext.location);
    if (locAbbrev) {
      variants.push({
        value: `${base}${year}${locAbbrev}`,
        reason: `personalized with year and location`,
        personalizationLevel: "location-based",
      });
    }
  }

  return variants;
}

/**
 * Generate suggestions from custom patterns
 * Patterns can use: {{base}}, {{year}}, {{initials}}, {{location}}
 */
function generateFromPatterns(
  base: string,
  patterns: string[],
  userContext?: UserContext
): PersonalizedSuggestion[] {
  const year = new Date().getFullYear();
  const initials = userContext
    ? getUserInitials(userContext.firstName, userContext.lastName, "short")
    : null;
  const location = userContext ? getLocationAbbrev(userContext.location) : null;

  const context = {
    base,
    year: String(year),
    initials: initials || "xx",
    location: location || "loc",
  };

  return patterns
    .map((pattern) => {
      let value = pattern;
      Object.entries(context).forEach(([key, val]) => {
        value = value.replace(new RegExp(`{{${key}}}`, "g"), val);
      });

      const sanitizedValue = sanitize(value, 50); // Use larger limit for patterns
      return {
        value: sanitizedValue,
        reason: `from pattern: ${pattern}`,
        personalizationLevel: "generic" as const,
      };
    })
    .filter((s) => s.value.length > 0);
}

/**
 * Main function to generate personalized suggestions
 */
export function generatePersonalizedSuggestions(
  config: SuggestionConfig
): PersonalizedSuggestion[] {
  const base = sanitize(config.baseValue);

  if (base.length === 0) {
    return [];
  }

  const suggestions: PersonalizedSuggestion[] = [];
  // Default to 7 to ensure variety across personalization levels (generic, user-derived, location-based, preference-based)
  const count = config.count ?? 7;
  const userContext = config.userContext;

  // Determine if we should include numeric content (numbers and years)
  const includeNumericContent = config.includeNumbers !== false;
  const effectiveIncludeYear = config.includeYear !== false && includeNumericContent;

  // 1. Custom patterns (if provided)
  if (config.patterns && config.patterns.length > 0) {
    suggestions.push(...generateFromPatterns(base, config.patterns, userContext));
  }

  // 2. Personalized underscore variants
  if (config.includeUnderscore !== false) {
    suggestions.push(
      ...generateUnderscoreVariants(base, userContext, {
        includeYear: effectiveIncludeYear,
      })
    );
  }

  // 3. Hybrid variants (year + initials/location)
  if (effectiveIncludeYear) {
    suggestions.push(...generateHybridVariants(base, userContext, { includeYear: true }));
  }

  // 4. Simple numeric variants (only if includeNumbers is true)
  if (includeNumericContent) {
    suggestions.push(...generateNumberVariants(base, Math.max(2, Math.ceil(count / 3))));
  }

  // 5. Ensure all suggestions are within length limit, deduplicate and limit
  const unique = new Map<string, PersonalizedSuggestion>();
  for (const suggestion of suggestions) {
    // Trim suggestion to 30 chars if needed
    const trimmedValue =
      suggestion.value.length > 30 ? suggestion.value.slice(0, 30) : suggestion.value;

    const trimmedSuggestion = {
      ...suggestion,
      value: trimmedValue,
    };

    if (!unique.has(trimmedSuggestion.value)) {
      unique.set(trimmedSuggestion.value, trimmedSuggestion);
    }
  }

  return Array.from(unique.values()).slice(0, count);
}

/**
 * Extract suggestions from backend response
 * Handles both standard validation response and enhanced response with suggestions
 */
export interface ValidationResponse {
  valid: boolean;
  message?: string;
  suggestions?: string[]; // raw suggestions from backend
}

export interface EnhancedValidationResponse extends ValidationResponse {
  suggestions?: string[];
  personalizedSuggestions?: PersonalizedSuggestion[]; // will be populated from suggestions
}

export function extractSuggestionsFromResponse(
  response: ValidationResponse,
  baseValue: string,
  userContext?: UserContext
): PersonalizedSuggestion[] {
  // Don't generate suggestions if response is valid
  if (response.valid) {
    return [];
  }

  // Prefer backend-provided suggestions
  if (response.suggestions && response.suggestions.length > 0) {
    return response.suggestions.map((value) => ({
      value,
      reason: "server suggestion",
      personalizationLevel: "generic" as const,
    }));
  }

  // Otherwise, generate frontend suggestions based on base value
  return generatePersonalizedSuggestions({
    baseValue,
    userContext,
    count: 3,
  });
}
