import { describe, it, expect, beforeEach } from "vitest";
import {
  appendEvent,
  queryEvents,
  getAggregateEvents,
  replayEvents,
  rebuildAggregate,
  saveSnapshot,
  getSnapshot,
  rebuildFromSnapshot,
  getEventStoreStats,
  clearEventStore,
} from "./eventStore.js";
import type { DomainEvent, EventReducer } from "@afenda/meta-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface OrderState {
  status: string;
  total: number;
  items: string[];
}

const initialOrderState: OrderState = {
  status: "new",
  total: 0,
  items: [],
};

const orderReducer: EventReducer<OrderState> = (state, event) => {
  switch (event.eventType) {
    case "item_added":
      return {
        ...state,
        items: [...state.items, event.payload.item as string],
        total: state.total + (event.payload.price as number),
      };
    case "order_confirmed":
      return { ...state, status: "confirmed" };
    case "order_shipped":
      return { ...state, status: "shipped" };
    default:
      return state;
  }
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("eventStore — append & query", () => {
  beforeEach(() => clearEventStore());

  it("appends events with auto-incrementing versions", () => {
    const e1 = appendEvent("order", "o1", "item_added", { item: "A", price: 10 });
    const e2 = appendEvent("order", "o1", "item_added", { item: "B", price: 20 });

    expect(e1.version).toBe(1);
    expect(e2.version).toBe(2);
    expect(e1.id).not.toBe(e2.id);
    expect(e1.aggregateType).toBe("order");
    expect(e1.aggregateId).toBe("o1");
  });

  it("assigns metadata when provided", () => {
    const e = appendEvent("order", "o1", "created", {}, {
      actor: "u1",
      source: "api",
    });
    expect(e.metadata!.actor).toBe("u1");
    expect(e.metadata!.source).toBe("api");
  });

  it("queries by aggregateType", () => {
    appendEvent("order", "o1", "created", {});
    appendEvent("payment", "p1", "paid", {});

    const orders = queryEvents({ aggregateType: "order" });
    expect(orders).toHaveLength(1);
    expect(orders[0].aggregateType).toBe("order");
  });

  it("queries by eventType", () => {
    appendEvent("order", "o1", "created", {});
    appendEvent("order", "o1", "shipped", {});

    const shipped = queryEvents({ eventType: "shipped" });
    expect(shipped).toHaveLength(1);
  });

  it("respects limit and offset", () => {
    for (let i = 0; i < 5; i++) {
      appendEvent("counter", "c1", "tick", { n: i });
    }

    const page = queryEvents({ limit: 2, offset: 2 });
    expect(page).toHaveLength(2);
    expect(page[0].payload.n).toBe(2);
  });

  it("queries by timestamp range", () => {
    const e1 = appendEvent("a", "1", "x", {});
    // All events have similar timestamps in tests, but at least cover the branch
    const results = queryEvents({ fromTimestamp: e1.timestamp });
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe("eventStore — getAggregateEvents", () => {
  beforeEach(() => clearEventStore());

  it("returns events for a specific aggregate sorted by version", () => {
    appendEvent("order", "o1", "created", {});
    appendEvent("order", "o2", "created", {});
    appendEvent("order", "o1", "shipped", {});

    const events = getAggregateEvents("order", "o1");
    expect(events).toHaveLength(2);
    expect(events[0].version).toBeLessThan(events[1].version);
    expect(events[0].eventType).toBe("created");
    expect(events[1].eventType).toBe("shipped");
  });
});

describe("eventStore — replay & rebuild", () => {
  beforeEach(() => clearEventStore());

  it("replays events through a reducer", () => {
    const events: DomainEvent[] = [
      appendEvent("order", "o1", "item_added", { item: "Widget", price: 25 }),
      appendEvent("order", "o1", "item_added", { item: "Gadget", price: 75 }),
      appendEvent("order", "o1", "order_confirmed", {}),
    ];

    const state = replayEvents(events, orderReducer, initialOrderState);

    expect(state.status).toBe("confirmed");
    expect(state.total).toBe(100);
    expect(state.items).toEqual(["Widget", "Gadget"]);
  });

  it("rebuilds aggregate state from store", () => {
    appendEvent("order", "o1", "item_added", { item: "A", price: 10 });
    appendEvent("order", "o1", "item_added", { item: "B", price: 30 });
    appendEvent("order", "o1", "order_shipped", {});

    const state = rebuildAggregate("order", "o1", orderReducer, initialOrderState);

    expect(state.status).toBe("shipped");
    expect(state.total).toBe(40);
    expect(state.items).toEqual(["A", "B"]);
  });
});

describe("eventStore — snapshots", () => {
  beforeEach(() => clearEventStore());

  it("saves and retrieves a snapshot", () => {
    saveSnapshot("order", "o1", { status: "confirmed", total: 100, items: ["A"] }, 3);

    const snap = getSnapshot("order", "o1");
    expect(snap).toBeDefined();
    expect(snap!.state.status).toBe("confirmed");
    expect(snap!.version).toBe(3);
  });

  it("returns undefined when no snapshot exists", () => {
    expect(getSnapshot("order", "none")).toBeUndefined();
  });

  it("rebuilds from snapshot + delta events", () => {
    // Append 3 events
    appendEvent("order", "o1", "item_added", { item: "A", price: 10 });
    appendEvent("order", "o1", "item_added", { item: "B", price: 20 });
    appendEvent("order", "o1", "order_confirmed", {});

    // Snapshot at version 2 (after 2 item_added events)
    saveSnapshot<OrderState>(
      "order",
      "o1",
      { status: "new", total: 30, items: ["A", "B"] },
      2,
    );

    // Rebuild should apply only event at version 3 (order_confirmed) on top of snapshot
    const state = rebuildFromSnapshot<OrderState>(
      "order",
      "o1",
      orderReducer,
      initialOrderState,
    );

    expect(state.status).toBe("confirmed");
    expect(state.total).toBe(30);
    expect(state.items).toEqual(["A", "B"]);
  });
});

describe("eventStore — stats & clear", () => {
  beforeEach(() => clearEventStore());

  it("reports stats correctly", () => {
    appendEvent("order", "o1", "created", {});
    appendEvent("payment", "p1", "paid", {});

    const stats = getEventStoreStats();
    expect(stats.totalEvents).toBe(2);
    expect(stats.aggregateTypes).toContain("order");
    expect(stats.aggregateTypes).toContain("payment");
    expect(stats.latestTimestamp).toBeTruthy();
  });

  it("clears everything", () => {
    appendEvent("order", "o1", "created", {});
    saveSnapshot("order", "o1", {}, 1);
    clearEventStore();

    expect(getEventStoreStats().totalEvents).toBe(0);
    expect(getSnapshot("order", "o1")).toBeUndefined();
  });
});
