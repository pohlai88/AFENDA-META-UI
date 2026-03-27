/**
 * @module truth-compiler/types
 * @description Shared internal types for the Truth Compiler pipeline.
 * @layer db/truth-compiler
 */

import type {
  CrossInvariantDefinition,
  EntityDef,
  InvariantDefinition,
  MutationPolicyDefinition,
  StateMachineDefinition,
} from "@afenda/meta-types";

/** Fully resolved pipeline input produced by the normalizer. */
export interface NormalizedTruthModel {
  entities: EntityDef[];
  invariants: InvariantDefinition[];
  crossInvariants: CrossInvariantDefinition[];
  mutationPolicies: MutationPolicyDefinition[];
  stateMachines: StateMachineDefinition[];
  events: string[];
  /** Optional DB schema prefix for generated function/trigger/constraint names. */
  namespace?: string;
}

/** SQL kind — controls output ordering in the emitter. */
export type SqlSegmentKind = "comment" | "check" | "function" | "trigger";

/** A single discrete SQL output unit from a compiler stage. */
export interface SqlSegment {
  /** Entity model identifier — used for deterministic stable sort in emitter. */
  model: string;
  /** Kind controls output order: comment → check → function → trigger. */
  kind: SqlSegmentKind;
  /** Optional dependency-graph node identifier used for topological ordering. */
  nodeId?: string;
  /** Optional precomputed ordering index from dependency graph assembly. */
  orderIndex?: number;
  /** Generated SQL text. Must be self-contained and idempotent. */
  sql: string;
}
