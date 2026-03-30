// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
import {
  disciplinaryActions,
  employeeDocuments,
  onboardingChecklists,
  onboardingProgress,
  onboardingTasks,
} from "../../schema/hr/operations.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeDocumentsByIdSafe(
  db: Database,
  tenantId: (typeof employeeDocuments.$inferSelect)["tenantId"],
  id: (typeof employeeDocuments.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeDocuments)
    .where(
      and(
        eq(employeeDocuments.tenantId, tenantId),
        eq(employeeDocuments.id, id),
        isNull(employeeDocuments.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeDocumentsActive(
  db: Database,
  tenantId: (typeof employeeDocuments.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeDocuments)
    .where(and(eq(employeeDocuments.tenantId, tenantId), isNull(employeeDocuments.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeDocumentsAll(
  db: Database,
  tenantId: (typeof employeeDocuments.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeDocuments).where(eq(employeeDocuments.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeDocuments(
  db: Database,
  tenantId: (typeof employeeDocuments.$inferSelect)["tenantId"],
  id: (typeof employeeDocuments.$inferSelect)["id"],
) {
  return await db
    .update(employeeDocuments)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeDocuments.tenantId, tenantId), eq(employeeDocuments.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getDisciplinaryActionsByIdSafe(
  db: Database,
  tenantId: (typeof disciplinaryActions.$inferSelect)["tenantId"],
  id: (typeof disciplinaryActions.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(disciplinaryActions)
    .where(
      and(
        eq(disciplinaryActions.tenantId, tenantId),
        eq(disciplinaryActions.id, id),
        isNull(disciplinaryActions.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listDisciplinaryActionsActive(
  db: Database,
  tenantId: (typeof disciplinaryActions.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(disciplinaryActions)
    .where(and(eq(disciplinaryActions.tenantId, tenantId), isNull(disciplinaryActions.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listDisciplinaryActionsAll(
  db: Database,
  tenantId: (typeof disciplinaryActions.$inferSelect)["tenantId"],
) {
  return await db.select().from(disciplinaryActions).where(eq(disciplinaryActions.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveDisciplinaryActions(
  db: Database,
  tenantId: (typeof disciplinaryActions.$inferSelect)["tenantId"],
  id: (typeof disciplinaryActions.$inferSelect)["id"],
) {
  return await db
    .update(disciplinaryActions)
    .set({ deletedAt: new Date() })
    .where(and(eq(disciplinaryActions.tenantId, tenantId), eq(disciplinaryActions.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getOnboardingChecklistsByIdSafe(
  db: Database,
  tenantId: (typeof onboardingChecklists.$inferSelect)["tenantId"],
  id: (typeof onboardingChecklists.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(onboardingChecklists)
    .where(
      and(
        eq(onboardingChecklists.tenantId, tenantId),
        eq(onboardingChecklists.id, id),
        isNull(onboardingChecklists.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listOnboardingChecklistsActive(
  db: Database,
  tenantId: (typeof onboardingChecklists.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(onboardingChecklists)
    .where(and(eq(onboardingChecklists.tenantId, tenantId), isNull(onboardingChecklists.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listOnboardingChecklistsAll(
  db: Database,
  tenantId: (typeof onboardingChecklists.$inferSelect)["tenantId"],
) {
  return await db.select().from(onboardingChecklists).where(eq(onboardingChecklists.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveOnboardingChecklists(
  db: Database,
  tenantId: (typeof onboardingChecklists.$inferSelect)["tenantId"],
  id: (typeof onboardingChecklists.$inferSelect)["id"],
) {
  return await db
    .update(onboardingChecklists)
    .set({ deletedAt: new Date() })
    .where(and(eq(onboardingChecklists.tenantId, tenantId), eq(onboardingChecklists.id, id)));
}


/** By ID for tenant (no soft-delete column on table). */
export async function getOnboardingTasksById(
  db: Database,
  tenantId: (typeof onboardingTasks.$inferSelect)["tenantId"],
  id: (typeof onboardingTasks.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(onboardingTasks)
    .where(and(eq(onboardingTasks.tenantId, tenantId), eq(onboardingTasks.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listOnboardingTasks(
  db: Database,
  tenantId: (typeof onboardingTasks.$inferSelect)["tenantId"],
) {
  return await db.select().from(onboardingTasks).where(eq(onboardingTasks.tenantId, tenantId));
}


/** By ID for tenant (no soft-delete column on table). */
export async function getOnboardingProgressById(
  db: Database,
  tenantId: (typeof onboardingProgress.$inferSelect)["tenantId"],
  id: (typeof onboardingProgress.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(onboardingProgress)
    .where(and(eq(onboardingProgress.tenantId, tenantId), eq(onboardingProgress.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listOnboardingProgress(
  db: Database,
  tenantId: (typeof onboardingProgress.$inferSelect)["tenantId"],
) {
  return await db.select().from(onboardingProgress).where(eq(onboardingProgress.tenantId, tenantId));
}

