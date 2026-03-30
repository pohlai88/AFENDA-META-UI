// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
import {
  benefitPlans,
  employeeBenefits,
  employmentContracts,
} from "../../schema/hr/employment.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getEmploymentContractsByIdSafe(
  db: Database,
  tenantId: (typeof employmentContracts.$inferSelect)["tenantId"],
  id: (typeof employmentContracts.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employmentContracts)
    .where(
      and(
        eq(employmentContracts.tenantId, tenantId),
        eq(employmentContracts.id, id),
        isNull(employmentContracts.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmploymentContractsActive(
  db: Database,
  tenantId: (typeof employmentContracts.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employmentContracts)
    .where(and(eq(employmentContracts.tenantId, tenantId), isNull(employmentContracts.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listEmploymentContractsAll(
  db: Database,
  tenantId: (typeof employmentContracts.$inferSelect)["tenantId"],
) {
  return await db.select().from(employmentContracts).where(eq(employmentContracts.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmploymentContracts(
  db: Database,
  tenantId: (typeof employmentContracts.$inferSelect)["tenantId"],
  id: (typeof employmentContracts.$inferSelect)["id"],
) {
  return await db
    .update(employmentContracts)
    .set({ deletedAt: new Date() })
    .where(and(eq(employmentContracts.tenantId, tenantId), eq(employmentContracts.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getBenefitPlansByIdSafe(
  db: Database,
  tenantId: (typeof benefitPlans.$inferSelect)["tenantId"],
  id: (typeof benefitPlans.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(benefitPlans)
    .where(
      and(
        eq(benefitPlans.tenantId, tenantId),
        eq(benefitPlans.id, id),
        isNull(benefitPlans.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listBenefitPlansActive(
  db: Database,
  tenantId: (typeof benefitPlans.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(benefitPlans)
    .where(and(eq(benefitPlans.tenantId, tenantId), isNull(benefitPlans.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listBenefitPlansAll(
  db: Database,
  tenantId: (typeof benefitPlans.$inferSelect)["tenantId"],
) {
  return await db.select().from(benefitPlans).where(eq(benefitPlans.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveBenefitPlans(
  db: Database,
  tenantId: (typeof benefitPlans.$inferSelect)["tenantId"],
  id: (typeof benefitPlans.$inferSelect)["id"],
) {
  return await db
    .update(benefitPlans)
    .set({ deletedAt: new Date() })
    .where(and(eq(benefitPlans.tenantId, tenantId), eq(benefitPlans.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeBenefitsByIdSafe(
  db: Database,
  tenantId: (typeof employeeBenefits.$inferSelect)["tenantId"],
  id: (typeof employeeBenefits.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeBenefits)
    .where(
      and(
        eq(employeeBenefits.tenantId, tenantId),
        eq(employeeBenefits.id, id),
        isNull(employeeBenefits.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeBenefitsActive(
  db: Database,
  tenantId: (typeof employeeBenefits.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeBenefits)
    .where(and(eq(employeeBenefits.tenantId, tenantId), isNull(employeeBenefits.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeBenefitsAll(
  db: Database,
  tenantId: (typeof employeeBenefits.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeBenefits).where(eq(employeeBenefits.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeBenefits(
  db: Database,
  tenantId: (typeof employeeBenefits.$inferSelect)["tenantId"],
  id: (typeof employeeBenefits.$inferSelect)["id"],
) {
  return await db
    .update(employeeBenefits)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeBenefits.tenantId, tenantId), eq(employeeBenefits.id, id)));
}

