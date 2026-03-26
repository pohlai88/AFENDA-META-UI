import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, ValidationError } from "../middleware/errorHandler.js";
import {
  approveCommissionEntries,
  generateCommissionForOrder,
  getCommissionReport,
  payCommissionEntries,
} from "../modules/sales/commission-service.js";
import {
  expireConsignmentAgreementIfNeeded,
  generateConsignmentInvoiceDraft,
  validateConsignmentStockReport,
} from "../modules/sales/consignment-service.js";
import {
  approveReturn,
  generateReturnCreditNote,
  inspectReturnOrder,
  receiveReturn,
  validateReturnOrder,
} from "../modules/sales/returns-service.js";
import {
  activateSubscription,
  cancelSubscription,
  pauseSubscription,
  renewSubscription,
  resumeSubscription,
  validateSubscription,
} from "../modules/sales/subscription-service.js";
import {
  approveDocument,
  createDocumentApprovalRequest,
  postAccountingEntry,
  recordDocumentStatusHistory,
  registerDocumentAttachment,
  rejectDocument,
  resolveRoundingPolicy,
  reverseAccountingPosting,
} from "../modules/sales/document-infrastructure-service.js";

const router = Router();

const decimalLikeSchema = z.union([z.number().finite(), z.string().min(1)]);

const generateCommissionSchema = z.object({
  tenantId: z.int().positive().optional(),
  actorId: z.int().positive().optional(),
  orderId: z.uuid().optional(),
  id: z.uuid().optional(),
  planId: z.uuid().optional(),
  salespersonId: z.int().positive().optional(),
  status: z.enum(["draft", "approved"]).optional(),
  notes: z.string().max(4000).nullable().optional(),
  replaceExisting: z.boolean().optional(),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
  metricsOverrides: z
    .object({
      revenue: decimalLikeSchema.optional(),
      profit: decimalLikeSchema.optional(),
      margin: decimalLikeSchema.optional(),
    })
    .optional(),
});

const commissionEntryOperationSchema = z.object({
  tenantId: z.int().positive().optional(),
  actorId: z.int().positive().optional(),
  entryId: z.uuid().optional(),
  id: z.uuid().optional(),
  salespersonId: z.int().positive().optional(),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
});

const payCommissionEntriesSchema = commissionEntryOperationSchema.extend({
  paidDate: z.coerce.date().optional(),
});

const commissionReportSchema = z.object({
  tenantId: z.int().positive().optional(),
  salespersonId: z.int().positive().optional(),
  status: z.enum(["draft", "approved", "paid"]).optional(),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
  limit: z.int().positive().max(500).optional(),
  offset: z.int().nonnegative().optional(),
});

const reportOperationSchema = z.object({
  tenantId: z.int().positive().optional(),
  reportId: z.uuid().optional(),
  id: z.uuid().optional(),
});

const expireAgreementSchema = z.object({
  tenantId: z.int().positive().optional(),
  actorId: z.int().positive().optional(),
  agreementId: z.uuid().optional(),
  id: z.uuid().optional(),
  evaluatedAt: z.coerce.date().optional(),
});

const returnOperationSchema = z.object({
  tenantId: z.int().positive().optional(),
  returnOrderId: z.uuid().optional(),
  id: z.uuid().optional(),
  actorId: z.int().positive().optional(),
});

const approveReturnSchema = z.object({
  tenantId: z.int().positive().optional(),
  returnOrderId: z.uuid().optional(),
  id: z.uuid().optional(),
  actorId: z.int().positive().optional(),
  approvedDate: z.coerce.date().optional(),
});

const inspectReturnSchema = z.object({
  tenantId: z.int().positive().optional(),
  returnOrderId: z.uuid().optional(),
  id: z.uuid().optional(),
  actorId: z.int().positive().optional(),
  inspectionResults: z.array(
    z.object({
      lineId: z.uuid(),
      condition: z.enum(["new", "used", "damaged", "defective"]),
      notes: z.string().max(1000).optional(),
    })
  ),
});

const subscriptionOperationSchema = z.object({
  tenantId: z.int().positive().optional(),
  subscriptionId: z.uuid().optional(),
  id: z.uuid().optional(),
  actorId: z.int().positive().optional(),
});

const activateSubscriptionSchema = subscriptionOperationSchema.extend({
  activationDate: z.coerce.date().optional(),
});

const pauseSubscriptionSchema = subscriptionOperationSchema.extend({
  reason: z.string().max(2000).optional(),
});

const resumeSubscriptionSchema = subscriptionOperationSchema.extend({
  resumeDate: z.coerce.date().optional(),
  paymentResolved: z.boolean().optional(),
  reason: z.string().max(2000).optional(),
});

const cancelSubscriptionSchema = subscriptionOperationSchema.extend({
  closeReasonId: z.uuid(),
  cancelledAt: z.coerce.date().optional(),
  reason: z.string().max(2000).optional(),
});

const renewSubscriptionSchema = subscriptionOperationSchema.extend({
  renewalDate: z.coerce.date().optional(),
  reason: z.string().max(2000).optional(),
});

const documentStatusHistorySchema = z.object({
  tenantId: z.int().positive().optional(),
  actorId: z.int().positive().optional(),
  documentType: z.string().min(1).max(100),
  documentId: z.uuid().optional(),
  id: z.uuid().optional(),
  fromStatus: z.string().max(100).nullable().optional(),
  toStatus: z.string().min(1).max(100),
  transitionedAt: z.coerce.date().optional(),
  reason: z.string().max(2000).optional(),
  notes: z.string().max(4000).optional(),
});

const documentApprovalRequestSchema = z.object({
  tenantId: z.int().positive().optional(),
  actorId: z.int().positive().optional(),
  documentType: z.string().min(1).max(100),
  documentId: z.uuid().optional(),
  id: z.uuid().optional(),
  approvalLevel: z.int().positive(),
  approverUserId: z.int().positive(),
  approverRole: z.string().max(120).optional(),
  comments: z.string().max(4000).optional(),
  documentAmount: decimalLikeSchema.optional(),
});

const documentApprovalProcessSchema = z.object({
  tenantId: z.int().positive().optional(),
  actorId: z.int().positive().optional(),
  approvalId: z.uuid().optional(),
  id: z.uuid().optional(),
  comments: z.string().max(4000).optional(),
});

const documentAttachmentSchema = z.object({
  tenantId: z.int().positive().optional(),
  actorId: z.int().positive().optional(),
  documentType: z.string().min(1).max(100),
  documentId: z.uuid().optional(),
  id: z.uuid().optional(),
  fileName: z.string().min(1).max(260),
  fileSize: z.int().nonnegative(),
  mimeType: z.string().min(1).max(255),
  storageProvider: z.string().min(1).max(60),
  storagePath: z.string().min(1).max(4000),
  storageUrl: z.string().url().max(4000).optional(),
  attachmentType: z.string().max(120).optional(),
  description: z.string().max(4000).optional(),
  isPublic: z.boolean().optional(),
});

const postAccountingSchema = z.object({
  tenantId: z.int().positive().optional(),
  actorId: z.int().positive().optional(),
  sourceDocumentType: z.string().min(1).max(100),
  sourceDocumentId: z.uuid().optional(),
  id: z.uuid().optional(),
  postingDate: z.coerce.date().optional(),
  debitAccountCode: z.string().max(80).optional(),
  creditAccountCode: z.string().max(80).optional(),
  amount: decimalLikeSchema,
  currencyCode: z.string().length(3),
  journalEntryId: z.uuid().optional(),
});

const reversePostingSchema = z.object({
  tenantId: z.int().positive().optional(),
  actorId: z.int().positive().optional(),
  postingId: z.uuid().optional(),
  id: z.uuid().optional(),
  reversalDate: z.coerce.date().optional(),
  reversalReason: z.string().max(2000).optional(),
});

const resolveRoundingPolicySchema = z.object({
  tenantId: z.int().positive().optional(),
  policyKey: z.string().min(1).max(120),
  appliesTo: z.string().min(1).max(120),
  currencyCode: z.string().length(3).optional(),
  effectiveAt: z.coerce.date().optional(),
});

router.post(
  "/commissions/generate/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = generateCommissionSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid commission generation payload.", parsed.error.flatten());
    }

    const orderId = parsed.data.orderId ?? parsed.data.id;
    if (!orderId) {
      throw new ValidationError("orderId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await generateCommissionForOrder({
      tenantId,
      actorId,
      orderId,
      planId: parsed.data.planId,
      salespersonId: parsed.data.salespersonId,
      status: parsed.data.status,
      notes: parsed.data.notes,
      replaceExisting: parsed.data.replaceExisting,
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
      metricsOverrides: parsed.data.metricsOverrides,
    });

    res.status(result.persistence === "created" ? 201 : 200).json(result);
  })
);

router.post(
  "/commissions/generate",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = generateCommissionSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid commission generation payload.", parsed.error.flatten());
    }

    const orderId = parsed.data.orderId ?? parsed.data.id;
    if (!orderId) {
      throw new ValidationError("orderId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await generateCommissionForOrder({
      tenantId,
      actorId,
      orderId,
      planId: parsed.data.planId,
      salespersonId: parsed.data.salespersonId,
      status: parsed.data.status,
      notes: parsed.data.notes,
      replaceExisting: parsed.data.replaceExisting,
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
      metricsOverrides: parsed.data.metricsOverrides,
    });

    res.status(result.persistence === "created" ? 201 : 200).json(result);
  })
);

router.post(
  "/commissions/approve/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = commissionEntryOperationSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid commission approval payload.", parsed.error.flatten());
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const entryId = parsed.data.entryId ?? parsed.data.id;

    const result = await approveCommissionEntries({
      tenantId,
      actorId,
      entryIds: entryId ? [entryId] : undefined,
      salespersonId: parsed.data.salespersonId,
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/commissions/approve",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = commissionEntryOperationSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid commission approval payload.", parsed.error.flatten());
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const entryId = parsed.data.entryId ?? parsed.data.id;

    const result = await approveCommissionEntries({
      tenantId,
      actorId,
      entryIds: entryId ? [entryId] : undefined,
      salespersonId: parsed.data.salespersonId,
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/commissions/pay/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = payCommissionEntriesSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid commission payment payload.", parsed.error.flatten());
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const entryId = parsed.data.entryId ?? parsed.data.id;

    const result = await payCommissionEntries({
      tenantId,
      actorId,
      entryIds: entryId ? [entryId] : undefined,
      salespersonId: parsed.data.salespersonId,
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
      paidDate: parsed.data.paidDate,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/commissions/pay",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = payCommissionEntriesSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid commission payment payload.", parsed.error.flatten());
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const entryId = parsed.data.entryId ?? parsed.data.id;

    const result = await payCommissionEntries({
      tenantId,
      actorId,
      entryIds: entryId ? [entryId] : undefined,
      salespersonId: parsed.data.salespersonId,
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
      paidDate: parsed.data.paidDate,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/commissions/report",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = commissionReportSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid commission report payload.", parsed.error.flatten());
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const result = await getCommissionReport({
      tenantId,
      salespersonId: parsed.data.salespersonId,
      status: parsed.data.status,
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/consignment/reports/validate/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = reportOperationSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid consignment report payload.", parsed.error.flatten());
    }

    const reportId = parsed.data.reportId ?? parsed.data.id;
    if (!reportId) {
      throw new ValidationError("reportId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const result = await validateConsignmentStockReport({
      tenantId,
      reportId,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/consignment/reports/validate",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = reportOperationSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid consignment report payload.", parsed.error.flatten());
    }

    const reportId = parsed.data.reportId ?? parsed.data.id;
    if (!reportId) {
      throw new ValidationError("reportId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const result = await validateConsignmentStockReport({
      tenantId,
      reportId,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/consignment/reports/invoice-draft/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = reportOperationSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid consignment report payload.", parsed.error.flatten());
    }

    const reportId = parsed.data.reportId ?? parsed.data.id;
    if (!reportId) {
      throw new ValidationError("reportId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const result = await generateConsignmentInvoiceDraft({
      tenantId,
      reportId,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/consignment/reports/invoice-draft",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = reportOperationSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid consignment report payload.", parsed.error.flatten());
    }

    const reportId = parsed.data.reportId ?? parsed.data.id;
    if (!reportId) {
      throw new ValidationError("reportId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const result = await generateConsignmentInvoiceDraft({
      tenantId,
      reportId,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/consignment/agreements/expire/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = expireAgreementSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid consignment agreement payload.", parsed.error.flatten());
    }

    const agreementId = parsed.data.agreementId ?? parsed.data.id;
    if (!agreementId) {
      throw new ValidationError("agreementId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await expireConsignmentAgreementIfNeeded({
      tenantId,
      agreementId,
      actorId,
      evaluatedAt: parsed.data.evaluatedAt,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/consignment/agreements/expire",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = expireAgreementSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid consignment agreement payload.", parsed.error.flatten());
    }

    const agreementId = parsed.data.agreementId ?? parsed.data.id;
    if (!agreementId) {
      throw new ValidationError("agreementId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await expireConsignmentAgreementIfNeeded({
      tenantId,
      agreementId,
      actorId,
      evaluatedAt: parsed.data.evaluatedAt,
    });

    res.status(200).json(result);
  })
);

// ============================================================================
// Returns / RMA Routes
// ============================================================================

router.post(
  "/returns/validate/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = returnOperationSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid return order payload.", parsed.error.flatten());
    }

    const returnOrderId = parsed.data.returnOrderId ?? parsed.data.id;
    if (!returnOrderId) {
      throw new ValidationError("returnOrderId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const result = await validateReturnOrder({
      tenantId,
      returnOrderId,
      actorId: parsed.data.actorId,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/returns/validate",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = returnOperationSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid return order payload.", parsed.error.flatten());
    }

    const returnOrderId = parsed.data.returnOrderId ?? parsed.data.id;
    if (!returnOrderId) {
      throw new ValidationError("returnOrderId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const result = await validateReturnOrder({
      tenantId,
      returnOrderId,
      actorId: parsed.data.actorId,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/returns/approve/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = approveReturnSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid return order payload.", parsed.error.flatten());
    }

    const returnOrderId = parsed.data.returnOrderId ?? parsed.data.id;
    if (!returnOrderId) {
      throw new ValidationError("returnOrderId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await approveReturn({
      tenantId,
      returnOrderId,
      actorId,
      approvedDate: parsed.data.approvedDate,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/returns/approve",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = approveReturnSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid return order payload.", parsed.error.flatten());
    }

    const returnOrderId = parsed.data.returnOrderId ?? parsed.data.id;
    if (!returnOrderId) {
      throw new ValidationError("returnOrderId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await approveReturn({
      tenantId,
      returnOrderId,
      actorId,
      approvedDate: parsed.data.approvedDate,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/returns/receive/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = returnOperationSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid return order payload.", parsed.error.flatten());
    }

    const returnOrderId = parsed.data.returnOrderId ?? parsed.data.id;
    if (!returnOrderId) {
      throw new ValidationError("returnOrderId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const result = await receiveReturn({
      tenantId,
      returnOrderId,
      actorId: parsed.data.actorId,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/returns/receive",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = returnOperationSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid return order payload.", parsed.error.flatten());
    }

    const returnOrderId = parsed.data.returnOrderId ?? parsed.data.id;
    if (!returnOrderId) {
      throw new ValidationError("returnOrderId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const result = await receiveReturn({
      tenantId,
      returnOrderId,
      actorId: parsed.data.actorId,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/returns/inspect/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = inspectReturnSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid return order payload.", parsed.error.flatten());
    }

    const returnOrderId = parsed.data.returnOrderId ?? parsed.data.id;
    if (!returnOrderId) {
      throw new ValidationError("returnOrderId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const result = await inspectReturnOrder({
      tenantId,
      returnOrderId,
      inspectionResults: parsed.data.inspectionResults,
      actorId: parsed.data.actorId,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/returns/inspect",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = inspectReturnSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid return order payload.", parsed.error.flatten());
    }

    const returnOrderId = parsed.data.returnOrderId ?? parsed.data.id;
    if (!returnOrderId) {
      throw new ValidationError("returnOrderId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const result = await inspectReturnOrder({
      tenantId,
      returnOrderId,
      inspectionResults: parsed.data.inspectionResults,
      actorId: parsed.data.actorId,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/returns/credit-note/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = returnOperationSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid return order payload.", parsed.error.flatten());
    }

    const returnOrderId = parsed.data.returnOrderId ?? parsed.data.id;
    if (!returnOrderId) {
      throw new ValidationError("returnOrderId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const result = await generateReturnCreditNote({
      tenantId,
      returnOrderId,
      actorId: parsed.data.actorId,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/returns/credit-note",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = returnOperationSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid return order payload.", parsed.error.flatten());
    }

    const returnOrderId = parsed.data.returnOrderId ?? parsed.data.id;
    if (!returnOrderId) {
      throw new ValidationError("returnOrderId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const result = await generateReturnCreditNote({
      tenantId,
      returnOrderId,
      actorId: parsed.data.actorId,
    });

    res.status(200).json(result);
  })
);

// ============================================================================
// Subscriptions Routes
// ============================================================================

router.post(
  "/subscriptions/validate/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = subscriptionOperationSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid subscription payload.", parsed.error.flatten());
    }

    const subscriptionId = parsed.data.subscriptionId ?? parsed.data.id;
    if (!subscriptionId) {
      throw new ValidationError("subscriptionId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const result = await validateSubscription({
      tenantId,
      subscriptionId,
      actorId: parsed.data.actorId,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/subscriptions/validate",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = subscriptionOperationSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid subscription payload.", parsed.error.flatten());
    }

    const subscriptionId = parsed.data.subscriptionId ?? parsed.data.id;
    if (!subscriptionId) {
      throw new ValidationError("subscriptionId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const result = await validateSubscription({
      tenantId,
      subscriptionId,
      actorId: parsed.data.actorId,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/subscriptions/activate/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = activateSubscriptionSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid subscription payload.", parsed.error.flatten());
    }

    const subscriptionId = parsed.data.subscriptionId ?? parsed.data.id;
    if (!subscriptionId) {
      throw new ValidationError("subscriptionId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await activateSubscription({
      tenantId,
      subscriptionId,
      actorId,
      activationDate: parsed.data.activationDate,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/subscriptions/activate",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = activateSubscriptionSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid subscription payload.", parsed.error.flatten());
    }

    const subscriptionId = parsed.data.subscriptionId ?? parsed.data.id;
    if (!subscriptionId) {
      throw new ValidationError("subscriptionId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await activateSubscription({
      tenantId,
      subscriptionId,
      actorId,
      activationDate: parsed.data.activationDate,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/subscriptions/pause/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = pauseSubscriptionSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid subscription payload.", parsed.error.flatten());
    }

    const subscriptionId = parsed.data.subscriptionId ?? parsed.data.id;
    if (!subscriptionId) {
      throw new ValidationError("subscriptionId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await pauseSubscription({
      tenantId,
      subscriptionId,
      actorId,
      reason: parsed.data.reason,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/subscriptions/pause",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = pauseSubscriptionSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid subscription payload.", parsed.error.flatten());
    }

    const subscriptionId = parsed.data.subscriptionId ?? parsed.data.id;
    if (!subscriptionId) {
      throw new ValidationError("subscriptionId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await pauseSubscription({
      tenantId,
      subscriptionId,
      actorId,
      reason: parsed.data.reason,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/subscriptions/resume/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = resumeSubscriptionSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid subscription payload.", parsed.error.flatten());
    }

    const subscriptionId = parsed.data.subscriptionId ?? parsed.data.id;
    if (!subscriptionId) {
      throw new ValidationError("subscriptionId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await resumeSubscription({
      tenantId,
      subscriptionId,
      actorId,
      resumeDate: parsed.data.resumeDate,
      paymentResolved: parsed.data.paymentResolved,
      reason: parsed.data.reason,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/subscriptions/resume",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = resumeSubscriptionSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid subscription payload.", parsed.error.flatten());
    }

    const subscriptionId = parsed.data.subscriptionId ?? parsed.data.id;
    if (!subscriptionId) {
      throw new ValidationError("subscriptionId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await resumeSubscription({
      tenantId,
      subscriptionId,
      actorId,
      resumeDate: parsed.data.resumeDate,
      paymentResolved: parsed.data.paymentResolved,
      reason: parsed.data.reason,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/subscriptions/cancel/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = cancelSubscriptionSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid subscription payload.", parsed.error.flatten());
    }

    const subscriptionId = parsed.data.subscriptionId ?? parsed.data.id;
    if (!subscriptionId) {
      throw new ValidationError("subscriptionId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await cancelSubscription({
      tenantId,
      subscriptionId,
      actorId,
      closeReasonId: parsed.data.closeReasonId,
      cancelledAt: parsed.data.cancelledAt,
      reason: parsed.data.reason,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/subscriptions/cancel",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = cancelSubscriptionSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid subscription payload.", parsed.error.flatten());
    }

    const subscriptionId = parsed.data.subscriptionId ?? parsed.data.id;
    if (!subscriptionId) {
      throw new ValidationError("subscriptionId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await cancelSubscription({
      tenantId,
      subscriptionId,
      actorId,
      closeReasonId: parsed.data.closeReasonId,
      cancelledAt: parsed.data.cancelledAt,
      reason: parsed.data.reason,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/subscriptions/renew/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = renewSubscriptionSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid subscription payload.", parsed.error.flatten());
    }

    const subscriptionId = parsed.data.subscriptionId ?? parsed.data.id;
    if (!subscriptionId) {
      throw new ValidationError("subscriptionId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await renewSubscription({
      tenantId,
      subscriptionId,
      actorId,
      renewalDate: parsed.data.renewalDate,
      reason: parsed.data.reason,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/subscriptions/renew",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = renewSubscriptionSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid subscription payload.", parsed.error.flatten());
    }

    const subscriptionId = parsed.data.subscriptionId ?? parsed.data.id;
    if (!subscriptionId) {
      throw new ValidationError("subscriptionId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await renewSubscription({
      tenantId,
      subscriptionId,
      actorId,
      renewalDate: parsed.data.renewalDate,
      reason: parsed.data.reason,
    });

    res.status(200).json(result);
  })
);

// ============================================================================
// Document Infrastructure Routes (Phase 11)
// ============================================================================

router.post(
  "/documents/status-history/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = documentStatusHistorySchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid document status history payload.", parsed.error.flatten());
    }

    const documentId = parsed.data.documentId ?? parsed.data.id;
    if (!documentId) {
      throw new ValidationError("documentId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await recordDocumentStatusHistory({
      tenantId,
      actorId,
      documentType: parsed.data.documentType,
      documentId,
      fromStatus: parsed.data.fromStatus,
      toStatus: parsed.data.toStatus,
      transitionedAt: parsed.data.transitionedAt,
      reason: parsed.data.reason,
      notes: parsed.data.notes,
    });

    res.status(201).json(result);
  })
);

router.post(
  "/documents/status-history",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = documentStatusHistorySchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid document status history payload.", parsed.error.flatten());
    }

    const documentId = parsed.data.documentId ?? parsed.data.id;
    if (!documentId) {
      throw new ValidationError("documentId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await recordDocumentStatusHistory({
      tenantId,
      actorId,
      documentType: parsed.data.documentType,
      documentId,
      fromStatus: parsed.data.fromStatus,
      toStatus: parsed.data.toStatus,
      transitionedAt: parsed.data.transitionedAt,
      reason: parsed.data.reason,
      notes: parsed.data.notes,
    });

    res.status(201).json(result);
  })
);

router.post(
  "/documents/approvals/request/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = documentApprovalRequestSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid document approval payload.", parsed.error.flatten());
    }

    const documentId = parsed.data.documentId ?? parsed.data.id;
    if (!documentId) {
      throw new ValidationError("documentId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await createDocumentApprovalRequest({
      tenantId,
      actorId,
      documentType: parsed.data.documentType,
      documentId,
      approvalLevel: parsed.data.approvalLevel,
      approverUserId: parsed.data.approverUserId,
      approverRole: parsed.data.approverRole,
      comments: parsed.data.comments,
      documentAmount: parsed.data.documentAmount?.toString(),
    });

    res.status(201).json(result);
  })
);

router.post(
  "/documents/approvals/request",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = documentApprovalRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid document approval payload.", parsed.error.flatten());
    }

    const documentId = parsed.data.documentId ?? parsed.data.id;
    if (!documentId) {
      throw new ValidationError("documentId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await createDocumentApprovalRequest({
      tenantId,
      actorId,
      documentType: parsed.data.documentType,
      documentId,
      approvalLevel: parsed.data.approvalLevel,
      approverUserId: parsed.data.approverUserId,
      approverRole: parsed.data.approverRole,
      comments: parsed.data.comments,
      documentAmount: parsed.data.documentAmount?.toString(),
    });

    res.status(201).json(result);
  })
);

router.post(
  "/documents/approvals/approve/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = documentApprovalProcessSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid document approval payload.", parsed.error.flatten());
    }

    const approvalId = parsed.data.approvalId ?? parsed.data.id;
    if (!approvalId) {
      throw new ValidationError("approvalId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await approveDocument({
      tenantId,
      actorId,
      approvalId,
      comments: parsed.data.comments,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/documents/approvals/approve",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = documentApprovalProcessSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid document approval payload.", parsed.error.flatten());
    }

    const approvalId = parsed.data.approvalId ?? parsed.data.id;
    if (!approvalId) {
      throw new ValidationError("approvalId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await approveDocument({
      tenantId,
      actorId,
      approvalId,
      comments: parsed.data.comments,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/documents/approvals/reject/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = documentApprovalProcessSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid document approval payload.", parsed.error.flatten());
    }

    const approvalId = parsed.data.approvalId ?? parsed.data.id;
    if (!approvalId) {
      throw new ValidationError("approvalId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await rejectDocument({
      tenantId,
      actorId,
      approvalId,
      comments: parsed.data.comments,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/documents/approvals/reject",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = documentApprovalProcessSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid document approval payload.", parsed.error.flatten());
    }

    const approvalId = parsed.data.approvalId ?? parsed.data.id;
    if (!approvalId) {
      throw new ValidationError("approvalId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await rejectDocument({
      tenantId,
      actorId,
      approvalId,
      comments: parsed.data.comments,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/documents/attachments/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = documentAttachmentSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid document attachment payload.", parsed.error.flatten());
    }

    const documentId = parsed.data.documentId ?? parsed.data.id;
    if (!documentId) {
      throw new ValidationError("documentId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await registerDocumentAttachment({
      tenantId,
      actorId,
      documentType: parsed.data.documentType,
      documentId,
      fileName: parsed.data.fileName,
      fileSize: parsed.data.fileSize,
      mimeType: parsed.data.mimeType,
      storageProvider: parsed.data.storageProvider,
      storagePath: parsed.data.storagePath,
      storageUrl: parsed.data.storageUrl,
      attachmentType: parsed.data.attachmentType,
      description: parsed.data.description,
      isPublic: parsed.data.isPublic,
    });

    res.status(201).json(result);
  })
);

router.post(
  "/documents/attachments",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = documentAttachmentSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid document attachment payload.", parsed.error.flatten());
    }

    const documentId = parsed.data.documentId ?? parsed.data.id;
    if (!documentId) {
      throw new ValidationError("documentId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await registerDocumentAttachment({
      tenantId,
      actorId,
      documentType: parsed.data.documentType,
      documentId,
      fileName: parsed.data.fileName,
      fileSize: parsed.data.fileSize,
      mimeType: parsed.data.mimeType,
      storageProvider: parsed.data.storageProvider,
      storagePath: parsed.data.storagePath,
      storageUrl: parsed.data.storageUrl,
      attachmentType: parsed.data.attachmentType,
      description: parsed.data.description,
      isPublic: parsed.data.isPublic,
    });

    res.status(201).json(result);
  })
);

router.post(
  "/accounting/postings/post/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = postAccountingSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid accounting posting payload.", parsed.error.flatten());
    }

    const sourceDocumentId = parsed.data.sourceDocumentId ?? parsed.data.id;
    if (!sourceDocumentId) {
      throw new ValidationError("sourceDocumentId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await postAccountingEntry({
      tenantId,
      actorId,
      sourceDocumentType: parsed.data.sourceDocumentType,
      sourceDocumentId,
      postingDate: parsed.data.postingDate,
      debitAccountCode: parsed.data.debitAccountCode,
      creditAccountCode: parsed.data.creditAccountCode,
      amount: parsed.data.amount.toString(),
      currencyCode: parsed.data.currencyCode.toUpperCase(),
      journalEntryId: parsed.data.journalEntryId,
    });

    res.status(201).json(result);
  })
);

router.post(
  "/accounting/postings/post",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = postAccountingSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid accounting posting payload.", parsed.error.flatten());
    }

    const sourceDocumentId = parsed.data.sourceDocumentId ?? parsed.data.id;
    if (!sourceDocumentId) {
      throw new ValidationError("sourceDocumentId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await postAccountingEntry({
      tenantId,
      actorId,
      sourceDocumentType: parsed.data.sourceDocumentType,
      sourceDocumentId,
      postingDate: parsed.data.postingDate,
      debitAccountCode: parsed.data.debitAccountCode,
      creditAccountCode: parsed.data.creditAccountCode,
      amount: parsed.data.amount.toString(),
      currencyCode: parsed.data.currencyCode.toUpperCase(),
      journalEntryId: parsed.data.journalEntryId,
    });

    res.status(201).json(result);
  })
);

router.post(
  "/accounting/postings/reverse/:id",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = reversePostingSchema.safeParse({ ...req.body, id: req.params.id });

    if (!parsed.success) {
      throw new ValidationError("Invalid accounting reversal payload.", parsed.error.flatten());
    }

    const postingId = parsed.data.postingId ?? parsed.data.id;
    if (!postingId) {
      throw new ValidationError("postingId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await reverseAccountingPosting({
      tenantId,
      actorId,
      postingId,
      reversalDate: parsed.data.reversalDate,
      reversalReason: parsed.data.reversalReason,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/accounting/postings/reverse",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = reversePostingSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid accounting reversal payload.", parsed.error.flatten());
    }

    const postingId = parsed.data.postingId ?? parsed.data.id;
    if (!postingId) {
      throw new ValidationError("postingId is required.");
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const actorId = parsed.data.actorId ?? resolveActorId(req);
    if (!actorId) {
      throw new ValidationError(
        "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user."
      );
    }

    const result = await reverseAccountingPosting({
      tenantId,
      actorId,
      postingId,
      reversalDate: parsed.data.reversalDate,
      reversalReason: parsed.data.reversalReason,
    });

    res.status(200).json(result);
  })
);

router.post(
  "/rounding/resolve",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = resolveRoundingPolicySchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError("Invalid rounding policy payload.", parsed.error.flatten());
    }

    const tenantId =
      parsed.data.tenantId ??
      parseInteger((req.tenantContext?.tenantId as string | undefined) ?? null);
    if (!tenantId) {
      throw new ValidationError(
        "A numeric tenantId is required. Provide it in the request body or x-tenant-id header."
      );
    }

    const result = await resolveRoundingPolicy({
      tenantId,
      policyKey: parsed.data.policyKey,
      appliesTo: parsed.data.appliesTo,
      currencyCode: parsed.data.currencyCode?.toUpperCase(),
      effectiveAt: parsed.data.effectiveAt,
    });

    res.status(200).json(result);
  })
);

export default router;

function resolveActorId(req: Request): number | null {
  const userId = (req.session as { userId?: string | number } | undefined)?.userId;
  if (typeof userId === "number" && Number.isInteger(userId) && userId > 0) {
    return userId;
  }

  if (typeof userId === "string") {
    return parseInteger(userId);
  }

  const uid = (req.session as { uid?: string } | undefined)?.uid;
  return parseInteger(uid ?? null);
}

function parseInteger(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
