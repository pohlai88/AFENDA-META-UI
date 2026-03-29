/**
 * Policy Evaluator
 * ================
 * Orchestrates policy evaluation:
 *   1. Collect applicable policies (by scope)
 *   2. Build flat DSL context
 *   3. Evaluate `when` guard (skip if false)
 *   4. Evaluate `validate` assertion (violation if false)
 *   5. Collect all violations, return structured result
 *
 * NEW: Tenant-aware policy evaluation
 * ===================================
 * When ResolutionContext is provided, policies are additionally resolved
 * via resolveMetadata() to apply tenant/department/industry overrides.
 * This enables different validation rules per tenant, industry, etc.
 */

import type { ResolutionContext } from "@afenda/meta-types/platform";
import type { PolicyContext, PolicyDefinition, PolicyEvaluationResult, PolicyViolation } from "@afenda/meta-types/policy";
import { getPoliciesForScope } from "./policyRegistry.js";
import { evaluateCondition } from "./policyDSL.js";
import { buildPolicyContext } from "./policyContextBuilder.js";
import { resolveMetadata } from "../tenant/index.js";
import { logDecisionAudit } from "../audit/decisionAuditLogger.js";
import { randomUUID } from "crypto";

/**
 * Evaluate a single policy against a prepared flat context.
 * Returns a violation if the policy is violated, or null if it passes.
 */
function evaluateSinglePolicy(
  policy: PolicyDefinition,
  flatContext: Record<string, unknown>
): PolicyViolation | null {
  // 1. Check `when` guard — skip policy if precondition is not met
  if (policy.when) {
    const guard = evaluateCondition(policy.when, flatContext);
    if (guard.error) {
      return {
        policyId: policy.id,
        policyName: policy.name,
        message: `Policy guard error: ${guard.error}`,
        severity: "warning",
      };
    }
    if (!guard.result) {
      return null; // precondition not met — policy does not apply
    }
  }

  // 2. Evaluate `validate` assertion
  const assertion = evaluateCondition(policy.validate, flatContext);

  if (assertion.error) {
    return {
      policyId: policy.id,
      policyName: policy.name,
      message: `Policy validation error: ${assertion.error}`,
      severity: "warning",
    };
  }

  // 3. Assertion passed → no violation
  if (assertion.result) {
    return null;
  }

  // 4. Assertion failed → violation
  return {
    policyId: policy.id,
    policyName: policy.name,
    message: policy.message,
    severity: policy.severity,
  };
}

/**
 * Evaluate all applicable policies for a given context.
 *
 * @param context - Rich policy context (record, actor, operation, etc.)
 * @param scope   - Optional scope override. Defaults to `context.model`.
 * @returns Structured result with errors, warnings, info, and timing.
 */
export function evaluatePolicies(context: PolicyContext, scope?: string): PolicyEvaluationResult {
  const startTime = performance.now();
  const effectiveScope = scope ?? context.model;
  const policies = getPoliciesForScope(effectiveScope);
  const flatContext = buildPolicyContext(context);

  const errors: PolicyViolation[] = [];
  const warnings: PolicyViolation[] = [];
  const info: PolicyViolation[] = [];

  for (const policy of policies) {
    const violation = evaluateSinglePolicy(policy, flatContext);
    if (!violation) continue;

    switch (violation.severity) {
      case "error":
        errors.push(violation);
        break;
      case "warning":
        warnings.push(violation);
        break;
      case "info":
        info.push(violation);
        break;
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    info,
    evaluationTimeMs: performance.now() - startTime,
  };
}

/**
 * Evaluate policies with tenant resolution — applies tenant/department/industry overrides.
 *
 * This function:
 * 1. Collects policies for the scope
 * 2. Resolves each policy via resolveMetadata() to apply tenant overrides
 * 3. Evaluates the resolved policies
 *
 * Example: A global policy may have a tenant-specific override that tightens or loosens rules.
 *
 * @param context      - Rich policy context (record, actor, operation, etc.)
 * @param tenantCtx    - Tenant resolution context (tenant/dept/user/industry)
 * @param globalMeta   - Global metadata (tenantId -> metadata map)
 * @param scope        - Optional scope override
 * @returns Structured result with resolved + evaluated policies
 */
export function evaluatePoliciesWithTenantContext(
  context: PolicyContext,
  tenantCtx: ResolutionContext,
  globalMeta: Record<string, unknown>,
  scope?: string
): PolicyEvaluationResult {
  const startTime = performance.now();
  const policyEvaluationId = randomUUID();
  const effectiveScope = scope ?? context.model;
  const basePolicies = getPoliciesForScope(effectiveScope);
  const flatContext = buildPolicyContext(context);

  const errors: PolicyViolation[] = [];
  const warnings: PolicyViolation[] = [];
  const info: PolicyViolation[] = [];

  for (const basePolicy of basePolicies) {
    // Resolve the policy to apply tenant overrides
    const resolvedPolicyMeta = resolveMetadata(context.model, globalMeta, tenantCtx);

    // Apply resolved metadata to the policy (e.g., override validate condition)
    const resolvedPolicies = (resolvedPolicyMeta.policies || {}) as Record<
      string,
      Partial<PolicyDefinition>
    >;
    const policy: PolicyDefinition = {
      ...basePolicy,
      // If tenant-specific overrides exist, apply them
      ...((resolvedPolicies[basePolicy.id] || {}) as Partial<PolicyDefinition>),
    };

    const violation = evaluateSinglePolicy(policy, flatContext);
    if (!violation) continue;

    switch (violation.severity) {
      case "error":
        errors.push(violation);
        break;
      case "warning":
        warnings.push(violation);
        break;
      case "info":
        info.push(violation);
        break;
    }

    // Log policy enforcement decision (Phase 4: Audit Fabric)
    const durationMs = performance.now() - startTime;
    const violations: Array<{
      type: string;
      message: string;
      severity: "info" | "warning" | "error";
    }> = violation
      ? [
          {
            type: "policy_violation",
            message: violation.message,
            severity: violation.severity as "info" | "warning" | "error",
          },
        ]
      : [];

    logDecisionAudit({
      id: policyEvaluationId,
      timestamp: new Date().toISOString(),
      tenantId: tenantCtx.tenantId,
      userId: tenantCtx.userId,
      eventType: "policy_enforced",
      scope: effectiveScope,
      context: {
        model: context.model,
        policyId: policy.id,
      },
      decision: {
        input: {
          policyId: policy.id,
          severity: policy.severity,
          condition: String(policy.validate),
          record: context.record,
        },
        output: {
          passed: !violation,
        },
        reasoning: violation
          ? `Policy '${policy.id}' enforced at severity '${violation.severity}': ${violation.message}`
          : `Policy '${policy.id}' passed`,
        appliedLayers: [
          "global",
          ...Object.keys(resolvedPolicyMeta).filter(
            (k) => k.startsWith("tenant") || k.startsWith("department") || k.startsWith("industry")
          ),
        ],
        ...(violations.length > 0 && { violations }),
      },
      durationMs,
      status: "success",
    });
  }

  const totalDurationMs = performance.now() - startTime;

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    info,
    evaluationTimeMs: totalDurationMs,
  };
}

/**
 * Evaluate an explicit list of policies (instead of scope lookup).
 * Useful for testing or when policies are already resolved.
 */
export function evaluateExplicitPolicies(
  policies: PolicyDefinition[],
  context: PolicyContext
): PolicyEvaluationResult {
  const startTime = performance.now();
  const flatContext = buildPolicyContext(context);

  const errors: PolicyViolation[] = [];
  const warnings: PolicyViolation[] = [];
  const info: PolicyViolation[] = [];

  for (const policy of policies) {
    if (policy.enabled === false) continue;
    const violation = evaluateSinglePolicy(policy, flatContext);
    if (!violation) continue;

    switch (violation.severity) {
      case "error":
        errors.push(violation);
        break;
      case "warning":
        warnings.push(violation);
        break;
      case "info":
        info.push(violation);
        break;
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    info,
    evaluationTimeMs: performance.now() - startTime,
  };
}
