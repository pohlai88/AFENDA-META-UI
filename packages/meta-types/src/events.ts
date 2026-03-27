/**
 * @module events
 * @description Domain event and reducer contracts for event-sourced truth flows.
 * @layer truth-contract
 * @consumers api, web, db
 */

/**
 * Event-Sourcing Types
 * ====================
 * Every business event is stored as truth. State = Replay(Events).
 *
 * Events are immutable, append-only records of what happened.
 * Reducers rebuild entity state by replaying events in order.
 */

// ---------------------------------------------------------------------------
// Domain Event
// ---------------------------------------------------------------------------

export interface DomainEvent<TPayload = Record<string, unknown>> {
  /** Unique event ID */
  id: string;
  /** What entity type this event belongs to (e.g. "invoice", "employee") */
  aggregateType: string;
  /** The specific entity instance ID */
  aggregateId: string;
  /** Event type name (e.g. "invoice_posted", "salary_updated") */
  eventType: string;
  /** Event-specific data payload */
  payload: TPayload;
  /** Extra metadata (actor, source IP, correlation ID, etc.) */
  metadata?: EventMetadata;
  /** Monotonically increasing version per aggregate */
  version: number;
  /** ISO 8601 timestamp of when event occurred */
  timestamp: string;
}

export interface EventMetadata {
  /** Who triggered the event */
  actor?: string;
  /** Correlation ID for tracing across services */
  correlationId?: string;
  /** Source system or module */
  source?: string;
  /** Arbitrary extra context */
  [key: string]: unknown;
}

/**
 * Bridge between domain events and state-machine transition events.
 * This keeps causality (event) and lifecycle transitions explicitly linked.
 */
export interface EventTransitionBinding {
  /** Domain event type, e.g. "consignment.closed" */
  eventType: string;
  /** State machine model identifier */
  model: string;
  /** Transition event key in the target state machine */
  transitionEvent: string;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

/**
 * A reducer takes current state and an event, returns new state.
 * Pure function — no side effects.
 */
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
// Snapshot (optimization for large event streams)
// ---------------------------------------------------------------------------

export interface AggregateSnapshot<TState = Record<string, unknown>> {
  aggregateType: string;
  aggregateId: string;
  state: TState;
  version: number;
  timestamp: string;
}
