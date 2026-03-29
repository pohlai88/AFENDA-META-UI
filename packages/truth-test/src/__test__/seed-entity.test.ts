import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TruthContext, TruthMutation } from "../types/test-harness.js";
import { seedEntity, seedEntityBatch, seedEntityViaEngine } from "../seed/seed-entity.js";

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
    correlationId: "corr-1",
  };
}

describe("seed-entity", () => {
  let context: TruthContext;

  beforeEach(() => {
    context = makeContext();
  });

  it("enriches seeded data with tenant/audit fields", async () => {
    vi.mocked(context.db.insert).mockResolvedValue({ id: 101 } as never);

    const id = await seedEntity("salesOrder", { status: "draft" }, context);

    expect(id).toBe("101");
    expect(context.db.insert).toHaveBeenCalledWith("salesOrder", {
      status: "draft",
      tenantId: "tenant-1",
      createdBy: 42,
      updatedBy: 42,
    });
  });

  it("preserves explicit tenant/audit fields when provided", async () => {
    vi.mocked(context.db.insert).mockResolvedValue({ id: "SO-200" } as never);

    await seedEntity(
      "salesOrder",
      { tenantId: "tenant-x", createdBy: 9, updatedBy: 10, status: "approved" },
      context
    );

    expect(context.db.insert).toHaveBeenCalledWith("salesOrder", {
      tenantId: "tenant-x",
      createdBy: 9,
      updatedBy: 10,
      status: "approved",
    });
  });

  it("seeds batches and returns IDs", async () => {
    vi.mocked(context.db.insert)
      .mockResolvedValueOnce({ id: 1 } as never)
      .mockResolvedValueOnce({ id: 2 } as never)
      .mockResolvedValueOnce({ id: 3 } as never);

    const ids = await seedEntityBatch(
      "product",
      [{ name: "A" }, { name: "B" }, { name: "C" }],
      context
    );

    expect(ids).toEqual(["1", "2", "3"]);
    expect(context.db.insert).toHaveBeenCalledTimes(3);
  });

  it("seeds via truth engine and returns mutation result id", async () => {
    vi.mocked(context.db.insert).mockResolvedValue({ id: 987 } as never);

    const mutation: TruthMutation = {
      entity: "salesOrder",
      operation: "create",
      input: { status: "active" },
    };

    const id = await seedEntityViaEngine(mutation, context);

    expect(id).toBe("987");
  });
});
