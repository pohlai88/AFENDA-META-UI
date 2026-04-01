// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
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

/** Same as getInternationalAssignmentsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getInternationalAssignmentsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof internationalAssignments.$inferSelect)["tenantId"],
  id: (typeof internationalAssignments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getInternationalAssignmentsByIdSafe(db, tenantId, id);
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

export async function listInternationalAssignmentsActiveGuarded(
  db: Database,
  tenantId: (typeof internationalAssignments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listInternationalAssignmentsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listInternationalAssignmentsAll(
  db: Database,
  tenantId: (typeof internationalAssignments.$inferSelect)["tenantId"],
) {
  return await db.select().from(internationalAssignments).where(eq(internationalAssignments.tenantId, tenantId));
}

export async function listInternationalAssignmentsAllGuarded(
  db: Database,
  tenantId: (typeof internationalAssignments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listInternationalAssignmentsAll(db, tenantId);
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

export async function archiveInternationalAssignmentsGuarded(
  db: Database,
  tenantId: (typeof internationalAssignments.$inferSelect)["tenantId"],
  id: (typeof internationalAssignments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveInternationalAssignments(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getAssignmentAllowancesByIdSafe(
  db: Database,
  tenantId: (typeof assignmentAllowances.$inferSelect)["tenantId"],
  id: (typeof assignmentAllowances.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(assignmentAllowances)
    .where(
      and(
        eq(assignmentAllowances.tenantId, tenantId),
        eq(assignmentAllowances.id, id),
        isNull(assignmentAllowances.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getAssignmentAllowancesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getAssignmentAllowancesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof assignmentAllowances.$inferSelect)["tenantId"],
  id: (typeof assignmentAllowances.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getAssignmentAllowancesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listAssignmentAllowancesActive(
  db: Database,
  tenantId: (typeof assignmentAllowances.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(assignmentAllowances)
    .where(and(eq(assignmentAllowances.tenantId, tenantId), isNull(assignmentAllowances.deletedAt)));
}

export async function listAssignmentAllowancesActiveGuarded(
  db: Database,
  tenantId: (typeof assignmentAllowances.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAssignmentAllowancesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listAssignmentAllowancesAll(
  db: Database,
  tenantId: (typeof assignmentAllowances.$inferSelect)["tenantId"],
) {
  return await db.select().from(assignmentAllowances).where(eq(assignmentAllowances.tenantId, tenantId));
}

export async function listAssignmentAllowancesAllGuarded(
  db: Database,
  tenantId: (typeof assignmentAllowances.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAssignmentAllowancesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveAssignmentAllowances(
  db: Database,
  tenantId: (typeof assignmentAllowances.$inferSelect)["tenantId"],
  id: (typeof assignmentAllowances.$inferSelect)["id"],
) {
  return await db
    .update(assignmentAllowances)
    .set({ deletedAt: new Date() })
    .where(and(eq(assignmentAllowances.tenantId, tenantId), eq(assignmentAllowances.id, id)));
}

export async function archiveAssignmentAllowancesGuarded(
  db: Database,
  tenantId: (typeof assignmentAllowances.$inferSelect)["tenantId"],
  id: (typeof assignmentAllowances.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveAssignmentAllowances(db, tenantId, id);
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

/** Same as getWorkPermitsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getWorkPermitsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof workPermits.$inferSelect)["tenantId"],
  id: (typeof workPermits.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getWorkPermitsByIdSafe(db, tenantId, id);
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

export async function listWorkPermitsActiveGuarded(
  db: Database,
  tenantId: (typeof workPermits.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listWorkPermitsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listWorkPermitsAll(
  db: Database,
  tenantId: (typeof workPermits.$inferSelect)["tenantId"],
) {
  return await db.select().from(workPermits).where(eq(workPermits.tenantId, tenantId));
}

export async function listWorkPermitsAllGuarded(
  db: Database,
  tenantId: (typeof workPermits.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listWorkPermitsAll(db, tenantId);
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

export async function archiveWorkPermitsGuarded(
  db: Database,
  tenantId: (typeof workPermits.$inferSelect)["tenantId"],
  id: (typeof workPermits.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveWorkPermits(db, tenantId, id);
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

/** Same as getComplianceTrackingByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getComplianceTrackingByIdSafeGuarded(
  db: Database,
  tenantId: (typeof complianceTracking.$inferSelect)["tenantId"],
  id: (typeof complianceTracking.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getComplianceTrackingByIdSafe(db, tenantId, id);
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

export async function listComplianceTrackingActiveGuarded(
  db: Database,
  tenantId: (typeof complianceTracking.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listComplianceTrackingActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listComplianceTrackingAll(
  db: Database,
  tenantId: (typeof complianceTracking.$inferSelect)["tenantId"],
) {
  return await db.select().from(complianceTracking).where(eq(complianceTracking.tenantId, tenantId));
}

export async function listComplianceTrackingAllGuarded(
  db: Database,
  tenantId: (typeof complianceTracking.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listComplianceTrackingAll(db, tenantId);
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

export async function archiveComplianceTrackingGuarded(
  db: Database,
  tenantId: (typeof complianceTracking.$inferSelect)["tenantId"],
  id: (typeof complianceTracking.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveComplianceTracking(db, tenantId, id);
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

/** Same as getRelocationServicesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getRelocationServicesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof relocationServices.$inferSelect)["tenantId"],
  id: (typeof relocationServices.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getRelocationServicesByIdSafe(db, tenantId, id);
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

export async function listRelocationServicesActiveGuarded(
  db: Database,
  tenantId: (typeof relocationServices.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listRelocationServicesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listRelocationServicesAll(
  db: Database,
  tenantId: (typeof relocationServices.$inferSelect)["tenantId"],
) {
  return await db.select().from(relocationServices).where(eq(relocationServices.tenantId, tenantId));
}

export async function listRelocationServicesAllGuarded(
  db: Database,
  tenantId: (typeof relocationServices.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listRelocationServicesAll(db, tenantId);
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

export async function archiveRelocationServicesGuarded(
  db: Database,
  tenantId: (typeof relocationServices.$inferSelect)["tenantId"],
  id: (typeof relocationServices.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveRelocationServices(db, tenantId, id);
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

/** Same as getDeiMetricsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getDeiMetricsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof deiMetrics.$inferSelect)["tenantId"],
  id: (typeof deiMetrics.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getDeiMetricsByIdSafe(db, tenantId, id);
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

export async function listDeiMetricsActiveGuarded(
  db: Database,
  tenantId: (typeof deiMetrics.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listDeiMetricsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listDeiMetricsAll(
  db: Database,
  tenantId: (typeof deiMetrics.$inferSelect)["tenantId"],
) {
  return await db.select().from(deiMetrics).where(eq(deiMetrics.tenantId, tenantId));
}

export async function listDeiMetricsAllGuarded(
  db: Database,
  tenantId: (typeof deiMetrics.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listDeiMetricsAll(db, tenantId);
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

export async function archiveDeiMetricsGuarded(
  db: Database,
  tenantId: (typeof deiMetrics.$inferSelect)["tenantId"],
  id: (typeof deiMetrics.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveDeiMetrics(db, tenantId, id);
}

