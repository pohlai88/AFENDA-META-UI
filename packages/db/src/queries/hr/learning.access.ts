// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
import {
  assessmentAttempts,
  assessmentQuestions,
  assessments,
  certificates,
  courseEnrollments,
  courseMaterials,
  courseModules,
  coursePrerequisites,
  courseSessions,
  courses,
  learningPathCourses,
  learningPathEnrollments,
  learningPaths,
  learningProgress,
  trainingCosts,
  trainingFeedback,
} from "../../schema/hr/learning.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getCoursesByIdSafe(
  db: Database,
  tenantId: (typeof courses.$inferSelect)["tenantId"],
  id: (typeof courses.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(courses)
    .where(
      and(
        eq(courses.tenantId, tenantId),
        eq(courses.id, id),
        isNull(courses.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getCoursesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCoursesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof courses.$inferSelect)["tenantId"],
  id: (typeof courses.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCoursesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listCoursesActive(
  db: Database,
  tenantId: (typeof courses.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(courses)
    .where(and(eq(courses.tenantId, tenantId), isNull(courses.deletedAt)));
}

export async function listCoursesActiveGuarded(
  db: Database,
  tenantId: (typeof courses.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCoursesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCoursesAll(
  db: Database,
  tenantId: (typeof courses.$inferSelect)["tenantId"],
) {
  return await db.select().from(courses).where(eq(courses.tenantId, tenantId));
}

export async function listCoursesAllGuarded(
  db: Database,
  tenantId: (typeof courses.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCoursesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCourses(
  db: Database,
  tenantId: (typeof courses.$inferSelect)["tenantId"],
  id: (typeof courses.$inferSelect)["id"],
) {
  return await db
    .update(courses)
    .set({ deletedAt: new Date() })
    .where(and(eq(courses.tenantId, tenantId), eq(courses.id, id)));
}

export async function archiveCoursesGuarded(
  db: Database,
  tenantId: (typeof courses.$inferSelect)["tenantId"],
  id: (typeof courses.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCourses(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getCourseModulesByIdSafe(
  db: Database,
  tenantId: (typeof courseModules.$inferSelect)["tenantId"],
  id: (typeof courseModules.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(courseModules)
    .where(
      and(
        eq(courseModules.tenantId, tenantId),
        eq(courseModules.id, id),
        isNull(courseModules.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getCourseModulesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCourseModulesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof courseModules.$inferSelect)["tenantId"],
  id: (typeof courseModules.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCourseModulesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listCourseModulesActive(
  db: Database,
  tenantId: (typeof courseModules.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(courseModules)
    .where(and(eq(courseModules.tenantId, tenantId), isNull(courseModules.deletedAt)));
}

export async function listCourseModulesActiveGuarded(
  db: Database,
  tenantId: (typeof courseModules.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCourseModulesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCourseModulesAll(
  db: Database,
  tenantId: (typeof courseModules.$inferSelect)["tenantId"],
) {
  return await db.select().from(courseModules).where(eq(courseModules.tenantId, tenantId));
}

export async function listCourseModulesAllGuarded(
  db: Database,
  tenantId: (typeof courseModules.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCourseModulesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCourseModules(
  db: Database,
  tenantId: (typeof courseModules.$inferSelect)["tenantId"],
  id: (typeof courseModules.$inferSelect)["id"],
) {
  return await db
    .update(courseModules)
    .set({ deletedAt: new Date() })
    .where(and(eq(courseModules.tenantId, tenantId), eq(courseModules.id, id)));
}

export async function archiveCourseModulesGuarded(
  db: Database,
  tenantId: (typeof courseModules.$inferSelect)["tenantId"],
  id: (typeof courseModules.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCourseModules(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getLearningPathsByIdSafe(
  db: Database,
  tenantId: (typeof learningPaths.$inferSelect)["tenantId"],
  id: (typeof learningPaths.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(learningPaths)
    .where(
      and(
        eq(learningPaths.tenantId, tenantId),
        eq(learningPaths.id, id),
        isNull(learningPaths.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getLearningPathsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getLearningPathsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof learningPaths.$inferSelect)["tenantId"],
  id: (typeof learningPaths.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getLearningPathsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listLearningPathsActive(
  db: Database,
  tenantId: (typeof learningPaths.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(learningPaths)
    .where(and(eq(learningPaths.tenantId, tenantId), isNull(learningPaths.deletedAt)));
}

export async function listLearningPathsActiveGuarded(
  db: Database,
  tenantId: (typeof learningPaths.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLearningPathsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listLearningPathsAll(
  db: Database,
  tenantId: (typeof learningPaths.$inferSelect)["tenantId"],
) {
  return await db.select().from(learningPaths).where(eq(learningPaths.tenantId, tenantId));
}

export async function listLearningPathsAllGuarded(
  db: Database,
  tenantId: (typeof learningPaths.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLearningPathsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveLearningPaths(
  db: Database,
  tenantId: (typeof learningPaths.$inferSelect)["tenantId"],
  id: (typeof learningPaths.$inferSelect)["id"],
) {
  return await db
    .update(learningPaths)
    .set({ deletedAt: new Date() })
    .where(and(eq(learningPaths.tenantId, tenantId), eq(learningPaths.id, id)));
}

export async function archiveLearningPathsGuarded(
  db: Database,
  tenantId: (typeof learningPaths.$inferSelect)["tenantId"],
  id: (typeof learningPaths.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveLearningPaths(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getLearningPathCoursesByIdSafe(
  db: Database,
  tenantId: (typeof learningPathCourses.$inferSelect)["tenantId"],
  id: (typeof learningPathCourses.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(learningPathCourses)
    .where(
      and(
        eq(learningPathCourses.tenantId, tenantId),
        eq(learningPathCourses.id, id),
        isNull(learningPathCourses.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getLearningPathCoursesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getLearningPathCoursesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof learningPathCourses.$inferSelect)["tenantId"],
  id: (typeof learningPathCourses.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getLearningPathCoursesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listLearningPathCoursesActive(
  db: Database,
  tenantId: (typeof learningPathCourses.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(learningPathCourses)
    .where(and(eq(learningPathCourses.tenantId, tenantId), isNull(learningPathCourses.deletedAt)));
}

export async function listLearningPathCoursesActiveGuarded(
  db: Database,
  tenantId: (typeof learningPathCourses.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLearningPathCoursesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listLearningPathCoursesAll(
  db: Database,
  tenantId: (typeof learningPathCourses.$inferSelect)["tenantId"],
) {
  return await db.select().from(learningPathCourses).where(eq(learningPathCourses.tenantId, tenantId));
}

export async function listLearningPathCoursesAllGuarded(
  db: Database,
  tenantId: (typeof learningPathCourses.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLearningPathCoursesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveLearningPathCourses(
  db: Database,
  tenantId: (typeof learningPathCourses.$inferSelect)["tenantId"],
  id: (typeof learningPathCourses.$inferSelect)["id"],
) {
  return await db
    .update(learningPathCourses)
    .set({ deletedAt: new Date() })
    .where(and(eq(learningPathCourses.tenantId, tenantId), eq(learningPathCourses.id, id)));
}

export async function archiveLearningPathCoursesGuarded(
  db: Database,
  tenantId: (typeof learningPathCourses.$inferSelect)["tenantId"],
  id: (typeof learningPathCourses.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveLearningPathCourses(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getAssessmentsByIdSafe(
  db: Database,
  tenantId: (typeof assessments.$inferSelect)["tenantId"],
  id: (typeof assessments.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(assessments)
    .where(
      and(
        eq(assessments.tenantId, tenantId),
        eq(assessments.id, id),
        isNull(assessments.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getAssessmentsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getAssessmentsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof assessments.$inferSelect)["tenantId"],
  id: (typeof assessments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getAssessmentsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listAssessmentsActive(
  db: Database,
  tenantId: (typeof assessments.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(assessments)
    .where(and(eq(assessments.tenantId, tenantId), isNull(assessments.deletedAt)));
}

export async function listAssessmentsActiveGuarded(
  db: Database,
  tenantId: (typeof assessments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAssessmentsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listAssessmentsAll(
  db: Database,
  tenantId: (typeof assessments.$inferSelect)["tenantId"],
) {
  return await db.select().from(assessments).where(eq(assessments.tenantId, tenantId));
}

export async function listAssessmentsAllGuarded(
  db: Database,
  tenantId: (typeof assessments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAssessmentsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveAssessments(
  db: Database,
  tenantId: (typeof assessments.$inferSelect)["tenantId"],
  id: (typeof assessments.$inferSelect)["id"],
) {
  return await db
    .update(assessments)
    .set({ deletedAt: new Date() })
    .where(and(eq(assessments.tenantId, tenantId), eq(assessments.id, id)));
}

export async function archiveAssessmentsGuarded(
  db: Database,
  tenantId: (typeof assessments.$inferSelect)["tenantId"],
  id: (typeof assessments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveAssessments(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getAssessmentQuestionsByIdSafe(
  db: Database,
  tenantId: (typeof assessmentQuestions.$inferSelect)["tenantId"],
  id: (typeof assessmentQuestions.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(assessmentQuestions)
    .where(
      and(
        eq(assessmentQuestions.tenantId, tenantId),
        eq(assessmentQuestions.id, id),
        isNull(assessmentQuestions.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getAssessmentQuestionsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getAssessmentQuestionsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof assessmentQuestions.$inferSelect)["tenantId"],
  id: (typeof assessmentQuestions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getAssessmentQuestionsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listAssessmentQuestionsActive(
  db: Database,
  tenantId: (typeof assessmentQuestions.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(assessmentQuestions)
    .where(and(eq(assessmentQuestions.tenantId, tenantId), isNull(assessmentQuestions.deletedAt)));
}

export async function listAssessmentQuestionsActiveGuarded(
  db: Database,
  tenantId: (typeof assessmentQuestions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAssessmentQuestionsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listAssessmentQuestionsAll(
  db: Database,
  tenantId: (typeof assessmentQuestions.$inferSelect)["tenantId"],
) {
  return await db.select().from(assessmentQuestions).where(eq(assessmentQuestions.tenantId, tenantId));
}

export async function listAssessmentQuestionsAllGuarded(
  db: Database,
  tenantId: (typeof assessmentQuestions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAssessmentQuestionsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveAssessmentQuestions(
  db: Database,
  tenantId: (typeof assessmentQuestions.$inferSelect)["tenantId"],
  id: (typeof assessmentQuestions.$inferSelect)["id"],
) {
  return await db
    .update(assessmentQuestions)
    .set({ deletedAt: new Date() })
    .where(and(eq(assessmentQuestions.tenantId, tenantId), eq(assessmentQuestions.id, id)));
}

export async function archiveAssessmentQuestionsGuarded(
  db: Database,
  tenantId: (typeof assessmentQuestions.$inferSelect)["tenantId"],
  id: (typeof assessmentQuestions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveAssessmentQuestions(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getAssessmentAttemptsByIdSafe(
  db: Database,
  tenantId: (typeof assessmentAttempts.$inferSelect)["tenantId"],
  id: (typeof assessmentAttempts.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(assessmentAttempts)
    .where(
      and(
        eq(assessmentAttempts.tenantId, tenantId),
        eq(assessmentAttempts.id, id),
        isNull(assessmentAttempts.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getAssessmentAttemptsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getAssessmentAttemptsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof assessmentAttempts.$inferSelect)["tenantId"],
  id: (typeof assessmentAttempts.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getAssessmentAttemptsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listAssessmentAttemptsActive(
  db: Database,
  tenantId: (typeof assessmentAttempts.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(assessmentAttempts)
    .where(and(eq(assessmentAttempts.tenantId, tenantId), isNull(assessmentAttempts.deletedAt)));
}

export async function listAssessmentAttemptsActiveGuarded(
  db: Database,
  tenantId: (typeof assessmentAttempts.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAssessmentAttemptsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listAssessmentAttemptsAll(
  db: Database,
  tenantId: (typeof assessmentAttempts.$inferSelect)["tenantId"],
) {
  return await db.select().from(assessmentAttempts).where(eq(assessmentAttempts.tenantId, tenantId));
}

export async function listAssessmentAttemptsAllGuarded(
  db: Database,
  tenantId: (typeof assessmentAttempts.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listAssessmentAttemptsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveAssessmentAttempts(
  db: Database,
  tenantId: (typeof assessmentAttempts.$inferSelect)["tenantId"],
  id: (typeof assessmentAttempts.$inferSelect)["id"],
) {
  return await db
    .update(assessmentAttempts)
    .set({ deletedAt: new Date() })
    .where(and(eq(assessmentAttempts.tenantId, tenantId), eq(assessmentAttempts.id, id)));
}

export async function archiveAssessmentAttemptsGuarded(
  db: Database,
  tenantId: (typeof assessmentAttempts.$inferSelect)["tenantId"],
  id: (typeof assessmentAttempts.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveAssessmentAttempts(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getCourseSessionsByIdSafe(
  db: Database,
  tenantId: (typeof courseSessions.$inferSelect)["tenantId"],
  id: (typeof courseSessions.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(courseSessions)
    .where(
      and(
        eq(courseSessions.tenantId, tenantId),
        eq(courseSessions.id, id),
        isNull(courseSessions.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getCourseSessionsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCourseSessionsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof courseSessions.$inferSelect)["tenantId"],
  id: (typeof courseSessions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCourseSessionsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listCourseSessionsActive(
  db: Database,
  tenantId: (typeof courseSessions.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(courseSessions)
    .where(and(eq(courseSessions.tenantId, tenantId), isNull(courseSessions.deletedAt)));
}

export async function listCourseSessionsActiveGuarded(
  db: Database,
  tenantId: (typeof courseSessions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCourseSessionsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCourseSessionsAll(
  db: Database,
  tenantId: (typeof courseSessions.$inferSelect)["tenantId"],
) {
  return await db.select().from(courseSessions).where(eq(courseSessions.tenantId, tenantId));
}

export async function listCourseSessionsAllGuarded(
  db: Database,
  tenantId: (typeof courseSessions.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCourseSessionsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCourseSessions(
  db: Database,
  tenantId: (typeof courseSessions.$inferSelect)["tenantId"],
  id: (typeof courseSessions.$inferSelect)["id"],
) {
  return await db
    .update(courseSessions)
    .set({ deletedAt: new Date() })
    .where(and(eq(courseSessions.tenantId, tenantId), eq(courseSessions.id, id)));
}

export async function archiveCourseSessionsGuarded(
  db: Database,
  tenantId: (typeof courseSessions.$inferSelect)["tenantId"],
  id: (typeof courseSessions.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCourseSessions(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getCourseEnrollmentsByIdSafe(
  db: Database,
  tenantId: (typeof courseEnrollments.$inferSelect)["tenantId"],
  id: (typeof courseEnrollments.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(courseEnrollments)
    .where(
      and(
        eq(courseEnrollments.tenantId, tenantId),
        eq(courseEnrollments.id, id),
        isNull(courseEnrollments.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getCourseEnrollmentsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCourseEnrollmentsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof courseEnrollments.$inferSelect)["tenantId"],
  id: (typeof courseEnrollments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCourseEnrollmentsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listCourseEnrollmentsActive(
  db: Database,
  tenantId: (typeof courseEnrollments.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(courseEnrollments)
    .where(and(eq(courseEnrollments.tenantId, tenantId), isNull(courseEnrollments.deletedAt)));
}

export async function listCourseEnrollmentsActiveGuarded(
  db: Database,
  tenantId: (typeof courseEnrollments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCourseEnrollmentsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCourseEnrollmentsAll(
  db: Database,
  tenantId: (typeof courseEnrollments.$inferSelect)["tenantId"],
) {
  return await db.select().from(courseEnrollments).where(eq(courseEnrollments.tenantId, tenantId));
}

export async function listCourseEnrollmentsAllGuarded(
  db: Database,
  tenantId: (typeof courseEnrollments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCourseEnrollmentsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCourseEnrollments(
  db: Database,
  tenantId: (typeof courseEnrollments.$inferSelect)["tenantId"],
  id: (typeof courseEnrollments.$inferSelect)["id"],
) {
  return await db
    .update(courseEnrollments)
    .set({ deletedAt: new Date() })
    .where(and(eq(courseEnrollments.tenantId, tenantId), eq(courseEnrollments.id, id)));
}

export async function archiveCourseEnrollmentsGuarded(
  db: Database,
  tenantId: (typeof courseEnrollments.$inferSelect)["tenantId"],
  id: (typeof courseEnrollments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCourseEnrollments(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getLearningProgressByIdSafe(
  db: Database,
  tenantId: (typeof learningProgress.$inferSelect)["tenantId"],
  id: (typeof learningProgress.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(learningProgress)
    .where(
      and(
        eq(learningProgress.tenantId, tenantId),
        eq(learningProgress.id, id),
        isNull(learningProgress.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getLearningProgressByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getLearningProgressByIdSafeGuarded(
  db: Database,
  tenantId: (typeof learningProgress.$inferSelect)["tenantId"],
  id: (typeof learningProgress.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getLearningProgressByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listLearningProgressActive(
  db: Database,
  tenantId: (typeof learningProgress.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(learningProgress)
    .where(and(eq(learningProgress.tenantId, tenantId), isNull(learningProgress.deletedAt)));
}

export async function listLearningProgressActiveGuarded(
  db: Database,
  tenantId: (typeof learningProgress.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLearningProgressActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listLearningProgressAll(
  db: Database,
  tenantId: (typeof learningProgress.$inferSelect)["tenantId"],
) {
  return await db.select().from(learningProgress).where(eq(learningProgress.tenantId, tenantId));
}

export async function listLearningProgressAllGuarded(
  db: Database,
  tenantId: (typeof learningProgress.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLearningProgressAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveLearningProgress(
  db: Database,
  tenantId: (typeof learningProgress.$inferSelect)["tenantId"],
  id: (typeof learningProgress.$inferSelect)["id"],
) {
  return await db
    .update(learningProgress)
    .set({ deletedAt: new Date() })
    .where(and(eq(learningProgress.tenantId, tenantId), eq(learningProgress.id, id)));
}

export async function archiveLearningProgressGuarded(
  db: Database,
  tenantId: (typeof learningProgress.$inferSelect)["tenantId"],
  id: (typeof learningProgress.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveLearningProgress(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getTrainingFeedbackByIdSafe(
  db: Database,
  tenantId: (typeof trainingFeedback.$inferSelect)["tenantId"],
  id: (typeof trainingFeedback.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(trainingFeedback)
    .where(
      and(
        eq(trainingFeedback.tenantId, tenantId),
        eq(trainingFeedback.id, id),
        isNull(trainingFeedback.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getTrainingFeedbackByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getTrainingFeedbackByIdSafeGuarded(
  db: Database,
  tenantId: (typeof trainingFeedback.$inferSelect)["tenantId"],
  id: (typeof trainingFeedback.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getTrainingFeedbackByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listTrainingFeedbackActive(
  db: Database,
  tenantId: (typeof trainingFeedback.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(trainingFeedback)
    .where(and(eq(trainingFeedback.tenantId, tenantId), isNull(trainingFeedback.deletedAt)));
}

export async function listTrainingFeedbackActiveGuarded(
  db: Database,
  tenantId: (typeof trainingFeedback.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTrainingFeedbackActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listTrainingFeedbackAll(
  db: Database,
  tenantId: (typeof trainingFeedback.$inferSelect)["tenantId"],
) {
  return await db.select().from(trainingFeedback).where(eq(trainingFeedback.tenantId, tenantId));
}

export async function listTrainingFeedbackAllGuarded(
  db: Database,
  tenantId: (typeof trainingFeedback.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTrainingFeedbackAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveTrainingFeedback(
  db: Database,
  tenantId: (typeof trainingFeedback.$inferSelect)["tenantId"],
  id: (typeof trainingFeedback.$inferSelect)["id"],
) {
  return await db
    .update(trainingFeedback)
    .set({ deletedAt: new Date() })
    .where(and(eq(trainingFeedback.tenantId, tenantId), eq(trainingFeedback.id, id)));
}

export async function archiveTrainingFeedbackGuarded(
  db: Database,
  tenantId: (typeof trainingFeedback.$inferSelect)["tenantId"],
  id: (typeof trainingFeedback.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveTrainingFeedback(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getTrainingCostsByIdSafe(
  db: Database,
  tenantId: (typeof trainingCosts.$inferSelect)["tenantId"],
  id: (typeof trainingCosts.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(trainingCosts)
    .where(
      and(
        eq(trainingCosts.tenantId, tenantId),
        eq(trainingCosts.id, id),
        isNull(trainingCosts.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getTrainingCostsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getTrainingCostsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof trainingCosts.$inferSelect)["tenantId"],
  id: (typeof trainingCosts.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getTrainingCostsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listTrainingCostsActive(
  db: Database,
  tenantId: (typeof trainingCosts.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(trainingCosts)
    .where(and(eq(trainingCosts.tenantId, tenantId), isNull(trainingCosts.deletedAt)));
}

export async function listTrainingCostsActiveGuarded(
  db: Database,
  tenantId: (typeof trainingCosts.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTrainingCostsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listTrainingCostsAll(
  db: Database,
  tenantId: (typeof trainingCosts.$inferSelect)["tenantId"],
) {
  return await db.select().from(trainingCosts).where(eq(trainingCosts.tenantId, tenantId));
}

export async function listTrainingCostsAllGuarded(
  db: Database,
  tenantId: (typeof trainingCosts.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listTrainingCostsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveTrainingCosts(
  db: Database,
  tenantId: (typeof trainingCosts.$inferSelect)["tenantId"],
  id: (typeof trainingCosts.$inferSelect)["id"],
) {
  return await db
    .update(trainingCosts)
    .set({ deletedAt: new Date() })
    .where(and(eq(trainingCosts.tenantId, tenantId), eq(trainingCosts.id, id)));
}

export async function archiveTrainingCostsGuarded(
  db: Database,
  tenantId: (typeof trainingCosts.$inferSelect)["tenantId"],
  id: (typeof trainingCosts.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveTrainingCosts(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getLearningPathEnrollmentsByIdSafe(
  db: Database,
  tenantId: (typeof learningPathEnrollments.$inferSelect)["tenantId"],
  id: (typeof learningPathEnrollments.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(learningPathEnrollments)
    .where(
      and(
        eq(learningPathEnrollments.tenantId, tenantId),
        eq(learningPathEnrollments.id, id),
        isNull(learningPathEnrollments.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getLearningPathEnrollmentsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getLearningPathEnrollmentsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof learningPathEnrollments.$inferSelect)["tenantId"],
  id: (typeof learningPathEnrollments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getLearningPathEnrollmentsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listLearningPathEnrollmentsActive(
  db: Database,
  tenantId: (typeof learningPathEnrollments.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(learningPathEnrollments)
    .where(and(eq(learningPathEnrollments.tenantId, tenantId), isNull(learningPathEnrollments.deletedAt)));
}

export async function listLearningPathEnrollmentsActiveGuarded(
  db: Database,
  tenantId: (typeof learningPathEnrollments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLearningPathEnrollmentsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listLearningPathEnrollmentsAll(
  db: Database,
  tenantId: (typeof learningPathEnrollments.$inferSelect)["tenantId"],
) {
  return await db.select().from(learningPathEnrollments).where(eq(learningPathEnrollments.tenantId, tenantId));
}

export async function listLearningPathEnrollmentsAllGuarded(
  db: Database,
  tenantId: (typeof learningPathEnrollments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listLearningPathEnrollmentsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveLearningPathEnrollments(
  db: Database,
  tenantId: (typeof learningPathEnrollments.$inferSelect)["tenantId"],
  id: (typeof learningPathEnrollments.$inferSelect)["id"],
) {
  return await db
    .update(learningPathEnrollments)
    .set({ deletedAt: new Date() })
    .where(and(eq(learningPathEnrollments.tenantId, tenantId), eq(learningPathEnrollments.id, id)));
}

export async function archiveLearningPathEnrollmentsGuarded(
  db: Database,
  tenantId: (typeof learningPathEnrollments.$inferSelect)["tenantId"],
  id: (typeof learningPathEnrollments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveLearningPathEnrollments(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getCertificatesByIdSafe(
  db: Database,
  tenantId: (typeof certificates.$inferSelect)["tenantId"],
  id: (typeof certificates.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(certificates)
    .where(
      and(
        eq(certificates.tenantId, tenantId),
        eq(certificates.id, id),
        isNull(certificates.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getCertificatesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCertificatesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof certificates.$inferSelect)["tenantId"],
  id: (typeof certificates.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCertificatesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listCertificatesActive(
  db: Database,
  tenantId: (typeof certificates.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(certificates)
    .where(and(eq(certificates.tenantId, tenantId), isNull(certificates.deletedAt)));
}

export async function listCertificatesActiveGuarded(
  db: Database,
  tenantId: (typeof certificates.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCertificatesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCertificatesAll(
  db: Database,
  tenantId: (typeof certificates.$inferSelect)["tenantId"],
) {
  return await db.select().from(certificates).where(eq(certificates.tenantId, tenantId));
}

export async function listCertificatesAllGuarded(
  db: Database,
  tenantId: (typeof certificates.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCertificatesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCertificates(
  db: Database,
  tenantId: (typeof certificates.$inferSelect)["tenantId"],
  id: (typeof certificates.$inferSelect)["id"],
) {
  return await db
    .update(certificates)
    .set({ deletedAt: new Date() })
    .where(and(eq(certificates.tenantId, tenantId), eq(certificates.id, id)));
}

export async function archiveCertificatesGuarded(
  db: Database,
  tenantId: (typeof certificates.$inferSelect)["tenantId"],
  id: (typeof certificates.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCertificates(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getCoursePrerequisitesByIdSafe(
  db: Database,
  tenantId: (typeof coursePrerequisites.$inferSelect)["tenantId"],
  id: (typeof coursePrerequisites.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(coursePrerequisites)
    .where(
      and(
        eq(coursePrerequisites.tenantId, tenantId),
        eq(coursePrerequisites.id, id),
        isNull(coursePrerequisites.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getCoursePrerequisitesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCoursePrerequisitesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof coursePrerequisites.$inferSelect)["tenantId"],
  id: (typeof coursePrerequisites.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCoursePrerequisitesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listCoursePrerequisitesActive(
  db: Database,
  tenantId: (typeof coursePrerequisites.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(coursePrerequisites)
    .where(and(eq(coursePrerequisites.tenantId, tenantId), isNull(coursePrerequisites.deletedAt)));
}

export async function listCoursePrerequisitesActiveGuarded(
  db: Database,
  tenantId: (typeof coursePrerequisites.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCoursePrerequisitesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCoursePrerequisitesAll(
  db: Database,
  tenantId: (typeof coursePrerequisites.$inferSelect)["tenantId"],
) {
  return await db.select().from(coursePrerequisites).where(eq(coursePrerequisites.tenantId, tenantId));
}

export async function listCoursePrerequisitesAllGuarded(
  db: Database,
  tenantId: (typeof coursePrerequisites.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCoursePrerequisitesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCoursePrerequisites(
  db: Database,
  tenantId: (typeof coursePrerequisites.$inferSelect)["tenantId"],
  id: (typeof coursePrerequisites.$inferSelect)["id"],
) {
  return await db
    .update(coursePrerequisites)
    .set({ deletedAt: new Date() })
    .where(and(eq(coursePrerequisites.tenantId, tenantId), eq(coursePrerequisites.id, id)));
}

export async function archiveCoursePrerequisitesGuarded(
  db: Database,
  tenantId: (typeof coursePrerequisites.$inferSelect)["tenantId"],
  id: (typeof coursePrerequisites.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCoursePrerequisites(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getCourseMaterialsByIdSafe(
  db: Database,
  tenantId: (typeof courseMaterials.$inferSelect)["tenantId"],
  id: (typeof courseMaterials.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(courseMaterials)
    .where(
      and(
        eq(courseMaterials.tenantId, tenantId),
        eq(courseMaterials.id, id),
        isNull(courseMaterials.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getCourseMaterialsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getCourseMaterialsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof courseMaterials.$inferSelect)["tenantId"],
  id: (typeof courseMaterials.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getCourseMaterialsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listCourseMaterialsActive(
  db: Database,
  tenantId: (typeof courseMaterials.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(courseMaterials)
    .where(and(eq(courseMaterials.tenantId, tenantId), isNull(courseMaterials.deletedAt)));
}

export async function listCourseMaterialsActiveGuarded(
  db: Database,
  tenantId: (typeof courseMaterials.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCourseMaterialsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listCourseMaterialsAll(
  db: Database,
  tenantId: (typeof courseMaterials.$inferSelect)["tenantId"],
) {
  return await db.select().from(courseMaterials).where(eq(courseMaterials.tenantId, tenantId));
}

export async function listCourseMaterialsAllGuarded(
  db: Database,
  tenantId: (typeof courseMaterials.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listCourseMaterialsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveCourseMaterials(
  db: Database,
  tenantId: (typeof courseMaterials.$inferSelect)["tenantId"],
  id: (typeof courseMaterials.$inferSelect)["id"],
) {
  return await db
    .update(courseMaterials)
    .set({ deletedAt: new Date() })
    .where(and(eq(courseMaterials.tenantId, tenantId), eq(courseMaterials.id, id)));
}

export async function archiveCourseMaterialsGuarded(
  db: Database,
  tenantId: (typeof courseMaterials.$inferSelect)["tenantId"],
  id: (typeof courseMaterials.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveCourseMaterials(db, tenantId, id);
}

