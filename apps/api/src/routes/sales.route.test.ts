import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureTestEnv,
  generateCommissionForOrderMock,
  approveCommissionEntriesMock,
  payCommissionEntriesMock,
  getCommissionReportMock,
  validateConsignmentStockReportMock,
  generateConsignmentInvoiceDraftMock,
  expireConsignmentAgreementIfNeededMock,
  recordDocumentStatusHistoryMock,
  createDocumentApprovalRequestMock,
  approveDocumentMock,
  rejectDocumentMock,
  registerDocumentAttachmentMock,
  postAccountingEntryMock,
  reverseAccountingPostingMock,
  resolveRoundingPolicyMock,
} = vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/afenda_test";

  return {
    ensureTestEnv: true,
    generateCommissionForOrderMock: vi.fn(),
    approveCommissionEntriesMock: vi.fn(),
    payCommissionEntriesMock: vi.fn(),
    getCommissionReportMock: vi.fn(),
    validateConsignmentStockReportMock: vi.fn(),
    generateConsignmentInvoiceDraftMock: vi.fn(),
    expireConsignmentAgreementIfNeededMock: vi.fn(),
    recordDocumentStatusHistoryMock: vi.fn(),
    createDocumentApprovalRequestMock: vi.fn(),
    approveDocumentMock: vi.fn(),
    rejectDocumentMock: vi.fn(),
    registerDocumentAttachmentMock: vi.fn(),
    postAccountingEntryMock: vi.fn(),
    reverseAccountingPostingMock: vi.fn(),
    resolveRoundingPolicyMock: vi.fn(),
  };
});

void ensureTestEnv;

vi.mock("../modules/sales/commission-service.js", () => ({
  generateCommissionForOrder: generateCommissionForOrderMock,
  approveCommissionEntries: approveCommissionEntriesMock,
  payCommissionEntries: payCommissionEntriesMock,
  getCommissionReport: getCommissionReportMock,
}));

vi.mock("../modules/sales/consignment-service.js", () => ({
  validateConsignmentStockReport: validateConsignmentStockReportMock,
  generateConsignmentInvoiceDraft: generateConsignmentInvoiceDraftMock,
  expireConsignmentAgreementIfNeeded: expireConsignmentAgreementIfNeededMock,
}));

vi.mock("../modules/sales/document-infrastructure-service.js", () => ({
  recordDocumentStatusHistory: recordDocumentStatusHistoryMock,
  createDocumentApprovalRequest: createDocumentApprovalRequestMock,
  approveDocument: approveDocumentMock,
  rejectDocument: rejectDocumentMock,
  registerDocumentAttachment: registerDocumentAttachmentMock,
  postAccountingEntry: postAccountingEntryMock,
  reverseAccountingPosting: reverseAccountingPostingMock,
  resolveRoundingPolicy: resolveRoundingPolicyMock,
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
      .send({
        orderId: "00000000-0000-4000-8000-000000000001",
        planId: "00000000-0000-4000-8000-000000000002",
      });

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

describe("/api/sales/commissions/approve route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns approval summary", async () => {
    approveCommissionEntriesMock.mockResolvedValueOnce({
      updatedCount: 1,
      unchangedCount: 0,
      entries: [{ id: "entry-1", status: "approved" }],
    });

    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales/commissions/approve")
      .send({ entryId: "00000000-0000-4000-8000-000000000021" });

    expect(response.status).toBe(200);
    expect(approveCommissionEntriesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 7,
        actorId: 21,
        entryIds: ["00000000-0000-4000-8000-000000000021"],
      })
    );
  });

  it("returns 400 for invalid approval payload", async () => {
    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales/commissions/approve")
      .send({ entryId: "bad-uuid" });

    expect(response.status).toBe(400);
    expect(approveCommissionEntriesMock).not.toHaveBeenCalled();
  });
});

describe("/api/sales/commissions/pay route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns payment summary", async () => {
    payCommissionEntriesMock.mockResolvedValueOnce({
      updatedCount: 2,
      unchangedCount: 0,
      entries: [
        { id: "entry-1", status: "paid" },
        { id: "entry-2", status: "paid" },
      ],
    });

    const response = await request(createApp({ uid: "42", roles: ["admin"] }))
      .post("/api/sales/commissions/pay")
      .send({ salespersonId: 21, paidDate: "2026-03-26T00:00:00.000Z" });

    expect(response.status).toBe(200);
    expect(payCommissionEntriesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 7,
        actorId: 42,
        salespersonId: 21,
      })
    );
  });

  it("returns 400 for invalid payment payload", async () => {
    const response = await request(createApp({ uid: "42", roles: ["admin"] }))
      .post("/api/sales/commissions/pay")
      .send({ paidDate: "not-a-date" });

    expect(response.status).toBe(400);
    expect(payCommissionEntriesMock).not.toHaveBeenCalled();
  });
});

describe("/api/sales/commissions/report route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns report payload", async () => {
    getCommissionReportMock.mockResolvedValueOnce({
      entries: [{ id: "entry-1" }],
      summary: {
        count: 1,
        baseAmountTotal: "1000.00",
        commissionAmountTotal: "100.00",
        byStatus: {
          draft: { count: 1, commissionAmountTotal: "100.00" },
          approved: { count: 0, commissionAmountTotal: "0.00" },
          paid: { count: 0, commissionAmountTotal: "0.00" },
        },
      },
    });

    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales/commissions/report")
      .send({ status: "draft", limit: 10, offset: 0 });

    expect(response.status).toBe(200);
    expect(getCommissionReportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 7,
        status: "draft",
        limit: 10,
      })
    );
  });

  it("returns 400 for invalid report payload", async () => {
    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales/commissions/report")
      .send({ limit: -1 });

    expect(response.status).toBe(400);
    expect(getCommissionReportMock).not.toHaveBeenCalled();
  });
});

describe("/api/sales/documents/status-history route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records status transitions", async () => {
    recordDocumentStatusHistoryMock.mockResolvedValueOnce({
      entry: { id: "status-1", toStatus: "approved" },
    });

    const response = await request(createApp({ uid: "15", roles: ["admin"] }))
      .post("/api/sales/documents/status-history")
      .send({
        documentType: "sales_order",
        documentId: "00000000-0000-4000-8000-000000000201",
        fromStatus: "draft",
        toStatus: "approved",
      });

    expect(response.status).toBe(201);
    expect(recordDocumentStatusHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 7,
        actorId: 15,
        documentType: "sales_order",
      })
    );
  });
});

describe("/api/sales/documents/approvals/request route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates approval requests", async () => {
    createDocumentApprovalRequestMock.mockResolvedValueOnce({
      approval: { id: "approval-1", status: "pending" },
    });

    const response = await request(createApp({ uid: "15", roles: ["admin"] }))
      .post("/api/sales/documents/approvals/request")
      .send({
        documentType: "sales_order",
        documentId: "00000000-0000-4000-8000-000000000202",
        approvalLevel: 1,
        approverUserId: 42,
      });

    expect(response.status).toBe(201);
    expect(createDocumentApprovalRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 7,
        actorId: 15,
        approverUserId: 42,
      })
    );
  });
});

describe("/api/sales/documents/approvals/approve route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approves an approval request", async () => {
    approveDocumentMock.mockResolvedValueOnce({
      approval: { id: "approval-2", status: "approved" },
    });

    const response = await request(createApp({ uid: "42", roles: ["admin"] }))
      .post("/api/sales/documents/approvals/approve")
      .send({ approvalId: "00000000-0000-4000-8000-000000000203" });

    expect(response.status).toBe(200);
    expect(approveDocumentMock).toHaveBeenCalledWith({
      tenantId: 7,
      actorId: 42,
      approvalId: "00000000-0000-4000-8000-000000000203",
      comments: undefined,
    });
  });

  it("rejects an approval request", async () => {
    rejectDocumentMock.mockResolvedValueOnce({
      approval: { id: "approval-3", status: "rejected" },
    });

    const response = await request(createApp({ uid: "42", roles: ["admin"] }))
      .post("/api/sales/documents/approvals/reject")
      .send({ approvalId: "00000000-0000-4000-8000-000000000207", comments: "missing docs" });

    expect(response.status).toBe(200);
    expect(rejectDocumentMock).toHaveBeenCalledWith({
      tenantId: 7,
      actorId: 42,
      approvalId: "00000000-0000-4000-8000-000000000207",
      comments: "missing docs",
    });
  });
});

describe("/api/sales/documents/attachments route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers an attachment", async () => {
    registerDocumentAttachmentMock.mockResolvedValueOnce({
      attachment: { id: "attachment-1", fileName: "invoice.pdf" },
    });

    const response = await request(createApp({ uid: "9", roles: ["admin"] }))
      .post("/api/sales/documents/attachments")
      .send({
        documentType: "sales_order",
        documentId: "00000000-0000-4000-8000-000000000204",
        fileName: "invoice.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
        storageProvider: "s3",
        storagePath: "tenant-7/order-204/invoice.pdf",
      });

    expect(response.status).toBe(201);
    expect(registerDocumentAttachmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 7,
        actorId: 9,
        fileName: "invoice.pdf",
      })
    );
  });
});

describe("/api/sales/accounting/postings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts accounting entries", async () => {
    postAccountingEntryMock.mockResolvedValueOnce({
      posting: { id: "posting-1", postingStatus: "posted" },
    });

    const response = await request(createApp({ uid: "9", roles: ["admin"] }))
      .post("/api/sales/accounting/postings/post")
      .send({
        sourceDocumentType: "sales_order",
        sourceDocumentId: "00000000-0000-4000-8000-000000000205",
        amount: "350.00",
        currencyCode: "usd",
      });

    expect(response.status).toBe(201);
    expect(postAccountingEntryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 7,
        actorId: 9,
        currencyCode: "USD",
      })
    );
  });

  it("reverses posted accounting entries", async () => {
    reverseAccountingPostingMock.mockResolvedValueOnce({
      posting: { id: "posting-1", postingStatus: "reversed" },
      reversalPosting: { id: "posting-rev-1", postingStatus: "posted" },
    });

    const response = await request(createApp({ uid: "9", roles: ["admin"] }))
      .post("/api/sales/accounting/postings/reverse")
      .send({ postingId: "00000000-0000-4000-8000-000000000206" });

    expect(response.status).toBe(200);
    expect(reverseAccountingPostingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 7,
        actorId: 9,
        postingId: "00000000-0000-4000-8000-000000000206",
      })
    );
  });
});

describe("/api/sales/rounding/resolve route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves rounding policy", async () => {
    resolveRoundingPolicyMock.mockResolvedValueOnce({
      policy: { id: "policy-1", policyKey: "price-default" },
      resolution: "currency-match",
    });

    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales/rounding/resolve")
      .send({
        policyKey: "price-default",
        appliesTo: "sales_order",
        currencyCode: "usd",
      });

    expect(response.status).toBe(200);
    expect(resolveRoundingPolicyMock).toHaveBeenCalledWith({
      tenantId: 7,
      policyKey: "price-default",
      appliesTo: "sales_order",
      currencyCode: "USD",
      effectiveAt: undefined,
    });
  });
});
