import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DomainEvent } from "@afenda/meta-types/events";
import type { ProjectionHandler, TruthContext } from "../types/test-harness.js";
import { replayEvents, replayEventsForProjection } from "../execute/replay-events.js";

function makeContext(): TruthContext {
  return {
    db: {
      findOne: vi.fn(),
      find: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      sql: vi.fn(),
      reset: vi.fn(),
      getEvents: vi.fn().mockReturnValue([]),
    },
    emit: vi.fn(),
    clock: () => new Date("2026-03-28T00:00:00.000Z"),
    tenantId: "tenant-1",
    userId: 42,
  };
}

function event(
  aggregateType: string,
  aggregateId: string,
  timestamp: string,
  eventType = "updated"
): DomainEvent {
  return {
    id: `${aggregateType}-${aggregateId}-${timestamp}`,
    aggregateType,
    aggregateId,
    eventType,
    payload: {},
    metadata: { actor: "42", source: "test" },
    timestamp,
    version: 1,
  };
}

describe("replay-events", () => {
  let context: TruthContext;

  beforeEach(() => {
    context = makeContext();
  });

  it("throws when no projection handlers are configured", async () => {
    const events: DomainEvent[] = [event("salesOrder", "1", "2026-03-28T00:00:01.000Z")];

    await expect(replayEvents(events, context)).rejects.toThrow(
      "replayEvents called without projectionHandlers"
    );
    expect(context.db.findOne).not.toHaveBeenCalled();
    expect(context.db.insert).not.toHaveBeenCalled();
    expect(context.db.update).not.toHaveBeenCalled();
  });

  it("replays sorted events through projection handlers", async () => {
    const handler: ProjectionHandler = vi
      .fn()
      .mockResolvedValueOnce({ id: 1, status: "created" })
      .mockResolvedValueOnce({ id: 1, status: "updated" });

    context.projectionHandlers = new Map([["salesOrder", handler]]);
    vi.mocked(context.db.findOne)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({ id: 1, status: "created" } as never);

    const events: DomainEvent[] = [
      event("salesOrder", "1", "2026-03-28T00:00:02.000Z", "updated"),
      event("salesOrder", "1", "2026-03-28T00:00:01.000Z", "created"),
    ];

    await replayEvents(events, context);

    expect(context.db.findOne).toHaveBeenNthCalledWith(1, "sales_order", { id: "1" });
    expect(context.db.findOne).toHaveBeenNthCalledWith(2, "sales_order", { id: "1" });
    expect(context.db.insert).toHaveBeenCalledWith("sales_order", { id: 1, status: "created" });
    expect(context.db.update).toHaveBeenCalledWith(
      "sales_order",
      { id: "1" },
      { status: "updated" }
    );
  });

  it("wraps replay errors with event replay context", async () => {
    const handler: ProjectionHandler = vi.fn().mockRejectedValue(new Error("handler failed"));
    context.projectionHandlers = new Map([["salesOrder", handler]]);
    vi.mocked(context.db.findOne).mockResolvedValue(null as never);

    await expect(
      replayEvents([event("salesOrder", "1", "2026-03-28T00:00:00.000Z")], context)
    ).rejects.toThrow("Event replay failed: handler failed");
  });

  it("replays events for a single projection and truncates table first", async () => {
    const projectionHandler: ProjectionHandler = vi
      .fn()
      .mockResolvedValueOnce({ id: 2, state: "v1" })
      .mockResolvedValueOnce({ id: 2, state: "v2" });

    context.projectionHandlers = new Map([["salesOrder", projectionHandler]]);
    vi.mocked(context.db.findOne)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({ id: 2, state: "v1" } as never);

    const events: DomainEvent[] = [
      event("salesOrder", "2", "2026-03-28T00:00:01.000Z"),
      event("commission", "3", "2026-03-28T00:00:02.000Z"),
      event("salesOrder", "2", "2026-03-28T00:00:03.000Z"),
    ];

    await replayEventsForProjection(events, "salesOrder", context);

    expect(context.db.sql).toHaveBeenCalledWith("TRUNCATE TABLE sales_order CASCADE");
    expect(projectionHandler).toHaveBeenCalledTimes(2);
    expect(context.db.insert).toHaveBeenCalledWith("sales_order", { id: 2, state: "v1" });
    expect(context.db.update).toHaveBeenCalledWith("sales_order", { id: "2" }, { state: "v2" });
  });

  it("silently no-ops for projection replay when no handler is registered", async () => {
    context.projectionHandlers = new Map();

    await expect(
      replayEventsForProjection(
        [event("salesOrder", "2", "2026-03-28T00:00:01.000Z")],
        "salesOrder",
        context
      )
    ).resolves.toBeUndefined();

    expect(context.db.sql).not.toHaveBeenCalled();
    expect(context.db.insert).not.toHaveBeenCalled();
    expect(context.db.update).not.toHaveBeenCalled();
  });

  it("wraps projection replay errors with projection context", async () => {
    const projectionHandler: ProjectionHandler = vi.fn().mockResolvedValue({ id: 2, state: "v1" });
    context.projectionHandlers = new Map([["salesOrder", projectionHandler]]);
    vi.mocked(context.db.sql).mockRejectedValue(new Error("truncate failed"));

    await expect(
      replayEventsForProjection(
        [event("salesOrder", "2", "2026-03-28T00:00:01.000Z")],
        "salesOrder",
        context
      )
    ).rejects.toThrow('Projection replay failed for "salesOrder": truncate failed');
  });
});
