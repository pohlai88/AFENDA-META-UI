// @generated
// Full access scaffold — tools/ci-gate/db-access-layer (emit-full).
// Human-owned reporting: use separate modules (not *.access.ts).

import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../../db.js";
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

/** List all rows for tenant including soft-deleted. */
export async function listJobOpeningsAll(
  db: Database,
  tenantId: (typeof jobOpenings.$inferSelect)["tenantId"],
) {
  return await db.select().from(jobOpenings).where(eq(jobOpenings.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listJobApplicationsAll(
  db: Database,
  tenantId: (typeof jobApplications.$inferSelect)["tenantId"],
) {
  return await db.select().from(jobApplications).where(eq(jobApplications.tenantId, tenantId));
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


/** By ID for tenant (no soft-delete column on table). */
export async function getInterviewsById(
  db: Database,
  tenantId: (typeof interviews.$inferSelect)["tenantId"],
  id: (typeof interviews.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(interviews)
    .where(and(eq(interviews.tenantId, tenantId), eq(interviews.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listInterviews(
  db: Database,
  tenantId: (typeof interviews.$inferSelect)["tenantId"],
) {
  return await db.select().from(interviews).where(eq(interviews.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listJobOffersAll(
  db: Database,
  tenantId: (typeof jobOffers.$inferSelect)["tenantId"],
) {
  return await db.select().from(jobOffers).where(eq(jobOffers.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listApplicantDocumentsAll(
  db: Database,
  tenantId: (typeof applicantDocuments.$inferSelect)["tenantId"],
) {
  return await db.select().from(applicantDocuments).where(eq(applicantDocuments.tenantId, tenantId));
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


/** By ID for tenant (no soft-delete column on table). */
export async function getInterviewFeedbackById(
  db: Database,
  tenantId: (typeof interviewFeedback.$inferSelect)["tenantId"],
  id: (typeof interviewFeedback.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(interviewFeedback)
    .where(and(eq(interviewFeedback.tenantId, tenantId), eq(interviewFeedback.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listInterviewFeedback(
  db: Database,
  tenantId: (typeof interviewFeedback.$inferSelect)["tenantId"],
) {
  return await db.select().from(interviewFeedback).where(eq(interviewFeedback.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listOfferLettersAll(
  db: Database,
  tenantId: (typeof offerLetters.$inferSelect)["tenantId"],
) {
  return await db.select().from(offerLetters).where(eq(offerLetters.tenantId, tenantId));
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

/** List all rows for tenant including soft-deleted. */
export async function listRecruitmentPipelineStagesAll(
  db: Database,
  tenantId: (typeof recruitmentPipelineStages.$inferSelect)["tenantId"],
) {
  return await db.select().from(recruitmentPipelineStages).where(eq(recruitmentPipelineStages.tenantId, tenantId));
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


/** By ID for tenant (no soft-delete column on table). */
export async function getRecruitmentAnalyticsById(
  db: Database,
  tenantId: (typeof recruitmentAnalytics.$inferSelect)["tenantId"],
  id: (typeof recruitmentAnalytics.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(recruitmentAnalytics)
    .where(and(eq(recruitmentAnalytics.tenantId, tenantId), eq(recruitmentAnalytics.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listRecruitmentAnalytics(
  db: Database,
  tenantId: (typeof recruitmentAnalytics.$inferSelect)["tenantId"],
) {
  return await db.select().from(recruitmentAnalytics).where(eq(recruitmentAnalytics.tenantId, tenantId));
}


/** By ID for tenant (no soft-delete column on table). */
export async function getResumeParsedDataById(
  db: Database,
  tenantId: (typeof resumeParsedData.$inferSelect)["tenantId"],
  id: (typeof resumeParsedData.$inferSelect)["id"],
) {
  const rows = await db
    .select()
    .from(resumeParsedData)
    .where(and(eq(resumeParsedData.tenantId, tenantId), eq(resumeParsedData.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

/** List rows for tenant. */
export async function listResumeParsedData(
  db: Database,
  tenantId: (typeof resumeParsedData.$inferSelect)["tenantId"],
) {
  return await db.select().from(resumeParsedData).where(eq(resumeParsedData.tenantId, tenantId));
}

