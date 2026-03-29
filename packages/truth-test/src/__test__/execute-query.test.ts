import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TruthContext, TruthQuery } from "../types/test-harness.js";
import { executeQuery } from "../execute/execute-query.js";

function createContext(): TruthContext {
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

describe("execute-query", () => {
  let context: TruthContext;

  beforeEach(() => {
    context = createContext();
  });

  it("queries by entity name when projection is not set", async () => {
    vi.mocked(context.db.find).mockResolvedValue([{ id: 1 }, { id: 2 }] as never);

    const query: TruthQuery = {
      entity: "salesOrder",
      filters: { status: "approved" },
    };

    const result = await executeQuery({ query, context });

    expect(context.db.find).toHaveBeenCalledWith("sales_order", { status: "approved" });
    expect(result.count).toBe(2);
    expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("queries by projection name when provided", async () => {
    vi.mocked(context.db.find).mockResolvedValue([{ id: 9 }] as never);

    const query: TruthQuery = {
      entity: "salesOrder",
      projection: "salesOrderProjection",
      filters: { id: 9 },
    };

    const result = await executeQuery({ query, context });

    expect(context.db.find).toHaveBeenCalledWith("sales_order_projection", { id: 9 });
    expect(result.count).toBe(1);
  });

  it("queries without filter by passing only table name", async () => {
    vi.mocked(context.db.find).mockResolvedValue([] as never);

    const query: TruthQuery = {
      entity: "commission",
    };

    const result = await executeQuery({ query, context });

    expect(context.db.find).toHaveBeenCalledWith("commission");
    expect(result.count).toBe(0);
    expect(result.data).toEqual([]);
  });

  it("returns count 1 for non-array truthy results", async () => {
    vi.mocked(context.db.find).mockResolvedValue({ id: 77 } as never);

    const query: TruthQuery = {
      entity: "salesOrder",
      filters: { id: 77 },
    };

    const result = await executeQuery({ query, context });

    expect(result.count).toBe(1);
    expect(result.data).toEqual({ id: 77 });
  });

  it("wraps and rethrows underlying query errors", async () => {
    vi.mocked(context.db.find).mockRejectedValue(new Error("db unavailable"));

    const query: TruthQuery = {
      entity: "salesOrder",
      projection: "salesOrderProjection",
      filters: { id: 77 },
    };

    await expect(executeQuery({ query, context })).rejects.toThrow(
      'Query execution failed for entity="salesOrder", projection="salesOrderProjection": db unavailable'
    );
  });
});
