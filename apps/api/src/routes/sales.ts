import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, ValidationError } from "../middleware/errorHandler.js";
import { generateCommissionForOrder } from "../modules/sales/commission-service.js";

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
