// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
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

/** Same as getDepartmentsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getDepartmentsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof departments.$inferSelect)["tenantId"],
  id: (typeof departments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getDepartmentsByIdSafe(db, tenantId, id);
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

export async function listDepartmentsActiveGuarded(
  db: Database,
  tenantId: (typeof departments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listDepartmentsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listDepartmentsAll(
  db: Database,
  tenantId: (typeof departments.$inferSelect)["tenantId"],
) {
  return await db.select().from(departments).where(eq(departments.tenantId, tenantId));
}

export async function listDepartmentsAllGuarded(
  db: Database,
  tenantId: (typeof departments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listDepartmentsAll(db, tenantId);
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

export async function archiveDepartmentsGuarded(
  db: Database,
  tenantId: (typeof departments.$inferSelect)["tenantId"],
  id: (typeof departments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveDepartments(db, tenantId, id);
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

/** Same as getJobTitlesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getJobTitlesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof jobTitles.$inferSelect)["tenantId"],
  id: (typeof jobTitles.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getJobTitlesByIdSafe(db, tenantId, id);
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

export async function listJobTitlesActiveGuarded(
  db: Database,
  tenantId: (typeof jobTitles.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listJobTitlesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listJobTitlesAll(
  db: Database,
  tenantId: (typeof jobTitles.$inferSelect)["tenantId"],
) {
  return await db.select().from(jobTitles).where(eq(jobTitles.tenantId, tenantId));
}

export async function listJobTitlesAllGuarded(
  db: Database,
  tenantId: (typeof jobTitles.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listJobTitlesAll(db, tenantId);
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

export async function archiveJobTitlesGuarded(
  db: Database,
  tenantId: (typeof jobTitles.$inferSelect)["tenantId"],
  id: (typeof jobTitles.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveJobTitles(db, tenantId, id);
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

/** Same as getJobPositionsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getJobPositionsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof jobPositions.$inferSelect)["tenantId"],
  id: (typeof jobPositions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getJobPositionsByIdSafe(db, tenantId, id);
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

export async function listJobPositionsActiveGuarded(
  db: Database,
  tenantId: (typeof jobPositions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listJobPositionsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listJobPositionsAll(
  db: Database,
  tenantId: (typeof jobPositions.$inferSelect)["tenantId"],
) {
  return await db.select().from(jobPositions).where(eq(jobPositions.tenantId, tenantId));
}

export async function listJobPositionsAllGuarded(
  db: Database,
  tenantId: (typeof jobPositions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listJobPositionsAll(db, tenantId);
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

export async function archiveJobPositionsGuarded(
  db: Database,
  tenantId: (typeof jobPositions.$inferSelect)["tenantId"],
  id: (typeof jobPositions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveJobPositions(db, tenantId, id);
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

/** Same as getEmployeesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employees.$inferSelect)["tenantId"],
  id: (typeof employees.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeesByIdSafe(db, tenantId, id);
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

export async function listEmployeesActiveGuarded(
  db: Database,
  tenantId: (typeof employees.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeesAll(
  db: Database,
  tenantId: (typeof employees.$inferSelect)["tenantId"],
) {
  return await db.select().from(employees).where(eq(employees.tenantId, tenantId));
}

export async function listEmployeesAllGuarded(
  db: Database,
  tenantId: (typeof employees.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeesAll(db, tenantId);
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

export async function archiveEmployeesGuarded(
  db: Database,
  tenantId: (typeof employees.$inferSelect)["tenantId"],
  id: (typeof employees.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployees(db, tenantId, id);
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

/** Same as getCostCentersByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCostCentersByIdSafeGuarded(
  db: Database,
  tenantId: (typeof costCenters.$inferSelect)["tenantId"],
  id: (typeof costCenters.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCostCentersByIdSafe(db, tenantId, id);
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

export async function listCostCentersActiveGuarded(
  db: Database,
  tenantId: (typeof costCenters.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCostCentersActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCostCentersAll(
  db: Database,
  tenantId: (typeof costCenters.$inferSelect)["tenantId"],
) {
  return await db.select().from(costCenters).where(eq(costCenters.tenantId, tenantId));
}

export async function listCostCentersAllGuarded(
  db: Database,
  tenantId: (typeof costCenters.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCostCentersAll(db, tenantId);
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

export async function archiveCostCentersGuarded(
  db: Database,
  tenantId: (typeof costCenters.$inferSelect)["tenantId"],
  id: (typeof costCenters.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCostCenters(db, tenantId, id);
}

