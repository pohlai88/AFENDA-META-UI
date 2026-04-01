// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
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

/** Same as getEmployeeDocumentsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeeDocumentsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeeDocuments.$inferSelect)["tenantId"],
  id: (typeof employeeDocuments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeeDocumentsByIdSafe(db, tenantId, id);
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

export async function listEmployeeDocumentsActiveGuarded(
  db: Database,
  tenantId: (typeof employeeDocuments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeDocumentsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeDocumentsAll(
  db: Database,
  tenantId: (typeof employeeDocuments.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeDocuments).where(eq(employeeDocuments.tenantId, tenantId));
}

export async function listEmployeeDocumentsAllGuarded(
  db: Database,
  tenantId: (typeof employeeDocuments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeDocumentsAll(db, tenantId);
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

export async function archiveEmployeeDocumentsGuarded(
  db: Database,
  tenantId: (typeof employeeDocuments.$inferSelect)["tenantId"],
  id: (typeof employeeDocuments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeeDocuments(db, tenantId, id);
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

/** Same as getDisciplinaryActionsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getDisciplinaryActionsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof disciplinaryActions.$inferSelect)["tenantId"],
  id: (typeof disciplinaryActions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getDisciplinaryActionsByIdSafe(db, tenantId, id);
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

export async function listDisciplinaryActionsActiveGuarded(
  db: Database,
  tenantId: (typeof disciplinaryActions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listDisciplinaryActionsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listDisciplinaryActionsAll(
  db: Database,
  tenantId: (typeof disciplinaryActions.$inferSelect)["tenantId"],
) {
  return await db.select().from(disciplinaryActions).where(eq(disciplinaryActions.tenantId, tenantId));
}

export async function listDisciplinaryActionsAllGuarded(
  db: Database,
  tenantId: (typeof disciplinaryActions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listDisciplinaryActionsAll(db, tenantId);
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

export async function archiveDisciplinaryActionsGuarded(
  db: Database,
  tenantId: (typeof disciplinaryActions.$inferSelect)["tenantId"],
  id: (typeof disciplinaryActions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveDisciplinaryActions(db, tenantId, id);
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

/** Same as getOnboardingChecklistsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getOnboardingChecklistsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof onboardingChecklists.$inferSelect)["tenantId"],
  id: (typeof onboardingChecklists.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getOnboardingChecklistsByIdSafe(db, tenantId, id);
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

export async function listOnboardingChecklistsActiveGuarded(
  db: Database,
  tenantId: (typeof onboardingChecklists.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listOnboardingChecklistsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listOnboardingChecklistsAll(
  db: Database,
  tenantId: (typeof onboardingChecklists.$inferSelect)["tenantId"],
) {
  return await db.select().from(onboardingChecklists).where(eq(onboardingChecklists.tenantId, tenantId));
}

export async function listOnboardingChecklistsAllGuarded(
  db: Database,
  tenantId: (typeof onboardingChecklists.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listOnboardingChecklistsAll(db, tenantId);
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

export async function archiveOnboardingChecklistsGuarded(
  db: Database,
  tenantId: (typeof onboardingChecklists.$inferSelect)["tenantId"],
  id: (typeof onboardingChecklists.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveOnboardingChecklists(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getOnboardingTasksByIdSafe(
  db: Database,
  tenantId: (typeof onboardingTasks.$inferSelect)["tenantId"],
  id: (typeof onboardingTasks.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(onboardingTasks)
    .where(
      and(
        eq(onboardingTasks.tenantId, tenantId),
        eq(onboardingTasks.id, id),
        isNull(onboardingTasks.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getOnboardingTasksByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getOnboardingTasksByIdSafeGuarded(
  db: Database,
  tenantId: (typeof onboardingTasks.$inferSelect)["tenantId"],
  id: (typeof onboardingTasks.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getOnboardingTasksByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listOnboardingTasksActive(
  db: Database,
  tenantId: (typeof onboardingTasks.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(onboardingTasks)
    .where(and(eq(onboardingTasks.tenantId, tenantId), isNull(onboardingTasks.deletedAt)));
}

export async function listOnboardingTasksActiveGuarded(
  db: Database,
  tenantId: (typeof onboardingTasks.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listOnboardingTasksActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listOnboardingTasksAll(
  db: Database,
  tenantId: (typeof onboardingTasks.$inferSelect)["tenantId"],
) {
  return await db.select().from(onboardingTasks).where(eq(onboardingTasks.tenantId, tenantId));
}

export async function listOnboardingTasksAllGuarded(
  db: Database,
  tenantId: (typeof onboardingTasks.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listOnboardingTasksAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveOnboardingTasks(
  db: Database,
  tenantId: (typeof onboardingTasks.$inferSelect)["tenantId"],
  id: (typeof onboardingTasks.$inferSelect)["id"],
) {
  return await db
    .update(onboardingTasks)
    .set({ deletedAt: new Date() })
    .where(and(eq(onboardingTasks.tenantId, tenantId), eq(onboardingTasks.id, id)));
}

export async function archiveOnboardingTasksGuarded(
  db: Database,
  tenantId: (typeof onboardingTasks.$inferSelect)["tenantId"],
  id: (typeof onboardingTasks.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveOnboardingTasks(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getOnboardingProgressByIdSafe(
  db: Database,
  tenantId: (typeof onboardingProgress.$inferSelect)["tenantId"],
  id: (typeof onboardingProgress.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(onboardingProgress)
    .where(
      and(
        eq(onboardingProgress.tenantId, tenantId),
        eq(onboardingProgress.id, id),
        isNull(onboardingProgress.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getOnboardingProgressByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getOnboardingProgressByIdSafeGuarded(
  db: Database,
  tenantId: (typeof onboardingProgress.$inferSelect)["tenantId"],
  id: (typeof onboardingProgress.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getOnboardingProgressByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listOnboardingProgressActive(
  db: Database,
  tenantId: (typeof onboardingProgress.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(onboardingProgress)
    .where(and(eq(onboardingProgress.tenantId, tenantId), isNull(onboardingProgress.deletedAt)));
}

export async function listOnboardingProgressActiveGuarded(
  db: Database,
  tenantId: (typeof onboardingProgress.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listOnboardingProgressActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listOnboardingProgressAll(
  db: Database,
  tenantId: (typeof onboardingProgress.$inferSelect)["tenantId"],
) {
  return await db.select().from(onboardingProgress).where(eq(onboardingProgress.tenantId, tenantId));
}

export async function listOnboardingProgressAllGuarded(
  db: Database,
  tenantId: (typeof onboardingProgress.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listOnboardingProgressAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveOnboardingProgress(
  db: Database,
  tenantId: (typeof onboardingProgress.$inferSelect)["tenantId"],
  id: (typeof onboardingProgress.$inferSelect)["id"],
) {
  return await db
    .update(onboardingProgress)
    .set({ deletedAt: new Date() })
    .where(and(eq(onboardingProgress.tenantId, tenantId), eq(onboardingProgress.id, id)));
}

export async function archiveOnboardingProgressGuarded(
  db: Database,
  tenantId: (typeof onboardingProgress.$inferSelect)["tenantId"],
  id: (typeof onboardingProgress.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveOnboardingProgress(db, tenantId, id);
}

