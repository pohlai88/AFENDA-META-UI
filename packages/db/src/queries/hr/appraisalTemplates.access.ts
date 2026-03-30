// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
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

/** List all rows for tenant including soft-deleted. */
export async function listAppraisalTemplatesAll(
  db: Database,
  tenantId: (typeof appraisalTemplates.$inferSelect)["tenantId"],
) {
  return await db.select().from(appraisalTemplates).where(eq(appraisalTemplates.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listAppraisalTemplateKrasAll(
  db: Database,
  tenantId: (typeof appraisalTemplateKras.$inferSelect)["tenantId"],
) {
  return await db.select().from(appraisalTemplateKras).where(eq(appraisalTemplateKras.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeKrasAll(
  db: Database,
  tenantId: (typeof employeeKras.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeKras).where(eq(employeeKras.tenantId, tenantId));
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

