import { describe, it, expect, beforeEach } from "vitest";
import type { PolicyContext, PolicyDefinition } from "@afenda/meta-types";
import {
  registerPolicy,
  registerPolicies,
  getPolicy,
  removePolicy,
  clearPolicies,
  getPoliciesForScope,
  getPoliciesByTags,
  getAllPolicies,
} from "./policyRegistry.js";

beforeEach(() => {
  clearPolicies();
});

describe("policyRegistry", () => {
  const samplePolicy: PolicyDefinition = {
    id: "invoice_total",
    scope: "finance.invoice",
    name: "Invoice Total Consistency",
    validate: "total == 100",
    message: "Invoice total mismatch",
    severity: "error",
  };

  describe("CRUD", () => {
    it("registers and retrieves a policy", () => {
      registerPolicy(samplePolicy);
      expect(getPolicy("invoice_total")).toEqual(samplePolicy);
    });

    it("removes a policy", () => {
      registerPolicy(samplePolicy);
      expect(removePolicy("invoice_total")).toBe(true);
      expect(getPolicy("invoice_total")).toBeUndefined();
    });

    it("clears all policies", () => {
      registerPolicies([samplePolicy, { ...samplePolicy, id: "policy2", scope: "hr" }]);
      expect(getAllPolicies()).toHaveLength(2);
      clearPolicies();
      expect(getAllPolicies()).toHaveLength(0);
    });
  });

  describe("scope lookup", () => {
    it("returns policies matching exact scope", () => {
      registerPolicy(samplePolicy);
      const result = getPoliciesForScope("finance.invoice");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("invoice_total");
    });

    it("returns policies when scope is a child of policy scope", () => {
      registerPolicy(samplePolicy);
      const result = getPoliciesForScope("finance.invoice.lines");
      expect(result).toHaveLength(1);
    });

    it("excludes policies from unrelated scopes", () => {
      registerPolicy(samplePolicy);
      const result = getPoliciesForScope("hr.employee");
      expect(result).toHaveLength(0);
    });

    it("excludes disabled policies", () => {
      registerPolicy({ ...samplePolicy, enabled: false });
      const result = getPoliciesForScope("finance.invoice");
      expect(result).toHaveLength(0);
    });
  });

  describe("tag lookup", () => {
    it("returns policies matching any tag", () => {
      registerPolicy({ ...samplePolicy, policyTags: ["sox", "financial"] });
      const result = getPoliciesByTags(["sox"]);
      expect(result).toHaveLength(1);
    });

    it("returns empty for non-matching tags", () => {
      registerPolicy({ ...samplePolicy, policyTags: ["sox"] });
      const result = getPoliciesByTags(["gdpr"]);
      expect(result).toHaveLength(0);
    });
  });
});
