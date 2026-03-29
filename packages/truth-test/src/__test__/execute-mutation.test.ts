import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DomainEvent } from "@afenda/meta-types/events";
import type { TruthContext, TruthMutation } from "../types/test-harness.js";
import { executeMutation, executeMutationBatch } from "../execute/execute-mutation.js";

function createBaseContext(): TruthContext {
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
    correlationId: "corr-1",
  };
}

describe("execute-mutation", () => {
  let context: TruthContext;
  let events: DomainEvent[];

  beforeEach(() => {
    context = createBaseContext();
    events = [];
  });

  it("creates a record through direct TestDB path and emits event", async () => {
    vi.mocked(context.db.insert).mockResolvedValue({ id: 123, status: "draft" } as never);

    const mutation: TruthMutation = {
      entity: "salesOrder",
      operation: "create",
      input: { status: "draft" },
    };

    const result = await executeMutation({ mutation, context, events });

    expect(context.db.insert).toHaveBeenCalledWith("salesOrder", {
      status: "draft",
      tenantId: "tenant-1",
      createdBy: 42,
      updatedBy: 42,
    });
    expect(result.id).toBe("123");
    expect(result.data).toEqual({ id: 123, status: "draft" });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.eventType).toBe("SalesOrderCreated");
    expect(result.events[0]).toBeDefined();
    expect(result.events[0]!.metadata?.tenantId).toBe("tenant-1");
    expect(events).toHaveLength(1);
  });

  it("updates a record through direct TestDB path", async () => {
    vi.mocked(context.db.update).mockResolvedValue(1 as never);
    vi.mocked(context.db.findOne).mockResolvedValue({ id: 9, status: "approved" } as never);

    const mutation: TruthMutation = {
      entity: "salesOrder",
      operation: "update",
      input: { id: 9, status: "approved" },
    };

    const result = await executeMutation({ mutation, context, events });

    expect(context.db.update).toHaveBeenCalledWith(
      "salesOrder",
      { id: 9 },
      expect.objectContaining({
        status: "approved",
        tenantId: "tenant-1",
        createdBy: 42,
        updatedBy: 42,
      })
    );
    expect(context.db.findOne).toHaveBeenCalledWith("salesOrder", { id: 9 });
    expect(result.id).toBe("9");
    expect(result.data).toEqual({ id: 9, status: "approved" });
    expect(result.events[0]?.eventType).toBe("SalesOrderUpdated");
  });

  it("throws for update without id", async () => {
    const mutation: TruthMutation = {
      entity: "salesOrder",
      operation: "update",
      input: { status: "approved" },
    };

    await expect(executeMutation({ mutation, context, events })).rejects.toThrow(
      "Update requires input with id"
    );
  });

  it("deletes a record through direct TestDB path", async () => {
    vi.mocked(context.db.delete).mockResolvedValue(1 as never);

    const mutation: TruthMutation = {
      entity: "salesOrder",
      operation: "delete",
      input: { id: 77 },
    };

    const result = await executeMutation({ mutation, context, events });

    expect(context.db.delete).toHaveBeenCalledWith("salesOrder", { id: 77 });
    expect(result.id).toBe("77");
    expect(result.data).toBeNull();
    expect(result.events[0]?.eventType).toBe("SalesOrderDeleted");
  });

  it("throws for delete without id", async () => {
    const mutation: TruthMutation = {
      entity: "salesOrder",
      operation: "delete",
      input: {},
    };

    await expect(executeMutation({ mutation, context, events })).rejects.toThrow(
      "Delete requires input with id"
    );
  });

  it("throws for unsupported operation in direct path", async () => {
    const mutation: TruthMutation = {
      entity: "salesOrder",
      operation: "custom" as any,
      input: {},
    };

    await expect(executeMutation({ mutation, context, events })).rejects.toThrow(
      "Unsupported mutation operation: custom"
    );
  });

  it("uses mutation gateway when provided and records policy/event", async () => {
    vi.mocked(context.db.insert).mockResolvedValue({ id: 555, status: "active" } as never);

    const gateway = vi.fn(async (input: any) => {
      const record = await input.mutate();
      return {
        record,
        event: {
          id: "evt-gw",
          aggregateType: "salesOrder",
          aggregateId: "555",
          eventType: "salesOrder.created",
          payload: { id: 555 },
          metadata: { actor: "42", source: "gateway" },
          timestamp: "2026-03-28T00:00:00.000Z",
          version: 1,
        } as DomainEvent,
        policy: { id: "policy-sales-create" } as any,
      };
    });

    context.mutationGateway = gateway as any;

    const mutation: TruthMutation = {
      entity: "salesOrder",
      operation: "create",
      input: { status: "active" },
    };

    const result = await executeMutation({ mutation, context, events });

    expect(gateway).toHaveBeenCalledTimes(1);
    expect(context.db.insert).toHaveBeenCalledWith("salesOrder", { status: "active" });
    expect(result.id).toBe("555");
    expect(result.events).toHaveLength(1);
    expect(result.invariantsChecked).toEqual(["policy-sales-create"]);
    expect(events).toHaveLength(1);
  });

  it("throws in gateway path when update input has no id", async () => {
    context.mutationGateway = vi.fn();

    const mutation: TruthMutation = {
      entity: "salesOrder",
      operation: "update",
      input: { status: "active" },
    };

    await expect(executeMutation({ mutation, context, events })).rejects.toThrow(
      "update requires input with id"
    );
    expect(context.mutationGateway).not.toHaveBeenCalled();
  });

  it("executes mutation batches in order", async () => {
    vi.mocked(context.db.insert)
      .mockResolvedValueOnce({ id: 1, status: "draft" } as never)
      .mockResolvedValueOnce({ id: 2, status: "draft" } as never);

    const mutations: TruthMutation[] = [
      { entity: "salesOrder", operation: "create", input: { status: "draft" } },
      { entity: "salesOrder", operation: "create", input: { status: "draft" } },
    ];

    const results = await executeMutationBatch(mutations, context, events);

    expect(results).toHaveLength(2);
    expect(results[0]?.id).toBe("1");
    expect(results[1]?.id).toBe("2");
    expect(events).toHaveLength(2);
  });
});
