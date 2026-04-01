import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureTestEnv,
  selectMock,
  updateMock,
  dbAppendEventMock,
  dbGetAggregateEventsMock,
  getProjectionCheckpointMock,
  upsertProjectionCheckpointMock,
  queueSelect,
  setUpdateResult,
  runOrderConfirmationPipelineMock,
} = vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/afenda_test";

  const selectQueue: unknown[][] = [];
  let updateResult: unknown[] = [];

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
    updateMock: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => updateResult),
        })),
      })),
    })),
    dbAppendEventMock: vi.fn(async (aggregateType, aggregateId, eventType, payload, metadata) => ({
      id: `evt-${eventType}`,
      aggregateType,
      aggregateId,
      eventType,
      payload,
      metadata,
      version: 1,
      timestamp: new Date("2026-01-03T00:00:00.000Z").toISOString(),
    })),
    dbGetAggregateEventsMock: vi.fn<() => Promise<unknown[]>>(async () => []),
    getProjectionCheckpointMock: vi.fn<() => unknown | null>(() => null),
    upsertProjectionCheckpointMock: vi.fn(),
    queueSelect: (...rows: unknown[][]) => {
      selectQueue.push(...rows);
    },
    setUpdateResult: (rows: unknown[]) => {
      updateResult = rows;
    },
    runOrderConfirmationPipelineMock: vi.fn(async () => ({
      status: "confirmed" as const,
      stagesExecuted: ["precheck", "truth_confirm", "post_confirm"] as const,
    })),
  };
});

void ensureTestEnv;

vi.mock("@afenda/db/queries/sales", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@afenda/db/queries/sales")>();
  return {
    ...orig,
    runOrderConfirmationPipeline: runOrderConfirmationPipelineMock,
  };
});

vi.mock("../../../db/index.js", () => ({
  db: {
    select: selectMock,
    update: updateMock,
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

vi.mock("../../../db/schema/index.js", () => ({
  partners: {
    tenantId: "partners.tenantId",
    id: "partners.id",
    deletedAt: "partners.deletedAt",
  },
  salesOrders: {
    tenantId: "salesOrders.tenantId",
    id: "salesOrders.id",
    partnerId: "salesOrders.partnerId",
    deletedAt: "salesOrders.deletedAt",
  },
  salesOrderLines: {
    tenantId: "salesOrderLines.tenantId",
    orderId: "salesOrderLines.orderId",
    deletedAt: "salesOrderLines.deletedAt",
  },
}));

import { ConflictError } from "../../../middleware/errorHandler.js";
import { ProjectionDriftError } from "../../../events/projectionRuntime.js";
import { cancelSalesOrder, confirmSalesOrder } from "../sales-order-command-service.js";

const baseOrder = {
  id: "order-1",
  tenantId: 7,
  name: "SO-100",
  partnerId: "partner-1",
  status: "draft" as const,
  sequenceNumber: null,
  quotationDate: null,
  confirmationDate: null,
  confirmedBy: null,
  currencyId: 1,
  pricelistId: null,
  fiscalPositionId: null,
  companyCurrencyRate: "1.000000",
  creditCheckPassed: false,
  creditCheckAt: null,
  creditCheckBy: null,
  creditLimitAtCheck: null,
  invoiceStatus: "no" as const,
  deliveryStatus: "no" as const,
  cancelReason: null,
  amountUntaxed: "100.00",
  amountTax: "10.00",
  amountTotal: "110.00",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedBy: 10,
  deletedAt: null,
};

const baseLine = {
  id: "line-1",
  tenantId: 7,
  orderId: "order-1",
  productId: "product-1",
  taxId: null,
  quantity: "1.0000",
  priceUnit: "100.00",
  discount: "0.00",
  priceSubtotal: "100.00",
  priceTax: "10.00",
  priceTotal: "110.00",
  qtyDelivered: "0.0000",
  qtyToInvoice: "1.0000",
  qtyInvoiced: "0.0000",
  invoiceStatus: "no" as const,
  displayType: "product" as const,
  deletedAt: null,
};

const basePartner = {
  id: "partner-1",
  tenantId: 7,
  creditLimit: "500.00",
  totalDue: "50.00",
  deletedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  setUpdateResult([]);
  getProjectionCheckpointMock.mockReturnValue(null);
  dbGetAggregateEventsMock.mockResolvedValue([]);
  runOrderConfirmationPipelineMock.mockResolvedValue({
    status: "confirmed",
    stagesExecuted: ["precheck", "truth_confirm", "post_confirm"],
  });
});

describe("sales-order command service", () => {
  it("confirms a sales order through event-only append and projection persistence", async () => {
    const orderAfterPipeline = { ...baseOrder, status: "sale" as const };
    queueSelect(
      [baseOrder],
      [baseLine],
      [basePartner],
      [orderAfterPipeline],
      [orderAfterPipeline]
    );
    setUpdateResult([
      {
        ...baseOrder,
        status: "sale",
        sequenceNumber: "SO-100",
        creditCheckPassed: true,
      },
    ]);

    const result = await confirmSalesOrder({
      tenantId: 7,
      orderId: "order-1",
      actorId: 99,
    });

    expect(result.order.status).toBe("sale");
    expect(result.mutationPolicy).toBe("event-only");
    expect(result.event?.eventType).toBe("sales_order.confirmed");
    expect(result.creditCheck.approved).toBe(true);
    expect(runOrderConfirmationPipelineMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: 7,
        orderId: "order-1",
        actorUserId: 99,
        truthOverrides: expect.objectContaining({
          creditCommitSnapshot: expect.objectContaining({ checkPassed: true }),
        }),
      })
    );
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "sales_order",
      "order-1",
      "sales_order.confirmed",
      expect.objectContaining({
        operation: "update",
        model: "sales_order",
      }),
      expect.objectContaining({
        actor: "99",
        source: "api.sales.orders.confirm",
        truthImpact: expect.objectContaining({
          graphLayer: "truth",
          operation: "confirm",
          startTable: "sales_orders",
        }),
      })
    );
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("rejects confirmation when credit policy fails", async () => {
    queueSelect([{ ...baseOrder, amountTotal: "800.00" }], [baseLine], [basePartner]);

    await expect(
      confirmSalesOrder({
        tenantId: 7,
        orderId: "order-1",
        actorId: 99,
      })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(runOrderConfirmationPipelineMock).not.toHaveBeenCalled();
    expect(dbAppendEventMock).not.toHaveBeenCalled();
  });

  it("cancels a sales order through event-only append and projection persistence", async () => {
    queueSelect([{ ...baseOrder, status: "sale" }], [baseLine], [{ ...baseOrder, status: "sale" }]);
    setUpdateResult([
      {
        ...baseOrder,
        status: "cancel",
        cancelReason: "Customer request",
      },
    ]);

    const result = await cancelSalesOrder({
      tenantId: 7,
      orderId: "order-1",
      actorId: 33,
      reason: "Customer request",
    });

    expect(result.order.status).toBe("cancel");
    expect(result.event?.eventType).toBe("sales_order.cancelled");
    expect(result.mutationPolicy).toBe("event-only");
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "sales_order",
      "order-1",
      "sales_order.cancelled",
      expect.any(Object),
      expect.objectContaining({
        actor: "33",
        source: "api.sales.orders.cancel",
        truthImpact: expect.objectContaining({
          graphLayer: "truth",
          operation: "cancel",
          startTable: "sales_orders",
        }),
      })
    );
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("fails fast when projection checkpoint is stale before append-and-project", async () => {
    queueSelect([{ ...baseOrder, status: "sale" }], [baseLine], [{ ...baseOrder, status: "sale" }]);
    getProjectionCheckpointMock.mockReturnValue({
      projectionName: "sales_order.read_model",
      aggregateType: "sales_order",
      aggregateId: "order-1",
      lastAppliedVersion: 1,
      projectionVersion: 1,
      schemaHash: "sales_order_read_model_v1",
      updatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    });
    dbGetAggregateEventsMock.mockResolvedValue([
      {
        id: "evt-1",
        aggregateType: "sales_order",
        aggregateId: "order-1",
        eventType: "sales_order.submitted",
        payload: {},
        version: 3,
        timestamp: new Date("2026-01-02T00:00:00.000Z").toISOString(),
      },
    ]);

    await expect(
      cancelSalesOrder({
        tenantId: 7,
        orderId: "order-1",
        actorId: 99,
        reason: "Customer request",
      })
    ).rejects.toBeInstanceOf(ProjectionDriftError);

    expect(dbAppendEventMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
