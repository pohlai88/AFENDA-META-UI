/**
 * Mesh eventing contract tests.
 *
 * Design intent: inter-service event transport depends on the exact event envelope,
 * handler signature, stream processor shape, and dead-letter payload contract.
 */
import { describe, expect, it } from "vitest";

import type {
  DeadLetterEntry,
  MeshEvent,
  MeshEventHandler,
  MeshSubscription,
  StreamProcessor,
  StreamTransformFn,
} from "../types.js";

describe("MeshEvent — structural contract", () => {
  it("requires tenantId, actor, timestamp, and payload", () => {
    const event: MeshEvent<{ id: string }> = {
      id: "mesh-001",
      topic: "orders.created",
      tenantId: "tenant-acme",
      actor: "user-001",
      timestamp: "2026-01-15T09:00:00Z",
      payload: { id: "ord-001" },
      metadata: {
        correlationId: "corr-001",
        causationId: "cmd-001",
        source: "orders-service",
      },
    };
    expect(event.tenantId).toBe("tenant-acme");
    expect(event.actor).toBe("user-001");
    expect(event.payload.id).toBe("ord-001");
  });
});

describe("MeshEventHandler — structural contract", () => {
  it("accepts a mesh event and returns void or promise", async () => {
    const handler: MeshEventHandler<{ approved: boolean }> = async (event) => {
      expect(event.topic).toBe("invoice.approved");
      expect(event.payload.approved).toBe(true);
    };

    await handler({
      id: "mesh-002",
      topic: "invoice.approved",
      tenantId: "tenant-acme",
      actor: "approver-001",
      timestamp: "2026-01-16T10:00:00Z",
      payload: { approved: true },
    });
  });
});

describe("MeshSubscription — structural contract", () => {
  it("stores id, topic, handler, and optional tenantId", () => {
    const handler: MeshEventHandler<Record<string, unknown>> = () => undefined;
    const subscription: MeshSubscription = {
      id: "sub-001",
      topic: "orders.*",
      handler,
      tenantId: "tenant-acme",
    };
    expect(subscription.id).toBe("sub-001");
    expect(subscription.topic).toBe("orders.*");
    expect(subscription.handler).toBe(handler);
    expect(subscription.tenantId).toBe("tenant-acme");
  });

  it("allows tenantId to be omitted", () => {
    const subscription: MeshSubscription = {
      id: "sub-002",
      topic: "system.health",
      handler: () => undefined,
    };
    expect(subscription.tenantId).toBeUndefined();
  });
});

describe("StreamTransformFn — structural contract", () => {
  it("transforms a mesh event into a record or null", async () => {
    const transform: StreamTransformFn = async (event) => {
      if (event.topic === "orders.created") {
        return { orderId: event.payload["id"], projected: true };
      }
      return null;
    };

    const output = await transform({
      id: "mesh-003",
      topic: "orders.created",
      tenantId: "tenant-acme",
      actor: "user-001",
      timestamp: "2026-01-16T11:00:00Z",
      payload: { id: "ord-999" },
    });

    expect(output).toEqual({ orderId: "ord-999", projected: true });
  });
});

describe("StreamProcessor — structural contract", () => {
  it("requires id, inputTopic, outputTopic, and transform", () => {
    const transform: StreamTransformFn = async (event) => ({ mirroredTopic: event.topic });
    const processor: StreamProcessor = {
      id: "proc-001",
      inputTopic: "orders.created",
      outputTopic: "orders.projected",
      transform,
    };
    expect(processor.id).toBe("proc-001");
    expect(processor.inputTopic).toBe("orders.created");
    expect(processor.outputTopic).toBe("orders.projected");
    expect(processor.transform).toBe(transform);
  });
});

describe("DeadLetterEntry — structural contract", () => {
  it("captures the failed event, error, timestamp, and retry count", () => {
    const entry: DeadLetterEntry = {
      event: {
        id: "mesh-004",
        topic: "billing.failed",
        tenantId: "tenant-acme",
        actor: "billing-service",
        timestamp: "2026-01-16T12:00:00Z",
        payload: { invoiceId: "inv-001" },
      },
      error: "Timeout while processing event",
      failedAt: "2026-01-16T12:00:05Z",
      retryCount: 3,
    };
    expect(entry.event.topic).toBe("billing.failed");
    expect(entry.error).toMatch("Timeout");
    expect(entry.retryCount).toBe(3);
  });
});
