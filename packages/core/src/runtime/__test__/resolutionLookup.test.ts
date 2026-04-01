import { describe, expect, it } from "vitest";
import { buildTruthRegistry } from "../registry.js";
import { getResolutionByRef } from "../resolution/resolutionLookup.js";

describe("getResolutionByRef", () => {
  it("resolves resolution metadata by reference", () => {
    const registry = buildTruthRegistry();
    const resolution = getResolutionByRef({
      registry,
      resolutionRef: "resolve_missing_fx_rate",
    });

    expect(resolution.resolutionId).toBe("resolve_missing_fx_rate");
    expect(resolution.actions[0]).toMatchObject({ type: "navigate" });
  });

  it("throws for unknown resolution reference", () => {
    const registry = buildTruthRegistry();
    expect(() =>
      getResolutionByRef({
        registry,
        resolutionRef: "unknown",
      }),
    ).toThrow(/Unknown resolutionRef/);
  });
});
