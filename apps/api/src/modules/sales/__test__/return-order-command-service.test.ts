import { beforeEach, describe, expect, it, vi } from "vitest";

const { ensureTestEnv, selectMock, dbAppendEventMock, approveReturnMock, queueSelect } = vi.hoisted(
  () => {
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
      approveReturnMock: vi.fn(),
      queueSelect: (...rows: unknown[][]) => {
        selectQueue.push(...rows);
      },
    };
  }
);

void ensureTestEnv;

vi.mock("../../../db/index.js", () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock("../../../events/dbEventStore.js", () => ({
  dbAppendEvent: dbAppendEventMock,
}));

vi.mock("../returns-service.js", () => ({
  approveReturn: approveReturnMock,
}));

vi.mock("../../../db/schema/index.js", () => ({
  returnOrders: {
    tenantId: "returnOrders.tenantId",
    id: "returnOrders.id",
    deletedAt: "returnOrders.deletedAt",
  },
}));

import { approveReturnOrderCommand } from "../return-order-command-service.js";

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
  });
});
