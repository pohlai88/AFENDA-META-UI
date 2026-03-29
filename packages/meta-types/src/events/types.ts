/**
 * @module events
 * @description Domain event and reducer contracts for event-sourced truth flows.
 * @layer truth-contract
 * @consumers api, web, db
 */

// ---------------------------------------------------------------------------
// Domain Event
// ---------------------------------------------------------------------------

export interface DomainEvent<TPayload = Record<string, unknown>> {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: TPayload;
  metadata?: EventMetadata;
  version: number;
  timestamp: string;
}

export interface EventMetadata {
  actor?: string;
  correlationId?: string;
  source?: string;
  [key: string]: unknown;
}

/**
 * Bridge between domain events and state-machine transition events.
 * Keeps causality (event) and lifecycle transitions explicitly linked.
 */
export interface EventTransitionBinding {
  eventType: string;
  model: string;
  transitionEvent: string;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export type EventReducer<TState = Record<string, unknown>> = (
  state: TState,
  event: DomainEvent
) => TState;

// ---------------------------------------------------------------------------
// Event Store Interface
// ---------------------------------------------------------------------------

export interface EventQuery {
  aggregateType?: string;
  aggregateId?: string;
  eventType?: string;
  fromTimestamp?: string;
  toTimestamp?: string;
  fromVersion?: number;
  limit?: number;
  offset?: number;
}

export interface EventStoreStats {
  totalEvents: number;
  aggregateTypes: string[];
  latestTimestamp?: string;
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

export interface AggregateSnapshot<TState = Record<string, unknown>> {
  aggregateType: string;
  aggregateId: string;
  state: TState;
  version: number;
  timestamp: string;
}
