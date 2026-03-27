import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MutationPolicyDefinition } from "@afenda/meta-types";

const { dbAppendEventMock } = vi.hoisted(() => ({
  dbAppendEventMock: vi.fn(),
}));

vi.mock("../../events/dbEventStore.js", () => ({
  dbAppendEvent: dbAppendEventMock,
}));

import {
  MutationPolicyViolationError,
  assertBulkMutationAllowed,
  executeMutationCommand,
} from "../mutation-command-gateway.js";

describe("mutation-command-gateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows direct writes with no active policy", async () => {
    const mutate = vi.fn().mockResolvedValue({ id: "so-1", status: "draft" });

    const result = await executeMutationCommand({
      model: "sales_order",
      operation: "create",
      mutate,
      nextRecord: { id: "so-1", status: "draft" },
      policies: [],
    });

    expect(result.mutationPolicy).toBe("direct");
    expect(result.record?.id).toBe("so-1");
    expect(dbAppendEventMock).not.toHaveBeenCalled();
  });

  it("appends a direct mutation event for dual-write policies", async () => {
    const policy: MutationPolicyDefinition = {
      id: "sales.sales_order.dual_write_rollout",
      mutationPolicy: "dual-write",
      appliesTo: ["sales_order"],
      description: "Sales orders append events while direct writes remain enabled.",
    };
    const mutate = vi.fn().mockResolvedValue({ id: "so-2", status: "sale", amount_total: 100 });
    dbAppendEventMock.mockResolvedValueOnce({
      id: "evt-1",
      aggregateType: "sales_order",
      aggregateId: "so-2",
      eventType: "sales_order.confirmed",
      payload: {},
      metadata: { actor: "21", source: "api.generic-crud" },
      version: 3,
      timestamp: new Date().toISOString(),
    });

    const result = await executeMutationCommand({
      model: "sales_order",
      operation: "update",
      mutate,
      recordId: "so-2",
      actorId: "21",
      existingRecord: { id: "so-2", status: "draft", amount_total: 100 },
      nextRecord: { id: "so-2", status: "sale", amount_total: 100 },
      policies: [policy],
    });

    expect(result.mutationPolicy).toBe("dual-write");
    expect(result.event?.eventType).toBe("sales_order.confirmed");
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "sales_order",
      "so-2",
      "sales_order.confirmed",
      expect.objectContaining({
        operation: "update",
        policyId: policy.id,
        model: "sales_order",
      }),
      expect.objectContaining({ actor: "21", source: "api.generic-crud" })
    );
  });

  it("blocks direct writes when an event-only policy is active and no projector is configured", async () => {
    const policy: MutationPolicyDefinition = {
      id: "sales.subscription.event_only",
      mutationPolicy: "event-only",
      appliesTo: ["subscription"],
      description: "Subscriptions must mutate through append-only commands.",
    };

    await expect(
      executeMutationCommand({
        model: "subscription",
        operation: "update",
        mutate: vi.fn(),
        policies: [policy],
      })
    ).rejects.toBeInstanceOf(MutationPolicyViolationError);

    expect(dbAppendEventMock).not.toHaveBeenCalled();
  });

  it("executes event-only commands through append-and-project when projection handlers are provided", async () => {
    const policy: MutationPolicyDefinition = {
      id: "sales.subscription.event_only",
      mutationPolicy: "event-only",
      appliesTo: ["subscription"],
      description: "Subscriptions must mutate through append-only commands.",
    };
    const mutate = vi.fn();
    const loadProjectionState = vi.fn().mockResolvedValue({
      id: "sub-1",
      status: "draft",
      recurring_total: 100,
    });
    const projectEvent = vi.fn().mockImplementation(({ currentState }) => ({
      ...currentState,
      status: "active",
    }));
    const persistProjectionState = vi.fn().mockResolvedValue(undefined);
    dbAppendEventMock.mockResolvedValueOnce({
      id: "evt-2",
      aggregateType: "subscription",
      aggregateId: "sub-1",
      eventType: "subscription.direct_update",
      payload: {},
      metadata: { actor: "21", source: "api.generic-crud" },
      version: 4,
      timestamp: new Date().toISOString(),
    });

    const result = await executeMutationCommand({
      model: "subscription",
      operation: "update",
      mutate,
      actorId: "21",
      recordId: "sub-1",
      nextRecord: { id: "sub-1", status: "active" },
      policies: [policy],
      loadProjectionState,
      projectEvent,
      persistProjectionState,
    });

    expect(mutate).not.toHaveBeenCalled();
    expect(loadProjectionState).toHaveBeenCalledTimes(1);
    expect(projectEvent).toHaveBeenCalledTimes(1);
    expect(persistProjectionState).toHaveBeenCalledTimes(1);
    expect(result.mutationPolicy).toBe("event-only");
    expect(result.event?.eventType).toBe("subscription.direct_update");
    expect(result.record?.status).toBe("active");
  });

  it("blocks bulk mutations for non-direct policies", () => {
    const policy: MutationPolicyDefinition = {
      id: "sales.sales_order.dual_write_rollout",
      mutationPolicy: "dual-write",
      appliesTo: ["sales_order"],
    };

    expect(() =>
      assertBulkMutationAllowed({
        model: "sales_order",
        operation: "update",
        policies: [policy],
      })
    ).toThrow(MutationPolicyViolationError);
  });
});
