import { describe, it, expect, beforeEach } from "vitest";
import {
  matchTopic,
  publish,
  subscribe,
  unsubscribe,
  registerProcessor,
  removeProcessor,
  getDeadLetters,
  retryDeadLetter,
  getMeshStats,
  clearMesh,
} from "../index.js";
import { clearDecisionAuditLog, queryDecisionAuditLog } from "../../audit/decisionAuditLogger.js";
import type { MeshEvent } from "@afenda/meta-types/mesh";
beforeEach(() => {
  clearMesh();
  clearDecisionAuditLog();
});

// ---------------------------------------------------------------------------
// Topic Matching
// ---------------------------------------------------------------------------

describe("mesh — topic matching", () => {
  it("matches an exact topic", () => {
    expect(matchTopic("sales.order.created", "sales.order.created")).toBe(true);
  });

  it("matches with a wildcard on the last segment", () => {
    expect(matchTopic("sales.order.created", "sales.order.*")).toBe(true);
  });

  it("matches with a wildcard on the middle segment", () => {
    expect(matchTopic("sales.order.created", "sales.*.created")).toBe(true);
  });

  it("matches with a full wildcard pattern", () => {
    expect(matchTopic("any.topic.here", "*.*.*")).toBe(true);
  });

  it("does not match different segment counts (no cross-segment wildcard)", () => {
    expect(matchTopic("sales.order.created.extra", "sales.order.*")).toBe(false);
  });

  it("does not match different topic", () => {
    expect(matchTopic("sales.order.created", "inventory.*.updated")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Publish / Subscribe
// ---------------------------------------------------------------------------

describe("mesh — publish/subscribe", () => {
  it("delivers a published event to a matching subscriber", async () => {
    const received: MeshEvent<unknown>[] = [];
    subscribe("sales.order.created", async (e) => {
      received.push(e);
    });

    await publish("sales.order.created", { orderId: "o1" });
    expect(received.length).toBe(1);
    expect((received[0].payload as { orderId: string }).orderId).toBe("o1");
  });

  it("delivers events to wildcard subscribers", async () => {
    const received: string[] = [];
    subscribe("sales.*.*", async (e) => {
      received.push(e.topic);
    });

    await publish("sales.order.created", {});
    await publish("sales.invoice.issued", {});
    await publish("inventory.item.added", {}); // should not match

    expect(received).toEqual(["sales.order.created", "sales.invoice.issued"]);
  });

  it("filters events by tenantId when subscription specifies one", async () => {
    const received: MeshEvent<unknown>[] = [];
    subscribe(
      "sales.*.*",
      async (e) => {
        received.push(e);
      },
      { tenantId: "tenant-a" }
    );

    await publish("sales.order.created", {}, { tenantId: "tenant-a" });
    await publish("sales.order.created", {}, { tenantId: "tenant-b" });

    expect(received.length).toBe(1);
    expect(
      received[0].metadata?.tenantId ??
        (received[0] as MeshEvent<unknown> & { tenantId?: string }).tenantId
    ).toBe("tenant-a");
  });

  it("does not deliver to an unsubscribed handler", async () => {
    const received: MeshEvent<unknown>[] = [];
    const subId = subscribe("sales.order.*", async (e) => {
      received.push(e);
    });

    unsubscribe(subId);
    await publish("sales.order.created", {});

    expect(received.length).toBe(0);
  });

  it("unsubscribe returns false for unknown subscription ID", () => {
    expect(unsubscribe("nonexistent-id")).toBe(false);
  });

  it("published event has correct structure", async () => {
    const event = await publish("test.event.fired", { x: 1 });
    expect(event.topic).toBe("test.event.fired");
    expect(event.id).toBeTruthy();
    expect(event.timestamp).toBeTruthy();
    expect(event.payload).toEqual({ x: 1 });
  });
});

// ---------------------------------------------------------------------------
// Dead Letters
// ---------------------------------------------------------------------------

describe("mesh — dead letters", () => {
  it("captures a failed handler in the dead-letter queue", async () => {
    subscribe("error.topic.*", async () => {
      throw new Error("Handler exploded");
    });

    await publish("error.topic.test", { data: "bad" });
    const dlq = getDeadLetters();
    expect(dlq.length).toBe(1);
    expect(dlq[0].error).toContain("Handler exploded");
  });

  it("retries a dead-letter event successfully", async () => {
    let attemptCount = 0;
    subscribe("retry.topic.test", async () => {
      attemptCount++;
      if (attemptCount === 1) throw new Error("First attempt failed");
      // Second attempt (retry) succeeds
    });

    await publish("retry.topic.test", {});
    expect(getDeadLetters().length).toBe(1);

    const succeeded = await retryDeadLetter(0);
    expect(succeeded).toBe(true);
    expect(attemptCount).toBe(2);
  });

  it("retryDeadLetter returns false for out-of-range index", async () => {
    const result = await retryDeadLetter(99);
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Stream Processors
// ---------------------------------------------------------------------------

describe("mesh — stream processors", () => {
  it("transforms output and publishes to outputTopic", async () => {
    const enriched: MeshEvent<unknown>[] = [];
    subscribe("enriched.order.created", async (e) => {
      enriched.push(e);
    });

    registerProcessor({
      id: "enrich-order",
      inputTopic: "raw.order.created",
      outputTopic: "enriched.order.created",
      transform: async (e) => ({ ...(e.payload as object), enriched: true }),
    });

    await publish("raw.order.created", { orderId: "o1" });
    expect(enriched.length).toBe(1);
    expect((enriched[0].payload as Record<string, unknown>).enriched).toBe(true);
    expect(enriched[0].topic).toBe("enriched.order.created");
  });

  it("drops event when transform returns null", async () => {
    const received: MeshEvent<unknown>[] = [];
    subscribe("filtered.out.topic", async (e) => {
      received.push(e);
    });

    registerProcessor({
      id: "drop-filter",
      inputTopic: "raw.drop.*",
      outputTopic: "filtered.out.topic",
      transform: async () => null, // drop all
    });

    await publish("raw.drop.test", { data: "ignored" });
    expect(received.length).toBe(0);
  });

  it("removeProcessor prevents further processing", async () => {
    const received: MeshEvent<unknown>[] = [];
    subscribe("downstream.topic", async (e) => {
      received.push(e);
    });

    registerProcessor({
      id: "proc-to-remove",
      inputTopic: "upstream.*",
      outputTopic: "downstream.topic",
      transform: async (e) => e.payload,
    });

    removeProcessor("proc-to-remove");
    await publish("upstream.event", {});
    expect(received.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

describe("mesh — stats", () => {
  it("reports correct subscription and processor counts", () => {
    subscribe("test.*", async () => {});
    subscribe("other.*", async () => {});
    registerProcessor({
      id: "p1",
      inputTopic: "in.*",
      outputTopic: "out.*",
      transform: async (e) => e.payload,
    });

    const stats = getMeshStats();
    expect(stats.subscriptions).toBe(2);
    expect(stats.processors).toBe(1);
    expect(stats.deadLetters).toBe(0);
  });
});

describe("mesh — decision audit hooks", () => {
  it("writes event_propagated audit entries when events are published", async () => {
    await publish(
      "audit.mesh.published",
      { payload: true },
      { tenantId: "tenant-mesh", actor: "mesh-user" }
    );

    const logs = queryDecisionAuditLog({
      tenantId: "tenant-mesh",
      eventType: "event_propagated",
      scope: "mesh.audit.mesh.published.published",
    });

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].userId).toBe("mesh-user");
  });

  it("writes error event_propagated entries when subscriber handlers fail", async () => {
    subscribe("audit.mesh.error", async () => {
      throw new Error("subscriber fail");
    });

    await publish("audit.mesh.error", { payload: true }, { tenantId: "tenant-mesh-error" });

    const logs = queryDecisionAuditLog({
      tenantId: "tenant-mesh-error",
      eventType: "event_propagated",
      scope: "mesh.audit.mesh.error.subscriber",
    });

    expect(logs.some((entry) => entry.status === "error")).toBe(true);
    expect(logs.some((entry) => entry.error?.code === "SUBSCRIBER_HANDLER_ERROR")).toBe(true);
  });
});
