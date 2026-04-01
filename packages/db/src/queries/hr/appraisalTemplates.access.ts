// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
import {
  appraisalTemplateKras,
  appraisalTemplates,
  employeeKras,
} from "../../schema/hr/appraisalTemplates.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getAppraisalTemplatesByIdSafe(
  db: Database,
  tenantId: (typeof appraisalTemplates.$inferSelect)["tenantId"],
  id: (typeof appraisalTemplates.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(appraisalTemplates)
    .where(
      and(
        eq(appraisalTemplates.tenantId, tenantId),
        eq(appraisalTemplates.id, id),
        isNull(appraisalTemplates.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getAppraisalTemplatesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getAppraisalTemplatesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof appraisalTemplates.$inferSelect)["tenantId"],
  id: (typeof appraisalTemplates.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getAppraisalTemplatesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listAppraisalTemplatesActive(
  db: Database,
  tenantId: (typeof appraisalTemplates.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(appraisalTemplates)
    .where(and(eq(appraisalTemplates.tenantId, tenantId), isNull(appraisalTemplates.deletedAt)));
}

export async function listAppraisalTemplatesActiveGuarded(
  db: Database,
  tenantId: (typeof appraisalTemplates.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAppraisalTemplatesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listAppraisalTemplatesAll(
  db: Database,
  tenantId: (typeof appraisalTemplates.$inferSelect)["tenantId"],
) {
  return await db.select().from(appraisalTemplates).where(eq(appraisalTemplates.tenantId, tenantId));
}

export async function listAppraisalTemplatesAllGuarded(
  db: Database,
  tenantId: (typeof appraisalTemplates.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAppraisalTemplatesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveAppraisalTemplates(
  db: Database,
  tenantId: (typeof appraisalTemplates.$inferSelect)["tenantId"],
  id: (typeof appraisalTemplates.$inferSelect)["id"],
) {
  return await db
    .update(appraisalTemplates)
    .set({ deletedAt: new Date() })
    .where(and(eq(appraisalTemplates.tenantId, tenantId), eq(appraisalTemplates.id, id)));
}

export async function archiveAppraisalTemplatesGuarded(
  db: Database,
  tenantId: (typeof appraisalTemplates.$inferSelect)["tenantId"],
  id: (typeof appraisalTemplates.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveAppraisalTemplates(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getAppraisalTemplateKrasByIdSafe(
  db: Database,
  tenantId: (typeof appraisalTemplateKras.$inferSelect)["tenantId"],
  id: (typeof appraisalTemplateKras.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(appraisalTemplateKras)
    .where(
      and(
        eq(appraisalTemplateKras.tenantId, tenantId),
        eq(appraisalTemplateKras.id, id),
        isNull(appraisalTemplateKras.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getAppraisalTemplateKrasByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getAppraisalTemplateKrasByIdSafeGuarded(
  db: Database,
  tenantId: (typeof appraisalTemplateKras.$inferSelect)["tenantId"],
  id: (typeof appraisalTemplateKras.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getAppraisalTemplateKrasByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listAppraisalTemplateKrasActive(
  db: Database,
  tenantId: (typeof appraisalTemplateKras.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(appraisalTemplateKras)
    .where(and(eq(appraisalTemplateKras.tenantId, tenantId), isNull(appraisalTemplateKras.deletedAt)));
}

export async function listAppraisalTemplateKrasActiveGuarded(
  db: Database,
  tenantId: (typeof appraisalTemplateKras.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAppraisalTemplateKrasActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listAppraisalTemplateKrasAll(
  db: Database,
  tenantId: (typeof appraisalTemplateKras.$inferSelect)["tenantId"],
) {
  return await db.select().from(appraisalTemplateKras).where(eq(appraisalTemplateKras.tenantId, tenantId));
}

export async function listAppraisalTemplateKrasAllGuarded(
  db: Database,
  tenantId: (typeof appraisalTemplateKras.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAppraisalTemplateKrasAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveAppraisalTemplateKras(
  db: Database,
  tenantId: (typeof appraisalTemplateKras.$inferSelect)["tenantId"],
  id: (typeof appraisalTemplateKras.$inferSelect)["id"],
) {
  return await db
    .update(appraisalTemplateKras)
    .set({ deletedAt: new Date() })
    .where(and(eq(appraisalTemplateKras.tenantId, tenantId), eq(appraisalTemplateKras.id, id)));
}

export async function archiveAppraisalTemplateKrasGuarded(
  db: Database,
  tenantId: (typeof appraisalTemplateKras.$inferSelect)["tenantId"],
  id: (typeof appraisalTemplateKras.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveAppraisalTemplateKras(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeKrasByIdSafe(
  db: Database,
  tenantId: (typeof employeeKras.$inferSelect)["tenantId"],
  id: (typeof employeeKras.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeKras)
    .where(
      and(
        eq(employeeKras.tenantId, tenantId),
        eq(employeeKras.id, id),
        isNull(employeeKras.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEmployeeKrasByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeeKrasByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeeKras.$inferSelect)["tenantId"],
  id: (typeof employeeKras.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeeKrasByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeKrasActive(
  db: Database,
  tenantId: (typeof employeeKras.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeKras)
    .where(and(eq(employeeKras.tenantId, tenantId), isNull(employeeKras.deletedAt)));
}

export async function listEmployeeKrasActiveGuarded(
  db: Database,
  tenantId: (typeof employeeKras.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeKrasActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeKrasAll(
  db: Database,
  tenantId: (typeof employeeKras.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeKras).where(eq(employeeKras.tenantId, tenantId));
}

export async function listEmployeeKrasAllGuarded(
  db: Database,
  tenantId: (typeof employeeKras.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeKrasAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeKras(
  db: Database,
  tenantId: (typeof employeeKras.$inferSelect)["tenantId"],
  id: (typeof employeeKras.$inferSelect)["id"],
) {
  return await db
    .update(employeeKras)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeKras.tenantId, tenantId), eq(employeeKras.id, id)));
}

export async function archiveEmployeeKrasGuarded(
  db: Database,
  tenantId: (typeof employeeKras.$inferSelect)["tenantId"],
  id: (typeof employeeKras.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeeKras(db, tenantId, id);
}

