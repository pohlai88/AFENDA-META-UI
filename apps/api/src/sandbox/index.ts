/**
 * Rule Simulation Sandbox — Admin Safety Lab
 * ============================================
 * Tests policies against simulated scenarios BEFORE activation.
 *
 * Features:
 * 1. Scenario Builder — create fake business cases
 * 2. Policy Simulator — run all policies against a scenario
 * 3. Impact Analysis — show pass/fail/warning per policy
 * 4. Blast Radius — estimate how many records a policy affects
 */

import type {
  PolicyDefinition,
  PolicyContext,
  PolicyViolation,
  PolicyEvaluationResult,
  SimulationScenario,
  PolicySimulationResult,
  SimulationReport,
  BlastRadiusResult,
} from "@afenda/meta-types";

import { evaluateExplicitPolicies } from "../policy/policyEvaluator.js";
import { getPoliciesForScope } from "../policy/policyRegistry.js";
import { buildPolicyContext } from "../policy/policyContextBuilder.js";
import { evaluateCondition } from "../policy/policyDSL.js";

// ---------------------------------------------------------------------------
// Scenario → PolicyContext conversion
// ---------------------------------------------------------------------------

function scenarioToContext(scenario: SimulationScenario): PolicyContext {
  return {
    model: scenario.entity,
    record: scenario.record,
    relatedRecords: scenario.relatedRecords,
    actor: scenario.actor,
    operation: scenario.operation as PolicyContext["operation"],
    previousRecord: scenario.previousRecord,
  };
}

// ---------------------------------------------------------------------------
// Single-Policy Simulation
// ---------------------------------------------------------------------------

function simulateSinglePolicy(
  policy: PolicyDefinition,
  flatContext: Record<string, unknown>
): PolicySimulationResult {
  const start = performance.now();

  // Check when-guard
  let applicable = true;
  if (policy.when) {
    const guardResult = evaluateCondition(policy.when, flatContext);
    if (guardResult.error) {
      return {
        policy,
        applicable: true,
        passed: false,
        violation: {
          policyId: policy.id,
          policyName: policy.name,
          message: `Policy guard error: ${guardResult.error}`,
          severity: "warning",
        },
        evaluationTimeMs: performance.now() - start,
      };
    }
    applicable = guardResult.result;
  }

  if (!applicable) {
    return {
      policy,
      applicable: false,
      passed: true,
      evaluationTimeMs: performance.now() - start,
    };
  }

  // Evaluate validate assertion
  const assertionResult = evaluateCondition(policy.validate, flatContext);
  if (assertionResult.error) {
    return {
      policy,
      applicable: true,
      passed: false,
      violation: {
        policyId: policy.id,
        policyName: policy.name,
        message: `Policy validation error: ${assertionResult.error}`,
        severity: "warning",
      },
      evaluationTimeMs: performance.now() - start,
    };
  }
  const passed = assertionResult.result;

  const violation: PolicyViolation | undefined = passed
    ? undefined
    : {
        policyId: policy.id,
        policyName: policy.name,
        message: policy.message,
        severity: policy.severity,
      };

  return {
    policy,
    applicable: true,
    passed,
    violation,
    evaluationTimeMs: performance.now() - start,
  };
}

// ---------------------------------------------------------------------------
// Full Scenario Simulation
// ---------------------------------------------------------------------------

/**
 * Run all applicable policies against a simulated scenario.
 * Returns detailed per-policy results plus an aggregate evaluation.
 */
export function simulateScenario(
  scenario: SimulationScenario,
  policies?: PolicyDefinition[]
): SimulationReport {
  const start = performance.now();
  const context = scenarioToContext(scenario);
  const flatContext = buildPolicyContext(context);

  // Use provided policies or look up by scope
  const activePolicies = policies ?? getPoliciesForScope(scenario.entity);

  // Simulate each policy individually
  const results: PolicySimulationResult[] = activePolicies
    .filter((p) => p.enabled !== false)
    .map((policy) => simulateSinglePolicy(policy, flatContext));

  // Also produce the aggregate result
  const aggregate = evaluateExplicitPolicies(activePolicies, context);

  return {
    scenario,
    results,
    aggregate,
    totalTimeMs: performance.now() - start,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Blast Radius Analysis
// ---------------------------------------------------------------------------

/**
 * Estimate how many records a policy would affect.
 *
 * Takes a dataset of sample records and runs the policy's when-guard
 * against each to see how many are "in scope."
 *
 * @param policy - The policy to analyze
 * @param records - Sample records grouped by entity
 *   e.g. { "sales.invoice": [{ id: "1", ...}, ...] }
 * @returns BlastRadiusResult with counts and sample IDs
 */
export function analyzeBlastRadius(
  policy: PolicyDefinition,
  records: Record<string, Array<{ id: string } & Record<string, unknown>>>
): BlastRadiusResult {
  let totalAffected = 0;
  const affectedEntities: BlastRadiusResult["affectedEntities"] = [];
  const sampleIds: string[] = [];

  for (const [entity, rows] of Object.entries(records)) {
    let entityCount = 0;

    for (const row of rows) {
      // Build a minimal flat context for the when-guard
      const flatContext: Record<string, unknown> = { ...row };

      // Check if the when-guard applies (or if there's no guard, all records match)
      const applies = policy.when ? evaluateCondition(policy.when, flatContext).result : true;

      if (applies) {
        entityCount++;
        if (sampleIds.length < 20) {
          sampleIds.push(row.id);
        }
      }
    }

    if (entityCount > 0) {
      affectedEntities.push({ entity, count: entityCount });
      totalAffected += entityCount;
    }
  }

  return {
    policyId: policy.id,
    policyName: policy.name,
    affectedRecordCount: totalAffected,
    affectedEntities,
    sampleRecordIds: sampleIds,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Batch Scenario Simulation
// ---------------------------------------------------------------------------

/**
 * Run multiple scenarios against the same policy set.
 * Useful for regression testing policy changes.
 */
export function simulateBatch(
  scenarios: SimulationScenario[],
  policies?: PolicyDefinition[]
): SimulationReport[] {
  return scenarios.map((scenario) => simulateScenario(scenario, policies));
}
