/**
 * Policy mutation-policy contract tests.
 *
 * Design intent: MutationPolicyResolutionInput and DirectMutationPolicyResult
 * are the query/response contracts for mutation gateway checks.
 * Changes here silently disable event-sourcing guarantees in api/db consumers.
 * Fix the contract, not the test.
 */
import { describe, expect, it } from "vitest";

import type {
  DirectMutationPolicyCheckInput,
  DirectMutationPolicyResult,
  MutationOperation,
  MutationPolicyDefinition,
  MutationPolicyResolutionInput,
} from "../mutation-policy.js";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const policies: MutationPolicyDefinition[] = [
  {
    id: "mp-invoice-dual",
    mutationPolicy: "dual-write",
    appliesTo: ["invoice"],
    requiredEvents: ["invoice.created", "invoice.updated"],
  },
  {
    id: "mp-audit-event-only",
    mutationPolicy: "event-only",
    appliesTo: ["audit_log"],
    requiredEvents: ["audit.entry.written"],
  },
  {
    id: "mp-user-direct",
    mutationPolicy: "direct",
    appliesTo: ["users"],
    directMutationOperations: ["create", "update", "delete"],
  },
];

// ---------------------------------------------------------------------------
// MutationPolicyResolutionInput — structural contract
// ---------------------------------------------------------------------------

describe("MutationPolicyResolutionInput — structural contract", () => {
  it("holds model name and applicable policies array", () => {
    const input: MutationPolicyResolutionInput = {
      model: "invoice",
      policies: [policies[0]!],
    };
    expect(input.model).toBe("invoice");
    expect(input.policies).toHaveLength(1);
    expect(input.policies[0]?.id).toBe("mp-invoice-dual");
  });

  it("accepts an empty policies array (no applicable policies)", () => {
    const input: MutationPolicyResolutionInput = {
      model: "schema_registry",
      policies: [],
    };
    expect(input.policies).toHaveLength(0);
  });

  it("accepts multiple policies for the same model", () => {
    const input: MutationPolicyResolutionInput = {
      model: "invoice",
      policies,
    };
    expect(input.policies).toHaveLength(3);
  });

  it("EXHAUSTIVENESS GATE — MutationPolicyResolutionInput has exactly 2 fields", () => {
    const input: MutationPolicyResolutionInput = {
      model: "order",
      policies: [],
    };
    expect(Object.keys(input)).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// DirectMutationPolicyCheckInput — extends resolution input with operation
// ---------------------------------------------------------------------------

describe("DirectMutationPolicyCheckInput — extends with operation", () => {
  it("includes model, policies, and operation", () => {
    const input: DirectMutationPolicyCheckInput = {
      model: "users",
      policies: [policies[2]!],
      operation: "create",
    };
    expect(input.model).toBe("users");
    expect(input.operation).toBe("create");
    expect(input.policies[0]?.mutationPolicy).toBe("direct");
  });

  it("accepts all three valid operations", () => {
    const ops: MutationOperation[] = ["create", "update", "delete"];
    for (const op of ops) {
      const input: DirectMutationPolicyCheckInput = {
        model: "invoice",
        policies: [],
        operation: op,
      };
      expect(input.operation).toBe(op);
    }
  });

  it("EXHAUSTIVENESS GATE — DirectMutationPolicyCheckInput has exactly 3 fields", () => {
    const input: DirectMutationPolicyCheckInput = {
      model: "m",
      policies: [],
      operation: "delete",
    };
    expect(Object.keys(input)).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// DirectMutationPolicyResult — structural contract
// ---------------------------------------------------------------------------

describe("DirectMutationPolicyResult — structural contract", () => {
  it("represents an allowed result with no reason or policy", () => {
    const result: DirectMutationPolicyResult = {
      allowed: true,
    };
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.policy).toBeUndefined();
  });

  it("represents a blocked result with reason and matched policy", () => {
    const result: DirectMutationPolicyResult = {
      allowed: false,
      reason: "event-only policy prohibits direct writes to audit_log",
      policy: policies[1]!,
    };
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/audit_log/);
    expect(result.policy?.id).toBe("mp-audit-event-only");
    expect(result.policy?.mutationPolicy).toBe("event-only");
  });

  it("represents a blocked result without identifying the specific policy", () => {
    const result: DirectMutationPolicyResult = {
      allowed: false,
      reason: "no direct mutation permitted",
    };
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.policy).toBeUndefined();
  });

  it("allowed=true result has no required optional fields", () => {
    const result: DirectMutationPolicyResult = { allowed: true };
    expect(Object.keys(result)).toHaveLength(1);
  });
});
