import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSchemaMock,
  resolveRbacMock,
  selectFromMock,
  selectLimitMock,
  insertValuesMock,
  updateSetMock,
  deleteWhereMock,
  consignmentAgreementsTable,
  salesOrdersTable,
  dbAppendEventMock,
} = vi.hoisted(() => {
  const selectLimitMock = vi.fn();
  const selectWhereMock = vi.fn(() => ({
    limit: selectLimitMock,
  }));
  const selectFromMock = vi.fn(() => ({
    where: selectWhereMock,
  }));

  const insertReturningMock = vi.fn();
  const insertValuesMock = vi.fn(() => ({
    returning: insertReturningMock,
  }));

  const updateReturningMock = vi.fn();
  const updateWhereMock = vi.fn(() => ({
    returning: updateReturningMock,
  }));
  const updateSetMock = vi.fn(() => ({
    where: updateWhereMock,
  }));

  const deleteWhereMock = vi.fn(() => ({
    returning: vi.fn(),
  }));

  return {
    getSchemaMock: vi.fn(),
    resolveRbacMock: vi.fn(),
    selectFromMock,
    selectWhereMock,
    selectLimitMock,
    insertReturningMock,
    insertValuesMock,
    updateReturningMock,
    updateWhereMock,
    updateSetMock,
    deleteWhereMock,
    consignmentAgreementsTable: { id: "id-column" },
    salesOrdersTable: { id: "id-column" },
    dbAppendEventMock: vi.fn(),
  };
});

vi.mock("../../meta/registry.js", () => ({
  getSchema: getSchemaMock,
}));

vi.mock("../../meta/rbac.js", () => ({
  resolveRbac: resolveRbacMock,
}));

vi.mock("../../db/index.js", () => ({
  db: {
    select: vi.fn(() => ({
      from: selectFromMock,
    })),
    insert: vi.fn(() => ({
      values: insertValuesMock,
    })),
    update: vi.fn(() => ({
      set: updateSetMock,
    })),
    delete: vi.fn(() => ({
      where: deleteWhereMock,
    })),
  },
}));

vi.mock("../../events/dbEventStore.js", () => ({
  dbAppendEvent: dbAppendEventMock,
}));

vi.mock("../../db/schema/index.js", () => ({
  consignmentAgreements: consignmentAgreementsTable,
  salesOrders: salesOrdersTable,
}));

import apiRouter from "../api.js";

function createApp(session?: Record<string, unknown>) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = session as typeof req.session;
    next();
  });
  app.use("/api", apiRouter);
  return app;
}

describe("/api generic CRUD invariant enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getSchemaMock.mockResolvedValue({
      model: "sales_order",
      fields: [
        { name: "status", type: "string" },
        { name: "amount_total", type: "float" },
        { name: "partner_id", type: "uuid" },
      ],
    });

    resolveRbacMock.mockReturnValue({
      allowedOps: {
        can_create: true,
        can_read: true,
        can_update: true,
        can_delete: true,
      },
      visibleFields: ["status", "amount_total", "partner_id"],
      writableFields: ["status", "amount_total", "partner_id"],
    });
  });

  it("returns 400 INVARIANT_VIOLATION for POST when a create payload violates truth invariants", async () => {
    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/consignment_agreement")
      .send({
        status: "active",
        partner_id: null,
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVARIANT_VIOLATION");
    expect(response.body.details.model).toBe("consignment_agreement");
    expect(response.body.details.operation).toBe("create");
    expect(response.body.details.errors[0].invariantId).toBe(
      "sales.consignment_agreement.active_has_partner"
    );
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("returns 400 INVARIANT_VIOLATION for PATCH when the merged record violates truth invariants", async () => {
    selectLimitMock.mockResolvedValueOnce([
      {
        id: "so-1",
        status: "draft",
        amount_total: 100,
      },
    ]);

    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .patch("/api/sales_order/so-1")
      .send({
        status: "sale",
        amount_total: 0,
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVARIANT_VIOLATION");
    expect(response.body.details.model).toBe("sales_order");
    expect(response.body.details.operation).toBe("update");
    expect(response.body.details.errors[0].invariantId).toBe(
      "sales.sales_order.confirmed_amount_positive"
    );
    expect(updateSetMock).not.toHaveBeenCalled();
  });

  it("appends a direct mutation event for dual-write create operations", async () => {
    insertValuesMock.mockReturnValueOnce({
      returning: vi.fn().mockResolvedValueOnce([
        {
          id: "so-2",
          status: "draft",
          amount_total: 120,
        },
      ]),
    });
    dbAppendEventMock.mockResolvedValueOnce({
      id: "evt-1",
      aggregateType: "sales_order",
      aggregateId: "so-2",
      eventType: "sales_order.submitted",
      payload: {},
      version: 1,
      timestamp: new Date().toISOString(),
    });

    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales_order")
      .send({
        status: "draft",
        amount_total: 120,
      });

    expect(response.status).toBe(201);
    expect(response.body.meta.mutationPolicy).toBe("dual-write");
    expect(response.body.meta.eventType).toBe("sales_order.submitted");
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "sales_order",
      "so-2",
      "sales_order.submitted",
      expect.objectContaining({ operation: "create", model: "sales_order" }),
      expect.objectContaining({ actor: "21", source: "api.generic-crud" })
    );
  });

  it("rejects bulk update for non-direct mutation policies", async () => {
    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales_order/bulk-update")
      .send({
        ids: ["so-1", "so-2"],
        updates: { status: "sale" },
      });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("MUTATION_POLICY_VIOLATION");
    expect(response.body.details.model).toBe("sales_order");
    expect(response.body.details.mutationPolicy).toBe("dual-write");
    expect(updateSetMock).not.toHaveBeenCalled();
  });
});
