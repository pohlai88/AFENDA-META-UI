import { Router, type Request } from "express";
import { z } from "zod/v4";
import {
  approveTenantStorageQuotaRequest,
  createTenantStorageQuotaRequest,
  getTenantStorageQuotaRequest,
  getTenantStorageUsageSummary,
  listRecentTenantStorageQuotaRequests,
  listTenantStorageQuotaRequestsByStatus,
  listTenantStorageQuotaRequestsForTenant,
  rejectTenantStorageQuotaRequest,
  updateTenantStoragePolicyByAdmin,
} from "@afenda/db/queries/storage";
import {
  applicationStorageKeySchema,
  createR2ObjectRepo,
  loadR2RepoCredentialsFromEnv,
  presignR2GetUrl,
  presignR2PutUrl,
} from "@afenda/db/r2";
import { randomUUID } from "node:crypto";

import { db } from "../db/index.js";
import { asyncHandler, ForbiddenError, ValidationError } from "../middleware/errorHandler.js";
import { resolveNumericTenantId } from "../tenant/resolveNumericTenantId.js";

const router = Router();

function requireAdminSession(req: Request): void {
  const roles = req.session?.roles ?? [];
  if (!roles.includes("admin")) {
    throw new ForbiddenError("Admin role required");
  }
}

function resolveReviewerUserId(req: Request): number {
  const header = req.headers["x-reviewer-user-id"];
  if (typeof header === "string" && /^\d+$/.test(header.trim())) {
    return Number.parseInt(header.trim(), 10);
  }
  const uid = req.session?.uid ?? "";
  if (/^\d+$/.test(uid)) {
    return Number.parseInt(uid, 10);
  }
  throw new ValidationError(
    "Provide a numeric JWT `sub` (uid) or header X-Reviewer-User-Id for approval audit"
  );
}

function parseTenantQuery(req: { query: unknown }): string {
  const q = z.object({ tenantId: z.string().min(1) }).safeParse(req.query);
  if (!q.success) {
    throw new ValidationError("tenantId query parameter is required");
  }
  return q.data.tenantId;
}

router.get(
  "/storage/usage",
  asyncHandler(async (req, res) => {
    const raw = parseTenantQuery(req);
    const tenantId = await resolveNumericTenantId(db, raw);
    if (tenantId == null) {
      throw new ValidationError("Unknown tenant");
    }
    const summary = await getTenantStorageUsageSummary(db, tenantId);
    res.json(summary);
  })
);

const quotaRequestBody = z.object({
  requestedHardQuotaBytes: z.string().regex(/^\d+$/),
  reason: z.string().max(4000).optional(),
});

router.post(
  "/storage/quota-requests",
  asyncHandler(async (req, res) => {
    const raw = parseTenantQuery(req);
    const tenantId = await resolveNumericTenantId(db, raw);
    if (tenantId == null) {
      throw new ValidationError("Unknown tenant");
    }
    const body = quotaRequestBody.safeParse(req.body);
    if (!body.success) {
      throw new ValidationError("Invalid request body", body.error.flatten());
    }
    const requested = BigInt(body.data.requestedHardQuotaBytes);
    const { requestId } = await createTenantStorageQuotaRequest(db, {
      tenantId,
      requestedHardQuotaBytes: requested,
      reason: body.data.reason ?? null,
    });
    res.status(201).json({ requestId });
  })
);

router.get(
  "/storage/quota-requests",
  asyncHandler(async (req, res) => {
    const raw = parseTenantQuery(req);
    const tenantId = await resolveNumericTenantId(db, raw);
    if (tenantId == null) {
      throw new ValidationError("Unknown tenant");
    }
    const rows = await listTenantStorageQuotaRequestsForTenant(db, tenantId);
    res.json({ requests: rows });
  })
);

router.get(
  "/admin/storage/quota-requests",
  asyncHandler(async (req, res) => {
    requireAdminSession(req);
    const q = z
      .object({
        status: z
          .enum([
            "submitted",
            "under_review",
            "approved",
            "rejected",
            "applied",
            "cancelled",
          ])
          .optional(),
      })
      .safeParse(req.query);

    if (!q.success) {
      throw new ValidationError("Invalid query", q.error.flatten());
    }

    const rows =
      q.data.status != null
        ? await listTenantStorageQuotaRequestsByStatus(db, [q.data.status])
        : await listRecentTenantStorageQuotaRequests(db, { limit: 100 });

    res.json({ requests: rows });
  })
);

const approveBody = z.object({
  decisionNote: z.string().max(4000).optional(),
});

router.post(
  "/admin/storage/quota-requests/:requestId/approve",
  asyncHandler(async (req, res) => {
    requireAdminSession(req);
    const requestId = z.uuid().parse(req.params.requestId);
    const body = approveBody.safeParse(req.body ?? {});
    if (!body.success) {
      throw new ValidationError("Invalid body", body.error.flatten());
    }
    const reviewerUserId = resolveReviewerUserId(req);
    await approveTenantStorageQuotaRequest(db, {
      requestId,
      reviewerUserId,
      decisionNote: body.data.decisionNote ?? null,
    });
    res.json({ ok: true });
  })
);

router.post(
  "/admin/storage/quota-requests/:requestId/reject",
  asyncHandler(async (req, res) => {
    requireAdminSession(req);
    const requestId = z.uuid().parse(req.params.requestId);
    const body = approveBody.safeParse(req.body ?? {});
    if (!body.success) {
      throw new ValidationError("Invalid body", body.error.flatten());
    }
    const reviewerUserId = resolveReviewerUserId(req);
    await rejectTenantStorageQuotaRequest(db, {
      requestId,
      reviewerUserId,
      decisionNote: body.data.decisionNote ?? null,
    });
    res.json({ ok: true });
  })
);

const patchPolicyBody = z
  .object({
    hardQuotaBytes: z.string().regex(/^\d+$/).optional(),
    graceQuotaBytes: z.string().regex(/^\d+$/).optional(),
    isUploadBlocked: z.boolean().optional(),
    defaultStorageClass: z.enum(["STANDARD", "STANDARD_IA"]).optional(),
  })
  .strict();

router.patch(
  "/admin/storage/policies/:tenantId",
  asyncHandler(async (req, res) => {
    requireAdminSession(req);
    const tenantId = z.coerce.number().int().positive().parse(req.params.tenantId);
    const body = patchPolicyBody.safeParse(req.body ?? {});
    if (!body.success) {
      throw new ValidationError("Invalid body", body.error.flatten());
    }
    await updateTenantStoragePolicyByAdmin(db, {
      tenantId,
      ...(body.data.hardQuotaBytes !== undefined
        ? { hardQuotaBytes: BigInt(body.data.hardQuotaBytes) }
        : {}),
      ...(body.data.graceQuotaBytes !== undefined
        ? { graceQuotaBytes: BigInt(body.data.graceQuotaBytes) }
        : {}),
      ...(body.data.isUploadBlocked !== undefined
        ? { isUploadBlocked: body.data.isUploadBlocked }
        : {}),
      ...(body.data.defaultStorageClass !== undefined
        ? { defaultStorageClass: body.data.defaultStorageClass }
        : {}),
    });
    res.json({ ok: true });
  })
);

router.get(
  "/admin/storage/quota-requests/:requestId",
  asyncHandler(async (req, res) => {
    requireAdminSession(req);
    const requestId = z.uuid().parse(req.params.requestId);
    const row = await getTenantStorageQuotaRequest(db, requestId);
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(row);
  })
);

const presignUploadBody = z.object({
  key: z.string().min(3).max(1024),
  contentType: z.string().min(1).max(255),
  expiresInSeconds: z.number().int().min(60).max(604_800).optional(),
});

router.post(
  "/storage/presign-upload",
  asyncHandler(async (req, res) => {
    const body = presignUploadBody.safeParse(req.body);
    if (!body.success) {
      throw new ValidationError("Invalid body", body.error.flatten());
    }
    applicationStorageKeySchema.parse(body.data.key);
    try {
      const creds = loadR2RepoCredentialsFromEnv(process.env);
      const expiresIn = body.data.expiresInSeconds ?? 3600;
      const url = await presignR2PutUrl(
        creds,
        body.data.key,
        body.data.contentType,
        expiresIn
      );
      res.json({ url, expiresInSeconds: expiresIn });
    } catch (err) {
      res.status(503).json({
        error: "R2 presign unavailable",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  })
);

const presignDownloadBody = z.object({
  key: z.string().min(3).max(1024),
  expiresInSeconds: z.number().int().min(60).max(604_800).optional(),
});

router.post(
  "/storage/presign-download",
  asyncHandler(async (req, res) => {
    const body = presignDownloadBody.safeParse(req.body);
    if (!body.success) {
      throw new ValidationError("Invalid body", body.error.flatten());
    }
    applicationStorageKeySchema.parse(body.data.key);
    try {
      const creds = loadR2RepoCredentialsFromEnv(process.env);
      const expiresIn = body.data.expiresInSeconds ?? 3600;
      const url = await presignR2GetUrl(creds, body.data.key, expiresIn);
      res.json({ url, expiresInSeconds: expiresIn });
    } catch (err) {
      res.status(503).json({
        error: "R2 presign unavailable",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  })
);

const uploadSessionBody = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    key: z.string().min(3).max(1024),
    contentType: z.string().min(1).max(255),
    contentLength: z.number().int().positive().optional(),
    expiresInSeconds: z.number().int().min(60).max(604_800).optional(),
  }),
  z.object({
    action: z.literal("finalize"),
    sessionId: z.string().uuid(),
    key: z.string().min(3).max(1024),
  }),
]);

router.post(
  "/storage/upload-sessions",
  asyncHandler(async (req, res) => {
    const body = uploadSessionBody.safeParse(req.body);
    if (!body.success) {
      throw new ValidationError("Invalid body", body.error.flatten());
    }
    applicationStorageKeySchema.parse(body.data.key);
    const creds = loadR2RepoCredentialsFromEnv(process.env);

    if (body.data.action === "start") {
      const expiresIn = body.data.expiresInSeconds ?? 3600;
      const uploadUrl = await presignR2PutUrl(
        creds,
        body.data.key,
        body.data.contentType,
        expiresIn
      );
      const contentLength = body.data.contentLength ?? 0;
      const multipartThresholdBytes = 20 * 1024 * 1024;
      const uploadMode = contentLength >= multipartThresholdBytes ? "multipart" : "single";

      res.status(201).json({
        sessionId: randomUUID(),
        key: body.data.key,
        uploadMode,
        expiresInSeconds: expiresIn,
        uploadUrl,
        recommendedPartSizeBytes: uploadMode === "multipart" ? 8 * 1024 * 1024 : null,
      });
      return;
    }

    const repo = createR2ObjectRepo(creds);
    const head = await repo.headObject(body.data.key);
    if (!head) {
      res.status(409).json({
        error: "Upload not found in object storage",
        sessionId: body.data.sessionId,
      });
      return;
    }
    res.json({
      ok: true,
      sessionId: body.data.sessionId,
      key: body.data.key,
      object: head,
    });
  })
);

export default router;
