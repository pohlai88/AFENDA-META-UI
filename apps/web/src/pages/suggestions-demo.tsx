/**
 * Personalized Suggestions Demo Page
 * ===================================
 * Interactive demonstration of the personalized suggestions system
 * for username/field validation fallbacks.
 */

import React, { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { PersonalizedSuggestion, UserContext } from "~/renderers/fields/suggestionGenerator";
import { generatePersonalizedSuggestions } from "~/renderers/fields/suggestionGenerator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@afenda/ui";
import { PageContainer, PageHeader } from "~/components/layout";

const demoSchema = z.object({
  baseUsername: z.string().min(3, "Username must be at least 3 characters"),
  firstName: z.string(),
  lastName: z.string(),
  location: z.string(),
});

type DemoFormData = z.infer<typeof demoSchema>;

export default function SuggestionsDemoPage() {
  const [suggestions, setSuggestions] = useState<PersonalizedSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);

  const form = useForm<DemoFormData>({
    resolver: zodResolver(demoSchema),
    defaultValues: {
      baseUsername: "alex",
      firstName: "John",
      lastName: "Doe",
      location: "San Francisco",
    },
  });

  const { control, watch, handleSubmit, setValue } = form;

  const formValues = watch();

  // Generate suggestions whenever base values change
  React.useEffect(() => {
    const userContext: UserContext = {
      firstName: formValues.firstName || "User",
      lastName: formValues.lastName || "",
      location: formValues.location || "Earth",
      preferences: {
        favoriteTeam: "Warriors",
        hobby: "coding",
      },
    };

    const generated = generatePersonalizedSuggestions({
      baseValue: formValues.baseUsername || "user",
      userContext,
      count: 7, // Show more suggestions for demo
    });

    setSuggestions(generated);
    setSelectedSuggestion(null);
  }, [formValues.baseUsername, formValues.firstName, formValues.lastName, formValues.location]);

  const handleSuggestionClick = (suggestion: PersonalizedSuggestion) => {
    setSelectedSuggestion(suggestion.value);
    setValue("baseUsername", suggestion.value);
  };

  const onSubmit: SubmitHandler<DemoFormData> = (data) => {
    console.log("Form submitted with:", data);
    alert(
      `Username accepted: "${data.baseUsername}"\n\nUser context:\n` +
        `Name: ${data.firstName} ${data.lastName}\n` +
        `Location: ${data.location}`
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title="Personalized Suggestions Demo"
        description="See how the system generates contextual username suggestions"
      />

      <div className="max-w-2xl mx-auto">
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* User Context Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">User Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., John" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Doe" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., San Francisco" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Username Field */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Username (Unavailable)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={control}
                  name="baseUsername"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desired Username</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter a username"
                          className={selectedSuggestion === field.value ? "border-green-500" : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Error Message Simulation */}
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700 font-medium">
                    ❌ Username "{formValues.baseUsername}" is already taken
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    Please choose one of our personalized suggestions below instead
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Suggestions Display */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Personalized Suggestions ({suggestions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={`p-3 rounded-md border-2 transition-all text-left ${
                        selectedSuggestion === suggestion.value
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-blue-400 bg-white hover:bg-blue-50"
                      }`}
                    >
                      <div className="font-mono font-semibold text-gray-900">
                        {suggestion.value}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">{suggestion.reason}</div>
                      <div className="flex gap-1 mt-2">
                        <span
                          className={`px-2 py-0.5 text-xs rounded font-medium ${
                            suggestion.personalizationLevel === "generic"
                              ? "bg-gray-100 text-gray-700"
                              : suggestion.personalizationLevel === "user-derived"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {suggestion.personalizationLevel}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {suggestions.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    No suggestions generated yet. Try changing the username.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Personalization Levels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                    generic
                  </span>
                  <span className="text-gray-600">Standard variations (numbers, patterns)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    user-derived
                  </span>
                  <span className="text-gray-600">Based on your name (initials, year)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                    location-based
                  </span>
                  <span className="text-gray-600">Uses your location context</span>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Button type="submit" className="w-full" size="lg">
              Accept Selected Username
            </Button>
          </form>
        </Form>
      </div>
    </PageContainer>
  );
}
