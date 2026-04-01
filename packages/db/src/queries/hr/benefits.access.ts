// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
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

/** Same as getBenefitProvidersByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getBenefitProvidersByIdSafeGuarded(
  db: Database,
  tenantId: (typeof benefitProviders.$inferSelect)["tenantId"],
  id: (typeof benefitProviders.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getBenefitProvidersByIdSafe(db, tenantId, id);
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

export async function listBenefitProvidersActiveGuarded(
  db: Database,
  tenantId: (typeof benefitProviders.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listBenefitProvidersActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listBenefitProvidersAll(
  db: Database,
  tenantId: (typeof benefitProviders.$inferSelect)["tenantId"],
) {
  return await db.select().from(benefitProviders).where(eq(benefitProviders.tenantId, tenantId));
}

export async function listBenefitProvidersAllGuarded(
  db: Database,
  tenantId: (typeof benefitProviders.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listBenefitProvidersAll(db, tenantId);
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

export async function archiveBenefitProvidersGuarded(
  db: Database,
  tenantId: (typeof benefitProviders.$inferSelect)["tenantId"],
  id: (typeof benefitProviders.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveBenefitProviders(db, tenantId, id);
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

/** Same as getBenefitEnrollmentsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getBenefitEnrollmentsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof benefitEnrollments.$inferSelect)["tenantId"],
  id: (typeof benefitEnrollments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getBenefitEnrollmentsByIdSafe(db, tenantId, id);
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

export async function listBenefitEnrollmentsActiveGuarded(
  db: Database,
  tenantId: (typeof benefitEnrollments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listBenefitEnrollmentsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listBenefitEnrollmentsAll(
  db: Database,
  tenantId: (typeof benefitEnrollments.$inferSelect)["tenantId"],
) {
  return await db.select().from(benefitEnrollments).where(eq(benefitEnrollments.tenantId, tenantId));
}

export async function listBenefitEnrollmentsAllGuarded(
  db: Database,
  tenantId: (typeof benefitEnrollments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listBenefitEnrollmentsAll(db, tenantId);
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

export async function archiveBenefitEnrollmentsGuarded(
  db: Database,
  tenantId: (typeof benefitEnrollments.$inferSelect)["tenantId"],
  id: (typeof benefitEnrollments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveBenefitEnrollments(db, tenantId, id);
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

/** Same as getBenefitDependentCoverageByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getBenefitDependentCoverageByIdSafeGuarded(
  db: Database,
  tenantId: (typeof benefitDependentCoverage.$inferSelect)["tenantId"],
  id: (typeof benefitDependentCoverage.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getBenefitDependentCoverageByIdSafe(db, tenantId, id);
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

export async function listBenefitDependentCoverageActiveGuarded(
  db: Database,
  tenantId: (typeof benefitDependentCoverage.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listBenefitDependentCoverageActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listBenefitDependentCoverageAll(
  db: Database,
  tenantId: (typeof benefitDependentCoverage.$inferSelect)["tenantId"],
) {
  return await db.select().from(benefitDependentCoverage).where(eq(benefitDependentCoverage.tenantId, tenantId));
}

export async function listBenefitDependentCoverageAllGuarded(
  db: Database,
  tenantId: (typeof benefitDependentCoverage.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listBenefitDependentCoverageAll(db, tenantId);
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

export async function archiveBenefitDependentCoverageGuarded(
  db: Database,
  tenantId: (typeof benefitDependentCoverage.$inferSelect)["tenantId"],
  id: (typeof benefitDependentCoverage.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveBenefitDependentCoverage(db, tenantId, id);
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

/** Same as getBenefitClaimsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getBenefitClaimsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof benefitClaims.$inferSelect)["tenantId"],
  id: (typeof benefitClaims.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getBenefitClaimsByIdSafe(db, tenantId, id);
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

export async function listBenefitClaimsActiveGuarded(
  db: Database,
  tenantId: (typeof benefitClaims.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listBenefitClaimsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listBenefitClaimsAll(
  db: Database,
  tenantId: (typeof benefitClaims.$inferSelect)["tenantId"],
) {
  return await db.select().from(benefitClaims).where(eq(benefitClaims.tenantId, tenantId));
}

export async function listBenefitClaimsAllGuarded(
  db: Database,
  tenantId: (typeof benefitClaims.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listBenefitClaimsAll(db, tenantId);
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

export async function archiveBenefitClaimsGuarded(
  db: Database,
  tenantId: (typeof benefitClaims.$inferSelect)["tenantId"],
  id: (typeof benefitClaims.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveBenefitClaims(db, tenantId, id);
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

/** Same as getBenefitPlanBenefitsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getBenefitPlanBenefitsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof benefitPlanBenefits.$inferSelect)["tenantId"],
  id: (typeof benefitPlanBenefits.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getBenefitPlanBenefitsByIdSafe(db, tenantId, id);
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

export async function listBenefitPlanBenefitsActiveGuarded(
  db: Database,
  tenantId: (typeof benefitPlanBenefits.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listBenefitPlanBenefitsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listBenefitPlanBenefitsAll(
  db: Database,
  tenantId: (typeof benefitPlanBenefits.$inferSelect)["tenantId"],
) {
  return await db.select().from(benefitPlanBenefits).where(eq(benefitPlanBenefits.tenantId, tenantId));
}

export async function listBenefitPlanBenefitsAllGuarded(
  db: Database,
  tenantId: (typeof benefitPlanBenefits.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listBenefitPlanBenefitsAll(db, tenantId);
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

export async function archiveBenefitPlanBenefitsGuarded(
  db: Database,
  tenantId: (typeof benefitPlanBenefits.$inferSelect)["tenantId"],
  id: (typeof benefitPlanBenefits.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveBenefitPlanBenefits(db, tenantId, id);
}

