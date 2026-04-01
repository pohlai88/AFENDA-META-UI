import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureTestEnv,
  confirmSalesOrderMock,
  cancelSalesOrderMock,
  approveReturnOrderCommandMock,
  generateReturnCreditNoteCommandMock,
  inspectReturnOrderCommandMock,
  receiveReturnOrderCommandMock,
  activateSubscriptionCommandMock,
  pauseSubscriptionCommandMock,
  renewSubscriptionCommandMock,
  resumeSubscriptionCommandMock,
  cancelSubscriptionCommandMock,
  approveCommissionEntryCommandMock,
  approveCommissionEntriesCommandMock,
  generateCommissionForOrderCommandMock,
  payCommissionEntryCommandMock,
  payCommissionEntriesCommandMock,
  removeCommissionEntryCommandMock,
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
    confirmSalesOrderMock: vi.fn(),
    cancelSalesOrderMock: vi.fn(),
    approveReturnOrderCommandMock: vi.fn(),
    generateReturnCreditNoteCommandMock: vi.fn(),
    inspectReturnOrderCommandMock: vi.fn(),
    receiveReturnOrderCommandMock: vi.fn(),
    activateSubscriptionCommandMock: vi.fn(),
    pauseSubscriptionCommandMock: vi.fn(),
    renewSubscriptionCommandMock: vi.fn(),
    resumeSubscriptionCommandMock: vi.fn(),
    cancelSubscriptionCommandMock: vi.fn(),
    approveCommissionEntryCommandMock: vi.fn(),
    approveCommissionEntriesCommandMock: vi.fn(),
    generateCommissionForOrderCommandMock: vi.fn(),
    payCommissionEntryCommandMock: vi.fn(),
    payCommissionEntriesCommandMock: vi.fn(),
    removeCommissionEntryCommandMock: vi.fn(),
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

vi.mock("../../modules/sales/sales-order-command-service.js", () => ({
  confirmSalesOrder: confirmSalesOrderMock,
  cancelSalesOrder: cancelSalesOrderMock,
}));

vi.mock("../../modules/sales/return-order-command-service.js", () => ({
  approveReturnOrderCommand: approveReturnOrderCommandMock,
  generateReturnCreditNoteCommand: generateReturnCreditNoteCommandMock,
  inspectReturnOrderCommand: inspectReturnOrderCommandMock,
  receiveReturnOrderCommand: receiveReturnOrderCommandMock,
}));

vi.mock("../../modules/sales/subscription-command-service.js", () => ({
  activateSubscriptionCommand: activateSubscriptionCommandMock,
  pauseSubscriptionCommand: pauseSubscriptionCommandMock,
  renewSubscriptionCommand: renewSubscriptionCommandMock,
  resumeSubscriptionCommand: resumeSubscriptionCommandMock,
  cancelSubscriptionCommand: cancelSubscriptionCommandMock,
}));

vi.mock("../../modules/sales/commission-command-service.js", () => ({
  approveCommissionEntryCommand: approveCommissionEntryCommandMock,
  approveCommissionEntriesCommand: approveCommissionEntriesCommandMock,
  generateCommissionForOrderCommand: generateCommissionForOrderCommandMock,
  payCommissionEntryCommand: payCommissionEntryCommandMock,
  payCommissionEntriesCommand: payCommissionEntriesCommandMock,
  removeCommissionEntryCommand: removeCommissionEntryCommandMock,
}));

vi.mock("../../modules/sales/commission-service.js", () => ({
  getCommissionReport: getCommissionReportMock,
}));

vi.mock("../../modules/sales/consignment-service.js", () => ({
  validateConsignmentStockReport: validateConsignmentStockReportMock,
  generateConsignmentInvoiceDraft: generateConsignmentInvoiceDraftMock,
  expireConsignmentAgreementIfNeeded: expireConsignmentAgreementIfNeededMock,
}));

vi.mock("../../modules/sales/document-infrastructure-service.js", () => ({
  recordDocumentStatusHistory: recordDocumentStatusHistoryMock,
  createDocumentApprovalRequest: createDocumentApprovalRequestMock,
  approveDocument: approveDocumentMock,
  rejectDocument: rejectDocumentMock,
  registerDocumentAttachment: registerDocumentAttachmentMock,
  postAccountingEntry: postAccountingEntryMock,
  reverseAccountingPosting: reverseAccountingPostingMock,
  resolveRoundingPolicy: resolveRoundingPolicyMock,
}));

import salesRouter from "../sales.js";
import { errorHandler } from "../../middleware/errorHandler.js";

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
    generateCommissionForOrderCommandMock.mockResolvedValueOnce({
      persistence: "created",
      calculation: { commissionAmount: "240.00" },
      entry: { id: "entry-1" },
      order: { id: "order-1" },
      plan: { id: "plan-1" },
      metrics: { revenue: "2400.00" },
      assignment: { salespersonId: 21, selectedBy: "order_user", territoryMatch: null },
      mutationPolicy: "dual-write",
      event: { id: "evt-generate", eventType: "commission_entry.generated" },
    });

    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales/commissions/generate")
      .send({
        orderId: "00000000-0000-4000-8000-000000000001",
        planId: "00000000-0000-4000-8000-000000000002",
      });

    expect(response.status).toBe(201);
    expect(generateCommissionForOrderCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 7,
        actorId: 21,
        orderId: "00000000-0000-4000-8000-000000000001",
        planId: "00000000-0000-4000-8000-000000000002",
      })
    );
    expect(response.body.mutationPolicy).toBe("dual-write");
    expect(response.body.event.eventType).toBe("commission_entry.generated");
  });

  it("returns 200 when an existing commission is regenerated", async () => {
    generateCommissionForOrderCommandMock.mockResolvedValueOnce({
      persistence: "updated",
      calculation: { commissionAmount: "240.00" },
      entry: { id: "entry-1" },
      order: { id: "order-1" },
      plan: { id: "plan-1" },
      metrics: { revenue: "2400.00" },
      assignment: { salespersonId: 21, selectedBy: "order_user", territoryMatch: null },
      mutationPolicy: "dual-write",
      event: { id: "evt-regenerate", eventType: "commission_entry.recalculated" },
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
    expect(generateCommissionForOrderCommandMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid payloads", async () => {
    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales/commissions/generate")
      .send({ orderId: "not-a-uuid" });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(generateCommissionForOrderCommandMock).not.toHaveBeenCalled();
  });
});

describe("/api/sales/orders/confirm route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns projection-aware confirmation payload", async () => {
    confirmSalesOrderMock.mockResolvedValueOnce({
      order: { id: "order-1", status: "sale" },
      mutationPolicy: "event-only",
      event: { id: "evt-1", eventType: "sales_order.confirmed" },
      creditCheck: { approved: true },
    });

    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales/orders/confirm")
      .send({ orderId: "00000000-0000-4000-8000-000000000020" });

    expect(response.status).toBe(200);
    expect(confirmSalesOrderMock).toHaveBeenCalledWith({
      tenantId: 7,
      orderId: "00000000-0000-4000-8000-000000000020",
      actorId: 21,
    });
    expect(response.body.mutationPolicy).toBe("event-only");
    expect(response.body.event.eventType).toBe("sales_order.confirmed");
  });

  it("returns 400 for invalid order ids", async () => {
    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales/orders/confirm")
      .send({ orderId: "not-a-uuid" });

    expect(response.status).toBe(400);
    expect(confirmSalesOrderMock).not.toHaveBeenCalled();
  });
});

describe("/api/sales/orders/cancel route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns projection-aware cancellation payload", async () => {
    cancelSalesOrderMock.mockResolvedValueOnce({
      order: { id: "order-1", status: "cancel" },
      mutationPolicy: "event-only",
      event: { id: "evt-2", eventType: "sales_order.cancelled" },
    });

    const response = await request(createApp({ uid: "42", roles: ["admin"] }))
      .post("/api/sales/orders/cancel")
      .send({ orderId: "00000000-0000-4000-8000-000000000021", reason: "Customer request" });

    expect(response.status).toBe(200);
    expect(cancelSalesOrderMock).toHaveBeenCalledWith({
      tenantId: 7,
      orderId: "00000000-0000-4000-8000-000000000021",
      actorId: 42,
      reason: "Customer request",
    });
    expect(response.body.event.eventType).toBe("sales_order.cancelled");
  });
});

describe("/api/sales/returns/approve route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns command result with event-only event metadata", async () => {
    approveReturnOrderCommandMock.mockResolvedValueOnce({
      returnOrder: { id: "return-1", status: "approved" },
      validation: { valid: true, errors: [], issues: [] },
      mutationPolicy: "event-only",
      event: { id: "evt-approve", eventType: "return_order.approved" },
    });

    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales/returns/approve")
      .send({
        returnOrderId: "00000000-0000-4000-8000-000000000041",
      });

    expect(response.status).toBe(200);
    expect(approveReturnOrderCommandMock).toHaveBeenCalledWith({
      tenantId: 7,
      returnOrderId: "00000000-0000-4000-8000-000000000041",
      actorId: 21,
      approvedDate: undefined,
    });
    expect(response.body.mutationPolicy).toBe("event-only");
    expect(response.body.event.eventType).toBe("return_order.approved");
  });
});

describe("/api/sales/returns/receive route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns command result with event-only event metadata", async () => {
    receiveReturnOrderCommandMock.mockResolvedValueOnce({
      returnOrder: { id: "return-2", status: "received" },
      mutationPolicy: "event-only",
      event: { id: "evt-receive", eventType: "return_order.received" },
    });

    const response = await request(createApp({ uid: "22", roles: ["admin"] }))
      .post("/api/sales/returns/receive")
      .send({
        returnOrderId: "00000000-0000-4000-8000-000000000042",
      });

    expect(response.status).toBe(200);
    expect(receiveReturnOrderCommandMock).toHaveBeenCalledWith({
      tenantId: 7,
      returnOrderId: "00000000-0000-4000-8000-000000000042",
      actorId: 22,
    });
    expect(response.body.mutationPolicy).toBe("event-only");
    expect(response.body.event.eventType).toBe("return_order.received");
  });
});

describe("/api/sales/returns/inspect route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns command result with event-only event metadata", async () => {
    inspectReturnOrderCommandMock.mockResolvedValueOnce({
      returnOrder: { id: "return-3", status: "inspected" },
      returnLines: [],
      inspection: { linesInspected: 1, conditionUpdates: [] },
      mutationPolicy: "event-only",
      event: { id: "evt-inspect", eventType: "return_order.inspected" },
    });

    const response = await request(createApp({ uid: "23", roles: ["admin"] }))
      .post("/api/sales/returns/inspect")
      .send({
        returnOrderId: "00000000-0000-4000-8000-000000000043",
        inspectionResults: [
          {
            lineId: "00000000-0000-4000-8000-000000000004",
            condition: "used",
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(inspectReturnOrderCommandMock).toHaveBeenCalledWith({
      tenantId: 7,
      returnOrderId: "00000000-0000-4000-8000-000000000043",
      inspectionResults: [
        {
          lineId: "00000000-0000-4000-8000-000000000004",
          condition: "used",
        },
      ],
      actorId: 23,
    });
    expect(response.body.mutationPolicy).toBe("event-only");
    expect(response.body.event.eventType).toBe("return_order.inspected");
  });

  it("returns 400 when actor identity is missing", async () => {
    const response = await request(createApp({ uid: "ops-user", roles: ["admin"] }))
      .post("/api/sales/returns/inspect")
      .send({
        returnOrderId: "00000000-0000-4000-8000-000000000043",
        inspectionResults: [
          {
            lineId: "00000000-0000-4000-8000-000000000004",
            condition: "used",
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(response.body.message).toContain("actorId is required");
    expect(inspectReturnOrderCommandMock).not.toHaveBeenCalled();
  });
});

describe("/api/sales/returns/credit-note route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns command result with event-only event metadata", async () => {
    generateReturnCreditNoteCommandMock.mockResolvedValueOnce({
      returnOrder: { id: "return-4", status: "credited" },
      returnLines: [],
      validation: { valid: true, errors: [], issues: [] },
      creditNote: { reference: "CN-200" },
      mutationPolicy: "event-only",
      event: { id: "evt-credit", eventType: "return_order.credited" },
    });

    const response = await request(createApp({ uid: "24", roles: ["admin"] }))
      .post("/api/sales/returns/credit-note")
      .send({
        returnOrderId: "00000000-0000-4000-8000-000000000044",
      });

    expect(response.status).toBe(200);
    expect(generateReturnCreditNoteCommandMock).toHaveBeenCalledWith({
      tenantId: 7,
      returnOrderId: "00000000-0000-4000-8000-000000000044",
      actorId: 24,
    });
    expect(response.body.mutationPolicy).toBe("event-only");
    expect(response.body.event.eventType).toBe("return_order.credited");
  });

  it("returns 400 when actor identity is missing", async () => {
    const response = await request(createApp({ uid: "ops-user", roles: ["admin"] }))
      .post("/api/sales/returns/credit-note")
      .send({
        returnOrderId: "00000000-0000-4000-8000-000000000044",
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(response.body.message).toContain("actorId is required");
    expect(generateReturnCreditNoteCommandMock).not.toHaveBeenCalled();
  });
});

describe("/api/sales/subscriptions/activate route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns command result with event-only event metadata", async () => {
    activateSubscriptionCommandMock.mockResolvedValueOnce({
      subscription: { id: "sub-1", status: "active" },
      lines: [],
      validation: { valid: true, errors: [], issues: [] },
      mutationPolicy: "event-only",
      event: { id: "evt-activate", eventType: "subscription.activated" },
    });

    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales/subscriptions/activate")
      .send({
        subscriptionId: "00000000-0000-4000-8000-000000000051",
      });

    expect(response.status).toBe(200);
    expect(activateSubscriptionCommandMock).toHaveBeenCalledWith({
      tenantId: 7,
      subscriptionId: "00000000-0000-4000-8000-000000000051",
      actorId: 21,
      activationDate: undefined,
    });
    expect(response.body.mutationPolicy).toBe("event-only");
    expect(response.body.event.eventType).toBe("subscription.activated");
  });
});

describe("/api/sales/subscriptions/cancel route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns command result with event-only event metadata", async () => {
    cancelSubscriptionCommandMock.mockResolvedValueOnce({
      subscription: { id: "sub-1", status: "cancelled" },
      mutationPolicy: "event-only",
      event: { id: "evt-cancel", eventType: "subscription.cancelled" },
    });

    const response = await request(createApp({ uid: "42", roles: ["admin"] }))
      .post("/api/sales/subscriptions/cancel")
      .send({
        subscriptionId: "00000000-0000-4000-8000-000000000052",
        closeReasonId: "00000000-0000-4000-8000-000000000099",
        reason: "Customer closed account",
      });

    expect(response.status).toBe(200);
    expect(cancelSubscriptionCommandMock).toHaveBeenCalledWith({
      tenantId: 7,
      subscriptionId: "00000000-0000-4000-8000-000000000052",
      actorId: 42,
      closeReasonId: "00000000-0000-4000-8000-000000000099",
      cancelledAt: undefined,
      reason: "Customer closed account",
    });
    expect(response.body.mutationPolicy).toBe("event-only");
    expect(response.body.event.eventType).toBe("subscription.cancelled");
  });
});

describe("/api/sales/subscriptions/pause route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes pause through command service with event-only metadata", async () => {
    pauseSubscriptionCommandMock.mockResolvedValueOnce({
      subscription: { id: "sub-2", status: "paused" },
      mutationPolicy: "event-only",
      event: { id: "evt-pause", eventType: "subscription.paused" },
    });

    const response = await request(createApp({ uid: "43", roles: ["admin"] }))
      .post("/api/sales/subscriptions/pause")
      .send({
        subscriptionId: "00000000-0000-4000-8000-000000000053",
        reason: "payment issue",
      });

    expect(response.status).toBe(200);
    expect(pauseSubscriptionCommandMock).toHaveBeenCalledWith({
      tenantId: 7,
      subscriptionId: "00000000-0000-4000-8000-000000000053",
      actorId: 43,
      reason: "payment issue",
    });
    expect(response.body.mutationPolicy).toBe("event-only");
    expect(response.body.event.eventType).toBe("subscription.paused");
  });
});

describe("/api/sales/subscriptions/resume route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes resume through command service with event-only metadata", async () => {
    resumeSubscriptionCommandMock.mockResolvedValueOnce({
      subscription: { id: "sub-3", status: "active" },
      mutationPolicy: "event-only",
      event: { id: "evt-resume", eventType: "subscription.activated" },
    });

    const response = await request(createApp({ uid: "44", roles: ["admin"] }))
      .post("/api/sales/subscriptions/resume")
      .send({
        subscriptionId: "00000000-0000-4000-8000-000000000054",
        paymentResolved: true,
        reason: "card updated",
      });

    expect(response.status).toBe(200);
    expect(resumeSubscriptionCommandMock).toHaveBeenCalledWith({
      tenantId: 7,
      subscriptionId: "00000000-0000-4000-8000-000000000054",
      actorId: 44,
      resumeDate: undefined,
      paymentResolved: true,
      reason: "card updated",
    });
    expect(response.body.mutationPolicy).toBe("event-only");
    expect(response.body.event.eventType).toBe("subscription.activated");
  });
});

describe("/api/sales/subscriptions/renew route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes renew through command service with event-only metadata", async () => {
    renewSubscriptionCommandMock.mockResolvedValueOnce({
      subscription: { id: "sub-4", status: "active" },
      mutationPolicy: "event-only",
      event: { id: "evt-renew", eventType: "subscription.direct_update" },
    });

    const response = await request(createApp({ uid: "45", roles: ["admin"] }))
      .post("/api/sales/subscriptions/renew")
      .send({
        subscriptionId: "00000000-0000-4000-8000-000000000055",
        reason: "period rollover",
      });

    expect(response.status).toBe(200);
    expect(renewSubscriptionCommandMock).toHaveBeenCalledWith({
      tenantId: 7,
      subscriptionId: "00000000-0000-4000-8000-000000000055",
      actorId: 45,
      renewalDate: undefined,
      reason: "period rollover",
    });
    expect(response.body.mutationPolicy).toBe("event-only");
    expect(response.body.event.eventType).toBe("subscription.direct_update");
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

  it("routes single-entry approval through the command service", async () => {
    approveCommissionEntryCommandMock.mockResolvedValueOnce({
      updatedCount: 1,
      unchangedCount: 0,
      entries: [{ id: "entry-1", status: "approved" }],
      mutationPolicy: "event-only",
      event: { id: "evt-approve", eventType: "commission_entry.approved" },
    });

    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales/commissions/approve/00000000-0000-4000-8000-000000000121")
      .send({});

    expect(response.status).toBe(200);
    expect(approveCommissionEntryCommandMock).toHaveBeenCalledWith({
      tenantId: 7,
      actorId: 21,
      entryId: "00000000-0000-4000-8000-000000000121",
    });
    expect(response.body.mutationPolicy).toBe("event-only");
    expect(response.body.event.eventType).toBe("commission_entry.approved");
    expect(approveCommissionEntriesCommandMock).not.toHaveBeenCalled();
  });

  it("returns approval summary", async () => {
    approveCommissionEntriesCommandMock.mockResolvedValueOnce({
      updatedCount: 1,
      unchangedCount: 0,
      entries: [{ id: "entry-1", status: "approved" }],
      mutationPolicy: "event-only",
      events: [{ id: "evt-approve-bulk", eventType: "commission_entry.approved" }],
      matchedCount: 1,
    });

    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales/commissions/approve")
      .send({ entryId: "00000000-0000-4000-8000-000000000021" });

    expect(response.status).toBe(200);
    expect(approveCommissionEntriesCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 7,
        actorId: 21,
        entryIds: ["00000000-0000-4000-8000-000000000021"],
      })
    );
    expect(response.body.mutationPolicy).toBe("event-only");
    expect(response.body.events).toHaveLength(1);
  });

  it("returns 400 for invalid approval payload", async () => {
    const response = await request(createApp({ uid: "21", roles: ["admin"] }))
      .post("/api/sales/commissions/approve")
      .send({ entryId: "bad-uuid" });

    expect(response.status).toBe(400);
    expect(approveCommissionEntriesCommandMock).not.toHaveBeenCalled();
  });
});

describe("/api/sales/commissions/pay route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes single-entry payment through the command service", async () => {
    payCommissionEntryCommandMock.mockResolvedValueOnce({
      updatedCount: 1,
      unchangedCount: 0,
      entries: [{ id: "entry-1", status: "paid" }],
      mutationPolicy: "event-only",
      event: { id: "evt-pay", eventType: "commission_entry.paid" },
    });

    const response = await request(createApp({ uid: "42", roles: ["admin"] }))
      .post("/api/sales/commissions/pay/00000000-0000-4000-8000-000000000122")
      .send({ paidDate: "2026-03-26" });

    expect(response.status).toBe(200);
    expect(payCommissionEntryCommandMock).toHaveBeenCalledWith({
      tenantId: 7,
      actorId: 42,
      entryId: "00000000-0000-4000-8000-000000000122",
      paidDate: new Date("2026-03-26T00:00:00.000Z"),
    });
    expect(response.body.mutationPolicy).toBe("event-only");
    expect(response.body.event.eventType).toBe("commission_entry.paid");
    expect(payCommissionEntriesCommandMock).not.toHaveBeenCalled();
  });

  it("returns payment summary", async () => {
    payCommissionEntriesCommandMock.mockResolvedValueOnce({
      updatedCount: 2,
      unchangedCount: 0,
      entries: [
        { id: "entry-1", status: "paid" },
        { id: "entry-2", status: "paid" },
      ],
      mutationPolicy: "event-only",
      events: [
        { id: "evt-pay-1", eventType: "commission_entry.paid" },
        { id: "evt-pay-2", eventType: "commission_entry.paid" },
      ],
      matchedCount: 2,
    });

    const response = await request(createApp({ uid: "42", roles: ["admin"] }))
      .post("/api/sales/commissions/pay")
      .send({ salespersonId: 21, paidDate: "2026-03-26" });

    expect(response.status).toBe(200);
    expect(payCommissionEntriesCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 7,
        actorId: 42,
        salespersonId: 21,
      })
    );
    expect(response.body.mutationPolicy).toBe("event-only");
    expect(response.body.events).toHaveLength(2);
  });

  it("returns 400 for invalid payment payload", async () => {
    const response = await request(createApp({ uid: "42", roles: ["admin"] }))
      .post("/api/sales/commissions/pay")
      .send({ paidDate: "not-a-date" });

    expect(response.status).toBe(400);
    expect(payCommissionEntriesCommandMock).not.toHaveBeenCalled();
  });
});

describe("/api/sales/commissions/:id delete route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes single-entry delete through the command service", async () => {
    removeCommissionEntryCommandMock.mockResolvedValueOnce({
      deletedCount: 1,
      entry: {
        id: "entry-1",
        status: "paid",
        deletedAt: new Date("2026-03-28T14:00:00.000Z"),
      },
      mutationPolicy: "event-only",
      event: { id: "evt-delete", eventType: "commission_entry.deleted" },
    });

    const response = await request(createApp({ uid: "42", roles: ["admin"] })).delete(
      "/api/sales/commissions/00000000-0000-4000-8000-000000000123"
    );

    expect(response.status).toBe(200);
    expect(removeCommissionEntryCommandMock).toHaveBeenCalledWith({
      tenantId: 7,
      actorId: 42,
      entryId: "00000000-0000-4000-8000-000000000123",
    });
    expect(response.body.mutationPolicy).toBe("event-only");
    expect(response.body.event.eventType).toBe("commission_entry.deleted");
  });

  it("returns 400 for invalid delete payload", async () => {
    const response = await request(createApp({ uid: "42", roles: ["admin"] })).delete(
      "/api/sales/commissions/not-a-uuid"
    );

    expect(response.status).toBe(400);
    expect(removeCommissionEntryCommandMock).not.toHaveBeenCalled();
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
        truthBindingId: "00000000-0000-4000-8000-000000000301",
        debitAccountCode: "4000",
        creditAccountCode: "1100",
        amount: "350.00",
        currencyCode: "usd",
      });

    expect(response.status).toBe(201);
    expect(postAccountingEntryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 7,
        actorId: 9,
        currencyCode: "USD",
        truthBindingId: "00000000-0000-4000-8000-000000000301",
        debitAccountCode: "4000",
        creditAccountCode: "1100",
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
