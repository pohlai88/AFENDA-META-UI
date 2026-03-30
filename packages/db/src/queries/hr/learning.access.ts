// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
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

/** List all rows for tenant including soft-deleted. */
export async function listCoursesAll(
  db: Database,
  tenantId: (typeof courses.$inferSelect)["tenantId"],
) {
  return await db.select().from(courses).where(eq(courses.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listCourseModulesAll(
  db: Database,
  tenantId: (typeof courseModules.$inferSelect)["tenantId"],
) {
  return await db.select().from(courseModules).where(eq(courseModules.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listLearningPathsAll(
  db: Database,
  tenantId: (typeof learningPaths.$inferSelect)["tenantId"],
) {
  return await db.select().from(learningPaths).where(eq(learningPaths.tenantId, tenantId));
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


/** By ID for tenant (no soft-delete column on table). */
export async function getLearningPathCoursesById(
  db: Database,
  tenantId: (typeof learningPathCourses.$inferSelect)["tenantId"],
  id: (typeof learningPathCourses.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(learningPathCourses)
    .where(and(eq(learningPathCourses.tenantId, tenantId), eq(learningPathCourses.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listLearningPathCourses(
  db: Database,
  tenantId: (typeof learningPathCourses.$inferSelect)["tenantId"],
) {
  return await db.select().from(learningPathCourses).where(eq(learningPathCourses.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listAssessmentsAll(
  db: Database,
  tenantId: (typeof assessments.$inferSelect)["tenantId"],
) {
  return await db.select().from(assessments).where(eq(assessments.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listAssessmentQuestionsAll(
  db: Database,
  tenantId: (typeof assessmentQuestions.$inferSelect)["tenantId"],
) {
  return await db.select().from(assessmentQuestions).where(eq(assessmentQuestions.tenantId, tenantId));
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


/** By ID for tenant (no soft-delete column on table). */
export async function getAssessmentAttemptsById(
  db: Database,
  tenantId: (typeof assessmentAttempts.$inferSelect)["tenantId"],
  id: (typeof assessmentAttempts.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(assessmentAttempts)
    .where(and(eq(assessmentAttempts.tenantId, tenantId), eq(assessmentAttempts.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listAssessmentAttempts(
  db: Database,
  tenantId: (typeof assessmentAttempts.$inferSelect)["tenantId"],
) {
  return await db.select().from(assessmentAttempts).where(eq(assessmentAttempts.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listCourseSessionsAll(
  db: Database,
  tenantId: (typeof courseSessions.$inferSelect)["tenantId"],
) {
  return await db.select().from(courseSessions).where(eq(courseSessions.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listCourseEnrollmentsAll(
  db: Database,
  tenantId: (typeof courseEnrollments.$inferSelect)["tenantId"],
) {
  return await db.select().from(courseEnrollments).where(eq(courseEnrollments.tenantId, tenantId));
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


/** By ID for tenant (no soft-delete column on table). */
export async function getLearningProgressById(
  db: Database,
  tenantId: (typeof learningProgress.$inferSelect)["tenantId"],
  id: (typeof learningProgress.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(learningProgress)
    .where(and(eq(learningProgress.tenantId, tenantId), eq(learningProgress.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listLearningProgress(
  db: Database,
  tenantId: (typeof learningProgress.$inferSelect)["tenantId"],
) {
  return await db.select().from(learningProgress).where(eq(learningProgress.tenantId, tenantId));
}


/** By ID for tenant (no soft-delete column on table). */
export async function getTrainingFeedbackById(
  db: Database,
  tenantId: (typeof trainingFeedback.$inferSelect)["tenantId"],
  id: (typeof trainingFeedback.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(trainingFeedback)
    .where(and(eq(trainingFeedback.tenantId, tenantId), eq(trainingFeedback.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listTrainingFeedback(
  db: Database,
  tenantId: (typeof trainingFeedback.$inferSelect)["tenantId"],
) {
  return await db.select().from(trainingFeedback).where(eq(trainingFeedback.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listTrainingCostsAll(
  db: Database,
  tenantId: (typeof trainingCosts.$inferSelect)["tenantId"],
) {
  return await db.select().from(trainingCosts).where(eq(trainingCosts.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listLearningPathEnrollmentsAll(
  db: Database,
  tenantId: (typeof learningPathEnrollments.$inferSelect)["tenantId"],
) {
  return await db.select().from(learningPathEnrollments).where(eq(learningPathEnrollments.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listCertificatesAll(
  db: Database,
  tenantId: (typeof certificates.$inferSelect)["tenantId"],
) {
  return await db.select().from(certificates).where(eq(certificates.tenantId, tenantId));
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


/** By ID for tenant (no soft-delete column on table). */
export async function getCoursePrerequisitesById(
  db: Database,
  tenantId: (typeof coursePrerequisites.$inferSelect)["tenantId"],
  id: (typeof coursePrerequisites.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(coursePrerequisites)
    .where(and(eq(coursePrerequisites.tenantId, tenantId), eq(coursePrerequisites.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listCoursePrerequisites(
  db: Database,
  tenantId: (typeof coursePrerequisites.$inferSelect)["tenantId"],
) {
  return await db.select().from(coursePrerequisites).where(eq(coursePrerequisites.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listCourseMaterialsAll(
  db: Database,
  tenantId: (typeof courseMaterials.$inferSelect)["tenantId"],
) {
  return await db.select().from(courseMaterials).where(eq(courseMaterials.tenantId, tenantId));
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

