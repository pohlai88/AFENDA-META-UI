// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../drizzle/db.js";
import { assertGraphGuardrailAllowsRead } from "../_shared/graph-guardrail.js";
import {
  applicantDocuments,
  interviewFeedback,
  interviews,
  jobApplications,
  jobOffers,
  jobOpenings,
  offerLetters,
  recruitmentAnalytics,
  recruitmentPipelineStages,
  resumeParsedData,
} from "../../schema/hr/recruitment.js";

/** Safe by ID: tenant + not soft-deleted. */
export async function getJobOpeningsByIdSafe(
  db: Database,
  tenantId: (typeof jobOpenings.$inferSelect)["tenantId"],
  id: (typeof jobOpenings.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(jobOpenings)
    .where(
      and(
        eq(jobOpenings.tenantId, tenantId),
        eq(jobOpenings.id, id),
        isNull(jobOpenings.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getJobOpeningsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getJobOpeningsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof jobOpenings.$inferSelect)["tenantId"],
  id: (typeof jobOpenings.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getJobOpeningsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listJobOpeningsActive(
  db: Database,
  tenantId: (typeof jobOpenings.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(jobOpenings)
    .where(and(eq(jobOpenings.tenantId, tenantId), isNull(jobOpenings.deletedAt)));
}

export async function listJobOpeningsActiveGuarded(
  db: Database,
  tenantId: (typeof jobOpenings.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listJobOpeningsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listJobOpeningsAll(
  db: Database,
  tenantId: (typeof jobOpenings.$inferSelect)["tenantId"],
) {
  return await db.select().from(jobOpenings).where(eq(jobOpenings.tenantId, tenantId));
}

export async function listJobOpeningsAllGuarded(
  db: Database,
  tenantId: (typeof jobOpenings.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listJobOpeningsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveJobOpenings(
  db: Database,
  tenantId: (typeof jobOpenings.$inferSelect)["tenantId"],
  id: (typeof jobOpenings.$inferSelect)["id"],
) {
  return await db
    .update(jobOpenings)
    .set({ deletedAt: new Date() })
    .where(and(eq(jobOpenings.tenantId, tenantId), eq(jobOpenings.id, id)));
}

export async function archiveJobOpeningsGuarded(
  db: Database,
  tenantId: (typeof jobOpenings.$inferSelect)["tenantId"],
  id: (typeof jobOpenings.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveJobOpenings(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getJobApplicationsByIdSafe(
  db: Database,
  tenantId: (typeof jobApplications.$inferSelect)["tenantId"],
  id: (typeof jobApplications.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(jobApplications)
    .where(
      and(
        eq(jobApplications.tenantId, tenantId),
        eq(jobApplications.id, id),
        isNull(jobApplications.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getJobApplicationsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getJobApplicationsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof jobApplications.$inferSelect)["tenantId"],
  id: (typeof jobApplications.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getJobApplicationsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listJobApplicationsActive(
  db: Database,
  tenantId: (typeof jobApplications.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(jobApplications)
    .where(and(eq(jobApplications.tenantId, tenantId), isNull(jobApplications.deletedAt)));
}

export async function listJobApplicationsActiveGuarded(
  db: Database,
  tenantId: (typeof jobApplications.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listJobApplicationsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listJobApplicationsAll(
  db: Database,
  tenantId: (typeof jobApplications.$inferSelect)["tenantId"],
) {
  return await db.select().from(jobApplications).where(eq(jobApplications.tenantId, tenantId));
}

export async function listJobApplicationsAllGuarded(
  db: Database,
  tenantId: (typeof jobApplications.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listJobApplicationsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveJobApplications(
  db: Database,
  tenantId: (typeof jobApplications.$inferSelect)["tenantId"],
  id: (typeof jobApplications.$inferSelect)["id"],
) {
  return await db
    .update(jobApplications)
    .set({ deletedAt: new Date() })
    .where(and(eq(jobApplications.tenantId, tenantId), eq(jobApplications.id, id)));
}

export async function archiveJobApplicationsGuarded(
  db: Database,
  tenantId: (typeof jobApplications.$inferSelect)["tenantId"],
  id: (typeof jobApplications.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveJobApplications(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getInterviewsByIdSafe(
  db: Database,
  tenantId: (typeof interviews.$inferSelect)["tenantId"],
  id: (typeof interviews.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(interviews)
    .where(
      and(
        eq(interviews.tenantId, tenantId),
        eq(interviews.id, id),
        isNull(interviews.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getInterviewsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getInterviewsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof interviews.$inferSelect)["tenantId"],
  id: (typeof interviews.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getInterviewsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listInterviewsActive(
  db: Database,
  tenantId: (typeof interviews.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(interviews)
    .where(and(eq(interviews.tenantId, tenantId), isNull(interviews.deletedAt)));
}

export async function listInterviewsActiveGuarded(
  db: Database,
  tenantId: (typeof interviews.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listInterviewsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listInterviewsAll(
  db: Database,
  tenantId: (typeof interviews.$inferSelect)["tenantId"],
) {
  return await db.select().from(interviews).where(eq(interviews.tenantId, tenantId));
}

export async function listInterviewsAllGuarded(
  db: Database,
  tenantId: (typeof interviews.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listInterviewsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveInterviews(
  db: Database,
  tenantId: (typeof interviews.$inferSelect)["tenantId"],
  id: (typeof interviews.$inferSelect)["id"],
) {
  return await db
    .update(interviews)
    .set({ deletedAt: new Date() })
    .where(and(eq(interviews.tenantId, tenantId), eq(interviews.id, id)));
}

export async function archiveInterviewsGuarded(
  db: Database,
  tenantId: (typeof interviews.$inferSelect)["tenantId"],
  id: (typeof interviews.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveInterviews(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getJobOffersByIdSafe(
  db: Database,
  tenantId: (typeof jobOffers.$inferSelect)["tenantId"],
  id: (typeof jobOffers.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(jobOffers)
    .where(
      and(
        eq(jobOffers.tenantId, tenantId),
        eq(jobOffers.id, id),
        isNull(jobOffers.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getJobOffersByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getJobOffersByIdSafeGuarded(
  db: Database,
  tenantId: (typeof jobOffers.$inferSelect)["tenantId"],
  id: (typeof jobOffers.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getJobOffersByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listJobOffersActive(
  db: Database,
  tenantId: (typeof jobOffers.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(jobOffers)
    .where(and(eq(jobOffers.tenantId, tenantId), isNull(jobOffers.deletedAt)));
}

export async function listJobOffersActiveGuarded(
  db: Database,
  tenantId: (typeof jobOffers.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listJobOffersActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listJobOffersAll(
  db: Database,
  tenantId: (typeof jobOffers.$inferSelect)["tenantId"],
) {
  return await db.select().from(jobOffers).where(eq(jobOffers.tenantId, tenantId));
}

export async function listJobOffersAllGuarded(
  db: Database,
  tenantId: (typeof jobOffers.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listJobOffersAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveJobOffers(
  db: Database,
  tenantId: (typeof jobOffers.$inferSelect)["tenantId"],
  id: (typeof jobOffers.$inferSelect)["id"],
) {
  return await db
    .update(jobOffers)
    .set({ deletedAt: new Date() })
    .where(and(eq(jobOffers.tenantId, tenantId), eq(jobOffers.id, id)));
}

export async function archiveJobOffersGuarded(
  db: Database,
  tenantId: (typeof jobOffers.$inferSelect)["tenantId"],
  id: (typeof jobOffers.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveJobOffers(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getApplicantDocumentsByIdSafe(
  db: Database,
  tenantId: (typeof applicantDocuments.$inferSelect)["tenantId"],
  id: (typeof applicantDocuments.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(applicantDocuments)
    .where(
      and(
        eq(applicantDocuments.tenantId, tenantId),
        eq(applicantDocuments.id, id),
        isNull(applicantDocuments.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getApplicantDocumentsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getApplicantDocumentsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof applicantDocuments.$inferSelect)["tenantId"],
  id: (typeof applicantDocuments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getApplicantDocumentsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listApplicantDocumentsActive(
  db: Database,
  tenantId: (typeof applicantDocuments.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(applicantDocuments)
    .where(and(eq(applicantDocuments.tenantId, tenantId), isNull(applicantDocuments.deletedAt)));
}

export async function listApplicantDocumentsActiveGuarded(
  db: Database,
  tenantId: (typeof applicantDocuments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listApplicantDocumentsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listApplicantDocumentsAll(
  db: Database,
  tenantId: (typeof applicantDocuments.$inferSelect)["tenantId"],
) {
  return await db.select().from(applicantDocuments).where(eq(applicantDocuments.tenantId, tenantId));
}

export async function listApplicantDocumentsAllGuarded(
  db: Database,
  tenantId: (typeof applicantDocuments.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listApplicantDocumentsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveApplicantDocuments(
  db: Database,
  tenantId: (typeof applicantDocuments.$inferSelect)["tenantId"],
  id: (typeof applicantDocuments.$inferSelect)["id"],
) {
  return await db
    .update(applicantDocuments)
    .set({ deletedAt: new Date() })
    .where(and(eq(applicantDocuments.tenantId, tenantId), eq(applicantDocuments.id, id)));
}

export async function archiveApplicantDocumentsGuarded(
  db: Database,
  tenantId: (typeof applicantDocuments.$inferSelect)["tenantId"],
  id: (typeof applicantDocuments.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveApplicantDocuments(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getInterviewFeedbackByIdSafe(
  db: Database,
  tenantId: (typeof interviewFeedback.$inferSelect)["tenantId"],
  id: (typeof interviewFeedback.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(interviewFeedback)
    .where(
      and(
        eq(interviewFeedback.tenantId, tenantId),
        eq(interviewFeedback.id, id),
        isNull(interviewFeedback.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getInterviewFeedbackByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getInterviewFeedbackByIdSafeGuarded(
  db: Database,
  tenantId: (typeof interviewFeedback.$inferSelect)["tenantId"],
  id: (typeof interviewFeedback.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getInterviewFeedbackByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listInterviewFeedbackActive(
  db: Database,
  tenantId: (typeof interviewFeedback.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(interviewFeedback)
    .where(and(eq(interviewFeedback.tenantId, tenantId), isNull(interviewFeedback.deletedAt)));
}

export async function listInterviewFeedbackActiveGuarded(
  db: Database,
  tenantId: (typeof interviewFeedback.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listInterviewFeedbackActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listInterviewFeedbackAll(
  db: Database,
  tenantId: (typeof interviewFeedback.$inferSelect)["tenantId"],
) {
  return await db.select().from(interviewFeedback).where(eq(interviewFeedback.tenantId, tenantId));
}

export async function listInterviewFeedbackAllGuarded(
  db: Database,
  tenantId: (typeof interviewFeedback.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listInterviewFeedbackAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveInterviewFeedback(
  db: Database,
  tenantId: (typeof interviewFeedback.$inferSelect)["tenantId"],
  id: (typeof interviewFeedback.$inferSelect)["id"],
) {
  return await db
    .update(interviewFeedback)
    .set({ deletedAt: new Date() })
    .where(and(eq(interviewFeedback.tenantId, tenantId), eq(interviewFeedback.id, id)));
}

export async function archiveInterviewFeedbackGuarded(
  db: Database,
  tenantId: (typeof interviewFeedback.$inferSelect)["tenantId"],
  id: (typeof interviewFeedback.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveInterviewFeedback(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getOfferLettersByIdSafe(
  db: Database,
  tenantId: (typeof offerLetters.$inferSelect)["tenantId"],
  id: (typeof offerLetters.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(offerLetters)
    .where(
      and(
        eq(offerLetters.tenantId, tenantId),
        eq(offerLetters.id, id),
        isNull(offerLetters.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getOfferLettersByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getOfferLettersByIdSafeGuarded(
  db: Database,
  tenantId: (typeof offerLetters.$inferSelect)["tenantId"],
  id: (typeof offerLetters.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getOfferLettersByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listOfferLettersActive(
  db: Database,
  tenantId: (typeof offerLetters.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(offerLetters)
    .where(and(eq(offerLetters.tenantId, tenantId), isNull(offerLetters.deletedAt)));
}

export async function listOfferLettersActiveGuarded(
  db: Database,
  tenantId: (typeof offerLetters.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listOfferLettersActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listOfferLettersAll(
  db: Database,
  tenantId: (typeof offerLetters.$inferSelect)["tenantId"],
) {
  return await db.select().from(offerLetters).where(eq(offerLetters.tenantId, tenantId));
}

export async function listOfferLettersAllGuarded(
  db: Database,
  tenantId: (typeof offerLetters.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listOfferLettersAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveOfferLetters(
  db: Database,
  tenantId: (typeof offerLetters.$inferSelect)["tenantId"],
  id: (typeof offerLetters.$inferSelect)["id"],
) {
  return await db
    .update(offerLetters)
    .set({ deletedAt: new Date() })
    .where(and(eq(offerLetters.tenantId, tenantId), eq(offerLetters.id, id)));
}

export async function archiveOfferLettersGuarded(
  db: Database,
  tenantId: (typeof offerLetters.$inferSelect)["tenantId"],
  id: (typeof offerLetters.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveOfferLetters(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getRecruitmentPipelineStagesByIdSafe(
  db: Database,
  tenantId: (typeof recruitmentPipelineStages.$inferSelect)["tenantId"],
  id: (typeof recruitmentPipelineStages.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(recruitmentPipelineStages)
    .where(
      and(
        eq(recruitmentPipelineStages.tenantId, tenantId),
        eq(recruitmentPipelineStages.id, id),
        isNull(recruitmentPipelineStages.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getRecruitmentPipelineStagesByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getRecruitmentPipelineStagesByIdSafeGuarded(
  db: Database,
  tenantId: (typeof recruitmentPipelineStages.$inferSelect)["tenantId"],
  id: (typeof recruitmentPipelineStages.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getRecruitmentPipelineStagesByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listRecruitmentPipelineStagesActive(
  db: Database,
  tenantId: (typeof recruitmentPipelineStages.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(recruitmentPipelineStages)
    .where(and(eq(recruitmentPipelineStages.tenantId, tenantId), isNull(recruitmentPipelineStages.deletedAt)));
}

export async function listRecruitmentPipelineStagesActiveGuarded(
  db: Database,
  tenantId: (typeof recruitmentPipelineStages.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listRecruitmentPipelineStagesActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listRecruitmentPipelineStagesAll(
  db: Database,
  tenantId: (typeof recruitmentPipelineStages.$inferSelect)["tenantId"],
) {
  return await db.select().from(recruitmentPipelineStages).where(eq(recruitmentPipelineStages.tenantId, tenantId));
}

export async function listRecruitmentPipelineStagesAllGuarded(
  db: Database,
  tenantId: (typeof recruitmentPipelineStages.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listRecruitmentPipelineStagesAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveRecruitmentPipelineStages(
  db: Database,
  tenantId: (typeof recruitmentPipelineStages.$inferSelect)["tenantId"],
  id: (typeof recruitmentPipelineStages.$inferSelect)["id"],
) {
  return await db
    .update(recruitmentPipelineStages)
    .set({ deletedAt: new Date() })
    .where(and(eq(recruitmentPipelineStages.tenantId, tenantId), eq(recruitmentPipelineStages.id, id)));
}

export async function archiveRecruitmentPipelineStagesGuarded(
  db: Database,
  tenantId: (typeof recruitmentPipelineStages.$inferSelect)["tenantId"],
  id: (typeof recruitmentPipelineStages.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveRecruitmentPipelineStages(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getRecruitmentAnalyticsByIdSafe(
  db: Database,
  tenantId: (typeof recruitmentAnalytics.$inferSelect)["tenantId"],
  id: (typeof recruitmentAnalytics.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(recruitmentAnalytics)
    .where(
      and(
        eq(recruitmentAnalytics.tenantId, tenantId),
        eq(recruitmentAnalytics.id, id),
        isNull(recruitmentAnalytics.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getRecruitmentAnalyticsByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getRecruitmentAnalyticsByIdSafeGuarded(
  db: Database,
  tenantId: (typeof recruitmentAnalytics.$inferSelect)["tenantId"],
  id: (typeof recruitmentAnalytics.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getRecruitmentAnalyticsByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listRecruitmentAnalyticsActive(
  db: Database,
  tenantId: (typeof recruitmentAnalytics.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(recruitmentAnalytics)
    .where(and(eq(recruitmentAnalytics.tenantId, tenantId), isNull(recruitmentAnalytics.deletedAt)));
}

export async function listRecruitmentAnalyticsActiveGuarded(
  db: Database,
  tenantId: (typeof recruitmentAnalytics.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listRecruitmentAnalyticsActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listRecruitmentAnalyticsAll(
  db: Database,
  tenantId: (typeof recruitmentAnalytics.$inferSelect)["tenantId"],
) {
  return await db.select().from(recruitmentAnalytics).where(eq(recruitmentAnalytics.tenantId, tenantId));
}

export async function listRecruitmentAnalyticsAllGuarded(
  db: Database,
  tenantId: (typeof recruitmentAnalytics.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listRecruitmentAnalyticsAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveRecruitmentAnalytics(
  db: Database,
  tenantId: (typeof recruitmentAnalytics.$inferSelect)["tenantId"],
  id: (typeof recruitmentAnalytics.$inferSelect)["id"],
) {
  return await db
    .update(recruitmentAnalytics)
    .set({ deletedAt: new Date() })
    .where(and(eq(recruitmentAnalytics.tenantId, tenantId), eq(recruitmentAnalytics.id, id)));
}

export async function archiveRecruitmentAnalyticsGuarded(
  db: Database,
  tenantId: (typeof recruitmentAnalytics.$inferSelect)["tenantId"],
  id: (typeof recruitmentAnalytics.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveRecruitmentAnalytics(db, tenantId, id);
}


/** Safe by ID: tenant + not soft-deleted. */
export async function getResumeParsedDataByIdSafe(
  db: Database,
  tenantId: (typeof resumeParsedData.$inferSelect)["tenantId"],
  id: (typeof resumeParsedData.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(resumeParsedData)
    .where(
      and(
        eq(resumeParsedData.tenantId, tenantId),
        eq(resumeParsedData.id, id),
        isNull(resumeParsedData.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Same as getResumeParsedDataByIdSafe; asserts graph-validation policy when GRAPH_VALIDATION_POLICY_JSON is set. */
export async function getResumeParsedDataByIdSafeGuarded(
  db: Database,
  tenantId: (typeof resumeParsedData.$inferSelect)["tenantId"],
  id: (typeof resumeParsedData.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return getResumeParsedDataByIdSafe(db, tenantId, id);
}

/** List rows for tenant excluding soft-deleted. */
export async function listResumeParsedDataActive(
  db: Database,
  tenantId: (typeof resumeParsedData.$inferSelect)["tenantId"],
) {
  return await db
    .select()
    .from(resumeParsedData)
    .where(and(eq(resumeParsedData.tenantId, tenantId), isNull(resumeParsedData.deletedAt)));
}

export async function listResumeParsedDataActiveGuarded(
  db: Database,
  tenantId: (typeof resumeParsedData.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listResumeParsedDataActive(db, tenantId);
}

/** List all rows for tenant including soft-deleted. */
export async function listResumeParsedDataAll(
  db: Database,
  tenantId: (typeof resumeParsedData.$inferSelect)["tenantId"],
) {
  return await db.select().from(resumeParsedData).where(eq(resumeParsedData.tenantId, tenantId));
}

export async function listResumeParsedDataAllGuarded(
  db: Database,
  tenantId: (typeof resumeParsedData.$inferSelect)["tenantId"],
) {
  await assertGraphGuardrailAllowsRead();
  return listResumeParsedDataAll(db, tenantId);
}

/** Soft-archive (mechanical delete flag). */
export async function archiveResumeParsedData(
  db: Database,
  tenantId: (typeof resumeParsedData.$inferSelect)["tenantId"],
  id: (typeof resumeParsedData.$inferSelect)["id"],
) {
  return await db
    .update(resumeParsedData)
    .set({ deletedAt: new Date() })
    .where(and(eq(resumeParsedData.tenantId, tenantId), eq(resumeParsedData.id, id)));
}

export async function archiveResumeParsedDataGuarded(
  db: Database,
  tenantId: (typeof resumeParsedData.$inferSelect)["tenantId"],
  id: (typeof resumeParsedData.$inferSelect)["id"],
) {
  await assertGraphGuardrailAllowsRead();
  return archiveResumeParsedData(db, tenantId, id);
}

