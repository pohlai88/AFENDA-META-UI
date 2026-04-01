import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureTestEnv,
  selectMock,
  dbAppendEventMock,
  dbGetAggregateEventsMock,
  getProjectionCheckpointMock,
  upsertProjectionCheckpointMock,
  approveCommissionEntriesMock,
  loadCommissionEntriesForMutationMock,
  payCommissionEntriesMock,
  removeCommissionEntryMock,
  persistPreparedCommissionGenerationMock,
  prepareCommissionGenerationMock,
  queueSelect,
} = vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/afenda_test";

  const selectQueue: unknown[][] = [];

  const createSelectChain = (rows: unknown[]) => {
    const chain = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(async () => rows),
      then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
    };

    return chain;
  };

  return {
    ensureTestEnv: true,
    selectMock: vi.fn(() => createSelectChain(selectQueue.shift() ?? [])),
    dbAppendEventMock: vi.fn(async (_aggregateType, aggregateId, eventType) => ({
      id: `evt-${eventType}`,
      aggregateType: "commission_entry",
      aggregateId,
      eventType,
      payload: {},
      version: 1,
      timestamp: new Date("2026-03-28T12:00:00.000Z").toISOString(),
    })),
    dbGetAggregateEventsMock: vi.fn<() => Promise<unknown[]>>(async () => []),
    getProjectionCheckpointMock: vi.fn<() => unknown | null>(() => null),
    upsertProjectionCheckpointMock: vi.fn(),
    approveCommissionEntriesMock: vi.fn(),
    loadCommissionEntriesForMutationMock: vi.fn(),
    payCommissionEntriesMock: vi.fn(),
    removeCommissionEntryMock: vi.fn(),
    persistPreparedCommissionGenerationMock: vi.fn(),
    prepareCommissionGenerationMock: vi.fn(),
    queueSelect: (...rows: unknown[][]) => {
      selectQueue.push(...rows);
    },
  };
});

void ensureTestEnv;

vi.mock("../../../db/index.js", () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock("../../../events/dbEventStore.js", () => ({
  dbAppendEvent: dbAppendEventMock,
  dbGetAggregateEvents: dbGetAggregateEventsMock,
}));

vi.mock("../../../events/projectionCheckpointStore.js", () => ({
  getProjectionCheckpoint: getProjectionCheckpointMock,
  upsertProjectionCheckpoint: upsertProjectionCheckpointMock,
}));

vi.mock("../commission-service.js", () => ({
  approveCommissionEntries: approveCommissionEntriesMock,
  loadCommissionEntriesForMutation: loadCommissionEntriesForMutationMock,
  payCommissionEntries: payCommissionEntriesMock,
  removeCommissionEntry: removeCommissionEntryMock,
  persistPreparedCommissionGeneration: persistPreparedCommissionGenerationMock,
  prepareCommissionGeneration: prepareCommissionGenerationMock,
}));

vi.mock("../../../db/schema/index.js", () => ({
  commissionEntries: {
    tenantId: "commissionEntries.tenantId",
    id: "commissionEntries.id",
    deletedAt: "commissionEntries.deletedAt",
  },
}));

import { ProjectionDriftError } from "../../../events/projectionRuntime.js";
import { ValidationError } from "../../../middleware/errorHandler.js";
import {
  approveCommissionEntriesCommand,
  approveCommissionEntryCommand,
  generateCommissionForOrderCommand,
  payCommissionEntriesCommand,
  payCommissionEntryCommand,
  removeCommissionEntryCommand,
} from "../commission-command-service.js";

const baseEntry = {
  id: "entry-1",
  tenantId: 7,
  status: "draft",
  paidDate: null,
  updatedBy: 1,
  deletedAt: null,
};

function queueCommissionEntryReads(entry = baseEntry): void {
  queueSelect([entry], [entry]);
}

beforeEach(() => {
  vi.clearAllMocks();
  getProjectionCheckpointMock.mockReturnValue(null);
  dbGetAggregateEventsMock.mockResolvedValue([]);
  loadCommissionEntriesForMutationMock.mockResolvedValue([]);
});

describe("commission command service", () => {
  it("runs single-entry approval under event-only policy and appends an approval event", async () => {
    queueCommissionEntryReads(baseEntry);
    approveCommissionEntriesMock.mockResolvedValueOnce({
      updatedCount: 1,
      unchangedCount: 0,
      entries: [{ ...baseEntry, status: "approved", updatedBy: 99 }],
    });

    const result = await approveCommissionEntryCommand({
      tenantId: 7,
      actorId: 99,
      entryId: "entry-1",
    });

    expect(result.updatedCount).toBe(1);
    expect(result.mutationPolicy).toBe("event-only");
    expect(result.event?.eventType).toBe("commission_entry.approved");
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "commission_entry",
      "entry-1",
      "commission_entry.approved",
      expect.any(Object),
      expect.objectContaining({
        actor: "99",
        source: "api.sales.commissions.approve.single",
        truthImpact: expect.objectContaining({
          graphLayer: "truth",
          operation: "approve.single",
          startTable: "commission_entries",
        }),
      })
    );
  });

  it("runs single-entry payment under event-only policy and appends a paid event", async () => {
    const approvedEntry = { ...baseEntry, status: "approved" };
    const paidDate = new Date("2026-03-28T13:00:00.000Z");
    queueCommissionEntryReads(approvedEntry);
    payCommissionEntriesMock.mockResolvedValueOnce({
      updatedCount: 1,
      unchangedCount: 0,
      entries: [{ ...approvedEntry, status: "paid", paidDate, updatedBy: 44 }],
    });

    const result = await payCommissionEntryCommand({
      tenantId: 7,
      actorId: 44,
      entryId: "entry-1",
      paidDate,
    });

    expect(result.updatedCount).toBe(1);
    expect(result.mutationPolicy).toBe("event-only");
    expect(result.event?.eventType).toBe("commission_entry.paid");
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "commission_entry",
      "entry-1",
      "commission_entry.paid",
      expect.any(Object),
      expect.objectContaining({
        actor: "44",
        truthImpact: expect.objectContaining({
          operation: "pay.single",
          startTable: "commission_entries",
        }),
      })
    );
  });

  it("runs single-entry delete under event-only policy and appends a deleted event", async () => {
    queueCommissionEntryReads(baseEntry);
    removeCommissionEntryMock.mockResolvedValueOnce({
      deletedCount: 1,
      entry: {
        ...baseEntry,
        updatedBy: 77,
        deletedAt: new Date("2026-03-28T14:00:00.000Z"),
      },
    });

    const result = await removeCommissionEntryCommand({
      tenantId: 7,
      actorId: 77,
      entryId: "entry-1",
    });

    expect(result.deletedCount).toBe(1);
    expect(result.mutationPolicy).toBe("event-only");
    expect(result.event?.eventType).toBe("commission_entry.deleted");
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "commission_entry",
      "entry-1",
      "commission_entry.deleted",
      expect.any(Object),
      expect.objectContaining({
        truthImpact: expect.objectContaining({
          operation: "delete",
          startTable: "commission_entries",
        }),
      })
    );
    expect(removeCommissionEntryMock).toHaveBeenCalledWith({
      tenantId: 7,
      actorId: 77,
      entryId: "entry-1",
    });
  });

  it("rejects payment for draft entries before appending an event", async () => {
    queueSelect([baseEntry]);

    await expect(
      payCommissionEntryCommand({
        tenantId: 7,
        actorId: 44,
        entryId: "entry-1",
      })
    ).rejects.toBeInstanceOf(ValidationError);

    expect(dbAppendEventMock).not.toHaveBeenCalled();
  });

  it("fails fast when the commission entry projection checkpoint is stale", async () => {
    const approvedEntry = { ...baseEntry, status: "approved" };
    queueCommissionEntryReads(approvedEntry);
    getProjectionCheckpointMock.mockReturnValue({
      projectionName: "commission_entry.read_model",
      aggregateType: "commission_entry",
      aggregateId: "entry-1",
      lastAppliedVersion: 1,
      projectionVersion: 1,
      schemaHash: "commission_entry_read_model_v1",
      updatedAt: new Date("2026-03-27T00:00:00.000Z").toISOString(),
    });
    dbGetAggregateEventsMock.mockResolvedValue([
      {
        id: "evt-stale-commission-entry",
        aggregateType: "commission_entry",
        aggregateId: "entry-1",
        eventType: "commission_entry.approved",
        payload: {},
        version: 3,
        timestamp: new Date("2026-03-28T12:30:00.000Z").toISOString(),
      },
    ]);

    await expect(
      payCommissionEntryCommand({
        tenantId: 7,
        actorId: 44,
        entryId: "entry-1",
      })
    ).rejects.toBeInstanceOf(ProjectionDriftError);

    expect(dbAppendEventMock).not.toHaveBeenCalled();
  });

  it("runs bulk approval with one event per updated entry", async () => {
    loadCommissionEntriesForMutationMock.mockResolvedValueOnce([
      { ...baseEntry, id: "entry-draft" },
      { ...baseEntry, id: "entry-approved", status: "approved" },
    ]);
    queueCommissionEntryReads({ ...baseEntry, id: "entry-draft" });
    approveCommissionEntriesMock.mockResolvedValueOnce({
      updatedCount: 1,
      unchangedCount: 0,
      entries: [{ ...baseEntry, id: "entry-draft", status: "approved", updatedBy: 21 }],
    });

    const result = await approveCommissionEntriesCommand({
      tenantId: 7,
      actorId: 21,
      salespersonId: 21,
    });

    expect(result.mutationPolicy).toBe("event-only");
    expect(result.matchedCount).toBe(2);
    expect(result.updatedCount).toBe(1);
    expect(result.unchangedCount).toBe(1);
    expect(result.events.map((event) => event.eventType)).toEqual(["commission_entry.approved"]);
  });

  it("runs bulk payment with one event per updated entry after preflight", async () => {
    const approvedEntry = { ...baseEntry, id: "entry-approved", status: "approved" };
    loadCommissionEntriesForMutationMock.mockResolvedValueOnce([
      approvedEntry,
      {
        ...baseEntry,
        id: "entry-paid",
        status: "paid",
        paidDate: new Date("2026-03-20T00:00:00.000Z"),
      },
    ]);
    queueCommissionEntryReads(approvedEntry);
    payCommissionEntriesMock.mockResolvedValueOnce({
      updatedCount: 1,
      unchangedCount: 0,
      entries: [
        {
          ...approvedEntry,
          status: "paid",
          updatedBy: 21,
          paidDate: new Date("2026-03-28T00:00:00.000Z"),
        },
      ],
    });

    const result = await payCommissionEntriesCommand({
      tenantId: 7,
      actorId: 21,
      paidDate: new Date("2026-03-28T00:00:00.000Z"),
    });

    expect(result.mutationPolicy).toBe("event-only");
    expect(result.matchedCount).toBe(2);
    expect(result.updatedCount).toBe(1);
    expect(result.unchangedCount).toBe(1);
    expect(result.events.map((event) => event.eventType)).toEqual(["commission_entry.paid"]);
  });

  it("preflights bulk payment and blocks all appends when a draft entry is selected", async () => {
    loadCommissionEntriesForMutationMock.mockResolvedValueOnce([
      { ...baseEntry, id: "entry-draft" },
      { ...baseEntry, id: "entry-approved", status: "approved" },
    ]);

    await expect(
      payCommissionEntriesCommand({
        tenantId: 7,
        actorId: 21,
      })
    ).rejects.toBeInstanceOf(ValidationError);

    expect(dbAppendEventMock).not.toHaveBeenCalled();
  });

  it("runs commission generation under dual-write and appends a generated event", async () => {
    prepareCommissionGenerationMock.mockResolvedValueOnce({
      persistence: "created",
      existingEntry: undefined,
      draft: {
        id: "entry-2",
        tenantId: 7,
        orderId: "order-1",
        salespersonId: 21,
        planId: "plan-1",
      },
      calculation: { commissionAmount: "240.00" },
      order: { id: "order-1" },
      plan: { id: "plan-1" },
      metrics: { revenue: "2400.00" },
      assignment: { salespersonId: 21, selectedBy: "order_user", territoryMatch: null },
    });
    persistPreparedCommissionGenerationMock.mockResolvedValueOnce({
      persistence: "created",
      calculation: { commissionAmount: "240.00" },
      entry: { id: "entry-2", status: "draft" },
      order: { id: "order-1" },
      plan: { id: "plan-1" },
      metrics: { revenue: "2400.00" },
      assignment: { salespersonId: 21, selectedBy: "order_user", territoryMatch: null },
    });

    const result = await generateCommissionForOrderCommand({
      tenantId: 7,
      actorId: 21,
      orderId: "order-1",
      planId: "plan-1",
    });

    expect(result.persistence).toBe("created");
    expect(result.mutationPolicy).toBe("dual-write");
    expect(result.event?.eventType).toBe("commission_entry.generated");
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "commission_entry",
      "entry-2",
      "commission_entry.generated",
      expect.any(Object),
      expect.objectContaining({
        actor: "21",
        source: "api.sales.commissions.generate",
        truthImpact: expect.objectContaining({
          operation: "generate.create",
          startTable: "commission_entries",
        }),
      })
    );
  });

  it("runs commission regeneration under dual-write and appends a recalculated event", async () => {
    prepareCommissionGenerationMock.mockResolvedValueOnce({
      persistence: "updated",
      existingEntry: { id: "entry-2", status: "draft", createdBy: 21, notes: null },
      draft: {
        id: undefined,
        tenantId: 7,
        orderId: "order-1",
        salespersonId: 21,
        planId: "plan-1",
      },
      calculation: { commissionAmount: "240.00" },
      order: { id: "order-1" },
      plan: { id: "plan-1" },
      metrics: { revenue: "2400.00" },
      assignment: { salespersonId: 21, selectedBy: "order_user", territoryMatch: null },
    });
    persistPreparedCommissionGenerationMock.mockResolvedValueOnce({
      persistence: "updated",
      calculation: { commissionAmount: "240.00" },
      entry: { id: "entry-2", status: "draft" },
      order: { id: "order-1" },
      plan: { id: "plan-1" },
      metrics: { revenue: "2400.00" },
      assignment: { salespersonId: 21, selectedBy: "order_user", territoryMatch: null },
    });

    const result = await generateCommissionForOrderCommand({
      tenantId: 7,
      actorId: 21,
      orderId: "order-1",
      planId: "plan-1",
      replaceExisting: true,
    });

    expect(result.persistence).toBe("updated");
    expect(result.mutationPolicy).toBe("dual-write");
    expect(result.event?.eventType).toBe("commission_entry.recalculated");
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "commission_entry",
      "entry-2",
      "commission_entry.recalculated",
      expect.any(Object),
      expect.objectContaining({
        truthImpact: expect.objectContaining({
          operation: "generate.update",
          startTable: "commission_entries",
        }),
      })
    );
  });
});
