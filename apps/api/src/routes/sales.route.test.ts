import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureTestEnv,
  generateCommissionForOrderMock,
  validateConsignmentStockReportMock,
  generateConsignmentInvoiceDraftMock,
  expireConsignmentAgreementIfNeededMock,
} = vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/afenda_test";

  return {
    ensureTestEnv: true,
    generateCommissionForOrderMock: vi.fn(),
    validateConsignmentStockReportMock: vi.fn(),
    generateConsignmentInvoiceDraftMock: vi.fn(),
    expireConsignmentAgreementIfNeededMock: vi.fn(),
  };
});

void ensureTestEnv;

vi.mock("../modules/sales/commission-service.js", () => ({
  generateCommissionForOrder: generateCommissionForOrderMock,
}));

vi.mock("../modules/sales/consignment-service.js", () => ({
  validateConsignmentStockReport: validateConsignmentStockReportMock,
  generateConsignmentInvoiceDraft: generateConsignmentInvoiceDraftMock,
  expireConsignmentAgreementIfNeeded: expireConsignmentAgreementIfNeededMock,
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

describe("/api/sales/consignment/reports/validate route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns report validation payload", async () => {
    validateConsignmentStockReportMock.mockResolvedValueOnce({
      report: { id: "report-1" },
      agreement: { id: "agreement-1" },
      lines: [{ id: "line-1" }],
      validation: { valid: true, errors: [], lineChecks: [] },
    });

    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales/consignment/reports/validate")
      .send({ reportId: "00000000-0000-4000-8000-000000000010" });

    expect(response.status).toBe(200);
    expect(validateConsignmentStockReportMock).toHaveBeenCalledWith({
      tenantId: 7,
      reportId: "00000000-0000-4000-8000-000000000010",
    });
  });

  it("returns 400 for invalid report id", async () => {
    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales/consignment/reports/validate")
      .send({ reportId: "not-a-uuid" });

    expect(response.status).toBe(400);
    expect(validateConsignmentStockReportMock).not.toHaveBeenCalled();
  });
});

describe("/api/sales/consignment/reports/invoice-draft route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns invoice draft payload", async () => {
    generateConsignmentInvoiceDraftMock.mockResolvedValueOnce({
      report: { id: "report-1" },
      agreement: { id: "agreement-1" },
      lines: [{ id: "line-1" }],
      validation: { valid: true, errors: [], lineChecks: [] },
      draft: { agreementId: "agreement-1", reportId: "report-1", lines: [] },
    });

    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales/consignment/reports/invoice-draft")
      .send({ reportId: "00000000-0000-4000-8000-000000000011" });

    expect(response.status).toBe(200);
    expect(generateConsignmentInvoiceDraftMock).toHaveBeenCalledWith({
      tenantId: 7,
      reportId: "00000000-0000-4000-8000-000000000011",
    });
  });
});

describe("/api/sales/consignment/agreements/expire route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns expiry evaluation payload", async () => {
    expireConsignmentAgreementIfNeededMock.mockResolvedValueOnce({
      persistence: "updated",
      agreement: { id: "agreement-1", status: "expired" },
      expiry: { shouldTransition: true, nextStatus: "expired" },
    });

    const response = await request(createApp({ uid: "42", roles: ["admin"] }))
      .post("/api/sales/consignment/agreements/expire")
      .send({ agreementId: "00000000-0000-4000-8000-000000000012" });

    expect(response.status).toBe(200);
    expect(expireConsignmentAgreementIfNeededMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 7,
        actorId: 42,
        agreementId: "00000000-0000-4000-8000-000000000012",
      })
    );
  });

  it("returns 401 when authentication is missing", async () => {
    const response = await request(createApp())
      .post("/api/sales/consignment/agreements/expire")
      .send({ agreementId: "00000000-0000-4000-8000-000000000012" });

    expect(response.status).toBe(401);
    expect(expireConsignmentAgreementIfNeededMock).not.toHaveBeenCalled();
  });
});