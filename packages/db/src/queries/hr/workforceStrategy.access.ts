// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
import {
  careerAspirationSkillGaps,
  careerAspirations,
  careerPathStepSkills,
  careerPathSteps,
  careerPaths,
  successionPlans,
  talentPoolMembers,
  talentPools,
} from "../../schema/hr/workforceStrategy.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getSuccessionPlansByIdSafe(
  db: Database,
  tenantId: (typeof successionPlans.$inferSelect)["tenantId"],
  id: (typeof successionPlans.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(successionPlans)
    .where(
      and(
        eq(successionPlans.tenantId, tenantId),
        eq(successionPlans.id, id),
        isNull(successionPlans.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listSuccessionPlansActive(
  db: Database,
  tenantId: (typeof successionPlans.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(successionPlans)
    .where(and(eq(successionPlans.tenantId, tenantId), isNull(successionPlans.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listSuccessionPlansAll(
  db: Database,
  tenantId: (typeof successionPlans.$inferSelect)["tenantId"],
) {
  return await db.select().from(successionPlans).where(eq(successionPlans.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveSuccessionPlans(
  db: Database,
  tenantId: (typeof successionPlans.$inferSelect)["tenantId"],
  id: (typeof successionPlans.$inferSelect)["id"],
) {
  return await db
    .update(successionPlans)
    .set({ deletedAt: new Date() })
    .where(and(eq(successionPlans.tenantId, tenantId), eq(successionPlans.id, id)));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getTalentPoolsByIdSafe(
  db: Database,
  tenantId: (typeof talentPools.$inferSelect)["tenantId"],
  id: (typeof talentPools.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(talentPools)
    .where(
      and(
        eq(talentPools.tenantId, tenantId),
        eq(talentPools.id, id),
        isNull(talentPools.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listTalentPoolsActive(
  db: Database,
  tenantId: (typeof talentPools.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(talentPools)
    .where(and(eq(talentPools.tenantId, tenantId), isNull(talentPools.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listTalentPoolsAll(
  db: Database,
  tenantId: (typeof talentPools.$inferSelect)["tenantId"],
) {
  return await db.select().from(talentPools).where(eq(talentPools.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveTalentPools(
  db: Database,
  tenantId: (typeof talentPools.$inferSelect)["tenantId"],
  id: (typeof talentPools.$inferSelect)["id"],
) {
  return await db
    .update(talentPools)
    .set({ deletedAt: new Date() })
    .where(and(eq(talentPools.tenantId, tenantId), eq(talentPools.id, id)));
}


/** By ID for tenant (no soft-delete column on table). */
export async function getTalentPoolMembersById(
  db: Database,
  tenantId: (typeof talentPoolMembers.$inferSelect)["tenantId"],
  id: (typeof talentPoolMembers.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(talentPoolMembers)
    .where(and(eq(talentPoolMembers.tenantId, tenantId), eq(talentPoolMembers.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listTalentPoolMembers(
  db: Database,
  tenantId: (typeof talentPoolMembers.$inferSelect)["tenantId"],
) {
  return await db.select().from(talentPoolMembers).where(eq(talentPoolMembers.tenantId, tenantId));
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getCareerPathsByIdSafe(
  db: Database,
  tenantId: (typeof careerPaths.$inferSelect)["tenantId"],
  id: (typeof careerPaths.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(careerPaths)
    .where(
      and(
        eq(careerPaths.tenantId, tenantId),
        eq(careerPaths.id, id),
        isNull(careerPaths.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant excluding soft-deleted. */
export async function listCareerPathsActive(
  db: Database,
  tenantId: (typeof careerPaths.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(careerPaths)
    .where(and(eq(careerPaths.tenantId, tenantId), isNull(careerPaths.deletedAt)));
}

/** List all rows for tenant including soft-deleted. */
export async function listCareerPathsAll(
  db: Database,
  tenantId: (typeof careerPaths.$inferSelect)["tenantId"],
) {
  return await db.select().from(careerPaths).where(eq(careerPaths.tenantId, tenantId));
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCareerPaths(
  db: Database,
  tenantId: (typeof careerPaths.$inferSelect)["tenantId"],
  id: (typeof careerPaths.$inferSelect)["id"],
) {
  return await db
    .update(careerPaths)
    .set({ deletedAt: new Date() })
    .where(and(eq(careerPaths.tenantId, tenantId), eq(careerPaths.id, id)));
}


/** By ID for tenant (no soft-delete column on table). */
export async function getCareerPathStepsById(
  db: Database,
  tenantId: (typeof careerPathSteps.$inferSelect)["tenantId"],
  id: (typeof careerPathSteps.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(careerPathSteps)
    .where(and(eq(careerPathSteps.tenantId, tenantId), eq(careerPathSteps.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listCareerPathSteps(
  db: Database,
  tenantId: (typeof careerPathSteps.$inferSelect)["tenantId"],
) {
  return await db.select().from(careerPathSteps).where(eq(careerPathSteps.tenantId, tenantId));
}


/** By ID for tenant (no soft-delete column on table). */
export async function getCareerPathStepSkillsById(
  db: Database,
  tenantId: (typeof careerPathStepSkills.$inferSelect)["tenantId"],
  id: (typeof careerPathStepSkills.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(careerPathStepSkills)
    .where(and(eq(careerPathStepSkills.tenantId, tenantId), eq(careerPathStepSkills.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listCareerPathStepSkills(
  db: Database,
  tenantId: (typeof careerPathStepSkills.$inferSelect)["tenantId"],
) {
  return await db.select().from(careerPathStepSkills).where(eq(careerPathStepSkills.tenantId, tenantId));
}


/** By ID for tenant (no soft-delete column on table). */
export async function getCareerAspirationsById(
  db: Database,
  tenantId: (typeof careerAspirations.$inferSelect)["tenantId"],
  id: (typeof careerAspirations.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(careerAspirations)
    .where(and(eq(careerAspirations.tenantId, tenantId), eq(careerAspirations.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listCareerAspirations(
  db: Database,
  tenantId: (typeof careerAspirations.$inferSelect)["tenantId"],
) {
  return await db.select().from(careerAspirations).where(eq(careerAspirations.tenantId, tenantId));
}


/** By ID for tenant (no soft-delete column on table). */
export async function getCareerAspirationSkillGapsById(
  db: Database,
  tenantId: (typeof careerAspirationSkillGaps.$inferSelect)["tenantId"],
  id: (typeof careerAspirationSkillGaps.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(careerAspirationSkillGaps)
    .where(and(eq(careerAspirationSkillGaps.tenantId, tenantId), eq(careerAspirationSkillGaps.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listCareerAspirationSkillGaps(
  db: Database,
  tenantId: (typeof careerAspirationSkillGaps.$inferSelect)["tenantId"],
) {
  return await db.select().from(careerAspirationSkillGaps).where(eq(careerAspirationSkillGaps.tenantId, tenantId));
}

