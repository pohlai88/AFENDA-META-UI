// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
import {
  costCenters,
  departments,
  employees,
  jobPositions,
  jobTitles,
} from "../../schema/hr/people.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getDepartmentsByIdSafe(
  db: Database,
  tenantId: (typeof departments.$inferSelect)["tenantId"],
  id: (typeof departments.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(departments)
    .where(
      and(
        eq(departments.tenantId, tenantId),
        eq(departments.id, id),
        isNull(departments.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listDepartmentsActive(
  db: Database,
  tenantId: (typeof departments.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(departments)
    .where(and(eq(departments.tenantId, tenantId), isNull(departments.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listDepartmentsAll(
  db: Database,
  tenantId: (typeof departments.$inferSelect)["tenantId"],
) {
  return await db.select().from(departments).where(eq(departments.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveDepartments(
  db: Database,
  tenantId: (typeof departments.$inferSelect)["tenantId"],
  id: (typeof departments.$inferSelect)["id"],
) {
  return await db
    .update(departments)
    .set({ deletedAt: new Date() })
    .where(and(eq(departments.tenantId, tenantId), eq(departments.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getJobTitlesByIdSafe(
  db: Database,
  tenantId: (typeof jobTitles.$inferSelect)["tenantId"],
  id: (typeof jobTitles.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(jobTitles)
    .where(
      and(
        eq(jobTitles.tenantId, tenantId),
        eq(jobTitles.id, id),
        isNull(jobTitles.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listJobTitlesActive(
  db: Database,
  tenantId: (typeof jobTitles.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(jobTitles)
    .where(and(eq(jobTitles.tenantId, tenantId), isNull(jobTitles.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listJobTitlesAll(
  db: Database,
  tenantId: (typeof jobTitles.$inferSelect)["tenantId"],
) {
  return await db.select().from(jobTitles).where(eq(jobTitles.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveJobTitles(
  db: Database,
  tenantId: (typeof jobTitles.$inferSelect)["tenantId"],
  id: (typeof jobTitles.$inferSelect)["id"],
) {
  return await db
    .update(jobTitles)
    .set({ deletedAt: new Date() })
    .where(and(eq(jobTitles.tenantId, tenantId), eq(jobTitles.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getJobPositionsByIdSafe(
  db: Database,
  tenantId: (typeof jobPositions.$inferSelect)["tenantId"],
  id: (typeof jobPositions.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(jobPositions)
    .where(
      and(
        eq(jobPositions.tenantId, tenantId),
        eq(jobPositions.id, id),
        isNull(jobPositions.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listJobPositionsActive(
  db: Database,
  tenantId: (typeof jobPositions.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(jobPositions)
    .where(and(eq(jobPositions.tenantId, tenantId), isNull(jobPositions.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listJobPositionsAll(
  db: Database,
  tenantId: (typeof jobPositions.$inferSelect)["tenantId"],
) {
  return await db.select().from(jobPositions).where(eq(jobPositions.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveJobPositions(
  db: Database,
  tenantId: (typeof jobPositions.$inferSelect)["tenantId"],
  id: (typeof jobPositions.$inferSelect)["id"],
) {
  return await db
    .update(jobPositions)
    .set({ deletedAt: new Date() })
    .where(and(eq(jobPositions.tenantId, tenantId), eq(jobPositions.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeesByIdSafe(
  db: Database,
  tenantId: (typeof employees.$inferSelect)["tenantId"],
  id: (typeof employees.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employees)
    .where(
      and(
        eq(employees.tenantId, tenantId),
        eq(employees.id, id),
        isNull(employees.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeesActive(
  db: Database,
  tenantId: (typeof employees.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employees)
    .where(and(eq(employees.tenantId, tenantId), isNull(employees.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeesAll(
  db: Database,
  tenantId: (typeof employees.$inferSelect)["tenantId"],
) {
  return await db.select().from(employees).where(eq(employees.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployees(
  db: Database,
  tenantId: (typeof employees.$inferSelect)["tenantId"],
  id: (typeof employees.$inferSelect)["id"],
) {
  return await db
    .update(employees)
    .set({ deletedAt: new Date() })
    .where(and(eq(employees.tenantId, tenantId), eq(employees.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getCostCentersByIdSafe(
  db: Database,
  tenantId: (typeof costCenters.$inferSelect)["tenantId"],
  id: (typeof costCenters.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(costCenters)
    .where(
      and(
        eq(costCenters.tenantId, tenantId),
        eq(costCenters.id, id),
        isNull(costCenters.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listCostCentersActive(
  db: Database,
  tenantId: (typeof costCenters.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(costCenters)
    .where(and(eq(costCenters.tenantId, tenantId), isNull(costCenters.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listCostCentersAll(
  db: Database,
  tenantId: (typeof costCenters.$inferSelect)["tenantId"],
) {
  return await db.select().from(costCenters).where(eq(costCenters.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCostCenters(
  db: Database,
  tenantId: (typeof costCenters.$inferSelect)["tenantId"],
  id: (typeof costCenters.$inferSelect)["id"],
) {
  return await db
    .update(costCenters)
    .set({ deletedAt: new Date() })
    .where(and(eq(costCenters.tenantId, tenantId), eq(costCenters.id, id)));
}

