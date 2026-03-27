/**
 * @module truth-model
 * @description Normalized truth manifest contract consumed by compiler pipelines.
 * @layer truth-contract
 * @consumers db, api
 */

import type { DomainEvent } from "./events.js";
import type { EntityDef } from "./entity-def.js";

// ---------------------------------------------------------------------------
// Truth Manifest
// ---------------------------------------------------------------------------

/**
 * Compiler input manifest using ID references to keep the contract lightweight
 * and deterministic across package boundaries.
 *
 * `entityDefs` is the optional richer form used when the full compiler DSL is provided
 * (e.g. in the schema compiler stage). Lightweight consumers use IDs only.
 */
export interface TruthModel {
  /** Entity/model IDs from schema/module definitions. */
  entities: string[];
  /**
   * Optional rich entity definitions for the schema compiler stage.
   * When provided, the compiler generates DB schema from these definitions
   * instead of just validating IDs.
   */
  entityDefs?: EntityDef[];
  /** Event IDs/types from events definitions. */
  events: string[];
  /** Invariant IDs from invariant registries. */
  invariants: string[];
  /** Optional cross-entity invariant IDs for advanced compiler stages. */
  crossInvariants?: string[];
  /** Optional state machine IDs for lifecycle enforcement stages. */
  stateMachines?: string[];
  /** Relationship IDs from the business truth graph. */
  relationships: string[];
  /** Policy IDs from declarative policy definitions. */
  policies: string[];
}

// ---------------------------------------------------------------------------
// Projection Contracts (Phase 3.8.2)
// ---------------------------------------------------------------------------

/**
 * Consistency mode for a projection read model.
 * - "realtime": state is computed on demand by replaying events (pure, slower).
 * - "materialized": state is persisted in a read table and updated on each event.
 */
export type ProjectionConsistency = "realtime" | "materialized";

/**
 * Version metadata for a projection — used to detect replay incompatibility
 * and trigger rebuild when the handler contract changes.
 */
export interface ProjectionVersion {
  /** Monotonically incrementing version number. Increment when handler logic changes. */
  version: number;
  /**
   * Deterministic hash of the projection handler contract.
   * Computed from event types consumed and state shape. Used to detect replay drift.
   */
  schemaHash: string;
}

/**
 * Declarative projection contract. Projections must be:
 * - Replay-deterministic: same events always produce same state.
 * - Side-effect free: no I/O or mutations in the handler.
 *
 * Handler must be a pure function: (current state, event) => next state.
 */
export interface ProjectionDefinition<TState = Record<string, unknown>> {
  /** Projection identifier — maps to the read model name. */
  name: string;
  /** Source entity model identifier. Must match an entity in TruthModel. */
  source: string;
  /** How the projection state is maintained. */
  consistency: ProjectionConsistency;
  /** Version metadata for replay compatibility tracking. */
  version: ProjectionVersion;
  /**
   * Pure reducer: given current state and a domain event, returns next state.
   * Must be deterministic and side-effect free.
   */
  handler: (state: TState, event: DomainEvent) => TState;
}
