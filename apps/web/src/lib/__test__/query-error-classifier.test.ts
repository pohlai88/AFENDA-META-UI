import { describe, expect, it } from "vitest";
import { classifyQueryError, getErrorStatus } from "../query-error-classifier";

describe("getErrorStatus", () => {
  it("returns status for status-bearing errors", () => {
    expect(getErrorStatus({ status: 403 })).toBe(403);
  });

  it("returns undefined for non-status errors", () => {
    expect(getErrorStatus(new Error("x"))).toBeUndefined();
    expect(getErrorStatus("oops")).toBeUndefined();
  });
});

describe("classifyQueryError", () => {
  it("classifies auth errors as actionable", () => {
    const classification = classifyQueryError({ status: 403, statusText: "Forbidden" });
    expect(classification.category).toBe("auth");
    expect(classification.actionable).toBe(true);
    expect(classification.source).toBe("query");
  });

  it("classifies 404 as non-actionable", () => {
    const classification = classifyQueryError({ status: 404, statusText: "Not Found" });
    expect(classification.category).toBe("not-found");
    expect(classification.actionable).toBe(false);
  });

  it("classifies server errors as actionable", () => {
    const classification = classifyQueryError({ status: 500, statusText: "Internal Server Error" });
    expect(classification.category).toBe("server");
    expect(classification.actionable).toBe(true);
  });

  it("classifies network errors as actionable", () => {
    const classification = classifyQueryError(new TypeError("Failed to fetch"));
    expect(classification.category).toBe("network");
    expect(classification.actionable).toBe(true);
  });

  it("classifies abort errors as non-actionable", () => {
    const error = new Error("Request aborted");
    error.name = "AbortError";
    const classification = classifyQueryError(error);
    expect(classification.category).toBe("cancelled");
    expect(classification.actionable).toBe(false);
  });

  it("classifies unknown errors as non-actionable", () => {
    const classification = classifyQueryError(new Error("Unexpected failure"));
    expect(classification.category).toBe("unknown");
    expect(classification.actionable).toBe(false);
  });

  it("applies source-aware overrides for mutation auth errors", () => {
    const classification = classifyQueryError(
      { status: 403, statusText: "Forbidden" },
      {
        source: "mutation",
        presentationOverrides: {
          mutation: {
            auth: {
              message: "Custom mutation auth message",
            },
          },
        },
      }
    );

    expect(classification.source).toBe("mutation");
    expect(classification.category).toBe("auth");
    expect(classification.message).toBe("Custom mutation auth message");
  });

  it("applies source-aware overrides for query auth errors", () => {
    const classification = classifyQueryError(
      { status: 403, statusText: "Forbidden" },
      {
        source: "query",
        presentationOverrides: {
          query: {
            auth: {
              title: "Custom query title",
              message: "Custom query auth message",
            },
          },
        },
      }
    );

    expect(classification.source).toBe("query");
    expect(classification.category).toBe("auth");
    expect(classification.title).toBe("Custom query title");
    expect(classification.message).toBe("Custom query auth message");
  });
});
