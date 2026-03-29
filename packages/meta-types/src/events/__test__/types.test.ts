/**
 * Event system contract tests.
 *
 * Design intent: event payload envelopes and query shapes must stay stable because
 * replay, projection, and integration flows depend on them.
 */
import { describe, expect, it } from "vitest";

import type {
  AggregateSnapshot,
  DomainEvent,
  EventMetadata,
  EventQuery,
  EventReducer,
  EventStoreStats,
  EventTransitionBinding,
} from "../types.js";

describe("EventMetadata — structural contract", () => {
  it("accepts standard metadata fields", () => {
    const metadata: EventMetadata = {
      actor: "user-001",
      correlationId: "corr-123",
      source: "workflow-engine",
      traceId: "trace-abc",
    };
    expect(metadata.actor).toBe("user-001");
    expect(metadata.correlationId).toBe("corr-123");
    expect(metadata.traceId).toBe("trace-abc");
  });
});

describe("DomainEvent — structural contract", () => {
  it("accepts a flat domain event envelope", () => {
    const event: DomainEvent<{ status: string }> = {
      id: "evt-001",
      aggregateType: "Order",
      aggregateId: "ord-001",
      eventType: "order.submitted",
      payload: { status: "submitted" },
      metadata: {
        actor: "user-001",
        correlationId: "corr-001",
      },
      version: 3,
      timestamp: "2026-01-15T09:00:00Z",
    };
    expect(event.aggregateType).toBe("Order");
    expect(event.eventType).toBe("order.submitted");
    expect(event.payload.status).toBe("submitted");
    expect(event.version).toBe(3);
  });

  it("allows metadata to be omitted", () => {
    const event: DomainEvent<{ approved: boolean }> = {
      id: "evt-002",
      aggregateType: "Invoice",
      aggregateId: "inv-001",
      eventType: "invoice.approved",
      payload: { approved: true },
      version: 1,
      timestamp: "2026-01-16T10:00:00Z",
    };
    expect(event.metadata).toBeUndefined();
  });
});

describe("EventReducer — structural contract", () => {
  it("uses a single state generic and accepts DomainEvent", () => {
    const reducer: EventReducer<{ count: number }> = (state, event) => {
      if (event.eventType === "counter.incremented") {
        return { count: state.count + 1 };
      }
      return state;
    };

    const nextState = reducer(
      { count: 1 },
      {
        id: "evt-003",
        aggregateType: "Counter",
        aggregateId: "ctr-001",
        eventType: "counter.incremented",
        payload: {},
        version: 2,
        timestamp: "2026-01-16T10:05:00Z",
      }
    );

    expect(nextState.count).toBe(2);
  });
});

describe("AggregateSnapshot — structural contract", () => {
  it("captures aggregate state with timestamp", () => {
    const snapshot: AggregateSnapshot<{ total: number }> = {
      aggregateType: "Order",
      aggregateId: "ord-001",
      state: { total: 250 },
      version: 6,
      timestamp: "2026-01-16T11:00:00Z",
    };
    expect(snapshot.aggregateType).toBe("Order");
    expect(snapshot.state.total).toBe(250);
    expect(snapshot.timestamp).toBe("2026-01-16T11:00:00Z");
  });
});

describe("EventStoreStats — structural contract", () => {
  it("tracks total events and aggregate type coverage", () => {
    const stats: EventStoreStats = {
      totalEvents: 1500,
      aggregateTypes: ["Order", "Invoice", "Shipment"],
      latestTimestamp: "2026-01-16T12:00:00Z",
    };
    expect(stats.totalEvents).toBe(1500);
    expect(stats.aggregateTypes).toContain("Invoice");
    expect(stats.latestTimestamp).toBeDefined();
  });
});

describe("EventTransitionBinding — structural contract", () => {
  it("binds an event type to a model transition event", () => {
    const binding: EventTransitionBinding = {
      eventType: "invoice.approved",
      model: "Invoice",
      transitionEvent: "approve",
    };
    expect(binding.eventType).toBe("invoice.approved");
    expect(binding.model).toBe("Invoice");
    expect(binding.transitionEvent).toBe("approve");
  });
});

describe("EventQuery — structural contract", () => {
  it("supports filtering by aggregate, event type, timestamp, version, and paging", () => {
    const query: EventQuery = {
      aggregateType: "Order",
      aggregateId: "ord-001",
      eventType: "order.submitted",
      fromTimestamp: "2026-01-01T00:00:00Z",
      toTimestamp: "2026-01-31T23:59:59Z",
      fromVersion: 10,
      limit: 100,
      offset: 200,
    };
    expect(query.aggregateType).toBe("Order");
    expect(query.fromVersion).toBe(10);
    expect(query.limit).toBe(100);
  });

  it("allows an empty query object", () => {
    const query: EventQuery = {};
    expect(Object.keys(query)).toHaveLength(0);
  });
});
