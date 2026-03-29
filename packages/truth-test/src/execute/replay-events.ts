/**
 * Event Replay Engine
 * ===================
 * Replays domain events to rebuild projections.
 *
 * **Critical for Event Sourcing:**
 * Verifies that projections can be rebuilt from events alone.
 */

import type { DomainEvent } from "@afenda/meta-types/events";
import type { TruthContext } from "../types/test-harness.js";

/**
 * Replay events to rebuild projections.
 *
 * **Use Case:**
 * 1. Execute mutations (events collected)
 * 2. Clear projection tables
 * 3. Replay events to rebuild projections
 * 4. Assert projections match expected state
 *
 * **Integration Modes:**
 * - With projectionHandlers: Real event sourcing with projection rebuilding
 * - Without: Events already applied via mutations (Phase 2 behavior)
 *
 * @param events - Domain events to replay
 * @param context - Truth execution context
 */
export async function replayEvents(events: DomainEvent[], context: TruthContext): Promise<void> {
  try {
    // Sort events by timestamp to ensure correct replay order
    const sortedEvents = [...events].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    // ===================================================================
    // PATH 1: Real Projection Handlers (full event sourcing)
    // ===================================================================
    if (context.projectionHandlers && context.projectionHandlers.size > 0) {
      for (const event of sortedEvents) {
        const handler = context.projectionHandlers.get(event.aggregateType);

        if (handler) {
          // Load current projection state
          const tableName = event.aggregateType.replace(/([A-Z])/g, "_$1").toLowerCase();

          const currentState = await context.db.findOne(tableName, {
            id: event.aggregateId,
          } as any);

          // Apply projection handler
          const nextState = await handler(event, (currentState as Record<string, unknown>) ?? null);

          // Persist updated projection
          if (nextState) {
            if (currentState) {
              const { id: _, ...updateData } = nextState as any;
              await context.db.update(tableName, { id: event.aggregateId } as any, updateData);
            } else {
              await context.db.insert(tableName, nextState);
            }
          }
        }
      }

      console.log(
        `replayEvents: Replayed ${sortedEvents.length} events using projection handlers. ` +
          `Handlers available: ${Array.from(context.projectionHandlers.keys()).join(", ")}`
      );

      return;
    }

    // ===================================================================
    // PATH 2: No projection handlers — configuration error.
    // ===================================================================
    // If you are calling replayEvents, you expect projections to be rebuilt.
    // Either supply context.projectionHandlers or use executeMutation directly.
    throw new Error(
      `replayEvents called without projectionHandlers. ` +
        `Provide context.projectionHandlers for event sourcing replay, ` +
        `or use executeMutation and skip replay if projections are already applied.
`
    );
  } catch (error: any) {
    throw new Error(`Event replay failed: ${error.message}`);
  }
}

/**
 * Replay events for a specific projection.
 *
 * **Optimization:** Only rebuild one projection instead of all.
 * **Integration Modes:**
 * - With projectionHandlers: Real event sourcing with single projection rebuild
 * - Without: Stub implementation (Phase 2 behavior)
 */
export async function replayEventsForProjection(
  events: DomainEvent[],
  projectionName: string,
  context: TruthContext
): Promise<void> {
  try {
    // Filter events relevant to this projection
    const relevantEvents = events.filter((event) => event.aggregateType === projectionName);

    // Sort events by timestamp
    const sortedEvents = [...relevantEvents].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    // ===================================================================
    // PATH 1: Real Projection Handler (full event sourcing)
    // ===================================================================
    if (!context.projectionHandlers) {
      throw new Error(
        `replayEventsForProjection called without projectionHandlers. ` +
          `Provide context.projectionHandlers to replay projection "${projectionName}".`
      );
    }

    const handler = context.projectionHandlers.get(projectionName);

    if (handler) {
      // Clear projection table first
      const tableName = projectionName.replace(/([A-Z])/g, "_$1").toLowerCase();
      await context.db.sql(`TRUNCATE TABLE ${tableName} CASCADE`);

      // Replay events
      for (const event of sortedEvents) {
        const currentState = await context.db.findOne(tableName, {
          id: event.aggregateId,
        } as any);

        const nextState = await handler(event, (currentState as Record<string, unknown>) ?? null);

        if (nextState) {
          if (currentState) {
            const { id: _, ...updateData } = nextState as any;
            await context.db.update(tableName, { id: event.aggregateId } as any, updateData);
          } else {
            await context.db.insert(tableName, nextState);
          }
        }
      }

      console.log(
        `replayEventsForProjection: Rebuilt "${projectionName}" from ${sortedEvents.length} events.`
      );

      return;
    }

    // No handler for this specific projection — log and continue.
    // This is not an error: handlers may cover only a subset of projection types.
    console.warn(
      `replayEventsForProjection: No handler registered for "${projectionName}" — skipping replay.`
    );
  } catch (error: any) {
    throw new Error(`Projection replay failed for "${projectionName}": ${error.message}`);
  }
}
