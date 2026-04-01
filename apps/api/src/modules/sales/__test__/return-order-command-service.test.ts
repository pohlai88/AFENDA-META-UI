import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureTestEnv,
  selectMock,
  dbAppendEventMock,
  dbGetAggregateEventsMock,
  getProjectionCheckpointMock,
  upsertProjectionCheckpointMock,
  approveReturnMock,
  generateReturnCreditNoteMock,
  inspectReturnOrderMock,
  receiveReturnMock,
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
      aggregateType: "return_order",
      aggregateId,
      eventType,
      payload: {},
      version: 1,
      timestamp: new Date("2026-01-10T00:00:00.000Z").toISOString(),
    })),
    dbGetAggregateEventsMock: vi.fn<
      () => Promise<
        Array<{
          id: string;
          aggregateType: string;
          aggregateId: string;
          eventType: string;
          payload: Record<string, unknown>;
          version: number;
          timestamp: string;
        }>
      >
    >(async () => []),
    getProjectionCheckpointMock: vi.fn<() => unknown | null>(() => null),
    upsertProjectionCheckpointMock: vi.fn(),
    approveReturnMock: vi.fn(),
    generateReturnCreditNoteMock: vi.fn(),
    inspectReturnOrderMock: vi.fn(),
    receiveReturnMock: vi.fn(),
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

vi.mock("../returns-service.js", () => ({
  approveReturn: approveReturnMock,
  generateReturnCreditNote: generateReturnCreditNoteMock,
  inspectReturnOrder: inspectReturnOrderMock,
  receiveReturn: receiveReturnMock,
}));

vi.mock("../../../db/schema/index.js", () => ({
  returnOrders: {
    tenantId: "returnOrders.tenantId",
    id: "returnOrders.id",
    deletedAt: "returnOrders.deletedAt",
  },
}));

import {
  approveReturnOrderCommand,
  generateReturnCreditNoteCommand,
  inspectReturnOrderCommand,
  receiveReturnOrderCommand,
} from "../return-order-command-service.js";
import { ProjectionDriftError } from "../../../events/projectionRuntime.js";

const baseReturnOrder = {
  id: "ret-1",
  tenantId: 7,
  status: "draft",
  deletedAt: null,
};

function queueReturnOrderReads(returnOrder = baseReturnOrder): void {
  queueSelect([returnOrder], [returnOrder]);
}

beforeEach(() => {
  vi.clearAllMocks();
  getProjectionCheckpointMock.mockReturnValue(null);
  dbGetAggregateEventsMock.mockResolvedValue([]);
});

describe("return-order command service", () => {
  it("runs approve command under event-only policy and appends event", async () => {
    queueReturnOrderReads(baseReturnOrder);
    approveReturnMock.mockResolvedValueOnce({
      returnOrder: {
        ...baseReturnOrder,
        status: "approved",
      },
      validation: { valid: true, errors: [], issues: [] },
    });

    const result = await approveReturnOrderCommand({
      tenantId: 7,
      returnOrderId: "ret-1",
      actorId: 15,
    });

    expect(result.returnOrder.status).toBe("approved");
    expect(result.mutationPolicy).toBe("event-only");
    expect(result.event?.eventType).toBe("return_order.approved");
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "return_order",
      "ret-1",
      "return_order.approved",
      expect.any(Object),
      expect.objectContaining({
        actor: "15",
        source: "api.sales.returns.approve",
        truthImpact: expect.objectContaining({
          graphLayer: "truth",
          operation: "approve",
          startTable: "return_orders",
        }),
      })
    );
    expect(upsertProjectionCheckpointMock).toHaveBeenCalledTimes(1);
    expect(upsertProjectionCheckpointMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectionName: "return_order.read_model",
        aggregateType: "return_order",
        aggregateId: "ret-1",
        lastAppliedVersion: 1,
      })
    );
  });

  it("runs receive command under event-only policy and appends event", async () => {
    queueReturnOrderReads({ ...baseReturnOrder, status: "approved" });
    receiveReturnMock.mockResolvedValueOnce({
      returnOrder: {
        ...baseReturnOrder,
        status: "received",
      },
    });

    const result = await receiveReturnOrderCommand({
      tenantId: 7,
      returnOrderId: "ret-1",
      actorId: 16,
    });

    expect(result.returnOrder.status).toBe("received");
    expect(result.mutationPolicy).toBe("event-only");
    expect(result.event?.eventType).toBe("return_order.received");
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "return_order",
      "ret-1",
      "return_order.received",
      expect.any(Object),
      expect.objectContaining({
        actor: "16",
        source: "api.sales.returns.receive",
        truthImpact: expect.objectContaining({
          graphLayer: "truth",
          operation: "receive",
          startTable: "return_orders",
        }),
      })
    );
    expect(upsertProjectionCheckpointMock).toHaveBeenCalledTimes(1);
    expect(upsertProjectionCheckpointMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectionName: "return_order.read_model",
        aggregateType: "return_order",
        aggregateId: "ret-1",
        lastAppliedVersion: 1,
      })
    );
  });

  it("runs inspect command under event-only policy and appends event", async () => {
    queueReturnOrderReads({ ...baseReturnOrder, status: "received" });
    inspectReturnOrderMock.mockResolvedValueOnce({
      returnOrder: {
        ...baseReturnOrder,
        status: "inspected",
      },
      returnLines: [],
      inspection: {
        linesInspected: 1,
        conditionUpdates: [],
      },
    });

    const result = await inspectReturnOrderCommand({
      tenantId: 7,
      returnOrderId: "ret-1",
      actorId: 17,
      inspectionResults: [
        {
          lineId: "00000000-0000-4000-8000-000000000001",
          condition: "used",
        },
      ],
    });

    expect(result.returnOrder.status).toBe("inspected");
    expect(result.mutationPolicy).toBe("event-only");
    expect(result.event?.eventType).toBe("return_order.inspected");
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "return_order",
      "ret-1",
      "return_order.inspected",
      expect.any(Object),
      expect.objectContaining({
        actor: "17",
        source: "api.sales.returns.inspect",
      })
    );
    expect(upsertProjectionCheckpointMock).toHaveBeenCalledTimes(1);
    expect(upsertProjectionCheckpointMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectionName: "return_order.read_model",
        aggregateType: "return_order",
        aggregateId: "ret-1",
        lastAppliedVersion: 1,
      })
    );
  });

  it("runs credit-note command under event-only policy and appends event", async () => {
    queueReturnOrderReads({ ...baseReturnOrder, status: "inspected" });
    generateReturnCreditNoteMock.mockResolvedValueOnce({
      returnOrder: {
        ...baseReturnOrder,
        status: "credited",
      },
      returnLines: [],
      validation: { valid: true, errors: [], issues: [] },
      creditNote: {
        reference: "CN-001",
      },
    });

    const result = await generateReturnCreditNoteCommand({
      tenantId: 7,
      returnOrderId: "ret-1",
      actorId: 18,
    });

    expect(result.returnOrder.status).toBe("credited");
    expect(result.mutationPolicy).toBe("event-only");
    expect(result.event?.eventType).toBe("return_order.credited");
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "return_order",
      "ret-1",
      "return_order.credited",
      expect.any(Object),
      expect.objectContaining({
        actor: "18",
        source: "api.sales.returns.credit_note",
        truthImpact: expect.objectContaining({
          graphLayer: "truth",
          operation: "credit_note",
          startTable: "return_orders",
        }),
      })
    );
    expect(upsertProjectionCheckpointMock).toHaveBeenCalledTimes(1);
    expect(upsertProjectionCheckpointMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectionName: "return_order.read_model",
        aggregateType: "return_order",
        aggregateId: "ret-1",
        lastAppliedVersion: 1,
      })
    );
  });

  it("captures promotion-readiness evidence for all return-order command paths", async () => {
    const scenarios = [
      {
        name: "approve",
        arrange: () => {
          queueReturnOrderReads(baseReturnOrder);
          approveReturnMock.mockResolvedValueOnce({
            returnOrder: { ...baseReturnOrder, status: "approved" },
            validation: { valid: true, errors: [], issues: [] },
          });
          dbAppendEventMock.mockResolvedValueOnce({
            id: "evt-ret-approve",
            aggregateType: "return_order",
            aggregateId: "ret-1",
            eventType: "return_order.approved",
            payload: {},
            version: 21,
            timestamp: "2026-03-28T11:00:00.000Z",
          });

          return approveReturnOrderCommand({
            tenantId: 7,
            returnOrderId: "ret-1",
            actorId: 15,
          });
        },
      },
      {
        name: "receive",
        arrange: () => {
          queueReturnOrderReads({ ...baseReturnOrder, status: "approved" });
          receiveReturnMock.mockResolvedValueOnce({
            returnOrder: { ...baseReturnOrder, status: "received" },
          });
          dbAppendEventMock.mockResolvedValueOnce({
            id: "evt-ret-receive",
            aggregateType: "return_order",
            aggregateId: "ret-1",
            eventType: "return_order.received",
            payload: {},
            version: 22,
            timestamp: "2026-03-28T11:05:00.000Z",
          });

          return receiveReturnOrderCommand({
            tenantId: 7,
            returnOrderId: "ret-1",
            actorId: 16,
          });
        },
      },
      {
        name: "inspect",
        arrange: () => {
          queueReturnOrderReads({ ...baseReturnOrder, status: "received" });
          inspectReturnOrderMock.mockResolvedValueOnce({
            returnOrder: { ...baseReturnOrder, status: "inspected" },
            returnLines: [],
            inspection: { linesInspected: 1, conditionUpdates: [] },
          });
          dbAppendEventMock.mockResolvedValueOnce({
            id: "evt-ret-inspect",
            aggregateType: "return_order",
            aggregateId: "ret-1",
            eventType: "return_order.inspected",
            payload: {},
            version: 23,
            timestamp: "2026-03-28T11:10:00.000Z",
          });

          return inspectReturnOrderCommand({
            tenantId: 7,
            returnOrderId: "ret-1",
            actorId: 17,
            inspectionResults: [
              {
                lineId: "00000000-0000-4000-8000-000000000001",
                condition: "used",
              },
            ],
          });
        },
      },
      {
        name: "credit-note",
        arrange: () => {
          queueReturnOrderReads({ ...baseReturnOrder, status: "inspected" });
          generateReturnCreditNoteMock.mockResolvedValueOnce({
            returnOrder: { ...baseReturnOrder, status: "credited" },
            returnLines: [],
            validation: { valid: true, errors: [], issues: [] },
            creditNote: { reference: "CN-001" },
          });
          dbAppendEventMock.mockResolvedValueOnce({
            id: "evt-ret-credit",
            aggregateType: "return_order",
            aggregateId: "ret-1",
            eventType: "return_order.credited",
            payload: {},
            version: 24,
            timestamp: "2026-03-28T11:15:00.000Z",
          });

          return generateReturnCreditNoteCommand({
            tenantId: 7,
            returnOrderId: "ret-1",
            actorId: 18,
          });
        },
      },
    ] as const;

    for (const scenario of scenarios) {
      const result = await scenario.arrange();
      const checkpoint = upsertProjectionCheckpointMock.mock.calls.at(-1)?.[0];
      const expectedOp = scenario.name === "credit-note" ? "credit_note" : scenario.name;
      const appendMeta = dbAppendEventMock.mock.calls.at(-1)?.[4];
      expect(appendMeta, `${scenario.name} should attach truth impact metadata`).toEqual(
        expect.objectContaining({
          truthImpact: expect.objectContaining({
            graphLayer: "truth",
            startTable: "return_orders",
            operation: expectedOp,
          }),
        })
      );

      expect(
        result.mutationPolicy,
        `${scenario.name} should stay in event-only after promotion`
      ).toBe("event-only");
      expect(
        result.event,
        `${scenario.name} should append an event during event-only execution`
      ).toBeDefined();
      expect(checkpoint).toEqual(
        expect.objectContaining({
          projectionName: "return_order.read_model",
          aggregateType: "return_order",
          aggregateId: "ret-1",
          lastAppliedVersion: result.event?.version,
          updatedAt: result.event?.timestamp,
        })
      );
    }
  });

  it("fails fast when the return-order projection checkpoint is stale", async () => {
    queueReturnOrderReads({ ...baseReturnOrder, status: "received" });
    getProjectionCheckpointMock.mockReturnValue({
      projectionName: "return_order.read_model",
      aggregateType: "return_order",
      aggregateId: "ret-1",
      lastAppliedVersion: 2,
      projectionVersion: 1,
      schemaHash: "return_order_read_model_v1",
      updatedAt: new Date("2026-03-27T00:00:00.000Z").toISOString(),
    });
    dbGetAggregateEventsMock.mockResolvedValue([
      {
        id: "evt-stale-return-order",
        aggregateType: "return_order",
        aggregateId: "ret-1",
        eventType: "return_order.received",
        payload: {},
        version: 4,
        timestamp: new Date("2026-03-28T12:00:00.000Z").toISOString(),
      },
    ]);

    await expect(
      inspectReturnOrderCommand({
        tenantId: 7,
        returnOrderId: "ret-1",
        actorId: 17,
        inspectionResults: [
          {
            lineId: "00000000-0000-4000-8000-000000000001",
            condition: "used",
          },
        ],
      })
    ).rejects.toBeInstanceOf(ProjectionDriftError);

    expect(dbAppendEventMock).not.toHaveBeenCalled();
    expect(inspectReturnOrderMock).not.toHaveBeenCalled();
  });
});
