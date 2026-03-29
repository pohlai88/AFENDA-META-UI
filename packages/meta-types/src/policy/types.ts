/**
 * @module policy
 * @description Declarative policy contracts for cross-module validation and decision rules.
 * @layer truth-contract
 * @consumers api, web, db
 */

export type PolicySeverity = "error" | "warning" | "info";

export interface PolicyDefinition {
  id: string;
  scope: string;
  name: string;
  description?: string;
  when?: string;
  validate: string;
  message: string;
  severity: PolicySeverity;
  enabled?: boolean;
  policyTags?: string[];
}

export type PolicyOperation =
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "submit"
  | "cancel"
  | "validate";

export interface PolicyContext {
  model: string;
  record: Record<string, unknown>;
  relatedRecords?: Record<string, Record<string, unknown>[]>;
  actor: {
    uid: string;
    roles: string[];
  };
  operation: PolicyOperation;
  previousRecord?: Record<string, unknown>;
}

export interface PolicyViolation {
  policyId: string;
  policyName: string;
  message: string;
  severity: PolicySeverity;
  field?: string;
}

export interface PolicyEvaluationResult {
  passed: boolean;
  errors: PolicyViolation[];
  warnings: PolicyViolation[];
  info: PolicyViolation[];
  evaluationTimeMs: number;
}
