import { Router, type Request, type Response } from "express";
import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";

import { db } from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";
import { domainEventLogs, domainInvariantLogs } from "../db/schema/index.js";

export const opsRouter = Router();

function parseInteger(value: unknown, fallback: number): number {
  if (typeof value !== "string") return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function withOptional<T extends SQL | undefined>(base: T, next: SQL | undefined): SQL | undefined {
  if (!next) return base;
  if (!base) return next;
  return and(base, next);
}

opsRouter.get("/invariant-violations", requireAuth, async (req: Request, res: Response) => {
  const page = Math.max(1, parseInteger(req.query.page, 1));
  const limit = Math.min(200, Math.max(1, parseInteger(req.query.limit, 50)));
  const offset = (page - 1) * limit;

  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const severity = typeof req.query.severity === "string" ? req.query.severity : undefined;
  const invariantCode =
    typeof req.query.invariantCode === "string" ? req.query.invariantCode : undefined;
  const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
  const dateFrom = parseDate(req.query.dateFrom);
  const dateTo = parseDate(req.query.dateTo);

  let whereClause: SQL | undefined;
  whereClause = withOptional(
    whereClause,
    status ? eq(domainInvariantLogs.status, status as never) : undefined
  );
  whereClause = withOptional(
    whereClause,
    severity ? eq(domainInvariantLogs.severity, severity as never) : undefined
  );
  whereClause = withOptional(
    whereClause,
    invariantCode ? eq(domainInvariantLogs.invariantCode, invariantCode) : undefined
  );
  whereClause = withOptional(
    whereClause,
    entityType ? eq(domainInvariantLogs.entityType, entityType) : undefined
  );
  whereClause = withOptional(
    whereClause,
    dateFrom ? gte(domainInvariantLogs.evaluatedAt, dateFrom) : undefined
  );
  whereClause = withOptional(
    whereClause,
    dateTo ? lte(domainInvariantLogs.evaluatedAt, dateTo) : undefined
  );

  const listBaseQuery = db
    .select({
      id: domainInvariantLogs.id,
      tenantId: domainInvariantLogs.tenantId,
      invariantCode: domainInvariantLogs.invariantCode,
      entityType: domainInvariantLogs.entityType,
      entityId: domainInvariantLogs.entityId,
      status: domainInvariantLogs.status,
      severity: domainInvariantLogs.severity,
      expectedValue: domainInvariantLogs.expectedValue,
      actualValue: domainInvariantLogs.actualValue,
      context: domainInvariantLogs.context,
      evaluatedAt: domainInvariantLogs.evaluatedAt,
      createdBy: domainInvariantLogs.createdBy,
      updatedBy: domainInvariantLogs.updatedBy,
    })
    .from(domainInvariantLogs);

  const countBaseQuery = db.select({ count: sql<number>`count(*)::int` }).from(domainInvariantLogs);

  const listQuery = whereClause ? listBaseQuery.where(whereClause) : listBaseQuery;
  const countQuery = whereClause ? countBaseQuery.where(whereClause) : countBaseQuery;

  const [rows, countRows] = await Promise.all([
    listQuery.orderBy(desc(domainInvariantLogs.evaluatedAt)).limit(limit).offset(offset),
    countQuery,
  ]);

  const total = countRows[0]?.count ?? 0;

  res.json({
    data: rows,
    meta: {
      page,
      limit,
      total,
      filters: {
        status,
        severity,
        invariantCode,
        entityType,
        dateFrom: dateFrom?.toISOString(),
        dateTo: dateTo?.toISOString(),
      },
    },
  });
});

opsRouter.get("/invariant-violations/stats", requireAuth, async (_req: Request, res: Response) => {
  const [summary] = await db
    .select({
      total: sql<number>`count(*)::int`,
      passCount: sql<number>`count(*) filter (where ${domainInvariantLogs.status} = 'pass')::int`,
      failCount: sql<number>`count(*) filter (where ${domainInvariantLogs.status} = 'fail')::int`,
      warningCount: sql<number>`count(*) filter (where ${domainInvariantLogs.status} = 'warning')::int`,
      errorSeverityCount: sql<number>`count(*) filter (where ${domainInvariantLogs.severity} = 'error')::int`,
      warningSeverityCount: sql<number>`count(*) filter (where ${domainInvariantLogs.severity} = 'warning')::int`,
      infoSeverityCount: sql<number>`count(*) filter (where ${domainInvariantLogs.severity} = 'info')::int`,
      recentFailures24h: sql<number>`count(*) filter (where ${domainInvariantLogs.status} = 'fail' and ${domainInvariantLogs.evaluatedAt} >= NOW() - interval '24 hours')::int`,
    })
    .from(domainInvariantLogs);

  res.json({
    total: summary?.total ?? 0,
    byStatus: {
      pass: summary?.passCount ?? 0,
      fail: summary?.failCount ?? 0,
      warning: summary?.warningCount ?? 0,
    },
    bySeverity: {
      error: summary?.errorSeverityCount ?? 0,
      warning: summary?.warningSeverityCount ?? 0,
      info: summary?.infoSeverityCount ?? 0,
    },
    recentFailures24h: summary?.recentFailures24h ?? 0,
  });
});

opsRouter.get("/domain-events", requireAuth, async (req: Request, res: Response) => {
  const page = Math.max(1, parseInteger(req.query.page, 1));
  const limit = Math.min(200, Math.max(1, parseInteger(req.query.limit, 50)));
  const offset = (page - 1) * limit;

  const eventType = typeof req.query.eventType === "string" ? req.query.eventType : undefined;
  const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
  const dateFrom = parseDate(req.query.dateFrom);
  const dateTo = parseDate(req.query.dateTo);

  let whereClause: SQL | undefined;
  whereClause = withOptional(
    whereClause,
    eventType ? eq(domainEventLogs.eventType, eventType as never) : undefined
  );
  whereClause = withOptional(
    whereClause,
    entityType ? eq(domainEventLogs.entityType, entityType) : undefined
  );
  whereClause = withOptional(
    whereClause,
    dateFrom ? gte(domainEventLogs.createdAt, dateFrom) : undefined
  );
  whereClause = withOptional(
    whereClause,
    dateTo ? lte(domainEventLogs.createdAt, dateTo) : undefined
  );

  const listBaseQuery = db
    .select({
      id: domainEventLogs.id,
      tenantId: domainEventLogs.tenantId,
      eventType: domainEventLogs.eventType,
      entityType: domainEventLogs.entityType,
      entityId: domainEventLogs.entityId,
      payload: domainEventLogs.payload,
      triggeredBy: domainEventLogs.triggeredBy,
      createdAt: domainEventLogs.createdAt,
    })
    .from(domainEventLogs);

  const countBaseQuery = db.select({ count: sql<number>`count(*)::int` }).from(domainEventLogs);

  const listQuery = whereClause ? listBaseQuery.where(whereClause) : listBaseQuery;
  const countQuery = whereClause ? countBaseQuery.where(whereClause) : countBaseQuery;

  const [rows, countRows] = await Promise.all([
    listQuery.orderBy(desc(domainEventLogs.createdAt)).limit(limit).offset(offset),
    countQuery,
  ]);

  const total = countRows[0]?.count ?? 0;

  res.json({
    data: rows,
    meta: {
      page,
      limit,
      total,
      filters: {
        eventType,
        entityType,
        dateFrom: dateFrom?.toISOString(),
        dateTo: dateTo?.toISOString(),
      },
    },
  });
});

export default opsRouter;
