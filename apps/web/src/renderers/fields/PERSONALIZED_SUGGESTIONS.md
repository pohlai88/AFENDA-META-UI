# Personalized Suggestions System

## Overview

The personalized suggestions system provides **graceful fallback UX** when form validation fails. Instead of just showing "Username already taken," the system suggests alternatives tailored to the user, keeping them engaged and reducing friction.

---

## 🎯 Key Benefits

- ✅ **User-friendly**: Reduces frustration by providing immediate alternatives
- ✅ **Personalized**: Suggestions use user's initials, location, preferences, year
- ✅ **Conversion-boosting**: Keeps users moving forward instead of stuck
- ✅ **Flexible**: Works with backend-provided or frontend-generated suggestions
- ✅ **Enterprise-ready**: Integrated with your async validation & caching system

---

## 📦 Core Modules

### 1. `suggestionGenerator.ts`
Generates personalized alternatives based on user context and patterns.

**Key Functions:**
- `generatePersonalizedSuggestions()` - Main generation function
- `extractSuggestionsFromResponse()` - Parse backend response and fallback to generation
- `getUserInitials()`, `getLocationAbbrev()` - Personalization helpers

**User Context:**
```typescript
interface UserContext {
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
```

### 2. `useSuggestions.ts`
React hook to manage suggestions state during validation lifecycle.

**Main Hooks:**
- `useSuggestions()` - Full state management for suggestions
- `useSuggestionsFromResponse()` - Simpler alternative for response-driven suggestions

### 3. `SuggestionPrompt.tsx`
UI components for displaying suggestions to users.

**Key Components:**
- `SuggestionPrompt` - Renders suggestions in 3 variants
- `FieldWithSuggestions` - Field wrapper with integrated error + suggestions
- Variants: `inline`, `compact` (default), `block`

### 4. `asyncValidationWithSuggestions.ts`
Integration layer between async validation pipeline and suggestions.

---

## 🚀 Quick Start

### Backend: Async Validation Endpoint

When a validation request fails, return suggestions:

```json
{
  "valid": false,
  "message": "Username already taken",
  "suggestions": ["alex123", "alex_vn", "alex2026"]
}
```

Or just return the validation result—frontend will generate suggestions automatically:

```json
{
  "valid": false,
  "message": "Username already taken"
}
```

### Frontend: Enhanced Form Field

```tsx
import { useForm } from "react-hook-form";
import { EnhancedStringFieldWithSuggestions } from "./EnhancedStringField.example";

export function SignupForm() {
  const { control } = useForm();

  return (
    <EnhancedStringFieldWithSuggestions
      control={control}
      name="username"
      label="Username"
      placeholder="Choose a username"
      asyncValidate={{
        url: "/api/check-username",
        method: "POST",
        debounceMs: 400,
        enableSuggestions: true,
        suggestionVariant: "compact",
      }}
      userContext={{
        firstName: "John",
        lastName: "Doe",
        location: "San Francisco",
        preferences: { favoriteTeam: "Warriors" },
      }}
    />
  );
}
```

---

## 📝 Configuration

### `AsyncFieldValidationConfig` Extensions

```typescript
export interface AsyncFieldValidationConfig {
  url: string;
  method?: "GET" | "POST";
  message?: string;
  debounceMs?: number;
  cacheTtlMs?: number;
  requestShape?: "legacy" | "contract-v1";
  finalCheckOnSubmit?: boolean;
  // NEW: Suggestions support
  enableSuggestions?: boolean;           // enable suggestion collection/display
  suggestionVariant?: "inline" | "compact" | "block"; // UI style
}
```

---

## 🎨 Suggestion Variants

### 1. Inline (Minimal)
Suggestions displayed inline with error message, comma-separated clickable links.

**Best for:** Compact forms, minimal visual impact

```
Username is taken. Try one of these: alex123, alex_sf, alex_warriors
```

### 2. Compact (Default)
Color-coded pills/badges showing personalization level.

**Best for:** Most forms, good balance of clarity and space

```
[Generic]     [Your Data]      [Location]
 alex123      alex_jd_2026     alex_sf
```

### 3. Block (Full-width)
Detailed cards with reasons and personalization metadata.

**Best for:** Important fields, detailed explanations needed

```
┌─────────────────────────────────┐
│ Suggested alternatives:         │
│ ├─ alex123          [Generic]   │
│ │  "with number suffix"         │
│ ├─ alex_jd_2026    [Your Data]  │
│ │  "with your initials"         │
│ └─ alex_sf_2026    [Location]   │
│    "personalized with location" │
└─────────────────────────────────┘
```

---

## 🔧 Personalization Strategies

### Strategy 1: Numeric Suffixes (Generic)
```
alex → alex1, alex2, alex123
```

### Strategy 2: Year-based
```
alex + 2026 → alex_2026, alex2026
```

### Strategy 3: Initials
```
John Doe + alex → alex_jd, alexjd
```

### Strategy 4: Location
```
Ho Chi Minh City + alex → alex_hcm, alex_hcm_2026
```

### Strategy 5: Preferences
```
Favorite Team + alex → alex_manchester, alex_mu
```

### Strategy 6: Hybrid Combinations
```
alex → alex2026jd, alex2026hcm, alex2026mu
```

### Strategy 7: Custom Patterns
```typescript
patterns: [
  "{{base}}_{{year}}",
  "{{base}}_{{initials}}",
  "{{base}}_{{location}}_{{year}}",
]
```

---

## 💻 Integration Patterns

### Pattern 1: Standalone Hook (Minimal)

```tsx
import { useSuggestions } from "./useSuggestions";
import { SuggestionPrompt } from "./SuggestionPrompt";

export function MyField() {
  const { suggestions, handleValidationFailure, clearSuggestions } = useSuggestions({
    userContext: { firstName: "John", lastName: "Doe" },
  });

  const validateUsername = async (username: string) => {
    const response = await fetch("/api/check-username", {
      method: "POST",
      body: JSON.stringify({ value: username }),
    });
    const data = await response.json();

    if (!data.valid) {
      handleValidationFailure(username, data.message, data.suggestions);
    } else {
      clearSuggestions();
    }
  };

  return (
    <div>
      <input type="text" onBlur={(e) => validateUsername(e.target.value)} />
      <SuggestionPrompt
        suggestions={suggestions}
        onSuggestionClick={(suggestion) => setUsername(suggestion)}
        variant="compact"
      />
    </div>
  );
}
```

### Pattern 2: Enhanced Field Component

```tsx
import { EnhancedStringFieldWithSuggestions } from "./EnhancedStringField.example";

export function RegistrationForm() {
  const { control } = useForm();
  const { user } = useAuth();

  return (
    <form>
      <EnhancedStringFieldWithSuggestions
        control={control}
        name="username"
        label="Username"
        asyncValidate={{
          url: "/api/validation/username",
          enableSuggestions: true,
          suggestionVariant: "compact",
        }}
        userContext={{
          firstName: user.firstName,
          lastName: user.lastName,
          location: user.location,
          preferences: user.preferences,
        }}
      />
    </form>
  );
}
```

### Pattern 3: DynamicForm Integration

```tsx
import { DynamicFormRHF } from "./renderers/fields";

const formConfig: FormConfig = {
  fields: [
    {
      type: "string",
      name: "username",
      label: "Username",
      asyncValidate: {
        url: "/api/check-username",
        enableSuggestions: true,        // Enable suggestions
        suggestionVariant: "compact",   // UI style
        debounceMs: 400,
      },
      required: true,
    },
    // ... other fields
  ],
};

export function MyDynamicForm() {
  const { validationCacheScope } = usePermissions();

  return (
    <DynamicFormRHF
      fields={formConfig.fields}
      validationCacheScope={validationCacheScope}
      onSubmit={handleSubmit}
    />
  );
}
```

---

## 🏗️ Architecture

### Data Flow

```
User Types → Field Validates (Debounce 400ms)
    ↓
Backend /api/check-username
    ├─ If valid: Clear suggestions
    └─ If invalid: Return { valid: false, message, suggestions? }
        ↓
        ├─ Backend suggestions available?
        │  └─ Use them directly
        └─ No suggestions?
           └─ Frontend generates personalized alternatives
               using UserContext (initials, location, year, preferences)
    ↓
Render SuggestionPrompt with personalized alternatives
    ↓
User Clicks Suggestion → Field updates → Re-validate
```

### Caching Strategy

Suggestions are cached alongside validation results:

```
Cache Key: 
  ${scope}::${fieldPath}::${method}::${url}::${value}::suggestions

TTL: 5 minutes (configurable via `cacheTtlMs`)
Max Entries: 200 (configurable via validation cache settings)
```

### Suggestion Metadata + Prioritization

The integration layer now returns optional suggestion metadata for diagnostics/UI instrumentation:

```typescript
_suggestionsMeta?: {
  source: "backend" | "frontend";
  count: number;
}
```

Behavior:

- Backend-first: backend suggestions are always used first.
- Fill strategy: if backend returns fewer than `maxCount`, frontend-generated suggestions fill remaining slots.
- Deduplication: duplicate suggestion values are removed during merge.

### Cacheability Rules

`transformFetchResponseToValidationWithSuggestions()` applies safer cacheability:

- `cacheable: true`
  - Valid response parsed successfully
  - Invalid response parsed successfully (with or without suggestions)
- `cacheable: false`
  - HTTP error with no backend message
  - Malformed JSON / parsing failure

This avoids persisting transient transport failures while still caching deterministic validation outcomes.

---

## 🧪 Testing

Test the suggestion generator:

```bash
npm test -- suggestionGenerator.test.ts
```

**Key test scenarios:**
- Generic numeric variants
- User-derived variants (initials, year, location)
- Preference-based variants
- Hybrid combinations
- Deduplication & limiting
- Personalization levels
- Real-world scenarios (username conflicts, minimal context)

---

## 📐 Performance Considerations

1. **Debouncing**: Async validation debounced at field level (default 400ms)
2. **Caching**: Results cached with 5-min TTL, LRU eviction at 200 entries
3. **Frontend Generation**: Personalized suggestions generated client-side instantly
4. **Deduplication**: Automatic duplicate removal in suggestion set
5. **Limiting**: Maximum 3 suggestions shown by default (configurable)

---

## 🔒 Security

- ✅ All user context is stored client-side (no backend exposure needed)
- ✅ Suggestions are generated from validated, sanitized values
- ✅ Backend can always override with explicit suggestions
- ✅ No sensitive data in suggestion values
- ✅ Special characters sanitized from base value

---

## 🛠️ Advanced Usage

### Custom Suggestion Generator

```typescript
import { generatePersonalizedSuggestions } from "./suggestionGenerator";

const suggestions = generatePersonalizedSuggestions({
  baseValue: "alex",
  userContext: {
    firstName: "John",
    lastName: "Doe",
    location: "San Francisco",
  },
  patterns: [
    "{{base}}_{{year}}",
    "{{base}}_{{location}}_{{initials}}",
    "pro_{{base}}_{{year}}",
  ],
  count: 5,
});

// [
//   { value: "alex_2026", reason: "with current year", personalizationLevel: "user-derived" },
//   { value: "alex_sf_jd", reason: "with location and initials", ... },
//   { value: "pro_alex_2026", reason: "from pattern: pro_{{base}}_{{year}}", ... },
//   ...
// ]
```

### Backend Suggestion Algorithm

```typescript
// Backend: /api/check-username

export async function checkUsername(value: string) {
  const isTaken = await db.users.exists({ username: value });
  
  if (!isTaken) {
    return { valid: true };
  }

  // Generate smart suggestions
  const suggestions = [
    `${value}${new Date().getFullYear()}`,
    `${value}_pro`,
    `${value}_dev`,
    `pro_${value}`,
  ];

  return {
    valid: false,
    message: `"${value}" is already taken`,
    suggestions: suggestions.filter(s => !await db.users.exists({ username: s })),
  };
}
```

---

## 📚 API Reference

### `generatePersonalizedSuggestions(config: SuggestionConfig)`

**Returns:** `PersonalizedSuggestion[]`

**Config Options:**
```typescript
{
  baseValue: string;                    // Required: base username/value
  count?: number;                       // Default: 5
  userContext?: UserContext;            // User data for personalization
  includeNumbers?: boolean;             // Default: true
  includeUnderscore?: boolean;          // Default: true
  includeYear?: boolean;                // Default: true
  includeInitials?: boolean;            // Default: true
  includeLocation?: boolean;            // Default: false
  patterns?: string[];                  // Custom patterns
}
```

### `useSuggestions(options: UseSuggestionsOptions)`

**Returns:** Suggestion state + callbacks

```typescript
{
  fieldValue: string;
  suggestions: PersonalizedSuggestion[];
  isLoading: boolean;
  errorMessage?: string;
  
  handleValidationFailure(fieldValue, errorMessage, backendSuggestions?);
  clearSuggestions();
  setLoading(fieldValue);
}
```

### `<SuggestionPrompt />`

**Props:**
```typescript
{
  suggestions: PersonalizedSuggestion[];
  onSuggestionClick: (suggestion: string) => void;
  variant?: "inline" | "compact" | "block";
  showReasons?: boolean;
  loading?: boolean;
  className?: string;
}
```

---

## ❓ FAQ

**Q: Can I use backend suggestions only (no frontend generation)?**  
A: Yes, set `enableFrontendGeneration: false` in `useSuggestions()`. Backend must provide suggestions.

**Q: How do I customize suggestion text?**  
A: Implement your own personalization logic using `generatePersonalizedSuggestions()` with custom patterns.

**Q: Are suggestions cached?**  
A: Yes, cached with async validation results (5 min TTL by default).

**Q: What if user context is missing?**  
A: The system gracefully falls back to generic numeric variants.

**Q: Can I track suggestion clicks?**  
A: Yes, hook `onSuggestionClick` to log analytics.

---

## 📞 Integration Support

For DynamicFormRHF integration questions, see:
- `parseFieldConfigs.ts` - How asyncValidate config is parsed
- `DynamicFormRHF.tsx` - How validation is executed
- `EnhancedStringField.example.tsx` - Complete field implementation

---

