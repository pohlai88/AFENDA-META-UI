import { describe, expect, it } from "vitest";
import { runProjectionReadChecks } from "./runProjectionReadChecks.js";

describe("runProjectionReadChecks", () => {
  it("returns no failures when truth contract is valid", () => {
    const failures = runProjectionReadChecks({
      context: {
        truthContractValid: true,
        scopeId: "financial_authority",
      },
    });

    expect(failures).toEqual([]);
  });

  it("returns doctrine/resolution-enriched failure when truth contract is invalid", () => {
    const failures = runProjectionReadChecks({
      context: {
        truthContractValid: false,
        scopeId: "financial_authority",
        breachReason: "test_breach",
        actorRole: "finance_manager",
      },
    });

    expect(failures).toHaveLength(1);
    expect(failures[0]?.invariantName).toBe(
      "authoritative_projection_requires_clean_truth_contract",
    );
    expect(failures[0]?.doctrine.doctrineRef).toBe("accounting_truth_contract");
    expect(failures[0]?.resolution?.resolutionId).toBe("resolve_truth_contract_violation");
  });
});
