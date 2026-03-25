import { describe, it, expect, beforeEach } from "vitest";
import { evaluatePolicies, evaluateExplicitPolicies } from "./policyEvaluator.js";
import { registerPolicies, clearPolicies } from "./policyRegistry.js";
import type { PolicyContext, PolicyDefinition } from "@afenda/meta-types";

function makeContext(overrides: Partial<PolicyContext> = {}): PolicyContext {
  return {
    model: "sales.invoice",
    record: { status: "draft", total: 1000 },
    actor: { uid: "u1", roles: ["accountant"] },
    operation: "update",
    ...overrides,
  };
}

const positiveAmountPolicy: PolicyDefinition = {
  id: "pol-positive",
  scope: "sales.invoice",
  name: "Positive total",
  validate: "total > 0",
  message: "Invoice total must be positive",
  severity: "error",
};

const draftOnlyDeletePolicy: PolicyDefinition = {
  id: "pol-draft-delete",
  scope: "sales.invoice",
  name: "Draft-only delete",
  when: 'operation == "delete"',
  validate: 'status == "draft"',
  message: "Only draft invoices may be deleted",
  severity: "error",
};

const largeInvoiceWarning: PolicyDefinition = {
  id: "pol-large",
  scope: "sales.invoice",
  name: "Large invoice",
  validate: "total <= 100000",
  message: "Invoice exceeds 100k — manual review recommended",
  severity: "warning",
};

describe("policyEvaluator", () => {
  beforeEach(() => clearPolicies());

  describe("evaluatePolicies (scope lookup)", () => {
    it("passes when all policies are satisfied", () => {
      registerPolicies([positiveAmountPolicy]);
      const result = evaluatePolicies(makeContext());
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.evaluationTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("fails when a policy is violated", () => {
      registerPolicies([positiveAmountPolicy]);
      const result = evaluatePolicies(makeContext({ record: { status: "draft", total: -5 } }));
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].policyId).toBe("pol-positive");
    });

    it("skips policy when `when` guard not met", () => {
      registerPolicies([draftOnlyDeletePolicy]);
      // operation is "update", not "delete" — guard should skip
      const result = evaluatePolicies(makeContext({ operation: "update" }));
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("applies policy when `when` guard is met and assertion fails", () => {
      registerPolicies([draftOnlyDeletePolicy]);
      const result = evaluatePolicies(
        makeContext({
          operation: "delete",
          record: { status: "posted", total: 1000 },
        })
      );
      expect(result.passed).toBe(false);
      expect(result.errors[0].message).toBe("Only draft invoices may be deleted");
    });

    it("collects warnings separately from errors", () => {
      registerPolicies([positiveAmountPolicy, largeInvoiceWarning]);
      const result = evaluatePolicies(makeContext({ record: { status: "draft", total: 200000 } }));
      expect(result.passed).toBe(true); // warnings don't block
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].policyId).toBe("pol-large");
    });
  });

  describe("evaluateExplicitPolicies", () => {
    it("evaluates an explicit list without scope lookup", () => {
      // Don't register anything in the registry
      const result = evaluateExplicitPolicies([positiveAmountPolicy], makeContext());
      expect(result.passed).toBe(true);
    });

    it("skips disabled policies", () => {
      const disabled: PolicyDefinition = {
        ...positiveAmountPolicy,
        enabled: false,
      };
      const result = evaluateExplicitPolicies(
        [disabled],
        makeContext({ record: { total: -1, status: "draft" } })
      );
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
