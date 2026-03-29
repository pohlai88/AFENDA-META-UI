/**
 * Projection Assertions
 * =====================
 * Verify that projections match expected state after events.
 *
 * **Design Philosophy:**
 * Projections are derived truth. Tests verify derivation correctness.
 */

import type { TestDB, TruthContext } from "../types/test-harness.js";
import type { DomainEvent } from "@afenda/meta-types/events";
import { replayEventsForProjection } from "../execute/replay-events.js";

/**
 * Assert that a projection matches expected state.
 *
 * **Use Case:** Verify read models are correctly updated by events.
 *
 * @param db - Test database instance
 * @param projection - Projection name
 * @param entityId - Entity ID in projection
 * @param expect - Expected projection data
 *
 * @example
 * ```typescript
 * await assertProjection({
 *   db: harness.db,
 *   projection: "sales_order_summary",
 *   entityId: "SO-12345",
 *   expect: { lineCount: 3, total: 1500 }
 * });
 * ```
 */
export async function assertProjection<T extends Record<string, unknown>>({
  db,
  projection,
  entityId,
  expect,
}: {
  db: TestDB;
  projection: string;
  entityId: string;
  expect: Partial<T>;
}): Promise<void> {
  // TODO: Phase 2 - Implement projection schema resolution
  // For now, assume projection name = table name
  const table = projection;

  const row = await db.findOne<T>(table, { id: entityId } as unknown as Partial<T>);

  if (!row) {
    throw new ProjectionAssertionError(
      `No projection "${projection}" found for entity ID: ${entityId}`
    );
  }

  // Check each expected field
  for (const key in expect) {
    const expected = expect[key];
    const actual = row[key];

    if (actual !== expected) {
      throw new ProjectionAssertionError(
        `Projection mismatch in "${projection}.${key}": ` +
          `expected ${JSON.stringify(expected)}, ` +
          `got ${JSON.stringify(actual)}`
      );
    }
  }
}

/**
 * Assert that a projection can be rebuilt from events.
 *
 * **Event Sourcing Guarantee:** Projection state = replay(events).
 *
 * @param db - Test database instance
 * @param projection - Projection name
 * @param events - Domain events to replay
 * @param expect - Expected projection data after replay
 *
 * @example
 * ```typescript
 * await assertProjectionReplay({
 *   db: harness.db,
 *   projection: "commission_summary",
 *   events: harness.events,
 *   expect: { totalCommissions: 450, commissionCount: 3 }
 * });
 * ```
 */
/**
 * Assert that a projection can be rebuilt from events.
 *
 * **Event Sourcing Guarantee:** Projection state = replay(events).
 *
 * Requires `context.projectionHandlers` to contain a handler for the given projection.
 * The handler is responsible for rebuilding the projection state from each event.
 *
 * @param db - Test database instance
 * @param projection - Projection name (must match a projectionHandlers key in context)
 * @param events - All domain events (filtered to projection automatically)
 * @param expect - Expected projection data after replay
 * @param context - Truth execution context with projectionHandlers wired
 *
 * @example
 * ```typescript
 * await assertProjectionReplay({
 *   db: harness.db,
 *   projection: "commission_summary",
 *   events: harness.events,
 *   expect: { totalCommissions: 450, commissionCount: 3 },
 *   context: harness.context,
 * });
 * ```
 */
export async function assertProjectionReplay<T extends Record<string, unknown>>({
  db,
  projection,
  events,
  expect,
  context,
}: {
  db: TestDB;
  projection: string;
  events: DomainEvent[];
  expect: Partial<T>;
  context: TruthContext;
}): Promise<void> {
  // Filter events relevant to this projection.
  const projectionEvents = events.filter((e) => e.aggregateType === projection);
  if (projectionEvents.length === 0) {
    throw new ProjectionAssertionError(
      `No events found for projection "${projection}" — cannot verify replay. ` +
        `Ensure mutations have been executed before calling assertProjectionReplay.`
    );
  }

  // Replay events to rebuild the projection from scratch.
  // replayEventsForProjection clears the table and replays in timestamp order.
  await replayEventsForProjection(projectionEvents, projection, context);

  // Derive entity ID from the most recent event.
  const sortedEvents = [...projectionEvents].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const entityId = sortedEvents[0]!.aggregateId;

  // Assert projection state matches expectations.
  await assertProjection({ db, projection, entityId, expect });
}

/**
 * Custom error for projection assertion failures.
 */
export class ProjectionAssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectionAssertionError";
  }
}
