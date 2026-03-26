import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { ensureTestEnv, generateCommissionForOrderMock } = vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/afenda_test";

  return {
    ensureTestEnv: true,
    generateCommissionForOrderMock: vi.fn(),
  };
});

void ensureTestEnv;

vi.mock("../modules/sales/commission-service.js", () => ({
  generateCommissionForOrder: generateCommissionForOrderMock,
}));

import salesRouter from "./sales.js";
import { errorHandler } from "../middleware/errorHandler.js";

function createApp(session?: Record<string, unknown>, tenantId = "7") {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = session as typeof req.session;
    req.tenantContext = {
      tenantId,
      userId: typeof session?.uid === "string" ? session.uid : undefined,
      departmentId: undefined,
      industry: undefined,
    };
    next();
  });
  app.use("/api/sales", salesRouter);
  app.use(errorHandler);
  return app;
}

describe("/api/sales/commissions/generate route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 201 for newly generated commissions", async () => {
    generateCommissionForOrderMock.mockResolvedValueOnce({
      persistence: "created",
      calculation: { commissionAmount: "240.00" },
      entry: { id: "entry-1" },
      order: { id: "order-1" },
      plan: { id: "plan-1" },
      metrics: { revenue: "2400.00" },
    });

    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales/commissions/generate")
      .send({ orderId: "00000000-0000-4000-8000-000000000001", planId: "00000000-0000-4000-8000-000000000002" });

    expect(response.status).toBe(201);
    expect(generateCommissionForOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 7,
        actorId: 21,
        orderId: "00000000-0000-4000-8000-000000000001",
        planId: "00000000-0000-4000-8000-000000000002",
      })
    );
  });

  it("returns 200 when an existing commission is regenerated", async () => {
    generateCommissionForOrderMock.mockResolvedValueOnce({
      persistence: "updated",
      calculation: { commissionAmount: "240.00" },
      entry: { id: "entry-1" },
      order: { id: "order-1" },
      plan: { id: "plan-1" },
      metrics: { revenue: "2400.00" },
    });

    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales/commissions/generate")
      .send({
        orderId: "00000000-0000-4000-8000-000000000001",
        planId: "00000000-0000-4000-8000-000000000002",
        replaceExisting: true,
      });

    expect(response.status).toBe(200);
  });

  it("returns 401 when authentication is missing", async () => {
    const response = await request(createApp())
      .post("/api/sales/commissions/generate")
      .send({ orderId: "00000000-0000-4000-8000-000000000001" });

    expect(response.status).toBe(401);
    expect(generateCommissionForOrderMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid payloads", async () => {
    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales/commissions/generate")
      .send({ orderId: "not-a-uuid" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(generateCommissionForOrderMock).not.toHaveBeenCalled();
  });
});