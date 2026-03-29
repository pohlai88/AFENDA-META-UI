/**
 * @module policy/sandbox
 * @description Simulation contracts for testing policy impact and blast radius before activation.
 * @layer truth-contract
 * @consumers api, web
 */

import type { PolicyDefinition, PolicyEvaluationResult, PolicyViolation } from "./types.js";

export interface SimulationScenario {
  id: string;
  name: string;
  entity: string;
  record: Record<string, unknown>;
  relatedRecords?: Record<string, Record<string, unknown>[]>;
  actor: { uid: string; roles: string[] };
  operation: string;
  previousRecord?: Record<string, unknown>;
}

export interface PolicySimulationResult {
  policy: PolicyDefinition;
  applicable: boolean;
  passed: boolean;
  violation?: PolicyViolation;
  evaluationTimeMs: number;
}

export interface SimulationReport {
  scenario: SimulationScenario;
  results: PolicySimulationResult[];
  aggregate: PolicyEvaluationResult;
  totalTimeMs: number;
  timestamp: string;
}

export interface BlastRadiusResult {
  policyId: string;
  policyName: string;
  affectedRecordCount: number;
  affectedEntities: Array<{
    entity: string;
    count: number;
  }>;
  sampleRecordIds: string[];
  timestamp: string;
}
