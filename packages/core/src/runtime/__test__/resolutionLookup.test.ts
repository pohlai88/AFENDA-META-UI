import { describe, expect, it } from "vitest";
import { getResolutionByRef } from "../resolution/resolutionLookup.js";

describe("getResolutionByRef", () => {
  it("resolves resolution metadata by reference", () => {
    const resolution = getResolutionByRef("resolve_missing_fx_rate");

    expect(resolution.resolutionId).toBe("resolve_missing_fx_rate");
    expect(resolution.allowedActions[0]).toMatchObject({ type: "navigate" });
  });

  it("throws for unknown resolution reference", () => {
    expect(() => getResolutionByRef("unknown")).toThrow(/Unknown resolutionRef/);
  });
});
