/**
 * Rule Simulation Sandbox Types
 * ==============================
 * Admin safety lab for testing policies before activation.
 * Prevents disasters like blocking all invoices or freezing payroll.
 */

import type { PolicyDefinition, PolicyEvaluationResult, PolicyViolation } from "./policy.js";

// ---------------------------------------------------------------------------
// Scenario Builder
// ---------------------------------------------------------------------------

export interface SimulationScenario {
  /** Unique scenario ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Target entity/model */
  entity: string;
  /** Simulated record data */
  record: Record<string, unknown>;
  /** Optional related records */
  relatedRecords?: Record<string, Record<string, unknown>[]>;
  /** Simulated actor context */
  actor: { uid: string; roles: string[] };
  /** Operation being simulated */
  operation: string;
  /** Previous record state (for update simulations) */
  previousRecord?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Simulation Results
// ---------------------------------------------------------------------------

export interface PolicySimulationResult {
  /** The policy that was evaluated */
  policy: PolicyDefinition;
  /** Whether the when-guard matched (policy was applicable) */
  applicable: boolean;
  /** Whether the validate assertion passed */
  passed: boolean;
  /** Violation details (if failed) */
  violation?: PolicyViolation;
  /** Evaluation time in milliseconds */
  evaluationTimeMs: number;
}

export interface SimulationReport {
  /** Scenario that was tested */
  scenario: SimulationScenario;
  /** Individual policy results */
  results: PolicySimulationResult[];
  /** Aggregate evaluation result */
  aggregate: PolicyEvaluationResult;
  /** Total simulation time */
  totalTimeMs: number;
  /** Timestamp of simulation */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Blast Radius Analysis
// ---------------------------------------------------------------------------

export interface BlastRadiusResult {
  /** Policy being analyzed */
  policyId: string;
  policyName: string;
  /** How many records would be affected */
  affectedRecordCount: number;
  /** Breakdown by entity type */
  affectedEntities: Array<{
    entity: string;
    count: number;
  }>;
  /** Sample of matching record IDs */
  sampleRecordIds: string[];
  /** Analysis timestamp */
  timestamp: string;
}
