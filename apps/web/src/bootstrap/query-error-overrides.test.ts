import { afterEach, describe, expect, it } from "vitest";
import {
  getQueryErrorPresentationOverrides,
  resetQueryErrorPresentationOverrides,
} from "~/lib/query-error-overrides-registry";
import { registerAppQueryErrorOverrides } from "./query-error-overrides";

describe("registerAppQueryErrorOverrides", () => {
  afterEach(() => {
    resetQueryErrorPresentationOverrides();
  });

  it("registers app-specific query and mutation messages", () => {
    registerAppQueryErrorOverrides();

    const overrides = getQueryErrorPresentationOverrides();

    expect(overrides.query?.auth?.message).toBe(
      "You do not have permission to view this data."
    );
    expect(overrides.mutation?.auth?.message).toBe(
      "You do not have permission to make this change."
    );
    expect(overrides.mutation?.validation?.message).toBe(
      "Please review the entered values and try again."
    );
  });
});
