import { describe, expect, it } from "vitest";
import { buildInvariantFailurePayload } from "../errors.js";
import { buildTruthRegistry } from "../registry.js";

describe("buildInvariantFailurePayload", () => {
  it("assembles doctrine, evidence, and resolution from the registry", () => {
    const registry = buildTruthRegistry();
    const payload = buildInvariantFailurePayload({
      registry,
      invariantKey: "fx_conversion_basis_required",
      evidenceSummary: "No rate for USD→EUR on 2024-01-01",
      evidenceFacts: { fromCurrency: "USD", toCurrency: "EUR" },
    });

    expect(payload.invariantName).toBe("fx_conversion_basis_required");
    expect(payload.doctrine.doctrineRef).toBe("ias21_fx_conversion");
    expect(payload.evidence.summary).toContain("USD");
    expect(payload.resolution?.resolutionId).toBe("resolve_missing_fx_rate");
    expect(payload.resolution?.actions[0]).toMatchObject({ type: "navigate" });
  });

  it("throws for unknown invariant", () => {
    const registry = buildTruthRegistry();
    expect(() =>
      buildInvariantFailurePayload({
        registry,
        invariantKey: "does_not_exist",
        evidenceSummary: "x",
        evidenceFacts: {},
      }),
    ).toThrow(/Unknown invariant/);
  });
});
