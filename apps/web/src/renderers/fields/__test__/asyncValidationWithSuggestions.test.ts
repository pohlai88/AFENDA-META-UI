import { describe, expect, it } from "vitest";
import {
  extractPersonalizedSuggestions,
  parseValidationResponseWithSuggestions,
  transformFetchResponseToValidationWithSuggestions,
  type AsyncValidationContext,
} from "../asyncValidationWithSuggestions";

describe("asyncValidationWithSuggestions", () => {
  const baseContext: AsyncValidationContext = {
    fieldPath: "username",
    fieldValue: "alex",
    enableSuggestions: true,
    userContext: {
      firstName: "John",
      lastName: "Doe",
      location: "Ho Chi Minh City",
    },
  };

  it("populates backend suggestions metadata during parsing", () => {
    const parsed = parseValidationResponseWithSuggestions(
      {
        valid: false,
        message: "Taken",
        suggestions: ["alex_01", "alex_02"],
      },
      baseContext
    );

    expect(parsed._suggestionsMeta).toEqual({
      source: "backend",
      count: 2,
    });
  });

  it("prioritizes backend suggestions and fills remaining slots with frontend suggestions", () => {
    const suggestions = extractPersonalizedSuggestions(
      {
        valid: false,
        message: "Taken",
        suggestions: ["alex_backend"],
      },
      baseContext,
      3
    );

    expect(suggestions.length).toBe(3);
    expect(suggestions[0]?.value).toBe("alex_backend");
    expect(suggestions[0]?.reason).toBe("server suggestion");
    expect(suggestions.some((item) => item.reason !== "server suggestion")).toBe(true);
  });

  it("returns generic message and non-cacheable result when HTTP error has no message", async () => {
    const response = new Response(JSON.stringify({ valid: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });

    const result = await transformFetchResponseToValidationWithSuggestions(response, baseContext);

    expect(result).toEqual({
      message: "Validation failed.",
      cacheable: false,
      suggestions: undefined,
      _suggestionsMeta: undefined,
    });
  });

  it("marks frontend suggestion source when backend suggestions are absent", async () => {
    const response = new Response(JSON.stringify({ valid: false, message: "Taken" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const result = await transformFetchResponseToValidationWithSuggestions(response, baseContext);

    expect(result.message).toBe("Taken");
    expect(result.cacheable).toBe(true);
    expect(result.suggestions && result.suggestions.length).toBeGreaterThan(0);
    expect(result._suggestionsMeta).toEqual({
      source: "frontend",
      count: result.suggestions?.length ?? 0,
    });
  });

  it("returns non-cacheable generic failure on malformed successful response", async () => {
    const response = new Response("not-json", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    const result = await transformFetchResponseToValidationWithSuggestions(response, baseContext);

    expect(result).toEqual({
      message: "Validation failed.",
      cacheable: false,
    });
  });

  it("keeps backend source in metadata when backend suggestions are returned", async () => {
    const response = new Response(
      JSON.stringify({ valid: false, message: "Taken", suggestions: ["alex_a", "alex_b"] }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

    const result = await transformFetchResponseToValidationWithSuggestions(response, baseContext);

    expect(result._suggestionsMeta?.source).toBe("backend");
    expect(result.suggestions?.[0]?.value).toBe("alex_a");
  });
});
