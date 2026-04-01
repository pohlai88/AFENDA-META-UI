// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
import {
  analyticsDashboards,
  analyticsDimensions,
  analyticsFacts,
  dataExports,
  hrMetrics,
  reportSubscriptionRecipients,
  reportSubscriptions,
} from "../../schema/hr/peopleAnalytics.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getAnalyticsFactsByIdSafe(
  db: Database,
  tenantId: (typeof analyticsFacts.$inferSelect)["tenantId"],
  id: (typeof analyticsFacts.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(analyticsFacts)
    .where(
      and(
        eq(analyticsFacts.tenantId, tenantId),
        eq(analyticsFacts.id, id),
        isNull(analyticsFacts.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getAnalyticsFactsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getAnalyticsFactsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof analyticsFacts.$inferSelect)["tenantId"],
  id: (typeof analyticsFacts.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getAnalyticsFactsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listAnalyticsFactsActive(
  db: Database,
  tenantId: (typeof analyticsFacts.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(analyticsFacts)
    .where(and(eq(analyticsFacts.tenantId, tenantId), isNull(analyticsFacts.deletedAt)));
}

export async function listAnalyticsFactsActiveGuarded(
  db: Database,
  tenantId: (typeof analyticsFacts.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAnalyticsFactsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listAnalyticsFactsAll(
  db: Database,
  tenantId: (typeof analyticsFacts.$inferSelect)["tenantId"],
) {
  return await db.select().from(analyticsFacts).where(eq(analyticsFacts.tenantId, tenantId));
}

export async function listAnalyticsFactsAllGuarded(
  db: Database,
  tenantId: (typeof analyticsFacts.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAnalyticsFactsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveAnalyticsFacts(
  db: Database,
  tenantId: (typeof analyticsFacts.$inferSelect)["tenantId"],
  id: (typeof analyticsFacts.$inferSelect)["id"],
) {
  return await db
    .update(analyticsFacts)
    .set({ deletedAt: new Date() })
    .where(and(eq(analyticsFacts.tenantId, tenantId), eq(analyticsFacts.id, id)));
}

export async function archiveAnalyticsFactsGuarded(
  db: Database,
  tenantId: (typeof analyticsFacts.$inferSelect)["tenantId"],
  id: (typeof analyticsFacts.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveAnalyticsFacts(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getHrMetricsByIdSafe(
  db: Database,
  tenantId: (typeof hrMetrics.$inferSelect)["tenantId"],
  id: (typeof hrMetrics.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(hrMetrics)
    .where(
      and(
        eq(hrMetrics.tenantId, tenantId),
        eq(hrMetrics.id, id),
        isNull(hrMetrics.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getHrMetricsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getHrMetricsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof hrMetrics.$inferSelect)["tenantId"],
  id: (typeof hrMetrics.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getHrMetricsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listHrMetricsActive(
  db: Database,
  tenantId: (typeof hrMetrics.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(hrMetrics)
    .where(and(eq(hrMetrics.tenantId, tenantId), isNull(hrMetrics.deletedAt)));
}

export async function listHrMetricsActiveGuarded(
  db: Database,
  tenantId: (typeof hrMetrics.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listHrMetricsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listHrMetricsAll(
  db: Database,
  tenantId: (typeof hrMetrics.$inferSelect)["tenantId"],
) {
  return await db.select().from(hrMetrics).where(eq(hrMetrics.tenantId, tenantId));
}

export async function listHrMetricsAllGuarded(
  db: Database,
  tenantId: (typeof hrMetrics.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listHrMetricsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveHrMetrics(
  db: Database,
  tenantId: (typeof hrMetrics.$inferSelect)["tenantId"],
  id: (typeof hrMetrics.$inferSelect)["id"],
) {
  return await db
    .update(hrMetrics)
    .set({ deletedAt: new Date() })
    .where(and(eq(hrMetrics.tenantId, tenantId), eq(hrMetrics.id, id)));
}

export async function archiveHrMetricsGuarded(
  db: Database,
  tenantId: (typeof hrMetrics.$inferSelect)["tenantId"],
  id: (typeof hrMetrics.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveHrMetrics(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getAnalyticsDashboardsByIdSafe(
  db: Database,
  tenantId: (typeof analyticsDashboards.$inferSelect)["tenantId"],
  id: (typeof analyticsDashboards.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(analyticsDashboards)
    .where(
      and(
        eq(analyticsDashboards.tenantId, tenantId),
        eq(analyticsDashboards.id, id),
        isNull(analyticsDashboards.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getAnalyticsDashboardsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getAnalyticsDashboardsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof analyticsDashboards.$inferSelect)["tenantId"],
  id: (typeof analyticsDashboards.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getAnalyticsDashboardsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listAnalyticsDashboardsActive(
  db: Database,
  tenantId: (typeof analyticsDashboards.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(analyticsDashboards)
    .where(and(eq(analyticsDashboards.tenantId, tenantId), isNull(analyticsDashboards.deletedAt)));
}

export async function listAnalyticsDashboardsActiveGuarded(
  db: Database,
  tenantId: (typeof analyticsDashboards.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAnalyticsDashboardsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listAnalyticsDashboardsAll(
  db: Database,
  tenantId: (typeof analyticsDashboards.$inferSelect)["tenantId"],
) {
  return await db.select().from(analyticsDashboards).where(eq(analyticsDashboards.tenantId, tenantId));
}

export async function listAnalyticsDashboardsAllGuarded(
  db: Database,
  tenantId: (typeof analyticsDashboards.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAnalyticsDashboardsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveAnalyticsDashboards(
  db: Database,
  tenantId: (typeof analyticsDashboards.$inferSelect)["tenantId"],
  id: (typeof analyticsDashboards.$inferSelect)["id"],
) {
  return await db
    .update(analyticsDashboards)
    .set({ deletedAt: new Date() })
    .where(and(eq(analyticsDashboards.tenantId, tenantId), eq(analyticsDashboards.id, id)));
}

export async function archiveAnalyticsDashboardsGuarded(
  db: Database,
  tenantId: (typeof analyticsDashboards.$inferSelect)["tenantId"],
  id: (typeof analyticsDashboards.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveAnalyticsDashboards(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getDataExportsByIdSafe(
  db: Database,
  tenantId: (typeof dataExports.$inferSelect)["tenantId"],
  id: (typeof dataExports.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(dataExports)
    .where(
      and(
        eq(dataExports.tenantId, tenantId),
        eq(dataExports.id, id),
        isNull(dataExports.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getDataExportsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getDataExportsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof dataExports.$inferSelect)["tenantId"],
  id: (typeof dataExports.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getDataExportsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listDataExportsActive(
  db: Database,
  tenantId: (typeof dataExports.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(dataExports)
    .where(and(eq(dataExports.tenantId, tenantId), isNull(dataExports.deletedAt)));
}

export async function listDataExportsActiveGuarded(
  db: Database,
  tenantId: (typeof dataExports.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listDataExportsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listDataExportsAll(
  db: Database,
  tenantId: (typeof dataExports.$inferSelect)["tenantId"],
) {
  return await db.select().from(dataExports).where(eq(dataExports.tenantId, tenantId));
}

export async function listDataExportsAllGuarded(
  db: Database,
  tenantId: (typeof dataExports.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listDataExportsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveDataExports(
  db: Database,
  tenantId: (typeof dataExports.$inferSelect)["tenantId"],
  id: (typeof dataExports.$inferSelect)["id"],
) {
  return await db
    .update(dataExports)
    .set({ deletedAt: new Date() })
    .where(and(eq(dataExports.tenantId, tenantId), eq(dataExports.id, id)));
}

export async function archiveDataExportsGuarded(
  db: Database,
  tenantId: (typeof dataExports.$inferSelect)["tenantId"],
  id: (typeof dataExports.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveDataExports(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getReportSubscriptionsByIdSafe(
  db: Database,
  tenantId: (typeof reportSubscriptions.$inferSelect)["tenantId"],
  id: (typeof reportSubscriptions.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(reportSubscriptions)
    .where(
      and(
        eq(reportSubscriptions.tenantId, tenantId),
        eq(reportSubscriptions.id, id),
        isNull(reportSubscriptions.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getReportSubscriptionsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getReportSubscriptionsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof reportSubscriptions.$inferSelect)["tenantId"],
  id: (typeof reportSubscriptions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getReportSubscriptionsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listReportSubscriptionsActive(
  db: Database,
  tenantId: (typeof reportSubscriptions.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(reportSubscriptions)
    .where(and(eq(reportSubscriptions.tenantId, tenantId), isNull(reportSubscriptions.deletedAt)));
}

export async function listReportSubscriptionsActiveGuarded(
  db: Database,
  tenantId: (typeof reportSubscriptions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listReportSubscriptionsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listReportSubscriptionsAll(
  db: Database,
  tenantId: (typeof reportSubscriptions.$inferSelect)["tenantId"],
) {
  return await db.select().from(reportSubscriptions).where(eq(reportSubscriptions.tenantId, tenantId));
}

export async function listReportSubscriptionsAllGuarded(
  db: Database,
  tenantId: (typeof reportSubscriptions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listReportSubscriptionsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveReportSubscriptions(
  db: Database,
  tenantId: (typeof reportSubscriptions.$inferSelect)["tenantId"],
  id: (typeof reportSubscriptions.$inferSelect)["id"],
) {
  return await db
    .update(reportSubscriptions)
    .set({ deletedAt: new Date() })
    .where(and(eq(reportSubscriptions.tenantId, tenantId), eq(reportSubscriptions.id, id)));
}

export async function archiveReportSubscriptionsGuarded(
  db: Database,
  tenantId: (typeof reportSubscriptions.$inferSelect)["tenantId"],
  id: (typeof reportSubscriptions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveReportSubscriptions(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getReportSubscriptionRecipientsByIdSafe(
  db: Database,
  tenantId: (typeof reportSubscriptionRecipients.$inferSelect)["tenantId"],
  id: (typeof reportSubscriptionRecipients.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(reportSubscriptionRecipients)
    .where(
      and(
        eq(reportSubscriptionRecipients.tenantId, tenantId),
        eq(reportSubscriptionRecipients.id, id),
        isNull(reportSubscriptionRecipients.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getReportSubscriptionRecipientsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getReportSubscriptionRecipientsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof reportSubscriptionRecipients.$inferSelect)["tenantId"],
  id: (typeof reportSubscriptionRecipients.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getReportSubscriptionRecipientsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listReportSubscriptionRecipientsActive(
  db: Database,
  tenantId: (typeof reportSubscriptionRecipients.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(reportSubscriptionRecipients)
    .where(and(eq(reportSubscriptionRecipients.tenantId, tenantId), isNull(reportSubscriptionRecipients.deletedAt)));
}

export async function listReportSubscriptionRecipientsActiveGuarded(
  db: Database,
  tenantId: (typeof reportSubscriptionRecipients.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listReportSubscriptionRecipientsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listReportSubscriptionRecipientsAll(
  db: Database,
  tenantId: (typeof reportSubscriptionRecipients.$inferSelect)["tenantId"],
) {
  return await db.select().from(reportSubscriptionRecipients).where(eq(reportSubscriptionRecipients.tenantId, tenantId));
}

export async function listReportSubscriptionRecipientsAllGuarded(
  db: Database,
  tenantId: (typeof reportSubscriptionRecipients.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listReportSubscriptionRecipientsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveReportSubscriptionRecipients(
  db: Database,
  tenantId: (typeof reportSubscriptionRecipients.$inferSelect)["tenantId"],
  id: (typeof reportSubscriptionRecipients.$inferSelect)["id"],
) {
  return await db
    .update(reportSubscriptionRecipients)
    .set({ deletedAt: new Date() })
    .where(and(eq(reportSubscriptionRecipients.tenantId, tenantId), eq(reportSubscriptionRecipients.id, id)));
}

export async function archiveReportSubscriptionRecipientsGuarded(
  db: Database,
  tenantId: (typeof reportSubscriptionRecipients.$inferSelect)["tenantId"],
  id: (typeof reportSubscriptionRecipients.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveReportSubscriptionRecipients(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getAnalyticsDimensionsByIdSafe(
  db: Database,
  tenantId: (typeof analyticsDimensions.$inferSelect)["tenantId"],
  id: (typeof analyticsDimensions.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(analyticsDimensions)
    .where(
      and(
        eq(analyticsDimensions.tenantId, tenantId),
        eq(analyticsDimensions.id, id),
        isNull(analyticsDimensions.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getAnalyticsDimensionsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getAnalyticsDimensionsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof analyticsDimensions.$inferSelect)["tenantId"],
  id: (typeof analyticsDimensions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getAnalyticsDimensionsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listAnalyticsDimensionsActive(
  db: Database,
  tenantId: (typeof analyticsDimensions.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(analyticsDimensions)
    .where(and(eq(analyticsDimensions.tenantId, tenantId), isNull(analyticsDimensions.deletedAt)));
}

export async function listAnalyticsDimensionsActiveGuarded(
  db: Database,
  tenantId: (typeof analyticsDimensions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAnalyticsDimensionsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listAnalyticsDimensionsAll(
  db: Database,
  tenantId: (typeof analyticsDimensions.$inferSelect)["tenantId"],
) {
  return await db.select().from(analyticsDimensions).where(eq(analyticsDimensions.tenantId, tenantId));
}

export async function listAnalyticsDimensionsAllGuarded(
  db: Database,
  tenantId: (typeof analyticsDimensions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAnalyticsDimensionsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveAnalyticsDimensions(
  db: Database,
  tenantId: (typeof analyticsDimensions.$inferSelect)["tenantId"],
  id: (typeof analyticsDimensions.$inferSelect)["id"],
) {
  return await db
    .update(analyticsDimensions)
    .set({ deletedAt: new Date() })
    .where(and(eq(analyticsDimensions.tenantId, tenantId), eq(analyticsDimensions.id, id)));
}

export async function archiveAnalyticsDimensionsGuarded(
  db: Database,
  tenantId: (typeof analyticsDimensions.$inferSelect)["tenantId"],
  id: (typeof analyticsDimensions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveAnalyticsDimensions(db, tenantId, id);
}

