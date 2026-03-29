import { describe, it, expect, vi } from "vitest";
import type { TestDB, TruthMutation } from "../types/test-harness.js";
import { createTruthHarness } from "../harness/create-harness.js";

function createDb(): TestDB {
  return {
    findOne: vi.fn(),
    find: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    sql: vi.fn(),
    reset: vi.fn(),
    getEvents: vi.fn().mockReturnValue([]),
  };
}

describe("create-truth-harness", () => {
  it("creates harness with default options", () => {
    const db = createDb();
    const harness = createTruthHarness({ db });

    expect(harness.context.tenantId).toBe("test-tenant");
    expect(harness.context.userId).toBe(1);
    expect(harness.events).toEqual([]);
    expect(harness.db).toBe(db);
  });

  it("applies explicit options", () => {
    const db = createDb();
    const fixedClock = () => new Date("2026-03-28T00:00:00.000Z");
    const harness = createTruthHarness({
      db,
      tenantId: "tenant-x",
      userId: 99,
      correlationId: "corr-x",
      clock: fixedClock,
    });

    expect(harness.context.tenantId).toBe("tenant-x");
    expect(harness.context.userId).toBe(99);
    expect(harness.context.correlationId).toBe("corr-x");
    expect(harness.context.clock()).toEqual(fixedClock());
  });

  it("executes mutations through harness API", async () => {
    const db = createDb();
    vi.mocked(db.insert).mockResolvedValue({ id: 1, status: "draft" } as never);

    const harness = createTruthHarness({ db, tenantId: "t1", userId: 7 });

    const mutation: TruthMutation = {
      entity: "salesOrder",
      operation: "create",
      input: { status: "draft" },
    };

    const result = await harness.execute(mutation);

    expect(result.id).toBe("1");
    expect(harness.events).toHaveLength(1);
  });

  it("queries through harness API", async () => {
    const db = createDb();
    vi.mocked(db.find).mockResolvedValue([{ id: 1 }, { id: 2 }] as never);

    const harness = createTruthHarness({ db });
    const result = await harness.query({ entity: "salesOrder" });

    expect(result.count).toBe(2);
    expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("replays events through harness API", async () => {
    const db = createDb();
    vi.mocked(db.insert).mockResolvedValue({ id: 1, status: "draft" } as never);
    vi.mocked(db.findOne).mockResolvedValue(null as never);
    const harness = createTruthHarness({ db });

    await harness.execute({
      entity: "salesOrder",
      operation: "create",
      input: { status: "draft" },
    });

    // Wire a projection handler so replay can process the salesOrder events.
    harness.context.projectionHandlers = new Map([
      ["salesOrder", vi.fn().mockResolvedValue({ id: 1, status: "draft" })],
    ]);

    await expect(harness.replay()).resolves.toBeUndefined();
    expect(db.insert).toHaveBeenCalled();
  });

  it("resets events and delegates DB reset", async () => {
    const db = createDb();
    vi.mocked(db.insert).mockResolvedValue({ id: 1 } as never);
    vi.mocked(db.reset).mockResolvedValue(undefined as never);

    const harness = createTruthHarness({ db });

    await harness.execute({ entity: "salesOrder", operation: "create", input: {} });
    expect(harness.events.length).toBeGreaterThan(0);

    await harness.reset();

    expect(harness.events).toEqual([]);
    expect(db.reset).toHaveBeenCalledTimes(1);
  });
});
