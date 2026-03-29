/**
 * Event Store — In-Memory Implementation
 * ========================================
 * Append-only event store with query, replay, and snapshot support.
 *
 * Core principle: State = Replay(Events)
 *
 * For production DB-backed persistence, use `dbEventStore.ts` which writes
 * to the `events` Drizzle table. The pure functions (replayEvents, etc.)
 * are shared by both implementations.
 */

import type { DomainEvent, EventQuery, EventReducer, EventStoreStats, AggregateSnapshot } from "@afenda/meta-types/events";
// ---------------------------------------------------------------------------
// In-Memory Store
// ---------------------------------------------------------------------------

let eventLog: DomainEvent[] = [];
let idCounter = 0;

function generateEventId(): string {
  idCounter += 1;
  return `evt_${Date.now()}_${idCounter}`;
}

// ---------------------------------------------------------------------------
// Append
// ---------------------------------------------------------------------------

/**
 * Append a new domain event. The store assigns ID, version, and timestamp.
 */
export function appendEvent<T extends Record<string, unknown>>(
  aggregateType: string,
  aggregateId: string,
  eventType: string,
  payload: T,
  metadata?: DomainEvent["metadata"]
): DomainEvent<T> {
  // Compute next version for this aggregate
  const currentVersion = eventLog.filter(
    (e) => e.aggregateType === aggregateType && e.aggregateId === aggregateId
  ).length;

  const event: DomainEvent<T> = {
    id: generateEventId(),
    aggregateType,
    aggregateId,
    eventType,
    payload,
    metadata,
    version: currentVersion + 1,
    timestamp: new Date().toISOString(),
  };

  eventLog.push(event as DomainEvent);
  return event;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Query events with optional filters and pagination.
 */
export function queryEvents(query: EventQuery = {}): DomainEvent[] {
  let results = eventLog;

  if (query.aggregateType) {
    results = results.filter((e) => e.aggregateType === query.aggregateType);
  }
  if (query.aggregateId) {
    results = results.filter((e) => e.aggregateId === query.aggregateId);
  }
  if (query.eventType) {
    results = results.filter((e) => e.eventType === query.eventType);
  }
  if (query.fromTimestamp) {
    results = results.filter((e) => e.timestamp >= query.fromTimestamp!);
  }
  if (query.toTimestamp) {
    results = results.filter((e) => e.timestamp <= query.toTimestamp!);
  }
  if (query.fromVersion != null) {
    results = results.filter((e) => e.version >= query.fromVersion!);
  }

  // Sort by timestamp then version
  results = results.sort((a, b) => {
    const timeDiff = a.timestamp.localeCompare(b.timestamp);
    return timeDiff !== 0 ? timeDiff : a.version - b.version;
  });

  if (query.offset) {
    results = results.slice(query.offset);
  }
  if (query.limit) {
    results = results.slice(0, query.limit);
  }

  return results;
}

/**
 * Get all events for a specific aggregate, sorted by version.
 */
export function getAggregateEvents(aggregateType: string, aggregateId: string): DomainEvent[] {
  return eventLog
    .filter((e) => e.aggregateType === aggregateType && e.aggregateId === aggregateId)
    .sort((a, b) => a.version - b.version);
}

// ---------------------------------------------------------------------------
// Replay — rebuild state from events
// ---------------------------------------------------------------------------

/**
 * Replay events through a reducer to rebuild entity state.
 *
 * @param events - Events to replay (must be sorted by version)
 * @param reducer - Pure function (state, event) → state
 * @param initialState - Starting state (default: empty object)
 */
export function replayEvents<TState = Record<string, unknown>>(
  events: DomainEvent[],
  reducer: EventReducer<TState>,
  initialState: TState = {} as TState
): TState {
  return events.reduce(reducer, initialState);
}

/**
 * Rebuild the current state of an aggregate by replaying all its events.
 */
export function rebuildAggregate<TState = Record<string, unknown>>(
  aggregateType: string,
  aggregateId: string,
  reducer: EventReducer<TState>,
  initialState: TState = {} as TState
): TState {
  const events = getAggregateEvents(aggregateType, aggregateId);
  return replayEvents(events, reducer, initialState);
}

// ---------------------------------------------------------------------------
// Snapshots (optimization for long event streams)
// ---------------------------------------------------------------------------

const snapshotStore = new Map<string, AggregateSnapshot>();

function snapshotKey(aggregateType: string, aggregateId: string): string {
  return `${aggregateType}:${aggregateId}`;
}

/**
 * Save a snapshot of the current aggregate state.
 */
export function saveSnapshot<TState = Record<string, unknown>>(
  aggregateType: string,
  aggregateId: string,
  state: TState,
  version: number
): void {
  snapshotStore.set(snapshotKey(aggregateType, aggregateId), {
    aggregateType,
    aggregateId,
    state: state as Record<string, unknown>,
    version,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Load a snapshot for an aggregate.
 */
export function getSnapshot(
  aggregateType: string,
  aggregateId: string
): AggregateSnapshot | undefined {
  return snapshotStore.get(snapshotKey(aggregateType, aggregateId));
}

/**
 * Rebuild from snapshot + delta events (optimized replay).
 */
export function rebuildFromSnapshot<TState = Record<string, unknown>>(
  aggregateType: string,
  aggregateId: string,
  reducer: EventReducer<TState>,
  initialState: TState = {} as TState
): TState {
  const snapshot = getSnapshot(aggregateType, aggregateId);

  if (snapshot) {
    // Get only events after the snapshot version
    const deltaEvents = getAggregateEvents(aggregateType, aggregateId).filter(
      (e) => e.version > snapshot.version
    );
    return replayEvents(deltaEvents, reducer, snapshot.state as TState);
  }

  // No snapshot — full replay
  return rebuildAggregate(aggregateType, aggregateId, reducer, initialState);
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function getEventStoreStats(): EventStoreStats {
  const types = new Set(eventLog.map((e) => e.aggregateType));
  const latest = eventLog.length > 0 ? eventLog[eventLog.length - 1].timestamp : undefined;

  return {
    totalEvents: eventLog.length,
    aggregateTypes: Array.from(types),
    latestTimestamp: latest,
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function clearEventStore(): void {
  eventLog = [];
  snapshotStore.clear();
  idCounter = 0;
}
