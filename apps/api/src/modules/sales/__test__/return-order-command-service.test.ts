import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureTestEnv,
  selectMock,
  dbAppendEventMock,
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
}));

vi.mock("../../../events/projectionCheckpointStore.js", () => ({
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

const baseReturnOrder = {
  id: "ret-1",
  tenantId: 7,
  status: "draft",
  deletedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("return-order command service", () => {
  it("runs approve command under dual-write policy and appends event", async () => {
    queueSelect([baseReturnOrder]);
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
    expect(result.mutationPolicy).toBe("dual-write");
    expect(result.event?.eventType).toBe("return_order.approved");
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "return_order",
      "ret-1",
      "return_order.approved",
      expect.any(Object),
      expect.objectContaining({
        actor: "15",
        source: "api.sales.returns.approve",
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

  it("runs receive command under dual-write policy and appends event", async () => {
    queueSelect([{ ...baseReturnOrder, status: "approved" }]);
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
    expect(result.mutationPolicy).toBe("dual-write");
    expect(result.event?.eventType).toBe("return_order.received");
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "return_order",
      "ret-1",
      "return_order.received",
      expect.any(Object),
      expect.objectContaining({
        actor: "16",
        source: "api.sales.returns.receive",
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

  it("runs inspect command under dual-write policy and appends event", async () => {
    queueSelect([{ ...baseReturnOrder, status: "received" }]);
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
    expect(result.mutationPolicy).toBe("dual-write");
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

  it("runs credit-note command under dual-write policy and appends event", async () => {
    queueSelect([{ ...baseReturnOrder, status: "inspected" }]);
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
    expect(result.mutationPolicy).toBe("dual-write");
    expect(result.event?.eventType).toBe("return_order.credited");
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "return_order",
      "ret-1",
      "return_order.credited",
      expect.any(Object),
      expect.objectContaining({
        actor: "18",
        source: "api.sales.returns.credit_note",
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
});
