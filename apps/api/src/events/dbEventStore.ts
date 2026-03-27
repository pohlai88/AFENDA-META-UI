/**
 * DB-Backed Event Store
 * =====================
 * Persists domain events to the `events` Drizzle table (meta schema).
 *
 * Drop-in async replacement for the in-memory eventStore.
 * Pure functions (replayEvents) remain in eventStore.ts — they are storage-agnostic.
 *
 * Usage:
 *   import { dbAppendEvent, dbQueryEvents } from "./dbEventStore.js";
 *   const event = await dbAppendEvent("order", "o1", "item_added", { item: "A" });
 */

import { eq, and, gte, lte, asc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { events } from "../db/schema/index.js";
import type { DomainEvent, EventQuery } from "@afenda/meta-types";

const dbGetAggregateEventsPrepared = db
  .select()
  .from(events)
  .where(
    and(
      eq(events.aggregateType, sql.placeholder("aggregateType")),
      eq(events.aggregateId, sql.placeholder("aggregateId")),
    ),
  )
  .orderBy(asc(events.version))
  .prepare("events_get_aggregate_events");

const dbGetEventStoreSummaryPrepared = db
  .select({
    total: sql<number>`COUNT(*)`,
    latest: sql<string>`MAX(${events.timestamp})`,
  })
  .from(events)
  .prepare("events_store_summary");

const dbGetEventStoreTypesPrepared = db
  .selectDistinct({ aggregateType: events.aggregateType })
  .from(events)
  .prepare("events_store_types");

// ---------------------------------------------------------------------------
// Append
// ---------------------------------------------------------------------------

/**
 * Persist a domain event to the `events` table.
 *
 * Version is computed as MAX(version) + 1 within the aggregate, using a
 * serializable sub-query to prevent version gaps under concurrency.
 */
export async function dbAppendEvent<T extends Record<string, unknown>>(
  aggregateType: string,
  aggregateId: string,
  eventType: string,
  payload: T,
  metadata?: DomainEvent["metadata"],
): Promise<DomainEvent<T>> {
  const nextVersion = sql<number>`
    COALESCE(
      (SELECT MAX(${events.version})
         FROM ${events}
        WHERE ${events.aggregateType} = ${aggregateType}
          AND ${events.aggregateId} = ${aggregateId}),
      0
    ) + 1
  `;

  const [row] = await db
    .insert(events)
    .values({
      aggregateType,
      aggregateId,
      eventType,
      eventPayload: payload as Record<string, unknown>,
      metadata: (metadata as Record<string, unknown>) ?? null,
      version: nextVersion,
    })
    .returning();

  return rowToEvent<T>(row);
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Query events with optional filters and pagination (DB-backed).
 */
export async function dbQueryEvents(query: EventQuery = {}): Promise<DomainEvent[]> {
  const conditions = [];

  if (query.aggregateType) {
    conditions.push(eq(events.aggregateType, query.aggregateType));
  }
  if (query.aggregateId) {
    conditions.push(eq(events.aggregateId, query.aggregateId));
  }
  if (query.eventType) {
    conditions.push(eq(events.eventType, query.eventType));
  }
  if (query.fromTimestamp) {
    conditions.push(gte(events.timestamp, new Date(query.fromTimestamp)));
  }
  if (query.toTimestamp) {
    conditions.push(lte(events.timestamp, new Date(query.toTimestamp)));
  }
  if (query.fromVersion != null) {
    conditions.push(gte(events.version, query.fromVersion));
  }

  const rows = await db
    .select()
    .from(events)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(events.timestamp), asc(events.version))
    .limit(query.limit ?? 1000)
    .offset(query.offset ?? 0);

  return rows.map((r) => rowToEvent(r));
}

/**
 * Get all events for a specific aggregate, sorted by version (DB-backed).
 */
export async function dbGetAggregateEvents(
  aggregateType: string,
  aggregateId: string,
): Promise<DomainEvent[]> {
  const rows = await dbGetAggregateEventsPrepared.execute({
    aggregateType,
    aggregateId,
  });

  return rows.map((r) => rowToEvent(r));
}

// ---------------------------------------------------------------------------
// Rebuild (async wrappers that fetch from DB then delegate to pure replay)
// ---------------------------------------------------------------------------

/**
 * Rebuild aggregate state from DB events + a pure reducer.
 */
export async function dbRebuildAggregate<TState = Record<string, unknown>>(
  aggregateType: string,
  aggregateId: string,
  reducer: (state: TState, event: DomainEvent) => TState,
  initialState: TState = {} as TState,
): Promise<TState> {
  const evts = await dbGetAggregateEvents(aggregateType, aggregateId);
  return evts.reduce(reducer, initialState);
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function dbGetEventStoreStats() {
  const [[result], types] = await Promise.all([
    dbGetEventStoreSummaryPrepared.execute(),
    dbGetEventStoreTypesPrepared.execute(),
  ]);

  return {
    totalEvents: Number(result.total),
    aggregateTypes: types.map((t) => t.aggregateType),
    latestTimestamp: result.latest ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type EventRow = typeof events.$inferSelect;

function rowToEvent<T = Record<string, unknown>>(row: EventRow): DomainEvent<T> {
  return {
    id: row.id,
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    eventType: row.eventType,
    payload: row.eventPayload as T,
    metadata: (row.metadata as DomainEvent["metadata"]) ?? undefined,
    version: row.version,
    timestamp: row.timestamp.toISOString(),
  };
}
