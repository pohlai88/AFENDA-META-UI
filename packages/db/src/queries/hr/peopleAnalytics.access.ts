// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
import {
  analyticsDashboards,
  analyticsDimensions,
  analyticsFacts,
  dataExports,
  hrMetrics,
  reportSubscriptionRecipients,
  reportSubscriptions,
} from "../../schema/hr/peopleAnalytics.js";

/** By ID for tenant (no soft-delete column on table). */
export async function getAnalyticsFactsById(
  db: Database,
  tenantId: (typeof analyticsFacts.$inferSelect)["tenantId"],
  id: (typeof analyticsFacts.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(analyticsFacts)
    .where(and(eq(analyticsFacts.tenantId, tenantId), eq(analyticsFacts.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listAnalyticsFacts(
  db: Database,
  tenantId: (typeof analyticsFacts.$inferSelect)["tenantId"],
) {
  return await db.select().from(analyticsFacts).where(eq(analyticsFacts.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listHrMetricsAll(
  db: Database,
  tenantId: (typeof hrMetrics.$inferSelect)["tenantId"],
) {
  return await db.select().from(hrMetrics).where(eq(hrMetrics.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listAnalyticsDashboardsAll(
  db: Database,
  tenantId: (typeof analyticsDashboards.$inferSelect)["tenantId"],
) {
  return await db.select().from(analyticsDashboards).where(eq(analyticsDashboards.tenantId, tenantId));
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


/** By ID for tenant (no soft-delete column on table). */
export async function getDataExportsById(
  db: Database,
  tenantId: (typeof dataExports.$inferSelect)["tenantId"],
  id: (typeof dataExports.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(dataExports)
    .where(and(eq(dataExports.tenantId, tenantId), eq(dataExports.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listDataExports(
  db: Database,
  tenantId: (typeof dataExports.$inferSelect)["tenantId"],
) {
  return await db.select().from(dataExports).where(eq(dataExports.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listReportSubscriptionsAll(
  db: Database,
  tenantId: (typeof reportSubscriptions.$inferSelect)["tenantId"],
) {
  return await db.select().from(reportSubscriptions).where(eq(reportSubscriptions.tenantId, tenantId));
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


/** By ID for tenant (no soft-delete column on table). */
export async function getReportSubscriptionRecipientsById(
  db: Database,
  tenantId: (typeof reportSubscriptionRecipients.$inferSelect)["tenantId"],
  id: (typeof reportSubscriptionRecipients.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(reportSubscriptionRecipients)
    .where(and(eq(reportSubscriptionRecipients.tenantId, tenantId), eq(reportSubscriptionRecipients.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listReportSubscriptionRecipients(
  db: Database,
  tenantId: (typeof reportSubscriptionRecipients.$inferSelect)["tenantId"],
) {
  return await db.select().from(reportSubscriptionRecipients).where(eq(reportSubscriptionRecipients.tenantId, tenantId));
}


/** By ID for tenant (no soft-delete column on table). */
export async function getAnalyticsDimensionsById(
  db: Database,
  tenantId: (typeof analyticsDimensions.$inferSelect)["tenantId"],
  id: (typeof analyticsDimensions.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(analyticsDimensions)
    .where(and(eq(analyticsDimensions.tenantId, tenantId), eq(analyticsDimensions.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listAnalyticsDimensions(
  db: Database,
  tenantId: (typeof analyticsDimensions.$inferSelect)["tenantId"],
) {
  return await db.select().from(analyticsDimensions).where(eq(analyticsDimensions.tenantId, tenantId));
}

