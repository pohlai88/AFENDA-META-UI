/**
 * Suggestion System - Complete Demo & Testing Guide
 * ==================================================
 * Comprehensive examples and test cases demonstrating all features
 * of the personalized suggestions system.
 */

// ============================================================================
// SECTION 1: Basic Suggestion Generation
// ============================================================================

import {
  generatePersonalizedSuggestions,
  extractSuggestionsFromResponse,
  type UserContext,
  type PersonalizedSuggestion,
} from "./suggestionGenerator";

// Example 1.1: Simple numeric alternatives
export function exampleBasicNumericSuggestions() {
  const suggestions = generatePersonalizedSuggestions({
    baseValue: "alex",
    count: 3,
  });

  console.log("Basic numeric suggestions:", suggestions);
  // Output:
  // [
  //   { value: "alex1", reason: "with number suffix", personalizationLevel: "generic" },
  //   { value: "alex2", reason: "with number suffix", personalizationLevel: "generic" },
  //   { value: "alex123", reason: "with number suffix", personalizationLevel: "generic" }
  // ]
}

// Example 1.2: Personalized with user context
export function examplePersonalizedSuggestions() {
  const userContext: UserContext = {
    userId: "user_123",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    location: "San Francisco",
    preferences: {
      favoriteTeam: "Golden State Warriors",
      favoriteColor: "Blue",
      hobby: "Basketball",
    },
  };

  const suggestions = generatePersonalizedSuggestions({
    baseValue: "john",
    userContext,
    count: 5,
  });

  console.log("Personalized suggestions:", suggestions);
  // Output includes:
  // - john_2026 (with current year)
  // - john_jd (with initials)
  // - john_sf (with location)
  // - john2026jd (hybrid: year + initials)
  // - john2026sf (hybrid: year + location)
}

// Example 1.3: Custom patterns
export function exampleCustomPatterns() {
  const userContext: UserContext = {
    firstName: "Jane",
    lastName: "Smith",
    location: "New York",
  };

  const suggestions = generatePersonalizedSuggestions({
    baseValue: "jane",
    userContext,
    patterns: [
      "{{base}}_{{year}}",
      "{{base}}{{initials}}",
      "{{base}}_{{location}}",
      "pro_{{base}}_{{year}}",
      "{{base}}_pro_{{location}}",
    ],
    count: 5,
  });

  console.log("Custom pattern suggestions:", suggestions);
  // Output:
  // [
  //   { value: "jane_2026", ... },
  //   { value: "janejs", ... },
  //   { value: "jane_ny", ... },
  //   { value: "pro_jane_2026", ... },
  //   { value: "jane_pro_ny", ... }
  // ]
}

// ============================================================================
// SECTION 2: Backend Response Handling
// ============================================================================

// Example 2.1: Backend provides suggestions
export function exampleBackendSuggestions() {
  const backendResponse = {
    valid: false,
    message: "Username already taken",
    suggestions: ["alex123", "alex_vn", "alex_pro"],
  };

  const userContext: UserContext = {
    firstName: "Alex",
    lastName: "Nguyen",
    location: "Vietnam",
  };

  const suggestions = extractSuggestionsFromResponse(backendResponse, "alex", userContext);

  console.log("Backend suggestions:", suggestions);
  // Output: Uses backend suggestions as-is
  // [
  //   { value: "alex123", reason: "server suggestion", personalizationLevel: "generic" },
  //   { value: "alex_vn", reason: "server suggestion", personalizationLevel: "generic" },
  //   { value: "alex_pro", reason: "server suggestion", personalizationLevel: "generic" }
  // ]
}

// Example 2.2: Backend doesn't provide suggestions - frontend generates
export function exampleFrontendFallback() {
  const backendResponse = {
    valid: false,
    message: "Username taken",
    // No suggestions provided
  };

  const userContext: UserContext = {
    firstName: "Michael",
    lastName: "Park",
    location: "Seoul",
  };

  const suggestions = extractSuggestionsFromResponse(backendResponse, "michael", userContext);

  console.log("Frontend-generated fallback:", suggestions);
  // Output: Generates personalized suggestions when backend doesn't provide any
  // [
  //   { value: "michael_2026", reason: "with current year", ... },
  //   { value: "michael_mp", reason: "with your initials", ... },
  //   { value: "michael_seoul", reason: "personalized with your location", ... }
  // ]
}

// ============================================================================
// SECTION 3: React Hook Usage
// ============================================================================

import { useSuggestions } from "./useSuggestions";

// Example 3.1: Hook usage in a component
export function exampleUseSuggestionsHook() {
  const hookExample = `
    import { useSuggestions } from './useSuggestions';

    export function MyField() {
      const { 
        suggestions,        // PersonalizedSuggestion[]
        errorMessage,       // string | undefined
        isLoading,          // boolean
        fieldValue,         // string
        handleValidationFailure,  // (value, message, backendSuggestions?) => void
        clearSuggestions,         // () => void
        setLoading,               // (value) => void
      } = useSuggestions({
        userContext: { firstName: "John", lastName: "Doe" },
        maxSuggestions: 3,
        enableFrontendGeneration: true,
      });

      const validate = async (value) => {
        setLoading(value);
        const res = await fetch('/api/check', { body: JSON.stringify({ value }) });
        const data = await res.json();
        
        if (!data.valid) {
          handleValidationFailure(value, data.message, data.suggestions);
        } else {
          clearSuggestions();
        }
      };

      return (
        <div>
          <input onBlur={(e) => validate(e.target.value)} />
          {errorMessage && <p className="error">{errorMessage}</p>}
          {isLoading && <p>Checking alternatives...</p>}
          {suggestions.map(s => (
            <button onClick={() => { /* set field value */ }}>
              {s.value}
            </button>
          ))}
        </div>
      );
    }
  `;
  console.log(hookExample);
}

// ============================================================================
// SECTION 4: UI Component Examples
// ============================================================================

import { SuggestionPrompt, FieldWithSuggestions } from "./SuggestionPrompt";

// Example 4.1: Different UI variants
export const suggestionsUIExample = {
  // Inline variant
  inlineExample: `
    <SuggestionPrompt
      suggestions={suggestions}
      variant="inline"
      onSuggestionClick={handleClick}
    />
    // Output: Try one of these: alex123, alex_jd, alex_sf
  `,

  // Compact variant (default)
  compactExample: `
    <SuggestionPrompt
      suggestions={suggestions}
      variant="compact"
      onSuggestionClick={handleClick}
      showReasons={false}
    />
    // Output: Colored pills showing personalization level
  `,

  // Block variant
  blockExample: `
    <SuggestionPrompt
      suggestions={suggestions}
      variant="block"
      onSuggestionClick={handleClick}
      showReasons={true}
    />
    // Output: Full-width cards with detailed explanations
  `,
};

// Example 4.2: Complete field wrapper
export const fieldWrapperExample = `
  <FieldWithSuggestions
    fieldId="username"
    label="Username"
    error={fieldError}
    suggestions={suggestions}
    onSuggestionClick={(suggestion) => setUsername(suggestion)}
    suggestionVariant="compact"
  >
    <input type="text" value={username} />
  </FieldWithSuggestions>
`;

// ============================================================================
// SECTION 5: Personalization Levels
// ============================================================================

// Example 5.1: Understanding personalization levels
export function examplePersonalizationLevels() {
  const suggestions: PersonalizedSuggestion[] = [
    {
      value: "alex1",
      reason: "with number suffix",
      personalizationLevel: "generic",
    },
    {
      value: "alex_2026",
      reason: "with current year",
      personalizationLevel: "user-derived",
    },
    {
      value: "alex_jd",
      reason: "with your initials",
      personalizationLevel: "user-derived",
    },
    {
      value: "alex_hcm",
      reason: "personalized with your location",
      personalizationLevel: "location-based",
    },
    {
      value: "alex_mu",
      reason: "with your favorite team",
      personalizationLevel: "preference-based",
    },
  ];

  const groupedByLevel = suggestions.reduce(
    (acc, s) => {
      acc[s.personalizationLevel] = (acc[s.personalizationLevel] || []).concat(s);
      return acc;
    },
    {} as Record<string, PersonalizedSuggestion[]>
  );

  console.log("Suggestions grouped by personalization level:", groupedByLevel);
  // Output:
  // {
  //   generic: [{ value: "alex1", ... }],
  //   "user-derived": [{ value: "alex_2026", ... }, { value: "alex_jd", ... }],
  //   "location-based": [{ value: "alex_hcm", ... }],
  //   "preference-based": [{ value: "alex_mu", ... }]
  // }
}

// ============================================================================
// SECTION 6: Real-World Scenarios
// ============================================================================

// Example 6.1: Complete registration flow
export async function exampleCompleteRegistrationFlow() {
  const username = "alice";
  const userContext: UserContext = {
    firstName: "Alice",
    lastName: "Johnson",
    location: "Boston",
    preferences: { favoriteTeam: "Boston Celtics" },
  };

  // 1. User enters username "alice"
  console.log("1. User enters:", username);

  // 2. Field validates after 400ms debounce
  const validationResponse = await fetch("/api/check-username", {
    method: "POST",
    body: JSON.stringify({ value: username }),
  });
  const data = await validationResponse.json();
  console.log("2. Backend response:", data);

  // 3. Extract suggestions
  const suggestions = extractSuggestionsFromResponse(data, username, userContext);
  console.log("3. Suggestions offered:", suggestions);

  // 4. User clicks on suggestion "alice_2026"
  console.log("4. User selects: alice_2026");

  // 5. Field re-validates with new value
  const revalidateResponse = await fetch("/api/check-username", {
    method: "POST",
    body: JSON.stringify({ value: "alice_2026" }),
  });
  const revalidateData = await revalidateResponse.json();
  console.log("5. Re-validation:", revalidateData);

  // 6. If valid, form can submit
  if (revalidateData.valid) {
    console.log("6. Username available! Form ready to submit");
  }
}

// Example 6.2: Handling minimal user context
export function exampleMinimalUserContext() {
  const userContext: UserContext = {
    firstName: "Bob",
    // No other fields available
  };

  const suggestions = generatePersonalizedSuggestions({
    baseValue: "bob",
    userContext,
    count: 3,
  });

  console.log("Suggestions with minimal context:", suggestions);
  // Output: Still generates helpful suggestions even with limited data
  // [
  //   { value: "bob_2026", reason: "with current year", ... },
  //   { value: "bob1", reason: "with number suffix", ... },
  //   { value: "bob2", reason: "with number suffix", ... }
  // ]
}

// Example 6.3: International user with special characters
export function exampleInternationalUser() {
  const userContext: UserContext = {
    firstName: "Nguyễn",
    lastName: "Văn A",
    location: "Hà Nội",
  };

  const suggestions = generatePersonalizedSuggestions({
    baseValue: "nguyễnvana",
    userContext,
    count: 3,
  });

  console.log("International user suggestions:", suggestions);
  // Output: Sanitizes special characters automatically
  // [
  //   { value: "nguyenvana_2026", ... },
  //   { value: "nguyenvana_nva", ... },
  //   { value: "nguyenvana_hn", ... }
  // ]
}

// ============================================================================
// SECTION 7: Integration Patterns
// ============================================================================

// Example 7.1: With React Hook Form
export const reactHookFormExample = `
  import { useForm, Controller } from "react-hook-form";
  import { EnhancedStringFieldWithSuggestions } from "./EnhancedStringField.example";

  export function MyForm() {
    const { control, handleSubmit } = useForm();

    return (
      <form onSubmit={handleSubmit((data) => console.log(data))}>
        <Controller
          name="username"
          control={control}
          render={({ field }) => (
            <EnhancedStringFieldWithSuggestions
              {...field}
              label="Username"
              asyncValidate={{
                url: "/api/check-username",
                enableSuggestions: true,
              }}
              userContext={{ firstName: "John", lastName: "Doe" }}
            />
          )}
        />
        <button type="submit">Submit</button>
      </form>
    );
  }
`;

// Example 7.2: With DynamicFormRHF
export const dynamicFormExample = `
  import { DynamicFormRHF } from "./renderers/fields";

  const formConfig = {
    fields: [
      {
        type: "string",
        name: "username",
        asyncValidate: {
          url: "/api/check-username",
          enableSuggestions: true,
          suggestionVariant: "compact",
        },
      },
    ],
  };

  export function MyForm() {
    return (
      <DynamicFormRHF 
        fields={formConfig.fields} 
        onSubmit={handleSubmit}
      />
    );
  }
`;

// ============================================================================
// SECTION 8: Backend Integration
// ============================================================================

export const backendIntegrationExample = `
// Backend: Node.js/Express example

app.post('/api/check-username', async (req, res) => {
  const { value } = req.body;

  // Validate input
  if (!value || typeof value !== 'string' || value.length < 3) {
    return res.json({ 
      valid: false, 
      message: 'Username must be at least 3 characters' 
    });
  }

  // Check if username exists
  const exists = await db.users.findOne({ username: value });

  if (!exists) {
    return res.json({ valid: true });
  }

  // Generate smart suggestions
  const year = new Date().getFullYear();
  const baseAlternatives = [
    \`\${value}\${year}\`,        // alex2026
    \`\${value}_pro\`,           // alex_pro
    \`pro_\${value}\`,           // pro_alex
    \`\${value}_dev\`,           // alex_dev
    \`\${value}_v2\`,            // alex_v2
  ];

  // Check which suggestions are available
  const available = await Promise.all(
    baseAlternatives.map(async (alt) => {
      const exists = await db.users.findOne({ username: alt });
      return !exists ? alt : null;
    })
  );

  const suggestions = available
    .filter(Boolean)
    .slice(0, 3); // Return top 3

  res.json({
    valid: false,
    message: \`"\${value}" is already taken. Try one of these instead.\`,
    suggestions,
  });
});
`;

// ============================================================================
// SECTION 9: Error Scenarios
// ============================================================================

// Example 9.1: Graceful degradation with no user context
export function exampleNoUserContext() {
  const suggestions = generatePersonalizedSuggestions({
    baseValue: "test",
    // No userContext provided
    count: 3,
  });

  console.log("Suggestions without user context:", suggestions);
  // Output: Still generates basic numeric suggestions
}

// Example 9.2: Validation service unavailable
export async function exampleValidationUnavailable() {
  const userContext: UserContext = {
    firstName: "User",
    lastName: "Name",
  };

  try {
    // Service is down, fetch fails
    const response = await fetch("/api/check-username", {
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    // Fallback: generate frontend suggestions
    const suggestions = generatePersonalizedSuggestions({
      baseValue: "username",
      userContext,
      count: 3,
    });
    console.log("Fallback suggestions (service unavailable):", suggestions);
  }
}

// ============================================================================
// SECTION 10: Testing Checklist
// ============================================================================

export const testingChecklist = `
  ✓ Suggestion generation with various personalization levels
  ✓ Backend response parsing and suggestion extraction
  ✓ Frontend fallback when backend doesn't provide suggestions
  ✓ React hook internal state management
  ✓ UI component rendering across all 3 variants
  ✓ User interactions (suggestion click, field update)
  ✓ Deduplication of suggestions
  ✓ Limiting to max count
  ✓ Sanitization of special characters
  ✓ Caching behavior
  ✓ Debouncing validation requests
  ✓ Error handling and graceful degradation
  ✓ Async validation with AbortController
  ✓ Integration with React Hook Form
  ✓ Integration with DynamicFormRHF
  ✓ Performance with large user context
  ✓ Internationalization (special characters)
  ✓ Analytics tracking of suggestion selection
  ✓ Empty results handling
  ✓ Timeout/service unavailable scenarios
`;

console.log("Personalized Suggestions System - Demo & Testing Guide loaded!");
