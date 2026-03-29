import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  integer,
  numeric,
  text,
  date,
  timestamp,
  uuid,
  uniqueIndex,
  boolean,
  check,
} from "drizzle-orm/pg-core";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../columns/index.js";
import { tenants } from "../core/tenants.js";
import { currencies } from "../reference/index.js";
import { hrSchema } from "./_schema.js";
import {
  recruitmentStatusEnum,
  applicationStatusEnum,
  interviewStageEnum,
  interviewResultEnum,
  offerStatusEnum,
  documentTypeEnum,
  feedbackCriteriaEnum,
} from "./_enums.js";
import { departments, employees, jobPositions } from "./people.js";
import {
  ApplicantDocumentIdSchema,
  InterviewFeedbackFormIdSchema,
  OfferLetterIdSchema,
} from "./_zodShared.js";
import { z } from "zod/v4";

// ============================================================================
// JOB OPENINGS
// ============================================================================

export const jobOpenings = hrSchema.table(
  "job_openings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    openingCode: text("opening_code").notNull(),
    ...nameColumn,
    description: text("description"),
    jobPositionId: uuid("job_position_id").notNull(),
    departmentId: uuid("department_id").notNull(),
    numberOfOpenings: integer("number_of_openings").notNull().default(1),
    recruitmentStatus: recruitmentStatusEnum("recruitment_status").notNull().default("open"),
    postedDate: date("posted_date"),
    closingDate: date("closing_date"),
    hiringManagerId: uuid("hiring_manager_id"),
    requirements: text("requirements"),
    responsibilities: text("responsibilities"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.jobPositionId],
      foreignColumns: [jobPositions.tenantId, jobPositions.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.departmentId],
      foreignColumns: [departments.tenantId, departments.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.hiringManagerId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("job_openings_tenant_code_unique")
      .on(table.tenantId, table.openingCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("job_openings_tenant_idx").on(table.tenantId),
    index("job_openings_status_idx").on(table.tenantId, table.recruitmentStatus),
    ...tenantIsolationPolicies("job_openings"),
    serviceBypassPolicy("job_openings"),
  ]
);

// ============================================================================
// JOB APPLICATIONS
// ============================================================================

export const jobApplications = hrSchema.table(
  "job_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    applicationNumber: text("application_number").notNull(),
    jobOpeningId: uuid("job_opening_id").notNull(),
    applicantName: text("applicant_name").notNull(),
    applicantEmail: text("applicant_email").notNull(),
    applicantPhone: text("applicant_phone"),
    resumeUrl: text("resume_url"),
    coverLetter: text("cover_letter"),
    applicationDate: date("application_date").notNull(),
    applicationStatus: applicationStatusEnum("application_status").notNull().default("received"),
    currentCTC: numeric("current_ctc", { precision: 15, scale: 2 }),
    expectedCTC: numeric("expected_ctc", { precision: 15, scale: 2 }),
    noticePeriodDays: integer("notice_period_days"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.jobOpeningId],
      foreignColumns: [jobOpenings.tenantId, jobOpenings.id],
    }),
    uniqueIndex("job_applications_tenant_number_unique")
      .on(table.tenantId, table.applicationNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("job_applications_tenant_idx").on(table.tenantId),
    index("job_applications_opening_idx").on(table.tenantId, table.jobOpeningId),
    index("job_applications_status_idx").on(table.tenantId, table.applicationStatus),
    ...tenantIsolationPolicies("job_applications"),
    serviceBypassPolicy("job_applications"),
  ]
);

// ============================================================================
// INTERVIEWS
// ============================================================================

export const interviews = hrSchema.table(
  "interviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    applicationId: uuid("application_id").notNull(),
    interviewStage: interviewStageEnum("interview_stage").notNull(),
    interviewDate: timestamp("interview_date", { withTimezone: true }).notNull(),
    interviewerId: uuid("interviewer_id"),
    location: text("location"),
    meetingLink: text("meeting_link"),
    interviewResult: interviewResultEnum("interview_result"),
    feedback: text("feedback"),
    rating: integer("rating"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.applicationId],
      foreignColumns: [jobApplications.tenantId, jobApplications.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.interviewerId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    index("interviews_tenant_idx").on(table.tenantId),
    index("interviews_application_idx").on(table.tenantId, table.applicationId),
    ...tenantIsolationPolicies("interviews"),
    serviceBypassPolicy("interviews"),
  ]
);

// ============================================================================
// JOB OFFERS
// ============================================================================

export const jobOffers = hrSchema.table(
  "job_offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    offerNumber: text("offer_number").notNull(),
    applicationId: uuid("application_id").notNull(),
    jobPositionId: uuid("job_position_id").notNull(),
    offerDate: date("offer_date").notNull(),
    offerStatus: offerStatusEnum("offer_status").notNull().default("draft"),
    offerSalary: numeric("offer_salary", { precision: 15, scale: 2 }).notNull(),
    currencyId: integer("currency_id").notNull(),
    joiningDate: date("joining_date"),
    offerValidUntil: date("offer_valid_until"),
    offerLetterUrl: text("offer_letter_url"),
    acceptedDate: date("accepted_date"),
    rejectedDate: date("rejected_date"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.applicationId],
      foreignColumns: [jobApplications.tenantId, jobApplications.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.jobPositionId],
      foreignColumns: [jobPositions.tenantId, jobPositions.id],
    }),
    foreignKey({ columns: [table.currencyId], foreignColumns: [currencies.currencyId] }),
    uniqueIndex("job_offers_tenant_number_unique")
      .on(table.tenantId, table.offerNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("job_offers_tenant_idx").on(table.tenantId),
    index("job_offers_application_idx").on(table.tenantId, table.applicationId),
    ...tenantIsolationPolicies("job_offers"),
    serviceBypassPolicy("job_offers"),
  ]
);

// ============================================================================
// PHASE 4: RECRUITMENT ENHANCEMENT TABLES
// ============================================================================

// ============================================================================
// TABLE: applicant_documents
// Resume, cover letter, certifications
// ============================================================================
export const applicantDocuments = hrSchema.table(
  "applicant_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    applicationId: uuid("application_id").notNull(),
    documentType: documentTypeEnum("document_type").notNull(),
    documentName: text("document_name").notNull(),
    documentUrl: text("document_url").notNull(),
    documentSize: integer("document_size"), // in bytes
    mimeType: text("mime_type"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    uploadedBy: uuid("uploaded_by"),
    isVerified: boolean("is_verified").notNull().default(false),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: uuid("verified_by"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.applicationId],
      foreignColumns: [jobApplications.tenantId, jobApplications.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.uploadedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.verifiedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    check(
      "applicant_documents_size_positive",
      sql`${table.documentSize} IS NULL OR ${table.documentSize} > 0`
    ),
    check(
      "applicant_documents_verified_consistency",
      sql`(${table.verifiedBy} IS NULL AND ${table.verifiedAt} IS NULL) OR (${table.verifiedBy} IS NOT NULL AND ${table.verifiedAt} IS NOT NULL)`
    ),
    index("applicant_documents_tenant_idx").on(table.tenantId),
    index("applicant_documents_application_idx").on(table.tenantId, table.applicationId),
    index("applicant_documents_type_idx").on(table.tenantId, table.documentType),
    index("applicant_documents_verified_idx").on(table.tenantId, table.verifiedBy),
    ...tenantIsolationPolicies("applicant_documents"),
    serviceBypassPolicy("applicant_documents"),
  ]
);

// ============================================================================
// TABLE: interview_feedback
// Structured feedback forms
// ============================================================================
export const interviewFeedback = hrSchema.table(
  "interview_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    interviewId: uuid("interview_id").notNull(),
    interviewerId: uuid("interviewer_id").notNull(),
    feedbackCriteria: feedbackCriteriaEnum("feedback_criteria").notNull(),
    rating: integer("rating").notNull(), // 1-5 scale
    comments: text("comments"),
    strengths: text("strengths"),
    weaknesses: text("weaknesses"),
    recommendation: text("recommendation"), // hire/no_hire/maybe
    isCompleted: boolean("is_completed").notNull().default(false),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.interviewId],
      foreignColumns: [interviews.tenantId, interviews.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.interviewerId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    check("interview_feedback_rating_valid", sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
    check(
      "interview_feedback_completed_consistency",
      sql`${table.isCompleted} = false OR (${table.isCompleted} = true AND ${table.submittedAt} IS NOT NULL)`
    ),
    uniqueIndex().on(
      table.tenantId,
      table.interviewId,
      table.interviewerId,
      table.feedbackCriteria
    ),
    index("interview_feedback_tenant_idx").on(table.tenantId),
    index("interview_feedback_interview_idx").on(table.tenantId, table.interviewId),
    index("interview_feedback_interviewer_idx").on(table.tenantId, table.interviewerId),
    index("interview_feedback_criteria_idx").on(table.tenantId, table.feedbackCriteria),
    ...tenantIsolationPolicies("interview_feedback"),
    serviceBypassPolicy("interview_feedback"),
  ]
);

// ============================================================================
// TABLE: offer_letters
// Generated offer letters with workflow
// ============================================================================
export const offerLetters = hrSchema.table(
  "offer_letters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    jobOfferId: uuid("job_offer_id").notNull(),
    templateId: text("template_id"),
    offerLetterNumber: text("offer_letter_number").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    generatedBy: uuid("generated_by").notNull(),
    documentUrl: text("document_url"), // URL to generated PDF
    documentHash: text("document_hash"), // For integrity verification
    status: text("status").notNull().default("draft"), // draft, sent, accepted, rejected, expired, withdrawn
    sentAt: timestamp("sent_at", { withTimezone: true }),
    sentBy: uuid("sent_by"),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.jobOfferId],
      foreignColumns: [jobOffers.tenantId, jobOffers.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.generatedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.sentBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    check(
      "offer_letters_status_valid",
      sql`${table.status} IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'withdrawn')`
    ),
    check("offer_letters_version_positive", sql`${table.version} > 0`),
    check(
      "offer_letters_date_consistency",
      sql`(${table.sentAt} IS NULL OR ${table.generatedAt} IS NULL OR ${table.sentAt} >= ${table.generatedAt})`
    ),
    uniqueIndex("offer_letters_tenant_number_unique")
      .on(table.tenantId, table.offerLetterNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("offer_letters_tenant_idx").on(table.tenantId),
    index("offer_letters_offer_idx").on(table.tenantId, table.jobOfferId),
    index("offer_letters_status_idx").on(table.tenantId, table.status),
    index("offer_letters_generated_idx").on(table.tenantId, table.generatedBy),
    ...tenantIsolationPolicies("offer_letters"),
    serviceBypassPolicy("offer_letters"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertJobOpeningSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.number().int().positive(),
  openingCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  jobPositionId: z.string().uuid(),
  departmentId: z.string().uuid(),
  numberOfOpenings: z.number().int().positive().default(1),
  recruitmentStatus: z
    .enum(["draft", "open", "in_progress", "on_hold", "filled", "cancelled"])
    .default("open"),
  postedDate: z.string().date().optional(),
  closingDate: z.string().date().optional(),
  hiringManagerId: z.string().uuid().optional(),
  requirements: z.string().max(2000).optional(),
  responsibilities: z.string().max(2000).optional(),
});

export const insertJobApplicationSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.number().int().positive(),
  applicationNumber: z.string().min(5).max(50),
  jobOpeningId: z.string().uuid(),
  applicantName: z.string().min(2).max(100),
  applicantEmail: z.string().email(),
  applicantPhone: z.string().max(20).optional(),
  resumeUrl: z.string().url().optional(),
  coverLetter: z.string().max(2000).optional(),
  applicationDate: z.string().date(),
  applicationStatus: z
    .enum([
      "received",
      "screening",
      "shortlisted",
      "interview_scheduled",
      "interviewed",
      "offer_extended",
      "offer_accepted",
      "offer_rejected",
      "rejected",
      "withdrawn",
    ])
    .default("received"),
  currentCTC: z.number().positive().optional(),
  expectedCTC: z.number().positive().optional(),
  noticePeriodDays: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
});

export const insertInterviewSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.number().int().positive(),
  applicationId: z.string().uuid(),
  interviewStage: z.enum([
    "phone_screen",
    "technical_test",
    "first_interview",
    "second_interview",
    "panel_interview",
    "final_interview",
  ]),
  interviewDate: z.string().datetime(),
  interviewerId: z.string().uuid().optional(),
  location: z.string().max(200).optional(),
  meetingLink: z.string().url().optional(),
  interviewResult: z
    .enum(["pending", "strong_hire", "hire", "maybe_hire", "no_hire", "strong_no_hire"])
    .optional(),
  feedback: z.string().max(2000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
});

export const insertJobOfferSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.number().int().positive(),
  offerNumber: z.string().min(5).max(50),
  applicationId: z.string().uuid(),
  jobPositionId: z.string().uuid(),
  offerDate: z.string().date(),
  offerStatus: z
    .enum(["draft", "sent", "accepted", "rejected", "expired", "withdrawn"])
    .default("draft"),
  offerSalary: z.number().positive(),
  currencyId: z.number().int().positive(),
  joiningDate: z.string().date().optional(),
  offerValidUntil: z.string().date().optional(),
  offerLetterUrl: z.string().url().optional(),
  acceptedDate: z.string().date().optional(),
  rejectedDate: z.string().date().optional(),
  notes: z.string().max(1000).optional(),
});

// Phase 4 Schemas
export const insertApplicantDocumentSchema = z
  .object({
    id: ApplicantDocumentIdSchema.optional(),
    tenantId: z.number().int().positive(),
    applicationId: z.string().uuid(),
    documentType: z.enum([
      "resume",
      "cover_letter",
      "portfolio",
      "certification",
      "transcript",
      "id_document",
      "work_sample",
      "reference_letter",
      "photo",
      "other",
    ]),
    documentName: z.string().min(1).max(255),
    documentUrl: z.string().url(),
    documentSize: z.number().int().positive().optional(),
    mimeType: z.string().max(100).optional(),
    uploadedBy: z.string().uuid().optional(),
    isVerified: z.boolean().default(false),
    verifiedAt: z.string().datetime().optional(),
    verifiedBy: z.string().uuid().optional(),
    notes: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.verifiedBy && !data.verifiedAt) return false;
      if (!data.verifiedBy && data.verifiedAt) return false;
      return true;
    },
    {
      message: "Both verifiedBy and verifiedAt must be provided together",
      path: ["verifiedAt"],
    }
  );

export const insertInterviewFeedbackSchema = z
  .object({
    id: InterviewFeedbackFormIdSchema.optional(),
    tenantId: z.number().int().positive(),
    interviewId: z.string().uuid(),
    interviewerId: z.string().uuid(),
    feedbackCriteria: z.enum([
      "technical_skills",
      "communication",
      "problem_solving",
      "leadership",
      "teamwork",
      "cultural_fit",
      "experience",
      "education",
      "attitude",
      "potential",
    ]),
    rating: z.number().int().min(1).max(5),
    comments: z.string().max(1000).optional(),
    strengths: z.string().max(1000).optional(),
    weaknesses: z.string().max(1000).optional(),
    recommendation: z.string().max(100).optional(),
    isCompleted: z.boolean().default(false),
    submittedAt: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      if (data.isCompleted && !data.submittedAt) return false;
      if (!data.isCompleted && data.submittedAt) return false;
      return true;
    },
    {
      message: "submittedAt is required when isCompleted is true",
      path: ["submittedAt"],
    }
  );

export const insertOfferLetterSchema = z
  .object({
    id: OfferLetterIdSchema.optional(),
    tenantId: z.number().int().positive(),
    jobOfferId: z.string().uuid(),
    templateId: z.string().max(50).optional(),
    offerLetterNumber: z.string().min(5).max(50),
    generatedBy: z.string().uuid(),
    documentUrl: z.string().url().optional(),
    documentHash: z.string().max(128).optional(),
    status: z
      .enum(["draft", "sent", "accepted", "rejected", "expired", "withdrawn"])
      .default("draft"),
    sentAt: z.string().datetime().optional(),
    sentBy: z.string().uuid().optional(),
    viewedAt: z.string().datetime().optional(),
    acceptedAt: z.string().datetime().optional(),
    rejectedAt: z.string().datetime().optional(),
    rejectionReason: z.string().max(500).optional(),
    expiresAt: z.string().datetime().optional(),
    version: z.number().int().positive().default(1),
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.status === "sent" && !data.sentAt) return false;
      if (data.status === "accepted" && !data.acceptedAt) return false;
      if (data.status === "rejected" && !data.rejectedAt) return false;
      if (data.sentBy && !data.sentAt) return false;
      if (!data.sentBy && data.sentAt) return false;
      return true;
    },
    {
      message: "Status and timestamps must be consistent",
      path: ["status"],
    }
  );
