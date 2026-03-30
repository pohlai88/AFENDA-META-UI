import { Router, type Request } from "express";
import { z } from "zod/v4";
import {
  createSignatureAttestationRequest,
  evaluateAndLogPreDecisionGuardrail,
  exportAttachmentChainOfCustody,
  getAttachmentSignatureSummary,
  getTruthGuardrailMetrics,
  getTruthGuardrailTimeSeries,
  getAttachmentTruthSummary,
  getLatestTruthDecision,
  listActivePreDecisionBlocks,
  listAttachmentGuardrailEvents,
  listAttachmentTruthOverrides,
  listOpenTruthResolutionTasks,
  queryTruthDecisionsByIntent,
  resolveTruthResolutionTaskWithOverride,
  runDocumentTruthCompiler,
  setAttachmentSignatureWorkflowStatus,
  setAttachmentLegalHold,
  setAttachmentRetentionExpiresAt,
  setMalwareScanStatus,
  updateSignatureAttestationStatus,
} from "@afenda/db/queries/truth";

import { db } from "../db/index.js";
import { asyncHandler, ForbiddenError, ValidationError } from "../middleware/errorHandler.js";
import { resolveNumericTenantId } from "../tenant/resolveNumericTenantId.js";

const router = Router();

function parseRangeQuery(
  query: unknown,
  defaultDays: number
): { from: Date; to: Date } {
  const now = new Date();
  const parsed = z
    .object({
      from: z.iso.datetime({ offset: true }).optional(),
      to: z.iso.datetime({ offset: true }).optional(),
      days: z.coerce.number().int().min(1).max(365).optional(),
    })
    .safeParse(query);
  if (!parsed.success) {
    throw new ValidationError("Invalid date range query", parsed.error.flatten());
  }
  const to = parsed.data.to ? new Date(parsed.data.to) : now;
  const days = parsed.data.days ?? defaultDays;
  const from = parsed.data.from
    ? new Date(parsed.data.from)
    : new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  if (from > to) {
    throw new ValidationError("`from` must be <= `to`");
  }
  return { from, to };
}

function parseTenantQuery(req: { query: unknown }): string {
  const q = z.object({ tenantId: z.string().min(1) }).safeParse(req.query);
  if (!q.success) {
    throw new ValidationError("tenantId query parameter is required");
  }
  return q.data.tenantId;
}

function requireAdminSession(req: Request): void {
  const roles = req.session?.roles ?? [];
  if (!roles.includes("admin")) {
    throw new ForbiddenError("Admin role required");
  }
}

router.get(
  "/truth/attachments/:attachmentId/summary",
  asyncHandler(async (req, res) => {
    const raw = parseTenantQuery(req);
    const tenantId = await resolveNumericTenantId(db, raw);
    if (tenantId == null) {
      throw new ValidationError("Unknown tenant");
    }
    const attachmentId = z.uuid().parse(req.params.attachmentId);
    const summary = await getAttachmentTruthSummary(db, { tenantId, attachmentId });
    if (!summary) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(summary);
  })
);

router.get(
  "/truth/decisions/:attachmentId/latest",
  asyncHandler(async (req, res) => {
    const raw = parseTenantQuery(req);
    const tenantId = await resolveNumericTenantId(db, raw);
    if (tenantId == null) {
      throw new ValidationError("Unknown tenant");
    }
    const attachmentId = z.uuid().parse(req.params.attachmentId);
    const row = await getLatestTruthDecision(db, { tenantId, attachmentId });
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(row);
  })
);

router.get(
  "/truth/resolution-tasks",
  asyncHandler(async (req, res) => {
    const raw = parseTenantQuery(req);
    const tenantId = await resolveNumericTenantId(db, raw);
    if (tenantId == null) {
      throw new ValidationError("Unknown tenant");
    }
    const limit = z.coerce.number().int().min(1).max(200).optional().parse(req.query.limit);
    const rows = await listOpenTruthResolutionTasks(db, { tenantId, limit });
    res.json({ tasks: rows });
  })
);

router.get(
  "/truth/attachments/:attachmentId/guardrails",
  asyncHandler(async (req, res) => {
    const raw = parseTenantQuery(req);
    const tenantId = await resolveNumericTenantId(db, raw);
    if (tenantId == null) {
      throw new ValidationError("Unknown tenant");
    }
    const attachmentId = z.uuid().parse(req.params.attachmentId);
    const blocks = await listActivePreDecisionBlocks(db, { tenantId, attachmentId });
    res.json({
      allowed: blocks.length === 0,
      activeBlocks: blocks,
    });
  })
);

router.get(
  "/truth/attachments/:attachmentId/chain-of-custody",
  asyncHandler(async (req, res) => {
    const raw = parseTenantQuery(req);
    const tenantId = await resolveNumericTenantId(db, raw);
    if (tenantId == null) {
      throw new ValidationError("Unknown tenant");
    }
    const attachmentId = z.uuid().parse(req.params.attachmentId);
    const decisionLimit = z.coerce.number().int().min(1).max(500).optional().parse(req.query.limit);
    const payload = await exportAttachmentChainOfCustody(db, {
      tenantId,
      attachmentId,
      decisionLimit,
    });
    if (!payload) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(payload);
  })
);

router.post(
  "/truth/query",
  asyncHandler(async (req, res) => {
    const parsed = z
      .object({
        tenantId: z.string().min(1),
        query: z.string().min(2).max(500),
        limit: z.number().int().min(1).max(100).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid body", parsed.error.flatten());
    }
    const tenantId = await resolveNumericTenantId(db, parsed.data.tenantId);
    if (tenantId == null) {
      throw new ValidationError("Unknown tenant");
    }
    const hits = await queryTruthDecisionsByIntent(db, {
      tenantId,
      query: parsed.data.query,
      limit: parsed.data.limit,
    });
    res.json({ hits });
  })
);

router.get(
  "/truth/metrics/guardrails",
  asyncHandler(async (req, res) => {
    const raw = parseTenantQuery(req);
    const tenantId = await resolveNumericTenantId(db, raw);
    if (tenantId == null) {
      throw new ValidationError("Unknown tenant");
    }
    const { from, to } = parseRangeQuery(req.query, 30);
    const metrics = await getTruthGuardrailMetrics(db, { tenantId, from, to });
    res.json({ from, to, metrics });
  })
);

router.get(
  "/truth/metrics/guardrails-timeseries",
  asyncHandler(async (req, res) => {
    const raw = parseTenantQuery(req);
    const tenantId = await resolveNumericTenantId(db, raw);
    if (tenantId == null) {
      throw new ValidationError("Unknown tenant");
    }
    const { from, to } = parseRangeQuery(req.query, 30);
    const rows = await getTruthGuardrailTimeSeries(db, { tenantId, from, to });
    res.json({ from, to, series: rows });
  })
);

router.get(
  "/truth/attachments/:attachmentId/signatures",
  asyncHandler(async (req, res) => {
    const raw = parseTenantQuery(req);
    const tenantId = await resolveNumericTenantId(db, raw);
    if (tenantId == null) {
      throw new ValidationError("Unknown tenant");
    }
    const attachmentId = z.uuid().parse(req.params.attachmentId);
    const payload = await getAttachmentSignatureSummary(db, { tenantId, attachmentId });
    if (!payload) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(payload);
  })
);

router.get(
  "/truth/attachments/:attachmentId/overrides",
  asyncHandler(async (req, res) => {
    const raw = parseTenantQuery(req);
    const tenantId = await resolveNumericTenantId(db, raw);
    if (tenantId == null) {
      throw new ValidationError("Unknown tenant");
    }
    const attachmentId = z.uuid().parse(req.params.attachmentId);
    const rows = await listAttachmentTruthOverrides(db, { tenantId, attachmentId });
    res.json({ overrides: rows });
  })
);

router.get(
  "/truth/attachments/:attachmentId/guardrail-events",
  asyncHandler(async (req, res) => {
    const raw = parseTenantQuery(req);
    const tenantId = await resolveNumericTenantId(db, raw);
    if (tenantId == null) {
      throw new ValidationError("Unknown tenant");
    }
    const attachmentId = z.uuid().parse(req.params.attachmentId);
    const limit = z.coerce.number().int().min(1).max(500).optional().parse(req.query.limit);
    const rows = await listAttachmentGuardrailEvents(db, {
      tenantId,
      attachmentId,
      limit,
    });
    res.json({ events: rows });
  })
);

const legalHoldBody = z.object({ active: z.boolean() });

router.patch(
  "/admin/truth/attachments/:attachmentId/legal-hold",
  asyncHandler(async (req, res) => {
    requireAdminSession(req);
    const tenantId = z.coerce.number().int().positive().parse(req.query.tenantId);
    const attachmentId = z.uuid().parse(req.params.attachmentId);
    const body = legalHoldBody.safeParse(req.body);
    if (!body.success) {
      throw new ValidationError("Invalid body", body.error.flatten());
    }
    await setAttachmentLegalHold(db, {
      tenantId,
      attachmentId,
      active: body.data.active,
    });
    res.json({ ok: true });
  })
);

const retentionBody = z.object({
  retentionExpiresAt: z.iso.datetime({ offset: true }).nullable(),
});

router.patch(
  "/admin/truth/attachments/:attachmentId/retention",
  asyncHandler(async (req, res) => {
    requireAdminSession(req);
    const tenantId = z.coerce.number().int().positive().parse(req.query.tenantId);
    const attachmentId = z.uuid().parse(req.params.attachmentId);
    const body = retentionBody.safeParse(req.body);
    if (!body.success) {
      throw new ValidationError("Invalid body", body.error.flatten());
    }
    await setAttachmentRetentionExpiresAt(db, {
      tenantId,
      attachmentId,
      retentionExpiresAt: body.data.retentionExpiresAt
        ? new Date(body.data.retentionExpiresAt)
        : null,
    });
    res.json({ ok: true });
  })
);

const malwareBody = z.object({
  status: z.enum(["not_required", "pending", "clean", "quarantined", "failed"]),
});

router.patch(
  "/admin/truth/attachments/:attachmentId/malware-scan",
  asyncHandler(async (req, res) => {
    requireAdminSession(req);
    const tenantId = z.coerce.number().int().positive().parse(req.query.tenantId);
    const attachmentId = z.uuid().parse(req.params.attachmentId);
    const body = malwareBody.safeParse(req.body);
    if (!body.success) {
      throw new ValidationError("Invalid body", body.error.flatten());
    }
    await setMalwareScanStatus(db, {
      tenantId,
      attachmentId,
      status: body.data.status,
    });
    res.json({ ok: true });
  })
);

const signatureWorkflowBody = z.object({
  status: z.enum(["NOT_REQUIRED", "PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"]),
});

router.patch(
  "/admin/truth/attachments/:attachmentId/signature-workflow",
  asyncHandler(async (req, res) => {
    requireAdminSession(req);
    const tenantId = z.coerce.number().int().positive().parse(req.query.tenantId);
    const attachmentId = z.uuid().parse(req.params.attachmentId);
    const body = signatureWorkflowBody.safeParse(req.body);
    if (!body.success) {
      throw new ValidationError("Invalid body", body.error.flatten());
    }
    await setAttachmentSignatureWorkflowStatus(db, {
      tenantId,
      attachmentId,
      status: body.data.status,
    });
    res.json({ ok: true });
  })
);

const signatureAttestationCreateBody = z.object({
  signerEmail: z.email(),
  signerUserId: z.number().int().positive().optional(),
  signerName: z.string().min(1).max(255).optional(),
  notes: z.string().max(4000).optional(),
  evidenceRefs: z.record(z.string(), z.unknown()).optional(),
});

router.post(
  "/admin/truth/attachments/:attachmentId/signatures/attestations",
  asyncHandler(async (req, res) => {
    requireAdminSession(req);
    const tenantId = z.coerce.number().int().positive().parse(req.query.tenantId);
    const attachmentId = z.uuid().parse(req.params.attachmentId);
    const body = signatureAttestationCreateBody.safeParse(req.body);
    if (!body.success) {
      throw new ValidationError("Invalid body", body.error.flatten());
    }
    const row = await createSignatureAttestationRequest(db, {
      tenantId,
      attachmentId,
      signerEmail: body.data.signerEmail,
      signerUserId: body.data.signerUserId,
      signerName: body.data.signerName,
      notes: body.data.notes,
      evidenceRefs: body.data.evidenceRefs,
    });
    res.status(201).json(row);
  })
);

const signatureAttestationUpdateBody = z.object({
  tenantId: z.coerce.number().int().positive(),
  status: z.enum(["REQUESTED", "SIGNED", "DECLINED", "EXPIRED"]),
  notes: z.string().max(4000).optional(),
  evidenceRefs: z.record(z.string(), z.unknown()).optional(),
});

router.patch(
  "/admin/truth/signatures/attestations/:attestationId",
  asyncHandler(async (req, res) => {
    requireAdminSession(req);
    const attestationId = z.uuid().parse(req.params.attestationId);
    const body = signatureAttestationUpdateBody.safeParse(req.body);
    if (!body.success) {
      throw new ValidationError("Invalid body", body.error.flatten());
    }
    await updateSignatureAttestationStatus(db, {
      tenantId: body.data.tenantId,
      attestationId,
      status: body.data.status,
      notes: body.data.notes,
      evidenceRefs: body.data.evidenceRefs,
    });
    res.json({ ok: true });
  })
);

const resolveTaskBody = z.object({
  tenantId: z.coerce.number().int().positive(),
  actorUserId: z.number().int().positive().optional(),
  resolutionStatus: z.enum(["RESOLVED", "REJECTED"]),
  overrideOutcome: z.enum(["CONFIRMED_BLOCK", "FALSE_BLOCK", "WAIVED"]),
  overrideRecommendedAction: z.enum(["ALLOW", "ESCALATE", "BLOCK"]),
  reason: z.string().min(1).max(4000),
  evidenceRefs: z.record(z.string(), z.unknown()).optional(),
});

router.post(
  "/admin/truth/resolution-tasks/:taskId/resolve",
  asyncHandler(async (req, res) => {
    requireAdminSession(req);
    const taskId = z.uuid().parse(req.params.taskId);
    const body = resolveTaskBody.safeParse(req.body);
    if (!body.success) {
      throw new ValidationError("Invalid body", body.error.flatten());
    }
    await resolveTruthResolutionTaskWithOverride(db, {
      tenantId: body.data.tenantId,
      taskId,
      actorUserId: body.data.actorUserId,
      resolutionStatus: body.data.resolutionStatus,
      overrideOutcome: body.data.overrideOutcome,
      overrideRecommendedAction: body.data.overrideRecommendedAction,
      reason: body.data.reason,
      evidenceRefs: body.data.evidenceRefs,
    });
    res.json({ ok: true });
  })
);

const guardrailEvaluateBody = z.object({
  tenantId: z.coerce.number().int().positive(),
  attachmentId: z.uuid(),
  attemptedAction: z.enum(["PAYMENT", "CONTRACT_EXECUTION", "DELETE", "WORKFLOW_ADVANCE"]),
  actorUserId: z.number().int().positive().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

router.post(
  "/admin/truth/guardrails/evaluate",
  asyncHandler(async (req, res) => {
    requireAdminSession(req);
    const body = guardrailEvaluateBody.safeParse(req.body);
    if (!body.success) {
      throw new ValidationError("Invalid body", body.error.flatten());
    }
    const out = await evaluateAndLogPreDecisionGuardrail(db, {
      tenantId: body.data.tenantId,
      attachmentId: body.data.attachmentId,
      attemptedAction: body.data.attemptedAction,
      actorUserId: body.data.actorUserId,
      context: body.data.context,
    });
    res.json(out);
  })
);

router.post(
  "/admin/truth/compile",
  asyncHandler(async (req, res) => {
    requireAdminSession(req);
    const parsed = z
      .object({
        tenantId: z.coerce.number().int().positive(),
        attachmentId: z.uuid(),
        shadowMode: z.boolean().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid body", parsed.error.flatten());
    }
    await runDocumentTruthCompiler(
      db,
      {
        tenantId: parsed.data.tenantId,
        attachmentId: parsed.data.attachmentId,
      },
      {
        shadowMode: parsed.data.shadowMode ?? false,
      }
    );
    res.json({ ok: true });
  })
);

export default router;
