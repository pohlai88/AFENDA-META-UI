import { and, eq, gte, lte, sql } from "drizzle-orm";

import type { Database } from "../../client/index.js";
import {
  documentAttachments,
  documentGuardrailEvents,
  documentPreDecisionBlocks,
  documentTruthDecisions,
  documentTruthOverrides,
  documentTruthResolutionTasks,
} from "../../schema/reference/tables.js";

type RangeParams = {
  tenantId: number;
  from: Date;
  to: Date;
};

export async function getTruthGuardrailMetrics(db: Database, params: RangeParams) {
  const [{ total, blocked, risky, riskyBlocked }] = await db
    .select({
      total: sql<number>`count(*)::int`,
      blocked: sql<number>`count(*) filter (where ${documentTruthDecisions.recommendedAction} = 'BLOCK')::int`,
      risky: sql<number>`count(*) filter (where ${documentTruthDecisions.duplicateRisk} in ('MEDIUM', 'HIGH'))::int`,
      riskyBlocked: sql<number>`count(*) filter (where ${documentTruthDecisions.duplicateRisk} in ('MEDIUM', 'HIGH') and ${documentTruthDecisions.recommendedAction} = 'BLOCK')::int`,
    })
    .from(documentTruthDecisions)
    .where(
      and(
        eq(documentTruthDecisions.tenantId, params.tenantId),
        gte(documentTruthDecisions.compiledAt, params.from),
        lte(documentTruthDecisions.compiledAt, params.to)
      )
    );

  const [{ ambiguousResolvedAvgMinutes, ambiguousOpenCount }] = await db
    .select({
      ambiguousResolvedAvgMinutes:
        sql<number>`coalesce(avg(extract(epoch from (${documentTruthResolutionTasks.resolvedAt} - ${documentTruthResolutionTasks.openedAt})) / 60.0), 0)::float`,
      ambiguousOpenCount:
        sql<number>`count(*) filter (where ${documentTruthResolutionTasks.taskStatus} in ('OPEN', 'IN_REVIEW'))::int`,
    })
    .from(documentTruthResolutionTasks)
    .where(
      and(
        eq(documentTruthResolutionTasks.tenantId, params.tenantId),
        gte(documentTruthResolutionTasks.openedAt, params.from),
        lte(documentTruthResolutionTasks.openedAt, params.to)
      )
    );

  const [{ attachmentCount, chainCompleteCount }] = await db
    .select({
      attachmentCount: sql<number>`count(*)::int`,
      chainCompleteCount:
        sql<number>`count(*) filter (where ${documentAttachments.truthPolicyVersion} is not null and ${documentAttachments.truthDecisionAt} is not null)::int`,
    })
    .from(documentAttachments)
    .where(
      and(
        eq(documentAttachments.tenantId, params.tenantId),
        gte(documentAttachments.createdAt, params.from),
        lte(documentAttachments.createdAt, params.to)
      )
    );

  const [{ overrideCount, falseBlockCount }] = await db
    .select({
      overrideCount: sql<number>`count(*)::int`,
      falseBlockCount:
        sql<number>`count(*) filter (where ${documentTruthOverrides.overrideOutcome} = 'FALSE_BLOCK')::int`,
    })
    .from(documentTruthOverrides)
    .where(
      and(
        eq(documentTruthOverrides.tenantId, params.tenantId),
        gte(documentTruthOverrides.createdAt, params.from),
        lte(documentTruthOverrides.createdAt, params.to)
      )
    );

  const [{ guardrailEventCount, guardrailBlockedCount, guardrailAllowedCount }] = await db
    .select({
      guardrailEventCount: sql<number>`count(*)::int`,
      guardrailBlockedCount:
        sql<number>`count(*) filter (where ${documentGuardrailEvents.blocked} = true)::int`,
      guardrailAllowedCount:
        sql<number>`count(*) filter (where ${documentGuardrailEvents.blocked} = false)::int`,
    })
    .from(documentGuardrailEvents)
    .where(
      and(
        eq(documentGuardrailEvents.tenantId, params.tenantId),
        gte(documentGuardrailEvents.createdAt, params.from),
        lte(documentGuardrailEvents.createdAt, params.to)
      )
    );

  const activeBlocksByTypeRows = await db
    .select({
      blockType: documentPreDecisionBlocks.blockType,
      activeCount: sql<number>`count(*)::int`,
    })
    .from(documentPreDecisionBlocks)
    .where(
      and(
        eq(documentPreDecisionBlocks.tenantId, params.tenantId),
        eq(documentPreDecisionBlocks.active, true)
      )
    )
    .groupBy(documentPreDecisionBlocks.blockType);

  const riskyDecisionsAutoBlockedPct =
    risky > 0 ? Number(((riskyBlocked / risky) * 100).toFixed(2)) : 0;
  const chainOfCustodyCompletenessPct =
    attachmentCount > 0 ? Number(((chainCompleteCount / attachmentCount) * 100).toFixed(2)) : 0;
  const falseBlockRatePct =
    overrideCount > 0 ? Number(((falseBlockCount / overrideCount) * 100).toFixed(2)) : 0;
  const guardrailBlockRatePct =
    guardrailEventCount > 0
      ? Number(((guardrailBlockedCount / guardrailEventCount) * 100).toFixed(2))
      : 0;

  return {
    totals: {
      totalDecisions: total,
      blockedDecisions: blocked,
      riskyDecisions: risky,
      riskyDecisionsBlocked: riskyBlocked,
    },
    kpis: {
      riskyDecisionsAutoBlockedPct,
      chainOfCustodyCompletenessPct,
      ambiguousResolvedAvgMinutes: Number((ambiguousResolvedAvgMinutes ?? 0).toFixed(2)),
      ambiguousOpenCount,
      falseBlockRatePct,
      guardrailBlockRatePct,
    },
    adjudication: {
      overrideCount,
      falseBlockCount,
    },
    guardrailEvents: {
      guardrailEventCount,
      guardrailBlockedCount,
      guardrailAllowedCount,
    },
    activeBlocksByType: activeBlocksByTypeRows,
  };
}

export async function getTruthGuardrailTimeSeries(
  db: Database,
  params: { tenantId: number; from: Date; to: Date }
) {
  return db
    .select({
      day: sql<string>`date_trunc('day', ${documentTruthDecisions.compiledAt})::date::text`,
      totalDecisions: sql<number>`count(*)::int`,
      blockedDecisions:
        sql<number>`count(*) filter (where ${documentTruthDecisions.recommendedAction} = 'BLOCK')::int`,
      riskyBlockedDecisions:
        sql<number>`count(*) filter (where ${documentTruthDecisions.duplicateRisk} in ('MEDIUM', 'HIGH') and ${documentTruthDecisions.recommendedAction} = 'BLOCK')::int`,
    })
    .from(documentTruthDecisions)
    .where(
      and(
        eq(documentTruthDecisions.tenantId, params.tenantId),
        gte(documentTruthDecisions.compiledAt, params.from),
        lte(documentTruthDecisions.compiledAt, params.to)
      )
    )
    .groupBy(sql`date_trunc('day', ${documentTruthDecisions.compiledAt})`)
    .orderBy(sql`date_trunc('day', ${documentTruthDecisions.compiledAt}) asc`);
}
