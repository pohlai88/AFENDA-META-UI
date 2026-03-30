// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
import {
  assignmentAllowances,
  complianceTracking,
  deiMetrics,
  internationalAssignments,
  relocationServices,
  workPermits,
} from "../../schema/hr/globalWorkforce.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getInternationalAssignmentsByIdSafe(
  db: Database,
  tenantId: (typeof internationalAssignments.$inferSelect)["tenantId"],
  id: (typeof internationalAssignments.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(internationalAssignments)
    .where(
      and(
        eq(internationalAssignments.tenantId, tenantId),
        eq(internationalAssignments.id, id),
        isNull(internationalAssignments.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listInternationalAssignmentsActive(
  db: Database,
  tenantId: (typeof internationalAssignments.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(internationalAssignments)
    .where(and(eq(internationalAssignments.tenantId, tenantId), isNull(internationalAssignments.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listInternationalAssignmentsAll(
  db: Database,
  tenantId: (typeof internationalAssignments.$inferSelect)["tenantId"],
) {
  return await db.select().from(internationalAssignments).where(eq(internationalAssignments.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveInternationalAssignments(
  db: Database,
  tenantId: (typeof internationalAssignments.$inferSelect)["tenantId"],
  id: (typeof internationalAssignments.$inferSelect)["id"],
) {
  return await db
    .update(internationalAssignments)
    .set({ deletedAt: new Date() })
    .where(and(eq(internationalAssignments.tenantId, tenantId), eq(internationalAssignments.id, id)));
}


/** By ID for tenant (no soft-delete column on table). */
export async function getAssignmentAllowancesById(
  db: Database,
  tenantId: (typeof assignmentAllowances.$inferSelect)["tenantId"],
  id: (typeof assignmentAllowances.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(assignmentAllowances)
    .where(and(eq(assignmentAllowances.tenantId, tenantId), eq(assignmentAllowances.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listAssignmentAllowances(
  db: Database,
  tenantId: (typeof assignmentAllowances.$inferSelect)["tenantId"],
) {
  return await db.select().from(assignmentAllowances).where(eq(assignmentAllowances.tenantId, tenantId));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getWorkPermitsByIdSafe(
  db: Database,
  tenantId: (typeof workPermits.$inferSelect)["tenantId"],
  id: (typeof workPermits.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(workPermits)
    .where(
      and(
        eq(workPermits.tenantId, tenantId),
        eq(workPermits.id, id),
        isNull(workPermits.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listWorkPermitsActive(
  db: Database,
  tenantId: (typeof workPermits.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(workPermits)
    .where(and(eq(workPermits.tenantId, tenantId), isNull(workPermits.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listWorkPermitsAll(
  db: Database,
  tenantId: (typeof workPermits.$inferSelect)["tenantId"],
) {
  return await db.select().from(workPermits).where(eq(workPermits.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveWorkPermits(
  db: Database,
  tenantId: (typeof workPermits.$inferSelect)["tenantId"],
  id: (typeof workPermits.$inferSelect)["id"],
) {
  return await db
    .update(workPermits)
    .set({ deletedAt: new Date() })
    .where(and(eq(workPermits.tenantId, tenantId), eq(workPermits.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getComplianceTrackingByIdSafe(
  db: Database,
  tenantId: (typeof complianceTracking.$inferSelect)["tenantId"],
  id: (typeof complianceTracking.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(complianceTracking)
    .where(
      and(
        eq(complianceTracking.tenantId, tenantId),
        eq(complianceTracking.id, id),
        isNull(complianceTracking.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listComplianceTrackingActive(
  db: Database,
  tenantId: (typeof complianceTracking.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(complianceTracking)
    .where(and(eq(complianceTracking.tenantId, tenantId), isNull(complianceTracking.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listComplianceTrackingAll(
  db: Database,
  tenantId: (typeof complianceTracking.$inferSelect)["tenantId"],
) {
  return await db.select().from(complianceTracking).where(eq(complianceTracking.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveComplianceTracking(
  db: Database,
  tenantId: (typeof complianceTracking.$inferSelect)["tenantId"],
  id: (typeof complianceTracking.$inferSelect)["id"],
) {
  return await db
    .update(complianceTracking)
    .set({ deletedAt: new Date() })
    .where(and(eq(complianceTracking.tenantId, tenantId), eq(complianceTracking.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getRelocationServicesByIdSafe(
  db: Database,
  tenantId: (typeof relocationServices.$inferSelect)["tenantId"],
  id: (typeof relocationServices.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(relocationServices)
    .where(
      and(
        eq(relocationServices.tenantId, tenantId),
        eq(relocationServices.id, id),
        isNull(relocationServices.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listRelocationServicesActive(
  db: Database,
  tenantId: (typeof relocationServices.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(relocationServices)
    .where(and(eq(relocationServices.tenantId, tenantId), isNull(relocationServices.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listRelocationServicesAll(
  db: Database,
  tenantId: (typeof relocationServices.$inferSelect)["tenantId"],
) {
  return await db.select().from(relocationServices).where(eq(relocationServices.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveRelocationServices(
  db: Database,
  tenantId: (typeof relocationServices.$inferSelect)["tenantId"],
  id: (typeof relocationServices.$inferSelect)["id"],
) {
  return await db
    .update(relocationServices)
    .set({ deletedAt: new Date() })
    .where(and(eq(relocationServices.tenantId, tenantId), eq(relocationServices.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getDeiMetricsByIdSafe(
  db: Database,
  tenantId: (typeof deiMetrics.$inferSelect)["tenantId"],
  id: (typeof deiMetrics.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(deiMetrics)
    .where(
      and(
        eq(deiMetrics.tenantId, tenantId),
        eq(deiMetrics.id, id),
        isNull(deiMetrics.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listDeiMetricsActive(
  db: Database,
  tenantId: (typeof deiMetrics.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(deiMetrics)
    .where(and(eq(deiMetrics.tenantId, tenantId), isNull(deiMetrics.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listDeiMetricsAll(
  db: Database,
  tenantId: (typeof deiMetrics.$inferSelect)["tenantId"],
) {
  return await db.select().from(deiMetrics).where(eq(deiMetrics.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveDeiMetrics(
  db: Database,
  tenantId: (typeof deiMetrics.$inferSelect)["tenantId"],
  id: (typeof deiMetrics.$inferSelect)["id"],
) {
  return await db
    .update(deiMetrics)
    .set({ deletedAt: new Date() })
    .where(and(eq(deiMetrics.tenantId, tenantId), eq(deiMetrics.id, id)));
}

