import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, ValidationError } from "../middleware/errorHandler.js";
import { generateCommissionForOrder } from "../modules/sales/commission-service.js";
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
