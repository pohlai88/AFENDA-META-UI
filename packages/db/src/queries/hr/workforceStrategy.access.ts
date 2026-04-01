// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
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

/** Same as getSuccessionPlansByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getSuccessionPlansByIdSafeGuarded(
  db: Database,
  tenantId: (typeof successionPlans.$inferSelect)["tenantId"],
  id: (typeof successionPlans.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getSuccessionPlansByIdSafe(db, tenantId, id);
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

export async function listSuccessionPlansActiveGuarded(
  db: Database,
  tenantId: (typeof successionPlans.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSuccessionPlansActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listSuccessionPlansAll(
  db: Database,
  tenantId: (typeof successionPlans.$inferSelect)["tenantId"],
) {
  return await db.select().from(successionPlans).where(eq(successionPlans.tenantId, tenantId));
}

export async function listSuccessionPlansAllGuarded(
  db: Database,
  tenantId: (typeof successionPlans.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSuccessionPlansAll(db, tenantId);
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

export async function archiveSuccessionPlansGuarded(
  db: Database,
  tenantId: (typeof successionPlans.$inferSelect)["tenantId"],
  id: (typeof successionPlans.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveSuccessionPlans(db, tenantId, id);
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

/** Same as getTalentPoolsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getTalentPoolsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof talentPools.$inferSelect)["tenantId"],
  id: (typeof talentPools.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getTalentPoolsByIdSafe(db, tenantId, id);
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

export async function listTalentPoolsActiveGuarded(
  db: Database,
  tenantId: (typeof talentPools.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTalentPoolsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listTalentPoolsAll(
  db: Database,
  tenantId: (typeof talentPools.$inferSelect)["tenantId"],
) {
  return await db.select().from(talentPools).where(eq(talentPools.tenantId, tenantId));
}

export async function listTalentPoolsAllGuarded(
  db: Database,
  tenantId: (typeof talentPools.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTalentPoolsAll(db, tenantId);
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

export async function archiveTalentPoolsGuarded(
  db: Database,
  tenantId: (typeof talentPools.$inferSelect)["tenantId"],
  id: (typeof talentPools.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveTalentPools(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getTalentPoolMembersByIdSafe(
  db: Database,
  tenantId: (typeof talentPoolMembers.$inferSelect)["tenantId"],
  id: (typeof talentPoolMembers.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(talentPoolMembers)
    .where(
      and(
        eq(talentPoolMembers.tenantId, tenantId),
        eq(talentPoolMembers.id, id),
        isNull(talentPoolMembers.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getTalentPoolMembersByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getTalentPoolMembersByIdSafeGuarded(
  db: Database,
  tenantId: (typeof talentPoolMembers.$inferSelect)["tenantId"],
  id: (typeof talentPoolMembers.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getTalentPoolMembersByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listTalentPoolMembersActive(
  db: Database,
  tenantId: (typeof talentPoolMembers.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(talentPoolMembers)
    .where(and(eq(talentPoolMembers.tenantId, tenantId), isNull(talentPoolMembers.deletedAt)));
}

export async function listTalentPoolMembersActiveGuarded(
  db: Database,
  tenantId: (typeof talentPoolMembers.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTalentPoolMembersActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listTalentPoolMembersAll(
  db: Database,
  tenantId: (typeof talentPoolMembers.$inferSelect)["tenantId"],
) {
  return await db.select().from(talentPoolMembers).where(eq(talentPoolMembers.tenantId, tenantId));
}

export async function listTalentPoolMembersAllGuarded(
  db: Database,
  tenantId: (typeof talentPoolMembers.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTalentPoolMembersAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveTalentPoolMembers(
  db: Database,
  tenantId: (typeof talentPoolMembers.$inferSelect)["tenantId"],
  id: (typeof talentPoolMembers.$inferSelect)["id"],
) {
  return await db
    .update(talentPoolMembers)
    .set({ deletedAt: new Date() })
    .where(and(eq(talentPoolMembers.tenantId, tenantId), eq(talentPoolMembers.id, id)));
}

export async function archiveTalentPoolMembersGuarded(
  db: Database,
  tenantId: (typeof talentPoolMembers.$inferSelect)["tenantId"],
  id: (typeof talentPoolMembers.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveTalentPoolMembers(db, tenantId, id);
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

/** Same as getCareerPathsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCareerPathsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof careerPaths.$inferSelect)["tenantId"],
  id: (typeof careerPaths.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCareerPathsByIdSafe(db, tenantId, id);
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

export async function listCareerPathsActiveGuarded(
  db: Database,
  tenantId: (typeof careerPaths.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCareerPathsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCareerPathsAll(
  db: Database,
  tenantId: (typeof careerPaths.$inferSelect)["tenantId"],
) {
  return await db.select().from(careerPaths).where(eq(careerPaths.tenantId, tenantId));
}

export async function listCareerPathsAllGuarded(
  db: Database,
  tenantId: (typeof careerPaths.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCareerPathsAll(db, tenantId);
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

export async function archiveCareerPathsGuarded(
  db: Database,
  tenantId: (typeof careerPaths.$inferSelect)["tenantId"],
  id: (typeof careerPaths.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCareerPaths(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getCareerPathStepsByIdSafe(
  db: Database,
  tenantId: (typeof careerPathSteps.$inferSelect)["tenantId"],
  id: (typeof careerPathSteps.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(careerPathSteps)
    .where(
      and(
        eq(careerPathSteps.tenantId, tenantId),
        eq(careerPathSteps.id, id),
        isNull(careerPathSteps.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getCareerPathStepsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCareerPathStepsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof careerPathSteps.$inferSelect)["tenantId"],
  id: (typeof careerPathSteps.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCareerPathStepsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listCareerPathStepsActive(
  db: Database,
  tenantId: (typeof careerPathSteps.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(careerPathSteps)
    .where(and(eq(careerPathSteps.tenantId, tenantId), isNull(careerPathSteps.deletedAt)));
}

export async function listCareerPathStepsActiveGuarded(
  db: Database,
  tenantId: (typeof careerPathSteps.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCareerPathStepsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCareerPathStepsAll(
  db: Database,
  tenantId: (typeof careerPathSteps.$inferSelect)["tenantId"],
) {
  return await db.select().from(careerPathSteps).where(eq(careerPathSteps.tenantId, tenantId));
}

export async function listCareerPathStepsAllGuarded(
  db: Database,
  tenantId: (typeof careerPathSteps.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCareerPathStepsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCareerPathSteps(
  db: Database,
  tenantId: (typeof careerPathSteps.$inferSelect)["tenantId"],
  id: (typeof careerPathSteps.$inferSelect)["id"],
) {
  return await db
    .update(careerPathSteps)
    .set({ deletedAt: new Date() })
    .where(and(eq(careerPathSteps.tenantId, tenantId), eq(careerPathSteps.id, id)));
}

export async function archiveCareerPathStepsGuarded(
  db: Database,
  tenantId: (typeof careerPathSteps.$inferSelect)["tenantId"],
  id: (typeof careerPathSteps.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCareerPathSteps(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getCareerPathStepSkillsByIdSafe(
  db: Database,
  tenantId: (typeof careerPathStepSkills.$inferSelect)["tenantId"],
  id: (typeof careerPathStepSkills.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(careerPathStepSkills)
    .where(
      and(
        eq(careerPathStepSkills.tenantId, tenantId),
        eq(careerPathStepSkills.id, id),
        isNull(careerPathStepSkills.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getCareerPathStepSkillsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCareerPathStepSkillsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof careerPathStepSkills.$inferSelect)["tenantId"],
  id: (typeof careerPathStepSkills.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCareerPathStepSkillsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listCareerPathStepSkillsActive(
  db: Database,
  tenantId: (typeof careerPathStepSkills.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(careerPathStepSkills)
    .where(and(eq(careerPathStepSkills.tenantId, tenantId), isNull(careerPathStepSkills.deletedAt)));
}

export async function listCareerPathStepSkillsActiveGuarded(
  db: Database,
  tenantId: (typeof careerPathStepSkills.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCareerPathStepSkillsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCareerPathStepSkillsAll(
  db: Database,
  tenantId: (typeof careerPathStepSkills.$inferSelect)["tenantId"],
) {
  return await db.select().from(careerPathStepSkills).where(eq(careerPathStepSkills.tenantId, tenantId));
}

export async function listCareerPathStepSkillsAllGuarded(
  db: Database,
  tenantId: (typeof careerPathStepSkills.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCareerPathStepSkillsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCareerPathStepSkills(
  db: Database,
  tenantId: (typeof careerPathStepSkills.$inferSelect)["tenantId"],
  id: (typeof careerPathStepSkills.$inferSelect)["id"],
) {
  return await db
    .update(careerPathStepSkills)
    .set({ deletedAt: new Date() })
    .where(and(eq(careerPathStepSkills.tenantId, tenantId), eq(careerPathStepSkills.id, id)));
}

export async function archiveCareerPathStepSkillsGuarded(
  db: Database,
  tenantId: (typeof careerPathStepSkills.$inferSelect)["tenantId"],
  id: (typeof careerPathStepSkills.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCareerPathStepSkills(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getCareerAspirationsByIdSafe(
  db: Database,
  tenantId: (typeof careerAspirations.$inferSelect)["tenantId"],
  id: (typeof careerAspirations.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(careerAspirations)
    .where(
      and(
        eq(careerAspirations.tenantId, tenantId),
        eq(careerAspirations.id, id),
        isNull(careerAspirations.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getCareerAspirationsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCareerAspirationsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof careerAspirations.$inferSelect)["tenantId"],
  id: (typeof careerAspirations.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCareerAspirationsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listCareerAspirationsActive(
  db: Database,
  tenantId: (typeof careerAspirations.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(careerAspirations)
    .where(and(eq(careerAspirations.tenantId, tenantId), isNull(careerAspirations.deletedAt)));
}

export async function listCareerAspirationsActiveGuarded(
  db: Database,
  tenantId: (typeof careerAspirations.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCareerAspirationsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCareerAspirationsAll(
  db: Database,
  tenantId: (typeof careerAspirations.$inferSelect)["tenantId"],
) {
  return await db.select().from(careerAspirations).where(eq(careerAspirations.tenantId, tenantId));
}

export async function listCareerAspirationsAllGuarded(
  db: Database,
  tenantId: (typeof careerAspirations.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCareerAspirationsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCareerAspirations(
  db: Database,
  tenantId: (typeof careerAspirations.$inferSelect)["tenantId"],
  id: (typeof careerAspirations.$inferSelect)["id"],
) {
  return await db
    .update(careerAspirations)
    .set({ deletedAt: new Date() })
    .where(and(eq(careerAspirations.tenantId, tenantId), eq(careerAspirations.id, id)));
}

export async function archiveCareerAspirationsGuarded(
  db: Database,
  tenantId: (typeof careerAspirations.$inferSelect)["tenantId"],
  id: (typeof careerAspirations.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCareerAspirations(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getCareerAspirationSkillGapsByIdSafe(
  db: Database,
  tenantId: (typeof careerAspirationSkillGaps.$inferSelect)["tenantId"],
  id: (typeof careerAspirationSkillGaps.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(careerAspirationSkillGaps)
    .where(
      and(
        eq(careerAspirationSkillGaps.tenantId, tenantId),
        eq(careerAspirationSkillGaps.id, id),
        isNull(careerAspirationSkillGaps.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getCareerAspirationSkillGapsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCareerAspirationSkillGapsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof careerAspirationSkillGaps.$inferSelect)["tenantId"],
  id: (typeof careerAspirationSkillGaps.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCareerAspirationSkillGapsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listCareerAspirationSkillGapsActive(
  db: Database,
  tenantId: (typeof careerAspirationSkillGaps.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(careerAspirationSkillGaps)
    .where(and(eq(careerAspirationSkillGaps.tenantId, tenantId), isNull(careerAspirationSkillGaps.deletedAt)));
}

export async function listCareerAspirationSkillGapsActiveGuarded(
  db: Database,
  tenantId: (typeof careerAspirationSkillGaps.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCareerAspirationSkillGapsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCareerAspirationSkillGapsAll(
  db: Database,
  tenantId: (typeof careerAspirationSkillGaps.$inferSelect)["tenantId"],
) {
  return await db.select().from(careerAspirationSkillGaps).where(eq(careerAspirationSkillGaps.tenantId, tenantId));
}

export async function listCareerAspirationSkillGapsAllGuarded(
  db: Database,
  tenantId: (typeof careerAspirationSkillGaps.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCareerAspirationSkillGapsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCareerAspirationSkillGaps(
  db: Database,
  tenantId: (typeof careerAspirationSkillGaps.$inferSelect)["tenantId"],
  id: (typeof careerAspirationSkillGaps.$inferSelect)["id"],
) {
  return await db
    .update(careerAspirationSkillGaps)
    .set({ deletedAt: new Date() })
    .where(and(eq(careerAspirationSkillGaps.tenantId, tenantId), eq(careerAspirationSkillGaps.id, id)));
}

export async function archiveCareerAspirationSkillGapsGuarded(
  db: Database,
  tenantId: (typeof careerAspirationSkillGaps.$inferSelect)["tenantId"],
  id: (typeof careerAspirationSkillGaps.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCareerAspirationSkillGaps(db, tenantId, id);
}

