// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
import {
  benefitClaims,
  benefitDependentCoverage,
  benefitEnrollments,
  benefitPlanBenefits,
  benefitProviders,
} from "../../schema/hr/benefits.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getBenefitProvidersByIdSafe(
  db: Database,
  tenantId: (typeof benefitProviders.$inferSelect)["tenantId"],
  id: (typeof benefitProviders.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(benefitProviders)
    .where(
      and(
        eq(benefitProviders.tenantId, tenantId),
        eq(benefitProviders.id, id),
        isNull(benefitProviders.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listBenefitProvidersActive(
  db: Database,
  tenantId: (typeof benefitProviders.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(benefitProviders)
    .where(and(eq(benefitProviders.tenantId, tenantId), isNull(benefitProviders.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listBenefitProvidersAll(
  db: Database,
  tenantId: (typeof benefitProviders.$inferSelect)["tenantId"],
) {
  return await db.select().from(benefitProviders).where(eq(benefitProviders.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveBenefitProviders(
  db: Database,
  tenantId: (typeof benefitProviders.$inferSelect)["tenantId"],
  id: (typeof benefitProviders.$inferSelect)["id"],
) {
  return await db
    .update(benefitProviders)
    .set({ deletedAt: new Date() })
    .where(and(eq(benefitProviders.tenantId, tenantId), eq(benefitProviders.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getBenefitEnrollmentsByIdSafe(
  db: Database,
  tenantId: (typeof benefitEnrollments.$inferSelect)["tenantId"],
  id: (typeof benefitEnrollments.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(benefitEnrollments)
    .where(
      and(
        eq(benefitEnrollments.tenantId, tenantId),
        eq(benefitEnrollments.id, id),
        isNull(benefitEnrollments.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listBenefitEnrollmentsActive(
  db: Database,
  tenantId: (typeof benefitEnrollments.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(benefitEnrollments)
    .where(and(eq(benefitEnrollments.tenantId, tenantId), isNull(benefitEnrollments.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listBenefitEnrollmentsAll(
  db: Database,
  tenantId: (typeof benefitEnrollments.$inferSelect)["tenantId"],
) {
  return await db.select().from(benefitEnrollments).where(eq(benefitEnrollments.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveBenefitEnrollments(
  db: Database,
  tenantId: (typeof benefitEnrollments.$inferSelect)["tenantId"],
  id: (typeof benefitEnrollments.$inferSelect)["id"],
) {
  return await db
    .update(benefitEnrollments)
    .set({ deletedAt: new Date() })
    .where(and(eq(benefitEnrollments.tenantId, tenantId), eq(benefitEnrollments.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getBenefitDependentCoverageByIdSafe(
  db: Database,
  tenantId: (typeof benefitDependentCoverage.$inferSelect)["tenantId"],
  id: (typeof benefitDependentCoverage.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(benefitDependentCoverage)
    .where(
      and(
        eq(benefitDependentCoverage.tenantId, tenantId),
        eq(benefitDependentCoverage.id, id),
        isNull(benefitDependentCoverage.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listBenefitDependentCoverageActive(
  db: Database,
  tenantId: (typeof benefitDependentCoverage.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(benefitDependentCoverage)
    .where(and(eq(benefitDependentCoverage.tenantId, tenantId), isNull(benefitDependentCoverage.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listBenefitDependentCoverageAll(
  db: Database,
  tenantId: (typeof benefitDependentCoverage.$inferSelect)["tenantId"],
) {
  return await db.select().from(benefitDependentCoverage).where(eq(benefitDependentCoverage.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveBenefitDependentCoverage(
  db: Database,
  tenantId: (typeof benefitDependentCoverage.$inferSelect)["tenantId"],
  id: (typeof benefitDependentCoverage.$inferSelect)["id"],
) {
  return await db
    .update(benefitDependentCoverage)
    .set({ deletedAt: new Date() })
    .where(and(eq(benefitDependentCoverage.tenantId, tenantId), eq(benefitDependentCoverage.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getBenefitClaimsByIdSafe(
  db: Database,
  tenantId: (typeof benefitClaims.$inferSelect)["tenantId"],
  id: (typeof benefitClaims.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(benefitClaims)
    .where(
      and(
        eq(benefitClaims.tenantId, tenantId),
        eq(benefitClaims.id, id),
        isNull(benefitClaims.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listBenefitClaimsActive(
  db: Database,
  tenantId: (typeof benefitClaims.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(benefitClaims)
    .where(and(eq(benefitClaims.tenantId, tenantId), isNull(benefitClaims.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listBenefitClaimsAll(
  db: Database,
  tenantId: (typeof benefitClaims.$inferSelect)["tenantId"],
) {
  return await db.select().from(benefitClaims).where(eq(benefitClaims.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveBenefitClaims(
  db: Database,
  tenantId: (typeof benefitClaims.$inferSelect)["tenantId"],
  id: (typeof benefitClaims.$inferSelect)["id"],
) {
  return await db
    .update(benefitClaims)
    .set({ deletedAt: new Date() })
    .where(and(eq(benefitClaims.tenantId, tenantId), eq(benefitClaims.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getBenefitPlanBenefitsByIdSafe(
  db: Database,
  tenantId: (typeof benefitPlanBenefits.$inferSelect)["tenantId"],
  id: (typeof benefitPlanBenefits.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(benefitPlanBenefits)
    .where(
      and(
        eq(benefitPlanBenefits.tenantId, tenantId),
        eq(benefitPlanBenefits.id, id),
        isNull(benefitPlanBenefits.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listBenefitPlanBenefitsActive(
  db: Database,
  tenantId: (typeof benefitPlanBenefits.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(benefitPlanBenefits)
    .where(and(eq(benefitPlanBenefits.tenantId, tenantId), isNull(benefitPlanBenefits.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listBenefitPlanBenefitsAll(
  db: Database,
  tenantId: (typeof benefitPlanBenefits.$inferSelect)["tenantId"],
) {
  return await db.select().from(benefitPlanBenefits).where(eq(benefitPlanBenefits.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveBenefitPlanBenefits(
  db: Database,
  tenantId: (typeof benefitPlanBenefits.$inferSelect)["tenantId"],
  id: (typeof benefitPlanBenefits.$inferSelect)["id"],
) {
  return await db
    .update(benefitPlanBenefits)
    .set({ deletedAt: new Date() })
    .where(and(eq(benefitPlanBenefits.tenantId, tenantId), eq(benefitPlanBenefits.id, id)));
}

