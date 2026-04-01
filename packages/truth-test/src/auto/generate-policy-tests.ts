/**
 * Mutation Policy Test Generator
 * ================================
 * Consumes MutationPolicyDefinition[] from truth-config and generates
 * exhaustive enforcement tests using the existing mutation-policy-runtime.
 *
 * Tests generated per policy:
 *   - Event-only policies block the correct operations
 *   - Dual-write policies allow the correct operations
 *   - Required events are declared
 *   - Unmatched models fall through (allowed)
 */

import { describe, test, expect } from "vitest";
import type {
  MutationOperation,
  MutationPolicyDefinition,
} from "@afenda/meta-types/policy";
import {
  isDirectMutationAllowed,
  resolveMutationPolicy,
} from "@afenda/db/truth-compiler";

const ALL_OPERATIONS: MutationOperation[] = ["create", "update", "delete"];

/**
 * Generate exhaustive mutation policy tests from a policy registry.
 * Call this inside a test file — it registers describe/test blocks via Vitest.
 *
 * When multiple policies target the same model, `resolveMutationPolicy` returns
 * the first match (Array.find order). The generator detects this and only
 * generates resolution tests for the primary (first-match) policy per model.
 */
export function generatePolicyTests(
  policies: MutationPolicyDefinition[],
): void {
  // Pre-compute which policy is the primary resolver for each model
  const primaryPolicyForModel = new Map<string, string>();
  for (const p of policies) {
    for (const m of p.appliesTo) {
      if (!primaryPolicyForModel.has(m)) {
        primaryPolicyForModel.set(m, p.id);
      }
    }
  }

  describe("auto → mutation policy enforcement", () => {
    // --- Per-policy tests ---
    for (const policy of policies) {
      describe(`${policy.id} (${policy.mutationPolicy})`, () => {
        test("has required metadata", () => {
          expect(policy.id).toBeTruthy();
          expect(policy.appliesTo.length).toBeGreaterThan(0);
          expect(["direct", "event-only", "dual-write"]).toContain(policy.mutationPolicy);
        });

        if (policy.requiredEvents) {
          test("declares required events", () => {
            expect(policy.requiredEvents!.length).toBeGreaterThan(0);
          });
        }

        // Resolve for each model the policy applies to
        for (const model of policy.appliesTo) {
          const isPrimary = primaryPolicyForModel.get(model) === policy.id;

          describe(`model: ${model}`, () => {
            if (isPrimary) {
              test("resolves as primary policy", () => {
                const resolved = resolveMutationPolicy({
                  model,
                  policies,
                });
                expect(resolved?.id).toBe(policy.id);
              });
            } else {
              test("is secondary (shadowed by earlier policy)", () => {
                const resolved = resolveMutationPolicy({
                  model,
                  policies,
                });
                expect(resolved?.id).not.toBe(policy.id);
                // Verify it resolves to the primary instead
                expect(resolved?.id).toBe(primaryPolicyForModel.get(model));
              });

              // When passed alone, it should resolve correctly
              test("resolves when used in isolation", () => {
                const resolved = resolveMutationPolicy({
                  model,
                  policies: [policy],
                });
                expect(resolved?.id).toBe(policy.id);
              });
            }

            // Enforcement tests use the primary policy's behavior
            if (isPrimary) {
              for (const op of ALL_OPERATIONS) {
                const scopedOps = policy.directMutationOperations?.length
                  ? policy.directMutationOperations
                  : ALL_OPERATIONS;

                if (policy.mutationPolicy === "event-only" && scopedOps.includes(op)) {
                  test(`${op} is BLOCKED (event-only)`, () => {
                    const result = isDirectMutationAllowed({
                      model,
                      operation: op,
                      policies,
                    });
                    expect(result.allowed).toBe(false);
                    expect(result.policy?.id).toBe(policy.id);
                  });
                } else if (policy.mutationPolicy === "event-only" && !scopedOps.includes(op)) {
                  test(`${op} is ALLOWED (not in scoped operations)`, () => {
                    const result = isDirectMutationAllowed({
                      model,
                      operation: op,
                      policies,
                    });
                    expect(result.allowed).toBe(true);
                  });
                } else {
                  test(`${op} is ALLOWED (${policy.mutationPolicy})`, () => {
                    const result = isDirectMutationAllowed({
                      model,
                      operation: op,
                      policies,
                    });
                    expect(result.allowed).toBe(true);
                  });
                }
              }
            }
          });
        }
      });
    }

    // --- Unmatched model falls through ---
    test("unmatched model allows all operations", () => {
      for (const op of ALL_OPERATIONS) {
        const result = isDirectMutationAllowed({
          model: "__nonexistent_model__",
          operation: op,
          policies,
        });
        expect(result.allowed).toBe(true);
      }
    });
  });
}
