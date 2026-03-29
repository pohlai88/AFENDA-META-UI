/**
 * @module compiler/truth-model
 * @description Normalized truth manifest contract consumed by compiler pipelines.
 * @layer truth-contract
 * @consumers db, api
 */

import type { DomainEvent } from "../events/types.js";
import type { EntityDef } from "./entity-def.js";

// ---------------------------------------------------------------------------
// Truth Manifest
// ---------------------------------------------------------------------------

export interface TruthModel {
  entities: string[];
  entityDefs?: EntityDef[];
  events: string[];
  invariants: string[];
  crossInvariants?: string[];
  stateMachines?: string[];
  relationships: string[];
  policies: string[];
  mutationPolicies?: MutationPolicyDefinition[];
}

// ---------------------------------------------------------------------------
// Event-Sourcing Mutation Policy Contracts
// ---------------------------------------------------------------------------

export type MutationPolicy = "direct" | "dual-write" | "event-only";

export type MutationOperation = "create" | "update" | "delete";

export interface MutationPolicyDefinition {
  id: string;
  mutationPolicy: MutationPolicy;
  appliesTo: string[];
  requiredEvents?: string[];
  directMutationOperations?: MutationOperation[];
  description?: string;
  targetMode?: MutationPolicy;
}

// ---------------------------------------------------------------------------
// Projection Contracts
// ---------------------------------------------------------------------------

export type ProjectionConsistency = "realtime" | "materialized";

export interface ProjectionVersion {
  version: number;
  schemaHash: string;
}

export interface ProjectionDefinition<TState = Record<string, unknown>> {
  name: string;
  source: string;
  consistency: ProjectionConsistency;
  version: ProjectionVersion;
  handler: (state: TState, event: DomainEvent) => TState;
}
