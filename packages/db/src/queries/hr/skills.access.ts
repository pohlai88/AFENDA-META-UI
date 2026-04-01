// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
import {
  employeeResumeLineAchievements,
  employeeResumeLineSkillEntries,
  employeeResumeLines,
  employeeSkills,
  hrResumeLineTypes,
  hrSkillLevels,
  jobPositionSkills,
  skillTypes,
  skills,
} from "../../schema/hr/skills.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getSkillTypesByIdSafe(
  db: Database,
  tenantId: (typeof skillTypes.$inferSelect)["tenantId"],
  id: (typeof skillTypes.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(skillTypes)
    .where(
      and(
        eq(skillTypes.tenantId, tenantId),
        eq(skillTypes.id, id),
        isNull(skillTypes.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getSkillTypesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getSkillTypesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof skillTypes.$inferSelect)["tenantId"],
  id: (typeof skillTypes.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getSkillTypesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listSkillTypesActive(
  db: Database,
  tenantId: (typeof skillTypes.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(skillTypes)
    .where(and(eq(skillTypes.tenantId, tenantId), isNull(skillTypes.deletedAt)));
}

export async function listSkillTypesActiveGuarded(
  db: Database,
  tenantId: (typeof skillTypes.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSkillTypesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listSkillTypesAll(
  db: Database,
  tenantId: (typeof skillTypes.$inferSelect)["tenantId"],
) {
  return await db.select().from(skillTypes).where(eq(skillTypes.tenantId, tenantId));
}

export async function listSkillTypesAllGuarded(
  db: Database,
  tenantId: (typeof skillTypes.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSkillTypesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveSkillTypes(
  db: Database,
  tenantId: (typeof skillTypes.$inferSelect)["tenantId"],
  id: (typeof skillTypes.$inferSelect)["id"],
) {
  return await db
    .update(skillTypes)
    .set({ deletedAt: new Date() })
    .where(and(eq(skillTypes.tenantId, tenantId), eq(skillTypes.id, id)));
}

export async function archiveSkillTypesGuarded(
  db: Database,
  tenantId: (typeof skillTypes.$inferSelect)["tenantId"],
  id: (typeof skillTypes.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveSkillTypes(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getHrSkillLevelsByIdSafe(
  db: Database,
  tenantId: (typeof hrSkillLevels.$inferSelect)["tenantId"],
  id: (typeof hrSkillLevels.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(hrSkillLevels)
    .where(
      and(
        eq(hrSkillLevels.tenantId, tenantId),
        eq(hrSkillLevels.id, id),
        isNull(hrSkillLevels.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getHrSkillLevelsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getHrSkillLevelsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof hrSkillLevels.$inferSelect)["tenantId"],
  id: (typeof hrSkillLevels.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getHrSkillLevelsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listHrSkillLevelsActive(
  db: Database,
  tenantId: (typeof hrSkillLevels.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(hrSkillLevels)
    .where(and(eq(hrSkillLevels.tenantId, tenantId), isNull(hrSkillLevels.deletedAt)));
}

export async function listHrSkillLevelsActiveGuarded(
  db: Database,
  tenantId: (typeof hrSkillLevels.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listHrSkillLevelsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listHrSkillLevelsAll(
  db: Database,
  tenantId: (typeof hrSkillLevels.$inferSelect)["tenantId"],
) {
  return await db.select().from(hrSkillLevels).where(eq(hrSkillLevels.tenantId, tenantId));
}

export async function listHrSkillLevelsAllGuarded(
  db: Database,
  tenantId: (typeof hrSkillLevels.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listHrSkillLevelsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveHrSkillLevels(
  db: Database,
  tenantId: (typeof hrSkillLevels.$inferSelect)["tenantId"],
  id: (typeof hrSkillLevels.$inferSelect)["id"],
) {
  return await db
    .update(hrSkillLevels)
    .set({ deletedAt: new Date() })
    .where(and(eq(hrSkillLevels.tenantId, tenantId), eq(hrSkillLevels.id, id)));
}

export async function archiveHrSkillLevelsGuarded(
  db: Database,
  tenantId: (typeof hrSkillLevels.$inferSelect)["tenantId"],
  id: (typeof hrSkillLevels.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveHrSkillLevels(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getSkillsByIdSafe(
  db: Database,
  tenantId: (typeof skills.$inferSelect)["tenantId"],
  id: (typeof skills.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(skills)
    .where(
      and(
        eq(skills.tenantId, tenantId),
        eq(skills.id, id),
        isNull(skills.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getSkillsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getSkillsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof skills.$inferSelect)["tenantId"],
  id: (typeof skills.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getSkillsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listSkillsActive(
  db: Database,
  tenantId: (typeof skills.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(skills)
    .where(and(eq(skills.tenantId, tenantId), isNull(skills.deletedAt)));
}

export async function listSkillsActiveGuarded(
  db: Database,
  tenantId: (typeof skills.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSkillsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listSkillsAll(
  db: Database,
  tenantId: (typeof skills.$inferSelect)["tenantId"],
) {
  return await db.select().from(skills).where(eq(skills.tenantId, tenantId));
}

export async function listSkillsAllGuarded(
  db: Database,
  tenantId: (typeof skills.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listSkillsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveSkills(
  db: Database,
  tenantId: (typeof skills.$inferSelect)["tenantId"],
  id: (typeof skills.$inferSelect)["id"],
) {
  return await db
    .update(skills)
    .set({ deletedAt: new Date() })
    .where(and(eq(skills.tenantId, tenantId), eq(skills.id, id)));
}

export async function archiveSkillsGuarded(
  db: Database,
  tenantId: (typeof skills.$inferSelect)["tenantId"],
  id: (typeof skills.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveSkills(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeSkillsByIdSafe(
  db: Database,
  tenantId: (typeof employeeSkills.$inferSelect)["tenantId"],
  id: (typeof employeeSkills.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeSkills)
    .where(
      and(
        eq(employeeSkills.tenantId, tenantId),
        eq(employeeSkills.id, id),
        isNull(employeeSkills.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEmployeeSkillsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeeSkillsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeeSkills.$inferSelect)["tenantId"],
  id: (typeof employeeSkills.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeeSkillsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeSkillsActive(
  db: Database,
  tenantId: (typeof employeeSkills.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeSkills)
    .where(and(eq(employeeSkills.tenantId, tenantId), isNull(employeeSkills.deletedAt)));
}

export async function listEmployeeSkillsActiveGuarded(
  db: Database,
  tenantId: (typeof employeeSkills.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeSkillsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeSkillsAll(
  db: Database,
  tenantId: (typeof employeeSkills.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeSkills).where(eq(employeeSkills.tenantId, tenantId));
}

export async function listEmployeeSkillsAllGuarded(
  db: Database,
  tenantId: (typeof employeeSkills.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeSkillsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeSkills(
  db: Database,
  tenantId: (typeof employeeSkills.$inferSelect)["tenantId"],
  id: (typeof employeeSkills.$inferSelect)["id"],
) {
  return await db
    .update(employeeSkills)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeSkills.tenantId, tenantId), eq(employeeSkills.id, id)));
}

export async function archiveEmployeeSkillsGuarded(
  db: Database,
  tenantId: (typeof employeeSkills.$inferSelect)["tenantId"],
  id: (typeof employeeSkills.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeeSkills(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getJobPositionSkillsByIdSafe(
  db: Database,
  tenantId: (typeof jobPositionSkills.$inferSelect)["tenantId"],
  id: (typeof jobPositionSkills.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(jobPositionSkills)
    .where(
      and(
        eq(jobPositionSkills.tenantId, tenantId),
        eq(jobPositionSkills.id, id),
        isNull(jobPositionSkills.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getJobPositionSkillsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getJobPositionSkillsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof jobPositionSkills.$inferSelect)["tenantId"],
  id: (typeof jobPositionSkills.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getJobPositionSkillsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listJobPositionSkillsActive(
  db: Database,
  tenantId: (typeof jobPositionSkills.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(jobPositionSkills)
    .where(and(eq(jobPositionSkills.tenantId, tenantId), isNull(jobPositionSkills.deletedAt)));
}

export async function listJobPositionSkillsActiveGuarded(
  db: Database,
  tenantId: (typeof jobPositionSkills.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listJobPositionSkillsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listJobPositionSkillsAll(
  db: Database,
  tenantId: (typeof jobPositionSkills.$inferSelect)["tenantId"],
) {
  return await db.select().from(jobPositionSkills).where(eq(jobPositionSkills.tenantId, tenantId));
}

export async function listJobPositionSkillsAllGuarded(
  db: Database,
  tenantId: (typeof jobPositionSkills.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listJobPositionSkillsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveJobPositionSkills(
  db: Database,
  tenantId: (typeof jobPositionSkills.$inferSelect)["tenantId"],
  id: (typeof jobPositionSkills.$inferSelect)["id"],
) {
  return await db
    .update(jobPositionSkills)
    .set({ deletedAt: new Date() })
    .where(and(eq(jobPositionSkills.tenantId, tenantId), eq(jobPositionSkills.id, id)));
}

export async function archiveJobPositionSkillsGuarded(
  db: Database,
  tenantId: (typeof jobPositionSkills.$inferSelect)["tenantId"],
  id: (typeof jobPositionSkills.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveJobPositionSkills(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getHrResumeLineTypesByIdSafe(
  db: Database,
  tenantId: (typeof hrResumeLineTypes.$inferSelect)["tenantId"],
  id: (typeof hrResumeLineTypes.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(hrResumeLineTypes)
    .where(
      and(
        eq(hrResumeLineTypes.tenantId, tenantId),
        eq(hrResumeLineTypes.id, id),
        isNull(hrResumeLineTypes.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getHrResumeLineTypesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getHrResumeLineTypesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof hrResumeLineTypes.$inferSelect)["tenantId"],
  id: (typeof hrResumeLineTypes.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getHrResumeLineTypesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listHrResumeLineTypesActive(
  db: Database,
  tenantId: (typeof hrResumeLineTypes.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(hrResumeLineTypes)
    .where(and(eq(hrResumeLineTypes.tenantId, tenantId), isNull(hrResumeLineTypes.deletedAt)));
}

export async function listHrResumeLineTypesActiveGuarded(
  db: Database,
  tenantId: (typeof hrResumeLineTypes.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listHrResumeLineTypesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listHrResumeLineTypesAll(
  db: Database,
  tenantId: (typeof hrResumeLineTypes.$inferSelect)["tenantId"],
) {
  return await db.select().from(hrResumeLineTypes).where(eq(hrResumeLineTypes.tenantId, tenantId));
}

export async function listHrResumeLineTypesAllGuarded(
  db: Database,
  tenantId: (typeof hrResumeLineTypes.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listHrResumeLineTypesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveHrResumeLineTypes(
  db: Database,
  tenantId: (typeof hrResumeLineTypes.$inferSelect)["tenantId"],
  id: (typeof hrResumeLineTypes.$inferSelect)["id"],
) {
  return await db
    .update(hrResumeLineTypes)
    .set({ deletedAt: new Date() })
    .where(and(eq(hrResumeLineTypes.tenantId, tenantId), eq(hrResumeLineTypes.id, id)));
}

export async function archiveHrResumeLineTypesGuarded(
  db: Database,
  tenantId: (typeof hrResumeLineTypes.$inferSelect)["tenantId"],
  id: (typeof hrResumeLineTypes.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveHrResumeLineTypes(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeResumeLinesByIdSafe(
  db: Database,
  tenantId: (typeof employeeResumeLines.$inferSelect)["tenantId"],
  id: (typeof employeeResumeLines.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeResumeLines)
    .where(
      and(
        eq(employeeResumeLines.tenantId, tenantId),
        eq(employeeResumeLines.id, id),
        isNull(employeeResumeLines.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEmployeeResumeLinesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeeResumeLinesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeeResumeLines.$inferSelect)["tenantId"],
  id: (typeof employeeResumeLines.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeeResumeLinesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeResumeLinesActive(
  db: Database,
  tenantId: (typeof employeeResumeLines.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeResumeLines)
    .where(and(eq(employeeResumeLines.tenantId, tenantId), isNull(employeeResumeLines.deletedAt)));
}

export async function listEmployeeResumeLinesActiveGuarded(
  db: Database,
  tenantId: (typeof employeeResumeLines.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeResumeLinesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeResumeLinesAll(
  db: Database,
  tenantId: (typeof employeeResumeLines.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeResumeLines).where(eq(employeeResumeLines.tenantId, tenantId));
}

export async function listEmployeeResumeLinesAllGuarded(
  db: Database,
  tenantId: (typeof employeeResumeLines.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeResumeLinesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeResumeLines(
  db: Database,
  tenantId: (typeof employeeResumeLines.$inferSelect)["tenantId"],
  id: (typeof employeeResumeLines.$inferSelect)["id"],
) {
  return await db
    .update(employeeResumeLines)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeResumeLines.tenantId, tenantId), eq(employeeResumeLines.id, id)));
}

export async function archiveEmployeeResumeLinesGuarded(
  db: Database,
  tenantId: (typeof employeeResumeLines.$inferSelect)["tenantId"],
  id: (typeof employeeResumeLines.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeeResumeLines(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeResumeLineAchievementsByIdSafe(
  db: Database,
  tenantId: (typeof employeeResumeLineAchievements.$inferSelect)["tenantId"],
  id: (typeof employeeResumeLineAchievements.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeResumeLineAchievements)
    .where(
      and(
        eq(employeeResumeLineAchievements.tenantId, tenantId),
        eq(employeeResumeLineAchievements.id, id),
        isNull(employeeResumeLineAchievements.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEmployeeResumeLineAchievementsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeeResumeLineAchievementsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeeResumeLineAchievements.$inferSelect)["tenantId"],
  id: (typeof employeeResumeLineAchievements.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeeResumeLineAchievementsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeResumeLineAchievementsActive(
  db: Database,
  tenantId: (typeof employeeResumeLineAchievements.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeResumeLineAchievements)
    .where(and(eq(employeeResumeLineAchievements.tenantId, tenantId), isNull(employeeResumeLineAchievements.deletedAt)));
}

export async function listEmployeeResumeLineAchievementsActiveGuarded(
  db: Database,
  tenantId: (typeof employeeResumeLineAchievements.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeResumeLineAchievementsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeResumeLineAchievementsAll(
  db: Database,
  tenantId: (typeof employeeResumeLineAchievements.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeResumeLineAchievements).where(eq(employeeResumeLineAchievements.tenantId, tenantId));
}

export async function listEmployeeResumeLineAchievementsAllGuarded(
  db: Database,
  tenantId: (typeof employeeResumeLineAchievements.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeResumeLineAchievementsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeResumeLineAchievements(
  db: Database,
  tenantId: (typeof employeeResumeLineAchievements.$inferSelect)["tenantId"],
  id: (typeof employeeResumeLineAchievements.$inferSelect)["id"],
) {
  return await db
    .update(employeeResumeLineAchievements)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeResumeLineAchievements.tenantId, tenantId), eq(employeeResumeLineAchievements.id, id)));
}

export async function archiveEmployeeResumeLineAchievementsGuarded(
  db: Database,
  tenantId: (typeof employeeResumeLineAchievements.$inferSelect)["tenantId"],
  id: (typeof employeeResumeLineAchievements.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeeResumeLineAchievements(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getEmployeeResumeLineSkillEntriesByIdSafe(
  db: Database,
  tenantId: (typeof employeeResumeLineSkillEntries.$inferSelect)["tenantId"],
  id: (typeof employeeResumeLineSkillEntries.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(employeeResumeLineSkillEntries)
    .where(
      and(
        eq(employeeResumeLineSkillEntries.tenantId, tenantId),
        eq(employeeResumeLineSkillEntries.id, id),
        isNull(employeeResumeLineSkillEntries.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getEmployeeResumeLineSkillEntriesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getEmployeeResumeLineSkillEntriesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof employeeResumeLineSkillEntries.$inferSelect)["tenantId"],
  id: (typeof employeeResumeLineSkillEntries.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getEmployeeResumeLineSkillEntriesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listEmployeeResumeLineSkillEntriesActive(
  db: Database,
  tenantId: (typeof employeeResumeLineSkillEntries.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(employeeResumeLineSkillEntries)
    .where(and(eq(employeeResumeLineSkillEntries.tenantId, tenantId), isNull(employeeResumeLineSkillEntries.deletedAt)));
}

export async function listEmployeeResumeLineSkillEntriesActiveGuarded(
  db: Database,
  tenantId: (typeof employeeResumeLineSkillEntries.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeResumeLineSkillEntriesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listEmployeeResumeLineSkillEntriesAll(
  db: Database,
  tenantId: (typeof employeeResumeLineSkillEntries.$inferSelect)["tenantId"],
) {
  return await db.select().from(employeeResumeLineSkillEntries).where(eq(employeeResumeLineSkillEntries.tenantId, tenantId));
}

export async function listEmployeeResumeLineSkillEntriesAllGuarded(
  db: Database,
  tenantId: (typeof employeeResumeLineSkillEntries.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listEmployeeResumeLineSkillEntriesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveEmployeeResumeLineSkillEntries(
  db: Database,
  tenantId: (typeof employeeResumeLineSkillEntries.$inferSelect)["tenantId"],
  id: (typeof employeeResumeLineSkillEntries.$inferSelect)["id"],
) {
  return await db
    .update(employeeResumeLineSkillEntries)
    .set({ deletedAt: new Date() })
    .where(and(eq(employeeResumeLineSkillEntries.tenantId, tenantId), eq(employeeResumeLineSkillEntries.id, id)));
}

export async function archiveEmployeeResumeLineSkillEntriesGuarded(
  db: Database,
  tenantId: (typeof employeeResumeLineSkillEntries.$inferSelect)["tenantId"],
  id: (typeof employeeResumeLineSkillEntries.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveEmployeeResumeLineSkillEntries(db, tenantId, id);
}

