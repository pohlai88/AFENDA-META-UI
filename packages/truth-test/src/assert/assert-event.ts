/**
 * Event Assertions
 * ================
 * Verify that expected domain events were emitted.
 *
 * **Design Philosophy:**
 * Events are the truth log. Tests verify the correct events occurred.
 */

import type { DomainEvent } from "@afenda/meta-types/events";

/**
 * Assert that an event of a specific type was emitted.
 *
 * @param events - Collected domain events
 * @param type - Expected event type
 * @param predicate - Optional predicate to match specific event
 *
 * @example
 * ```typescript
 * assertEvent(harness.events, "salesOrder.created");
 *
 * assertEvent(
 *   harness.events,
 *   "commission.calculated",
 *   (e) => e.payload.total > 0
 * );
 * ```
 */
export function assertEvent(
  events: DomainEvent[],
  type: string,
  predicate?: (event: DomainEvent) => boolean
): DomainEvent {
  const match = events.find(
    (e) => e.eventType === type && (!predicate || predicate(e))
  );

  if (!match) {
    const available = events.map((e) => e.eventType).join(", ");
    throw new EventAssertionError(
      `Expected event "${type}" not found. ` +
        `Available events: ${available || "none"}`
    );
  }

  return match;
}

/**
 * Assert that multiple events were emitted in order.
 *
 * @param events - Collected domain events
 * @param types - Expected event types in order
 *
 * @example
 * ```typescript
 * assertEventSequence(harness.events, [
 *   "salesOrder.created",
 *   "commission.calculated",
 *   "salesOrder.updated"
 * ]);
 * ```
 */
export function assertEventSequence(
  events: DomainEvent[],
  types: string[]
): void {
  const eventTypes = events.map((e) => e.eventType);

  let lastIndex = -1;
  for (const expectedType of types) {
    const index = eventTypes.indexOf(expectedType, lastIndex + 1);

    if (index === -1) {
      throw new EventAssertionError(
        `Expected event sequence violated. ` +
          `Missing or out-of-order event: "${expectedType}". ` +
          `Actual sequence: ${eventTypes.join(" → ")}`
      );
    }

    lastIndex = index;
  }
}

/**
 * Assert that no events of a specific type were emitted.
 *
 * @param events - Collected domain events
 * @param type - Event type that should not exist
 *
 * @example
 * ```typescript
 * assertNoEvent(harness.events, "invariant.violated");
 * ```
 */
export function assertNoEvent(
  events: DomainEvent[],
  type: string
): void {
  const match = events.find((e) => e.eventType === type);

  if (match) {
    throw new EventAssertionError(
      `Expected no event of type "${type}", but found one: ` +
        JSON.stringify(match, null, 2)
    );
  }
}

/**
 * Assert event count.
 *
 * @param events - Collected domain events
 * @param type - Event type to count (optional, counts all if omitted)
 * @param count - Expected count
 *
 * @example
 * ```typescript
 * assertEventCount(harness.events, "salesOrder.lineAdded", 3);
 * assertEventCount(harness.events, undefined, 5); // Total count
 * ```
 */
export function assertEventCount(
  events: DomainEvent[],
  type: string | undefined,
  count: number
): void {
  const filtered = type
    ? events.filter((e) => e.eventType === type)
    : events;

  if (filtered.length !== count) {
    throw new EventAssertionError(
      `Expected ${count} event(s)${type ? ` of type "${type}"` : ""}, ` +
        `but found ${filtered.length}`
    );
  }
}

/**
 * Custom error for event assertion failures.
 */
export class EventAssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventAssertionError";
  }
}
