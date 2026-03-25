/**
 * Real-World Integration Example
 * ==============================
 * Shows how to integrate personalized suggestions into your app
 * using Permissions context and user data.
 */

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { UserContext } from "./suggestionGenerator";
import { EnhancedStringFieldWithSuggestions } from "./EnhancedStringField.example";

/**
 * Example 1: Extract UserContext from Permissions
 */
export function useUserContextFromPermissions(): UserContext | undefined {
  // In your app, you'd use:
  // const { userId, role } = usePermissions();
  // const { user } = useUserStore();

  // For this example, we show the pattern:
  return {
    userId: "user_abc123",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@company.com",
    location: "Ho Chi Minh City", // from user profile
    preferences: {
      favoriteTeam: "Manchester United",
      favoriteColor: "Red",
      hobby: "Football",
    },
  };
}

/**
 * Example 2: Registration Form with Suggestions
 */
export function RegistrationFormWithSuggestions() {
  const userContext = useUserContextFromPermissions();
  const { control, handleSubmit, formState } = useForm({
    mode: "onBlur",
    resolver: zodResolver(
      z.object({
        username: z.string().min(3, "Username must be at least 3 characters"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      })
    ),
  });

  const onSubmit = async (data: Record<string, unknown>) => {
    console.log("Form submitted:", data);
    // Submit to backend...
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
        <p className="text-sm text-gray-600 mt-1">Join our community today</p>
      </div>

      {/* Username field with personalized suggestions */}
      <EnhancedStringFieldWithSuggestions
        control={control}
        name="username"
        label="Username"
        placeholder="alphanumeric lowercase (3+ chars)"
        required={true}
        help_text="Unique identifier for your account"
        asyncValidate={{
          url: "/api/auth/check-username",
          method: "POST",
          debounceMs: 500,
          cacheTtlMs: 10 * 60 * 1000, // 10 min cache
          enableSuggestions: true,
          suggestionVariant: "compact",
        }}
        userContext={userContext}
        onSuggestionSelect={(suggestion) => {
          console.log("User selected suggestion:", suggestion);
          // Optional: Analytics tracking
        }}
        suggestionVariant="compact"
      />

      {/* Regular email field (no suggestions) */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">
          Email Address
        </label>
        <input
          type="email"
          placeholder="you@example.com"
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Password field */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">
          Password
        </label>
        <input
          type="password"
          placeholder="••••••••"
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={formState.isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
      >
        {formState.isSubmitting ? "Creating account..." : "Create Account"}
      </button>
    </form>
  );
}

/**
 * Example 3: Profile Edit Form with Multiple Suggestion Fields
 */
export function ProfileEditFormWithSuggestions() {
  const userContext = useUserContextFromPermissions();
  const { control, handleSubmit } = useForm({
    mode: "onBlur",
    defaultValues: {
      displayName: userContext?.firstName,
      handle: userContext?.firstName?.toLowerCase(),
    },
  });

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))} className="space-y-6">
      <h2 className="text-xl font-bold">Edit Profile</h2>

      {/* Display Name - with personalized suggestions */}
      <EnhancedStringFieldWithSuggestions
        control={control}
        name="displayName"
        label="Display Name"
        placeholder="How you appear to others"
        asyncValidate={{
          url: "/api/profile/validate/displayName",
          enableSuggestions: true,
          suggestionVariant: "compact",
          debounceMs: 300,
        }}
        userContext={userContext}
      />

      {/* Social Handle - with suggestions */}
      <EnhancedStringFieldWithSuggestions
        control={control}
        name="handle"
        label="Social Handle"
        placeholder="@yourhandle"
        asyncValidate={{
          url: "/api/profile/validate/handle",
          enableSuggestions: true,
          suggestionVariant: "inline", // Compact inline style
          debounceMs: 400,
        }}
        userContext={userContext}
      />

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
      >
        Save Changes
      </button>
    </form>
  );
}

/**
 * Example 4: Advanced - Custom Suggestion Patterns
 */
export function AdvancedFormWithCustomPatterns() {
  const userContext = useUserContextFromPermissions();
  const { control, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <h2 className="text-lg font-bold mb-4">Create Team Handle</h2>

      <EnhancedStringFieldWithSuggestions
        control={control}
        name="teamHandle"
        label="Team Handle"
        placeholder="e.g., dev-team, product-squad"
        asyncValidate={{
          url: "/api/teams/validate/handle",
          enableSuggestions: true,
          suggestionVariant: "block", // Full block with reasons
          debounceMs: 600,
        }}
        userContext={userContext}
        help_text="Used for team identification and mentions"
      />

      <p className="text-xs text-gray-500 mt-4">
        Suggestions will include your location (HCM), year (2026), and preferences (Manchester)
      </p>

      <button type="submit" className="mt-6 bg-green-600 text-white px-4 py-2 rounded">
        Create Team
      </button>
    </form>
  );
}

/**
 * Example 5: Usage in DynamicForm with Server-Driven Config
 */
export const serverDrivenFormConfig = {
  fields: [
    {
      type: "string",
      name: "username",
      label: "Username",
      placeholder: "Choose your username",
      required: true,
      help_text: "2-20 characters, alphanumeric",
      asyncValidate: {
        url: "/api/auth/validate/username",
        method: "POST",
        debounceMs: 500,
        cacheTtlMs: 600000, // 10 minutes
        requestShape: "contract-v1",
        enableSuggestions: true,
        suggestionVariant: "compact",
      },
      validate: {
        min: 2,
        max: 20,
        pattern: "^[a-z0-9_]+$",
      },
    },
    {
      type: "string",
      name: "email",
      label: "Email",
      required: true,
      asyncValidate: {
        url: "/api/auth/validate/email",
        enableSuggestions: false, // Email doesn't need suggestions
        debounceMs: 400,
      },
    },
    {
      type: "string",
      name: "displayName",
      label: "Display Name",
      placeholder: "Your public name",
      asyncValidate: {
        url: "/api/profile/validate/displayName",
        enableSuggestions: true,
        suggestionVariant: "inline",
        debounceMs: 300,
      },
    },
  ],
};

/**
 * Example 6: Using with DynamicFormRHF
 */
export function ServerDrivenFormWithSuggestions() {
  const userContext = useUserContextFromPermissions();
  // In real usage, you'd pass this to the form validation somehow
  // For now shown here for reference

  return (
    <div className="p-4">
      <h2>Form with server-driven config (see `serverDrivenFormConfig`)</h2>
      <p className="text-sm text-gray-600 mt-2">
        When loaded with DynamicFormRHF, the asyncValidate configs with
        `enableSuggestions: true` will automatically use personalized suggestions.
      </p>
      <pre className="bg-gray-100 p-4 rounded mt-4 text-xs overflow-auto max-h-64">
        {JSON.stringify(serverDrivenFormConfig, null, 2)}
      </pre>
    </div>
  );
}

/**
 * Example 7: Backend Endpoint for Username Validation with Suggestions
 *
 * // In your backend (e.g., Node.js/Express):
 *
 * app.post('/api/auth/check-username', async (req, res) => {
 *   const { value } = req.body;
 *
 *   // Check if username exists
 *   const exists = await db.users.findOne({ username: value });
 *
 *   if (!exists) {
 *     return res.json({ valid: true });
 *   }
 *
 *   // Username taken - generate smart suggestions
 *   const year = new Date().getFullYear();
 *   const suggestions = [
 *     `${value}${year}`,
 *     `${value}_pro`,
 *     `pro_${value}`,
 *     `${value}_dev`,
 *   ];
 *
 *   // Filter: only suggest usernames that are available
 *   const available = await Promise.all(
 *     suggestions.map(async (s) => {
 *       const exists = await db.users.findOne({ username: s });
 *       return !exists ? s : null;
 *     })
 *   );
 *
 *   res.json({
 *     valid: false,
 *     message: `"${value}" is already taken`,
 *     suggestions: available.filter(Boolean).slice(0, 3),
 *   });
 * });
 */

