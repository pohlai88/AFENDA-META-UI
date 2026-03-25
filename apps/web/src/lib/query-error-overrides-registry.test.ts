import { afterEach, describe, expect, it } from "vitest";
import {
  getQueryErrorPresentationOverrides,
  registerQueryErrorPresentationOverrides,
  resetQueryErrorPresentationOverrides,
} from "./query-error-overrides-registry";

describe("query error overrides registry", () => {
  afterEach(() => {
    resetQueryErrorPresentationOverrides();
  });

  it("starts with no app-specific overrides", () => {
    const overrides = getQueryErrorPresentationOverrides();
    expect(overrides).toEqual({});
  });

  it("merges new overrides without dropping existing registered values", () => {
    registerQueryErrorPresentationOverrides({
      query: {
        auth: {
          message: "Query auth default",
        },
      },
    });

    registerQueryErrorPresentationOverrides({
      mutation: {
        server: {
          title: "Save failed",
          message: "Unable to save right now. Please try again.",
        },
      },
    });

    const overrides = getQueryErrorPresentationOverrides();

    expect(overrides.mutation?.server?.title).toBe("Save failed");
    expect(overrides.mutation?.server?.message).toBe("Unable to save right now. Please try again.");
    expect(overrides.query?.auth?.message).toBe("Query auth default");
  });

  it("supports overriding existing messages", () => {
    registerQueryErrorPresentationOverrides({
      query: {
        auth: {
          message: "Custom query auth message",
        },
      },
    });

    const overrides = getQueryErrorPresentationOverrides();
    expect(overrides.query?.auth?.message).toBe("Custom query auth message");
  });
});
