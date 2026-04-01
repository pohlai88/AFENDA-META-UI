import { describe, expect, it } from "vitest";
import { buildInvariantFailurePayload } from "../errors.js";
import { invariants } from "../../generated/invariants.js";

describe("buildInvariantFailurePayload", () => {
  it("assembles doctrine, evidence, and resolution from provided metadata", () => {
    const invariant = invariants.find((entry) => entry.key === "fx_conversion_basis_required");
    if (!invariant) {
      throw new Error("Missing generated invariant: fx_conversion_basis_required");
    }
    const payload = buildInvariantFailurePayload({
      invariantName: invariant.key,
      severity: invariant.severity,
      failurePolicy: invariant.failurePolicy,
      evidenceSummary: "No rate for USD→EUR on 2024-01-01",
      evidenceFacts: { fromCurrency: "USD", toCurrency: "EUR" },
      doctrineRef: invariant.doctrineRef,
      resolutionRef: invariant.resolutionRef,
      actorRole: "accountant",
    });

    expect(payload.invariantName).toBe("fx_conversion_basis_required");
    expect(payload.doctrine.doctrineRef).toBe("ias21_fx_conversion");
    expect(payload.evidence.summary).toContain("USD");
    expect(payload.resolution?.resolutionId).toBe("resolve_missing_fx_rate");
    expect(payload.resolution?.actions[0]).toMatchObject({ type: "navigate" });
  });

  it("throws when doctrineRef is omitted", () => {
    expect(() =>
      buildInvariantFailurePayload({
        invariantName: "demo_invariant",
        severity: "minor",
        failurePolicy: "alert-only",
        evidenceSummary: "x",
        evidenceFacts: {},
      }),
    ).toThrow(/missing doctrine trace/);
  });
});
