// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
import {
  certifications,
  employeeCertifications,
  goals,
  performanceReviewCycles,
  performanceReviews,
} from "../../schema/hr/talent.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getPerformanceReviewCyclesByIdSafe(
  db: Database,
  tenantId: (typeof performanceReviewCycles.$inferSelect)["tenantId"],
  id: (typeof performanceReviewCycles.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(performanceReviewCycles)
    .where(
      and(
        eq(performanceReviewCycles.tenantId, tenantId),
        eq(performanceReviewCycles.id, id),
        isNull(performanceReviewCycles.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getPerformanceReviewCyclesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getPerformanceReviewCyclesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof performanceReviewCycles.$inferSelect)["tenantId"],
  id: (typeof performanceReviewCycles.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getPerformanceReviewCyclesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listPerformanceReviewCyclesActive(
  db: Database,
  tenantId: (typeof performanceReviewCycles.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(performanceReviewCycles)
    .where(and(eq(performanceReviewCycles.tenantId, tenantId), isNull(performanceReviewCycles.deletedAt)));
}

export async function listPerformanceReviewCyclesActiveGuarded(
  db: Database,
  tenantId: (typeof performanceReviewCycles.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPerformanceReviewCyclesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listPerformanceReviewCyclesAll(
  db: Database,
  tenantId: (typeof performanceReviewCycles.$inferSelect)["tenantId"],
) {
  return await db.select().from(performanceReviewCycles).where(eq(performanceReviewCycles.tenantId, tenantId));
}

export async function listPerformanceReviewCyclesAllGuarded(
  db: Database,
  tenantId: (typeof performanceReviewCycles.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPerformanceReviewCyclesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archivePerformanceReviewCycles(
  db: Database,
  tenantId: (typeof performanceReviewCycles.$inferSelect)["tenantId"],
  id: (typeof performanceReviewCycles.$inferSelect)["id"],
) {
  return await db
    .update(performanceReviewCycles)
    .set({ deletedAt: new Date() })
    .where(and(eq(performanceReviewCycles.tenantId, tenantId), eq(performanceReviewCycles.id, id)));
}

export async function archivePerformanceReviewCyclesGuarded(
  db: Database,
  tenantId: (typeof performanceReviewCycles.$inferSelect)["tenantId"],
  id: (typeof performanceReviewCycles.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archivePerformanceReviewCycles(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getPerformanceReviewsByIdSafe(
  db: Database,
  tenantId: (typeof performanceReviews.$inferSelect)["tenantId"],
  id: (typeof performanceReviews.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(performanceReviews)
    .where(
      and(
        eq(performanceReviews.tenantId, tenantId),
        eq(performanceReviews.id, id),
        isNull(performanceReviews.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getPerformanceReviewsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getPerformanceReviewsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof performanceReviews.$inferSelect)["tenantId"],
  id: (typeof performanceReviews.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getPerformanceReviewsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listPerformanceReviewsActive(
  db: Database,
  tenantId: (typeof performanceReviews.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(performanceReviews)
    .where(and(eq(performanceReviews.tenantId, tenantId), isNull(performanceReviews.deletedAt)));
}

export async function listPerformanceReviewsActiveGuarded(
  db: Database,
  tenantId: (typeof performanceReviews.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPerformanceReviewsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listPerformanceReviewsAll(
  db: Database,
  tenantId: (typeof performanceReviews.$inferSelect)["tenantId"],
) {
  return await db.select().from(performanceReviews).where(eq(performanceReviews.tenantId, tenantId));
}

export async function listPerformanceReviewsAllGuarded(
  db: Database,
  tenantId: (typeof performanceReviews.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listPerformanceReviewsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archivePerformanceReviews(
  db: Database,
  tenantId: (typeof performanceReviews.$inferSelect)["tenantId"],
  id: (typeof performanceReviews.$inferSelect)["id"],
) {
  return await db
    .update(performanceReviews)
    .set({ deletedAt: new Date() })
    .where(and(eq(performanceReviews.tenantId, tenantId), eq(performanceReviews.id, id)));
}

export async function archivePerformanceReviewsGuarded(
  db: Database,
  tenantId: (typeof performanceReviews.$inferSelect)["tenantId"],
  id: (typeof performanceReviews.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archivePerformanceReviews(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getGoalsByIdSafe(
  db: Database,
  tenantId: (typeof goals.$inferSelect)["tenantId"],
  id: (typeof goals.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.tenantId, tenantId),
        eq(goals.id, id),
        isNull(goals.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getGoalsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getGoalsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof goals.$inferSelect)["tenantId"],
  id: (typeof goals.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getGoalsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listGoalsActive(
  db: Database,
  tenantId: (typeof goals.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(goals)
    .where(and(eq(goals.tenantId, tenantId), isNull(goals.deletedAt)));
}

export async function listGoalsActiveGuarded(
  db: Database,
  tenantId: (typeof goals.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listGoalsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listGoalsAll(
  db: Database,
  tenantId: (typeof goals.$inferSelect)["tenantId"],
) {
  return await db.select().from(goals).where(eq(goals.tenantId, tenantId));
}

export async function listGoalsAllGuarded(
  db: Database,
  tenantId: (typeof goals.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listGoalsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveGoals(
  db: Database,
  tenantId: (typeof goals.$inferSelect)["tenantId"],
  id: (typeof goals.$inferSelect)["id"],
) {
  return await db
    .update(goals)
    .set({ deletedAt: new Date() })
    .where(and(eq(goals.tenantId, tenantId), eq(goals.id, id)));
}

export async function archiveGoalsGuarded(
  db: Database,
  tenantId: (typeof goals.$inferSelect)["tenantId"],
  id: (typeof goals.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveGoals(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getCertificationsByIdSafe(
  db: Database,
  tenantId: (typeof certifications.$inferSelect)["tenantId"],
  id: (typeof certifications.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(certifications)
    .where(
      and(
        eq(certifications.tenantId, tenantId),
        eq(certifications.id, id),
        isNull(certifications.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getCertificationsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCertificationsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof certifications.$inferSelect)["tenantId"],
  id: (typeof certifications.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCertificationsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listCertificationsActive(
  db: Database,
  tenantId: (typeof certifications.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(certifications)
    .where(and(eq(certifications.tenantId, tenantId), isNull(certifications.deletedAt)));
}

export async function listCertificationsActiveGuarded(
  db: Database,
  tenantId: (typeof certifications.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCertificationsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCertificationsAll(
  db: Database,
  tenantId: (typeof certifications.$inferSelect)["tenantId"],
) {
  return await db.select().from(certifications).where(eq(certifications.tenantId, tenantId));
}

export async function listCertificationsAllGuarded(
  db: Database,
  tenantId: (typeof certifications.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCertificationsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCertifications(
  db: Database,
  tenantId: (typeof certifications.$inferSelect)["tenantId"],
  id: (typeof certifications.$inferSelect)["id"],
) {
  return await db
    .update(certifications)
    .set({ deletedAt: new Date() })
    .where(and(eq(certifications.tenantId, tenantId), eq(certifications.id, id)));
}

export async function archiveCertificationsGuarded(
  db: Database,
  tenantId: (typeof certifications.$inferSelect)["tenantId"],
  id: (typeof certifications.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCertifications(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeCertificationsByIdSafe(
  db: Database,
  tenantId: (typeof employeeCertifications.$inferSelect)["tenantId"],
  id: (typeof employeeCertifications.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeCertifications)
    .where(
      and(
        eq(employeeCertifications.tenantId, tenantId),
        eq(employeeCertifications.id, id),
        isNull(employeeCertifications.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEmployeeCertificationsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeeCertificationsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeeCertifications.$inferSelect)["tenantId"],
  id: (typeof employeeCertifications.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeeCertificationsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeCertificationsActive(
  db: Database,
  tenantId: (typeof employeeCertifications.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeCertifications)
    .where(and(eq(employeeCertifications.tenantId, tenantId), isNull(employeeCertifications.deletedAt)));
}

export async function listEmployeeCertificationsActiveGuarded(
  db: Database,
  tenantId: (typeof employeeCertifications.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeCertificationsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeCertificationsAll(
  db: Database,
  tenantId: (typeof employeeCertifications.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeCertifications).where(eq(employeeCertifications.tenantId, tenantId));
}

export async function listEmployeeCertificationsAllGuarded(
  db: Database,
  tenantId: (typeof employeeCertifications.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeCertificationsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeCertifications(
  db: Database,
  tenantId: (typeof employeeCertifications.$inferSelect)["tenantId"],
  id: (typeof employeeCertifications.$inferSelect)["id"],
) {
  return await db
    .update(employeeCertifications)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeCertifications.tenantId, tenantId), eq(employeeCertifications.id, id)));
}

export async function archiveEmployeeCertificationsGuarded(
  db: Database,
  tenantId: (typeof employeeCertifications.$inferSelect)["tenantId"],
  id: (typeof employeeCertifications.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeeCertifications(db, tenantId, id);
}

