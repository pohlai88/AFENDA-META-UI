/**
 * @module invariants
 * @description Declarative invariant contracts for entity and cross-entity truth rules.
 * @layer truth-contract
 * @consumers api, db
 */

import type { ConditionExpression } from "./schema.js";

// ---------------------------------------------------------------------------
// Invariant Definition
// ---------------------------------------------------------------------------

/** Scope determines where and how enforcement should occur. */
export type InvariantScope = "entity" | "aggregate" | "cross-aggregate" | "global";

/** Severity determines whether violations block writes or are advisory only. */
export type InvariantSeverity = "fatal" | "error" | "warning";

/** Operations that trigger invariant evaluation. */
export type InvariantTriggerOperation = "create" | "update" | "delete" | "transition";

/** Declarative invariant definition consumed by enforcement/compiler layers. */
export interface InvariantDefinition {
  /** Unique identifier, e.g. "sales.consignment.balance_non_negative" */
  id: string;
  /** Human-readable explanation used for diagnostics and audit traces. */
  description: string;
  /** Target entity/aggregate model identifier. */
  targetModel: string;
  /** Scope determines enforcement strategy. */
  scope: InvariantScope;
  /** Severity determines failure handling behavior. */
  severity: InvariantSeverity;
  /** Declarative condition in Truth DSL form. */
  condition: ConditionExpression;
  /** Which operations must trigger this invariant check. */
  triggerOn: InvariantTriggerOperation[];
  /** Optional grouping key for related invariants. */
  group?: string;
  /** Whether tenant-level overrides are permitted. */
  tenantOverridable: boolean;
}

// ---------------------------------------------------------------------------
// Evaluation Result Contracts
// ---------------------------------------------------------------------------

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
// Cross-Entity Invariants (Phase 3.7)
// ---------------------------------------------------------------------------

/** Explicit execution mode for cross-entity invariant enforcement. */
export type InvariantExecutionKind = "check" | "trigger" | "deferred-trigger";

/** Explicit join edge used to compile deterministic cross-entity trigger checks. */
export interface CrossInvariantJoinDefinition {
  /** Source model in the join edge. */
  fromModel: string;
  /** Source model field participating in the equality join. */
  fromField: string;
  /** Target model in the join edge. */
  toModel: string;
  /** Target model field participating in the equality join. */
  toField: string;
}

/**
 * Cross-entity invariant definition for rules that span joins/aggregates.
 *
 * This must be declared explicitly rather than inferred from expression text,
 * so compiler behavior remains deterministic and reviewable.
 */
export interface CrossInvariantDefinition {
  /** Unique identifier, e.g. "sales.cross.order_lines_must_match_order_total" */
  id: string;
  /** Human-readable explanation used in diagnostics. */
  description: string;
  /** All model identifiers involved in this invariant. */
  involvedModels: string[];
  /** Severity determines failure behavior. */
  severity: InvariantSeverity;
  /** Declarative condition for enforcement layers to compile. */
  condition: ConditionExpression;
  /** Explicit join edges used for deterministic multi-model trigger compilation. */
  joinPaths?: CrossInvariantJoinDefinition[];
  /** How this invariant must execute (never inferred by heuristics). */
  executionKind: InvariantExecutionKind;
  /**
   * Explicit dependency IDs that must run before this invariant.
   * IDs may reference regular or cross invariants.
   */
  dependsOn: string[];
  /** Which operations trigger this invariant check. */
  triggerOn: InvariantTriggerOperation[];
  /** Whether tenant-level overrides are permitted. */
  tenantOverridable: boolean;
}
