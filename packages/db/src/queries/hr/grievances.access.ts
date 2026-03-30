// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
import {
  employeeGrievances,
  grievanceCategories,
} from "../../schema/hr/grievances.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getGrievanceCategoriesByIdSafe(
  db: Database,
  tenantId: (typeof grievanceCategories.$inferSelect)["tenantId"],
  id: (typeof grievanceCategories.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(grievanceCategories)
    .where(
      and(
        eq(grievanceCategories.tenantId, tenantId),
        eq(grievanceCategories.id, id),
        isNull(grievanceCategories.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listGrievanceCategoriesActive(
  db: Database,
  tenantId: (typeof grievanceCategories.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(grievanceCategories)
    .where(and(eq(grievanceCategories.tenantId, tenantId), isNull(grievanceCategories.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listGrievanceCategoriesAll(
  db: Database,
  tenantId: (typeof grievanceCategories.$inferSelect)["tenantId"],
) {
  return await db.select().from(grievanceCategories).where(eq(grievanceCategories.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveGrievanceCategories(
  db: Database,
  tenantId: (typeof grievanceCategories.$inferSelect)["tenantId"],
  id: (typeof grievanceCategories.$inferSelect)["id"],
) {
  return await db
    .update(grievanceCategories)
    .set({ deletedAt: new Date() })
    .where(and(eq(grievanceCategories.tenantId, tenantId), eq(grievanceCategories.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeGrievancesByIdSafe(
  db: Database,
  tenantId: (typeof employeeGrievances.$inferSelect)["tenantId"],
  id: (typeof employeeGrievances.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeGrievances)
    .where(
      and(
        eq(employeeGrievances.tenantId, tenantId),
        eq(employeeGrievances.id, id),
        isNull(employeeGrievances.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeGrievancesActive(
  db: Database,
  tenantId: (typeof employeeGrievances.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeGrievances)
    .where(and(eq(employeeGrievances.tenantId, tenantId), isNull(employeeGrievances.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeGrievancesAll(
  db: Database,
  tenantId: (typeof employeeGrievances.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeGrievances).where(eq(employeeGrievances.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeGrievances(
  db: Database,
  tenantId: (typeof employeeGrievances.$inferSelect)["tenantId"],
  id: (typeof employeeGrievances.$inferSelect)["id"],
) {
  return await db
    .update(employeeGrievances)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeGrievances.tenantId, tenantId), eq(employeeGrievances.id, id)));
}

