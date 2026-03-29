/**
 * @module policy/invariants
 * @description Declarative invariant contracts for entity and cross-entity truth rules.
 * @layer truth-contract
 * @consumers api, db
 */

import type { ConditionExpression } from "../schema/types.js";

export type InvariantScope = "entity" | "aggregate" | "cross-aggregate" | "global";

export type InvariantSeverity = "fatal" | "error" | "warning";

export type InvariantTriggerOperation = "create" | "update" | "delete" | "transition";

export interface InvariantDefinition {
  id: string;
  description: string;
  targetModel: string;
  scope: InvariantScope;
  severity: InvariantSeverity;
  condition: ConditionExpression;
  triggerOn: InvariantTriggerOperation[];
  group?: string;
  tenantOverridable: boolean;
}

export interface InvariantViolation {
  invariantId: string;
  severity: InvariantSeverity;
  message: string;
  context: Record<string, unknown>;
}

export interface InvariantRegistry {
  model: string;
  invariants: InvariantDefinition[];
}

// ---------------------------------------------------------------------------
// Cross-Entity Invariants
// ---------------------------------------------------------------------------

export type InvariantExecutionKind = "check" | "trigger" | "deferred-trigger";

export interface CrossInvariantJoinDefinition {
  fromModel: string;
  fromField: string;
  toModel: string;
  toField: string;
}

export interface CrossInvariantDefinition {
  id: string;
  description: string;
  involvedModels: string[];
  severity: InvariantSeverity;
  condition: ConditionExpression;
  joinPaths?: CrossInvariantJoinDefinition[];
  executionKind: InvariantExecutionKind;
  dependsOn: string[];
  triggerOn: InvariantTriggerOperation[];
  tenantOverridable: boolean;
}
