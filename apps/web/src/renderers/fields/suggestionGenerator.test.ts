/**
 * Suggestion Generator Tests
 * ==========================
 * Comprehensive tests demonstrating personalized suggestion generation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  generatePersonalizedSuggestions,
  extractSuggestionsFromResponse,
  type UserContext,
  type SuggestionConfig,
} from "./suggestionGenerator";

describe("generatePersonalizedSuggestions", () => {
  let now: Date;

  beforeEach(() => {
    vi.useFakeTimers();
    now = new Date("2026-03-24");
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("generic number suffixes", () => {
    it("generates basic numeric alternatives", () => {
      const suggestions = generatePersonalizedSuggestions({
        baseValue: "alex",
        count: 3,
      });

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          value: "alex1",
          personalizationLevel: "generic",
        })
      );
      expect(suggestions).toContainEqual(
        expect.objectContaining({
          value: "alex2",
          personalizationLevel: "generic",
        })
      );
    });

    it("filters out generic suggestions when includeNumbers is false", () => {
      const suggestions = generatePersonalizedSuggestions({
        baseValue: "alex",
        count: 5,
        includeNumbers: false,
      });

      const hasNumbers = suggestions.some((s) => /\d+$/.test(s.value));
      expect(hasNumbers).toBe(false);
    });
  });

  describe("personalized with user context", () => {
    const userContext: UserContext = {
      userId: "user123",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      location: "Ho Chi Minh City",
      preferences: {
        favoriteTeam: "Manchester United",
        favoriteColor: "Blue",
        hobby: "Football",
      },
    };

    it("includes user initials in suggestions", () => {
      const suggestions = generatePersonalizedSuggestions({
        baseValue: "alex",
        userContext,
        includeUnderscore: true,
      });

      const withInitials = suggestions.find((s) =>
        s.value.includes("jd") && s.personalizationLevel === "user-derived"
      );
      expect(withInitials).toBeDefined();
      expect(withInitials?.reason).toContain("initials");
    });

    it("includes current year in suggestions", () => {
      const suggestions = generatePersonalizedSuggestions({
        baseValue: "alex",
        userContext,
        includeUnderscore: true,
      });

      const withYear = suggestions.find((s) =>
        s.value === "alex_2026"
      );
      expect(withYear).toBeDefined();
      expect(withYear?.reason).toContain("year");
    });

    it("includes location abbreviation in suggestions", () => {
      const suggestions = generatePersonalizedSuggestions({
        baseValue: "alex",
        userContext,
        includeLocation: true,
      });

      const withLocation = suggestions.find((s) =>
        s.value.includes("hcm") && s.personalizationLevel === "location-based"
      );
      expect(withLocation).toBeDefined();
    });

    it("includes favorite team in suggestions", () => {
      const suggestions = generatePersonalizedSuggestions({
        baseValue: "alex",
        userContext,
        includeUnderscore: true,
      });

      const withTeam = suggestions.find((s) =>
        s.value.includes("manchester") && s.personalizationLevel === "preference-based"
      );
      expect(withTeam).toBeDefined();
    });

    it("generates hybrid suggestions combining year and initials", () => {
      const suggestions = generatePersonalizedSuggestions({
        baseValue: "alex",
        userContext,
      });

      const hybrid = suggestions.find((s) =>
        s.value === "alex2026jd" && s.personalizationLevel === "user-derived"
      );
      expect(hybrid).toBeDefined();
    });

    it("generates hybrid suggestions combining year and location", () => {
      const suggestions = generatePersonalizedSuggestions({
        baseValue: "alex",
        userContext,
      });

      const hybrid = suggestions.find((s) =>
        s.value === "alex2026hcmc" && s.personalizationLevel === "location-based"
      );
      expect(hybrid).toBeDefined();
    });
  });

  describe("custom patterns", () => {
    const userContext: UserContext = {
      firstName: "Jane",
      lastName: "Smith",
      location: "San Francisco",
    };

    it("applies custom pattern templates", () => {
      const suggestions = generatePersonalizedSuggestions({
        baseValue: "jane",
        userContext,
        patterns: [
          "{{base}}_{{year}}",
          "{{base}}{{initials}}{{year}}",
        ],
      });

      expect(suggestions).toContainEqual(
        expect.objectContaining({ value: "jane_2026" })
      );
      expect(suggestions).toContainEqual(
        expect.objectContaining({ value: "janejs2026" })
      );
    });

    it("handles location in patterns", () => {
      const suggestions = generatePersonalizedSuggestions({
        baseValue: "jane",
        userContext,
        patterns: ["{{base}}_{{location}}"],
      });

      expect(suggestions).toContainEqual(
        expect.objectContaining({ value: "jane_sf" })
      );
    });
  });

  describe("deduplication and limiting", () => {
    it("deduplicates suggestions", () => {
      const suggestions = generatePersonalizedSuggestions({
        baseValue: "alex",
        count: 10,
      });

      const values = suggestions.map((s) => s.value);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
    });

    it("respects count limit", () => {
      const suggestions = generatePersonalizedSuggestions({
        baseValue: "alex",
        count: 3,
      });

      expect(suggestions).toHaveLength(3);
    });

    it("returns empty array for invalid input", () => {
      const suggestions = generatePersonalizedSuggestions({
        baseValue: "!!!",
        count: 3,
      });

      expect(suggestions).toHaveLength(0);
    });
  });

  describe("sanitization", () => {
    it("removes special characters", () => {
      const suggestions = generatePersonalizedSuggestions({
        baseValue: "al@x#doe",
      });

      expect(suggestions[0]?.value).toBe("alxdoe_2026");
    });

    it("lowercases values", () => {
      const suggestions = generatePersonalizedSuggestions({
        baseValue: "ALEX",
      });

      expect(suggestions.every((s) => s.value === s.value.toLowerCase())).toBe(true);
    });

    it("caps length at reasonable value", () => {
      const longValue = "a".repeat(50);
      const suggestions = generatePersonalizedSuggestions({
        baseValue: longValue,
      });

      expect(suggestions[0]?.value.length).toBeLessThanOrEqual(30);
    });
  });

  describe("personalization levels", () => {
    it("categorizes suggestions correctly", () => {
      const userContext: UserContext = {
        firstName: "John",
        lastName: "Doe",
        location: "Berlin",
      };

      const suggestions = generatePersonalizedSuggestions({
        baseValue: "john",
        userContext,
      });

      const levels = suggestions.map((s) => s.personalizationLevel);
      expect(levels).toContain("generic");
      expect(levels).toContain("user-derived");
      expect(levels).toContain("location-based");
    });
  });
});

describe("extractSuggestionsFromResponse", () => {
  const userContext: UserContext = {
    firstName: "Alex",
    lastName: "Chen",
    location: "Shanghai",
  };

  it("prefers backend suggestions over generated ones", () => {
    const response = {
      valid: false,
      message: "Username taken",
      suggestions: ["alex123", "alex_sh", "alexchen2026"],
    };

    const suggestions = extractSuggestionsFromResponse(response, "alex", userContext);

    expect(suggestions).toHaveLength(3);
    expect(suggestions[0]?.value).toBe("alex123");
    expect(suggestions[0]?.reason).toBe("server suggestion");
  });

  it("generates frontend suggestions when backend doesn't provide any", () => {
    const response = {
      valid: false,
      message: "Username taken",
    };

    const suggestions = extractSuggestionsFromResponse(response, "alex", userContext);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]?.personalizationLevel).not.toBe("generic");
  });

  it("returns empty array for valid responses", () => {
    const response = {
      valid: true,
    };

    const suggestions = extractSuggestionsFromResponse(response, "alex", userContext);

    expect(suggestions).toHaveLength(0);
  });

  it("includes personalized elements in generated suggestions", () => {
    const response = {
      valid: false,
      message: "Taken",
    };

    const suggestions = extractSuggestionsFromResponse(response, "alex", userContext);

    const hasPersonalized = suggestions.some(
      (s) => s.personalizationLevel !== "generic"
    );
    expect(hasPersonalized).toBe(true);
  });
});

describe("real-world scenarios", () => {
  it("handles username conflict gracefully", () => {
    const userContext: UserContext = {
      userId: "usr_456",
      firstName: "Michael",
      lastName: "Park",
      location: "Seoul",
      preferences: { favoriteTeam: "FC Seoul" },
    };

    const suggestions = generatePersonalizedSuggestions({
      baseValue: "michael",
      userContext,
      count: 5,
    });

    expect(suggestions.length).toBeGreaterThan(0);
    const reasons = suggestions.map((s) => s.reason).join(", ");
    
    // Should have variety in personalization
    expect(reasons).toMatch(/initials|year|location|team/i);
  });

  it("handles email domain personalization", () => {
    const userContext: UserContext = {
      email: "john.smith@techcorp.com",
      firstName: "John",
      lastName: "Smith",
    };

    const suggestions = generatePersonalizedSuggestions({
      baseValue: "johnsmith",
      userContext,
      count: 3,
    });

    const withInitials = suggestions.find((s) =>
      s.personalizationLevel === "user-derived"
    );
    expect(withInitials).toBeDefined();
  });

  it("generates suggestions even with minimal context", () => {
    const userContext: UserContext = {
      firstName: "Alex",
    };

    const suggestions = generatePersonalizedSuggestions({
      baseValue: "alex",
      userContext,
      count: 3,
    });

    expect(suggestions.length).toBeGreaterThan(0);
  });
});
