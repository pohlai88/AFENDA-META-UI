/**
 * /api/audit-log route
 * ====================
 * Receives fire-and-forget audit events from the client and logs them
 * as structured JSON via a dedicated Pino child logger.
 *
 * POST /api/audit-log → 204 No Content
 *
 * PLUS: Decision Audit Routes (Phase 4)
 * =====================================
 * Query business logic decisions, view decision chains, verify compliance.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { createChildLogger } from "../logging/index.js";
import {
  queryDecisionAuditLog,
  getDecisionChain,
  getDecisionStats,
  getSlowDecisions,
  getAuditFailures,
  getUserAuditTrail,
} from "../audit/index.js";
import type { DecisionAuditQuery } from "@afenda/meta-types";

const router = Router();
const auditLog = createChildLogger("audit");

// ---------------------------------------------------------------------------
// CHANGE TRACKING (Existing)
// ---------------------------------------------------------------------------

const auditPayloadSchema = z.object({
  action: z.enum([
    "purchaseOrder.submit",
    "purchaseOrder.approve",
    "purchaseOrder.reject",
    "metaList.bulk.export",
    "metaList.bulk.statusTransition",
  ]),
  outcome: z.enum(["success", "error"]),
  entityId: z.string().min(1).max(255),
  message: z.string().max(1000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

router.post("/audit-log", (req: Request, res: Response) => {
  const parsed = auditPayloadSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid audit payload", details: parsed.error.flatten() });
    return;
  }

  const { action, outcome, entityId, message, metadata, timestamp } = parsed.data;
  const session = (req as Request & { session?: { uid: string; roles?: string[] } }).session;

  auditLog.info(
    {
      event_type: "audit",
      action,
      outcome,
      entityId,
      userId: session?.uid ?? "anonymous",
      roles: session?.roles,
      ip: req.ip,
      message,
      metadata,
      clientTimestamp: timestamp,
    },
    `audit:${action}:${outcome}`
  );

  res.status(204).send();
});

// ---------------------------------------------------------------------------
// DECISION AUDIT (Phase 4)
// ---------------------------------------------------------------------------

/**
 * GET /api/audit/decisions
 *
 * Query decision audit logs by filters.
 * Returns audit chain of every business logic decision.
 *
 * Query parameters:
 * - tenantId (required): Which tenant
 * - eventType (optional): Filter by decision type (metadata_resolved, rule_evaluated, etc.)
 * - scope (optional): Filter by scope (e.g., "invoice.layout.*")
 * - userId (optional): Filter by user
 * - fromTimestamp (optional): ISO 8601 start time
 * - toTimestamp (optional): ISO 8601 end time
 * - limit (optional, default 100): Max results
 * - offset (optional, default 0): Pagination offset
 *
 * @example
 * GET /api/audit/decisions?tenantId=acme-corp&eventType=metadata_resolved&limit=50
 * GET /api/audit/decisions?tenantId=acme-corp&scope=invoice.*&fromTimestamp=2026-03-25T00:00:00Z
 */
router.get("/audit/decisions", (req: Request, res: Response) => {
  try {
    const { tenantId, eventType, scope, userId, fromTimestamp, toTimestamp, limit, offset } =
      req.query;

    if (!tenantId || typeof tenantId !== "string") {
      res.status(400).json({ error: "tenantId query parameter is required" });
      return;
    }

    // Validate eventType if provided
    const validEventTypes = [
      "metadata_resolved",
      "rule_evaluated",
      "policy_enforced",
      "workflow_transitioned",
      "event_propagated",
      "layout_rendered",
    ];

    const query: DecisionAuditQuery = {
      tenantId,
      eventType:
        eventType && validEventTypes.includes(eventType as string) ? (eventType as any) : undefined,
      scope: scope ? (scope as string) : undefined,
      userId: userId ? (userId as string) : undefined,
      fromTimestamp: fromTimestamp ? (fromTimestamp as string) : undefined,
      toTimestamp: toTimestamp ? (toTimestamp as string) : undefined,
      limit: limit ? parseInt(limit as string) : 100,
      offset: offset ? parseInt(offset as string) : 0,
    };

    const entries = queryDecisionAuditLog(query);
    res.json({
      count: entries.length,
      limit: query.limit,
      offset: query.offset,
      entries,
    });
  } catch (error) {
    auditLog.error(error, "Error querying decision audit log");
    res.status(500).json({ error: "Failed to query audit log" });
  }
});

/**
 * GET /api/audit/chain/:chainId
 *
 * Retrieve complete decision chain for a request.
 * Shows how one business decision triggered subsequent decisions.
 *
 * @example
 * GET /api/audit/chain/req-12345
 * Returns: [metadata_resolved, rule_evaluated, policy_enforced, workflow_transitioned]
 */
router.get("/audit/chain/:chainId", (req: Request, res: Response) => {
  try {
    const { chainId } = req.params;
    const chain = getDecisionChain(chainId);

    if (!chain) {
      res.status(404).json({ error: "Chain not found" });
      return;
    }

    res.json(chain);
  } catch (error) {
    auditLog.error(error, "Error retrieving decision chain");
    res.status(500).json({ error: "Failed to retrieve decision chain" });
  }
});

/**
 * GET /api/audit/stats/:eventType
 *
 * Get performance statistics for a decision type.
 * Useful for identifying performance bottlenecks.
 *
 * Query parameters:
 * - tenantId (required)
 * - timeWindowMs (optional, default 3600000 = 1 hour)
 *
 * Returns:
 * {
 *   count: number,
 *   avgDurationMs: number,
 *   minDurationMs: number,
 *   maxDurationMs: number,
 *   errorRate: number (0-1)
 * }
 *
 * @example
 * GET /api/audit/stats/metadata_resolved?tenantId=acme-corp
 * GET /api/audit/stats/rule_evaluated?tenantId=acme-corp&timeWindowMs=86400000
 */
router.get("/audit/stats/:eventType", (req: Request, res: Response) => {
  try {
    const { eventType } = req.params;
    const { tenantId, timeWindowMs } = req.query;

    if (!tenantId || typeof tenantId !== "string") {
      res.status(400).json({ error: "tenantId query parameter is required" });
      return;
    }

    const stats = getDecisionStats(
      tenantId,
      eventType,
      timeWindowMs ? parseInt(timeWindowMs as string) : 3600000
    );

    res.json(stats);
  } catch (error) {
    auditLog.error(error, "Error retrieving decision stats");
    res.status(500).json({ error: "Failed to retrieve stats" });
  }
});

/**
 * GET /api/audit/slow-decisions
 *
 * Identify decisions that exceeded a duration threshold.
 * Useful for performance optimization.
 *
 * Query parameters:
 * - tenantId (required)
 * - thresholdMs (optional, default 100): Duration threshold
 * - limit (optional, default 10): Max results
 *
 * @example
 * GET /api/audit/slow-decisions?tenantId=acme-corp&thresholdMs=50&limit=20
 */
router.get("/audit/slow-decisions", (req: Request, res: Response) => {
  try {
    const { tenantId, thresholdMs, limit } = req.query;

    if (!tenantId || typeof tenantId !== "string") {
      res.status(400).json({ error: "tenantId query parameter is required" });
      return;
    }

    const decisions = getSlowDecisions(
      tenantId,
      thresholdMs ? parseInt(thresholdMs as string) : 100,
      limit ? parseInt(limit as string) : 10
    );

    res.json({
      count: decisions.length,
      threshold: thresholdMs || 100,
      decisions,
    });
  } catch (error) {
    auditLog.error(error, "Error retrieving slow decisions");
    res.status(500).json({ error: "Failed to retrieve slow decisions" });
  }
});

/**
 * GET /api/audit/failures
 *
 * Get audit decisions that resulted in violations or errors.
 * Useful for debugging and compliance checks.
 *
 * Query parameters:
 * - tenantId (required)
 * - limit (optional, default 50): Max results
 *
 * @example
 * GET /api/audit/failures?tenantId=acme-corp&limit=100
 */
router.get("/audit/failures", (req: Request, res: Response) => {
  try {
    const { tenantId, limit } = req.query;

    if (!tenantId || typeof tenantId !== "string") {
      res.status(400).json({ error: "tenantId query parameter is required" });
      return;
    }

    const failures = getAuditFailures(tenantId, limit ? parseInt(limit as string) : 50);

    res.json({
      count: failures.length,
      failures,
    });
  } catch (error) {
    auditLog.error(error, "Error retrieving audit failures");
    res.status(500).json({ error: "Failed to retrieve audit failures" });
  }
});

/**
 * GET /api/audit/user/:userId
 *
 * Get audit trail for a specific user's decisions.
 * Useful for GDPR/compliance reporting.
 *
 * Query parameters:
 * - tenantId (required)
 * - limit (optional, default 100): Max results
 *
 * @example
 * GET /api/audit/user/alice?tenantId=acme-corp
 */
router.get("/audit/user/:userId", (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { tenantId, limit } = req.query;

    if (!tenantId || typeof tenantId !== "string") {
      res.status(400).json({ error: "tenantId query parameter is required" });
      return;
    }

    const trail = getUserAuditTrail(tenantId, userId, limit ? parseInt(limit as string) : 100);

    res.json({
      userId,
      count: trail.length,
      trail,
    });
  } catch (error) {
    auditLog.error(error, "Error retrieving user audit trail");
    res.status(500).json({ error: "Failed to retrieve user audit trail" });
  }
});

export default router;
