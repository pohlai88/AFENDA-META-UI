// ============================================================================
// HR DOMAIN: RECRUITMENT PIPELINE (Phase 5)
// Full hiring funnel, documents, feedback, offer letters, pipeline stages, analytics, parsed resumes (10 tables).
// Applications: E.164 phone + email CHECK; `application_source`; offers: valid-until vs offer date; offer letters: status↔timestamps;
// analytics `source_breakdown` jsonb + GIN; resume parse status + jsonb extracted sections + GIN.
// Tables: job_openings, job_applications, interviews, job_offers, applicant_documents,
//         interview_feedback, offer_letters, recruitment_pipeline_stages, recruitment_analytics, resume_parsed_data
// ============================================================================
import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  integer,
  jsonb,
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
  interviewFeedbackRecommendationEnum,
  recruitmentPipelineStageStatusEnum,
  jobApplicationSourceEnum,
  resumeParseStatusEnum,
  RecruitmentStatusSchema,
  ApplicationStatusSchema,
  InterviewStageSchema,
  InterviewResultSchema,
  OfferStatusSchema,
  DocumentTypeSchema,
  FeedbackCriteriaSchema,
  InterviewFeedbackRecommendationSchema,
  RecruitmentPipelineStageStatusSchema,
  JobApplicationSourceSchema,
  ResumeParseStatusSchema,
} from "./_enums.js";
import { departments, employees, jobPositions } from "./people.js";
import {
  ApplicantDocumentIdSchema,
  InterviewFeedbackFormIdSchema,
  OfferLetterIdSchema,
  RecruitmentPipelineStageIdSchema,
  RecruitmentAnalyticsIdSchema,
  ResumeParsedDataIdSchema,
  JobOpeningIdSchema,
  JobApplicationIdSchema,
  InterviewIdSchema,
  JobOfferIdSchema,
  JobPositionIdSchema,
  DepartmentIdSchema,
  EmployeeIdSchema,
  businessEmailSchema,
  internationalPhoneSchema,
  hrTenantIdSchema,
  recruitmentAutoAdvanceCriteriaSchema,
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
    postedDate: date("posted_date", { mode: "string" }),
    closingDate: date("closing_date", { mode: "string" }),
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
    applicationSource: jobApplicationSourceEnum("application_source").notNull().default("other"),
    resumeUrl: text("resume_url"),
    coverLetter: text("cover_letter"),
    applicationDate: date("application_date", { mode: "string" }).notNull(),
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
    index("job_applications_source_idx").on(table.tenantId, table.applicationSource),
    check(
      "job_applications_email_format",
      sql`${table.applicantEmail} ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'`
    ),
    check(
      "job_applications_phone_e164",
      sql`${table.applicantPhone} IS NULL OR ${table.applicantPhone} ~ '^\\+[1-9][0-9]{1,14}$'`
    ),
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
    offerDate: date("offer_date", { mode: "string" }).notNull(),
    offerStatus: offerStatusEnum("offer_status").notNull().default("draft"),
    offerSalary: numeric("offer_salary", { precision: 15, scale: 2 }).notNull(),
    currencyId: integer("currency_id").notNull(),
    joiningDate: date("joining_date", { mode: "string" }),
    offerValidUntil: date("offer_valid_until", { mode: "string" }),
    offerLetterUrl: text("offer_letter_url"),
    acceptedDate: date("accepted_date", { mode: "string" }),
    rejectedDate: date("rejected_date", { mode: "string" }),
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
    check(
      "job_offers_valid_until_on_or_after_offer_date",
      sql`${table.offerValidUntil} IS NULL OR ${table.offerValidUntil} >= ${table.offerDate}`
    ),
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
    recommendation: interviewFeedbackRecommendationEnum("recommendation"),
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
    uniqueIndex("interview_feedback_tenant_interview_interviewer_criteria_unique").on(
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
    status: offerStatusEnum("status").notNull().default("draft"),
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
    check("offer_letters_version_positive", sql`${table.version} > 0`),
    check(
      "offer_letters_date_consistency",
      sql`(${table.sentAt} IS NULL OR ${table.generatedAt} IS NULL OR ${table.sentAt} >= ${table.generatedAt})`
    ),
    check(
      "offer_letters_sent_pairing",
      sql`(${table.sentAt} IS NULL AND ${table.sentBy} IS NULL) OR (${table.sentAt} IS NOT NULL AND ${table.sentBy} IS NOT NULL)`
    ),
    check(
      "offer_letters_status_sent_requires_timestamps",
      sql`${table.status} <> 'sent'::hr.offer_status OR (${table.sentAt} IS NOT NULL AND ${table.sentBy} IS NOT NULL)`
    ),
    check(
      "offer_letters_status_accepted_requires_at",
      sql`${table.status} <> 'accepted'::hr.offer_status OR ${table.acceptedAt} IS NOT NULL`
    ),
    check(
      "offer_letters_status_rejected_requires_at",
      sql`${table.status} <> 'rejected'::hr.offer_status OR ${table.rejectedAt} IS NOT NULL`
    ),
    check(
      "offer_letters_accepted_no_rejected_at",
      sql`${table.status} <> 'accepted'::hr.offer_status OR ${table.rejectedAt} IS NULL`
    ),
    check(
      "offer_letters_rejected_no_accepted_at",
      sql`${table.status} <> 'rejected'::hr.offer_status OR ${table.acceptedAt} IS NULL`
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
  id: JobOpeningIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  openingCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  jobPositionId: JobPositionIdSchema,
  departmentId: DepartmentIdSchema,
  numberOfOpenings: z.number().int().positive().default(1),
  recruitmentStatus: RecruitmentStatusSchema.default("open"),
  postedDate: z.iso.date().optional(),
  closingDate: z.iso.date().optional(),
  hiringManagerId: EmployeeIdSchema.optional(),
  requirements: z.string().max(2000).optional(),
  responsibilities: z.string().max(2000).optional(),
});

export const insertJobApplicationSchema = z.object({
  id: JobApplicationIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  applicationNumber: z.string().min(5).max(50),
  jobOpeningId: JobOpeningIdSchema,
  applicantName: z.string().min(2).max(100),
  applicantEmail: businessEmailSchema,
  applicantPhone: internationalPhoneSchema.optional(),
  applicationSource: JobApplicationSourceSchema.optional().default("other"),
  resumeUrl: z.string().url().optional(),
  coverLetter: z.string().max(2000).optional(),
  applicationDate: z.iso.date(),
  applicationStatus: ApplicationStatusSchema.default("received"),
  currentCTC: z.number().positive().optional(),
  expectedCTC: z.number().positive().optional(),
  noticePeriodDays: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
});

export const insertInterviewSchema = z.object({
  id: InterviewIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  applicationId: JobApplicationIdSchema,
  interviewStage: InterviewStageSchema,
  interviewDate: z.iso.datetime(),
  interviewerId: EmployeeIdSchema.optional(),
  location: z.string().max(200).optional(),
  meetingLink: z.string().url().optional(),
  interviewResult: InterviewResultSchema.optional(),
  feedback: z.string().max(2000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
});

export const insertJobOfferSchema = z
  .object({
    id: JobOfferIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    offerNumber: z.string().min(5).max(50),
    applicationId: JobApplicationIdSchema,
    jobPositionId: JobPositionIdSchema,
    offerDate: z.iso.date(),
    offerStatus: OfferStatusSchema.default("draft"),
    offerSalary: z.number().positive(),
    currencyId: z.number().int().positive(),
    joiningDate: z.iso.date().optional(),
    offerValidUntil: z.iso.date().optional(),
    offerLetterUrl: z.string().url().optional(),
    acceptedDate: z.iso.date().optional(),
    rejectedDate: z.iso.date().optional(),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.offerValidUntil && data.offerValidUntil < data.offerDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "offerValidUntil must be on or after offerDate",
        path: ["offerValidUntil"],
      });
    }
  });

// Phase 4 Schemas
export const insertApplicantDocumentSchema = z
  .object({
    id: ApplicantDocumentIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    applicationId: JobApplicationIdSchema,
    documentType: DocumentTypeSchema,
    documentName: z.string().min(1).max(255),
    documentUrl: z.string().url(),
    documentSize: z.number().int().positive().optional(),
    mimeType: z.string().max(100).optional(),
    uploadedBy: EmployeeIdSchema.optional(),
    isVerified: z.boolean().default(false),
    verifiedAt: z.iso.datetime().optional(),
    verifiedBy: EmployeeIdSchema.optional(),
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
    tenantId: hrTenantIdSchema,
    interviewId: InterviewIdSchema,
    interviewerId: EmployeeIdSchema,
    feedbackCriteria: FeedbackCriteriaSchema,
    rating: z.number().int().min(1).max(5),
    comments: z.string().max(1000).optional(),
    strengths: z.string().max(1000).optional(),
    weaknesses: z.string().max(1000).optional(),
    recommendation: InterviewFeedbackRecommendationSchema.optional(),
    isCompleted: z.boolean().default(false),
    submittedAt: z.iso.datetime().optional(),
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
    tenantId: hrTenantIdSchema,
    jobOfferId: JobOfferIdSchema,
    templateId: z.string().max(50).optional(),
    offerLetterNumber: z.string().min(5).max(50),
    generatedBy: EmployeeIdSchema,
    documentUrl: z.string().url().optional(),
    documentHash: z.string().max(128).optional(),
    status: OfferStatusSchema.default("draft"),
    sentAt: z.iso.datetime().optional(),
    sentBy: EmployeeIdSchema.optional(),
    viewedAt: z.iso.datetime().optional(),
    acceptedAt: z.iso.datetime().optional(),
    rejectedAt: z.iso.datetime().optional(),
    rejectionReason: z.string().max(500).optional(),
    expiresAt: z.iso.datetime().optional(),
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
      if (data.status === "accepted" && data.rejectedAt) return false;
      if (data.status === "rejected" && data.acceptedAt) return false;
      return true;
    },
    {
      message: "Status and timestamps must be consistent",
      path: ["status"],
    }
  );

// ============================================================================
// RECRUITMENT PIPELINE STAGES - Configurable pipeline stages per job opening
// ============================================================================

export const recruitmentPipelineStages = hrSchema.table(
  "recruitment_pipeline_stages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    jobOpeningId: uuid("job_opening_id").notNull(),
    stageCode: text("stage_code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    stageOrder: integer("stage_order").notNull(),
    configurationStatus: recruitmentPipelineStageStatusEnum("configuration_status")
      .notNull()
      .default("active"),
    isDefault: boolean("is_default").notNull().default(false),
    autoAdvanceCriteria: jsonb("auto_advance_criteria").$type<unknown>(),
    notificationTemplate: text("notification_template"),
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
    uniqueIndex("recruitment_pipeline_stages_tenant_opening_code_unique")
      .on(table.tenantId, table.jobOpeningId, table.stageCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("recruitment_pipeline_stages_tenant_idx").on(table.tenantId),
    index("recruitment_pipeline_stages_opening_idx").on(table.tenantId, table.jobOpeningId),
    index("recruitment_pipeline_stages_config_status_idx").on(table.tenantId, table.configurationStatus),
    sql`CONSTRAINT recruitment_pipeline_stages_order_positive CHECK (stage_order > 0)`,
    ...tenantIsolationPolicies("recruitment_pipeline_stages"),
    serviceBypassPolicy("recruitment_pipeline_stages"),
  ]
);

// ============================================================================
// RECRUITMENT ANALYTICS - Aggregated recruitment metrics
// ============================================================================

export const recruitmentAnalytics = hrSchema.table(
  "recruitment_analytics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    jobOpeningId: uuid("job_opening_id").notNull(),
    periodStart: date("period_start", { mode: "string" }).notNull(),
    periodEnd: date("period_end", { mode: "string" }).notNull(),
    totalApplications: integer("total_applications").notNull().default(0),
    shortlisted: integer("shortlisted").notNull().default(0),
    interviewed: integer("interviewed").notNull().default(0),
    offersExtended: integer("offers_extended").notNull().default(0),
    offersAccepted: integer("offers_accepted").notNull().default(0),
    avgTimeToHire: numeric("avg_time_to_hire", { precision: 10, scale: 2 }), // Days
    avgTimeToOffer: numeric("avg_time_to_offer", { precision: 10, scale: 2 }), // Days
    sourceBreakdown: jsonb("source_breakdown").$type<Record<string, number>>(),
    costPerHire: numeric("cost_per_hire", { precision: 15, scale: 2 }),
    currencyId: integer("currency_id"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.jobOpeningId],
      foreignColumns: [jobOpenings.tenantId, jobOpenings.id],
    }),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
    }),
    uniqueIndex("recruitment_analytics_tenant_opening_period_unique").on(
      table.tenantId,
      table.jobOpeningId,
      table.periodStart,
      table.periodEnd
    ),
    index("recruitment_analytics_tenant_idx").on(table.tenantId),
    index("recruitment_analytics_opening_idx").on(table.tenantId, table.jobOpeningId),
    index("recruitment_analytics_period_idx").on(
      table.tenantId,
      table.periodStart,
      table.periodEnd
    ),
    index("recruitment_analytics_source_breakdown_gin").using("gin", table.sourceBreakdown),
    sql`CONSTRAINT recruitment_analytics_period_valid CHECK (period_end >= period_start)`,
    sql`CONSTRAINT recruitment_analytics_counts_non_negative CHECK (
      total_applications >= 0 AND
      shortlisted >= 0 AND
      interviewed >= 0 AND
      offers_extended >= 0 AND
      offers_accepted >= 0
    )`,
    ...tenantIsolationPolicies("recruitment_analytics"),
    serviceBypassPolicy("recruitment_analytics"),
  ]
);

// ============================================================================
// RESUME PARSED DATA - AI-parsed resume metadata
// ============================================================================

export const resumeParsedData = hrSchema.table(
  "resume_parsed_data",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    applicationId: uuid("application_id").notNull(),
    parsedAt: timestamp("parsed_at", { withTimezone: true }).notNull().defaultNow(),
    parseStatus: resumeParseStatusEnum("parse_status").notNull().default("success"),
    parseErrorMessage: text("parse_error_message"),
    parserVersion: text("parser_version").notNull(),
    extractedName: text("extracted_name"),
    extractedEmail: text("extracted_email"),
    extractedPhone: text("extracted_phone"),
    extractedSkills: jsonb("extracted_skills").$type<unknown>(),
    extractedExperience: jsonb("extracted_experience").$type<unknown>(),
    extractedEducation: jsonb("extracted_education").$type<unknown>(),
    matchScore: numeric("match_score", { precision: 5, scale: 2 }), // 0-100
    rawParseOutput: jsonb("raw_parse_output").$type<unknown>(),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.applicationId],
      foreignColumns: [jobApplications.tenantId, jobApplications.id],
    }),
    uniqueIndex("resume_parsed_data_tenant_application_unique").on(
      table.tenantId,
      table.applicationId
    ),
    index("resume_parsed_data_tenant_idx").on(table.tenantId),
    index("resume_parsed_data_application_idx").on(table.tenantId, table.applicationId),
    index("resume_parsed_data_match_score_idx").on(table.tenantId, table.matchScore),
    index("resume_parsed_data_parse_status_idx").on(table.tenantId, table.parseStatus),
    sql`CONSTRAINT resume_parsed_data_match_score_valid CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 100))`,
    check(
      "resume_parsed_data_error_message_when_failed",
      sql`${table.parseErrorMessage} IS NULL OR ${table.parseStatus} = 'failed'::hr.resume_parse_status`
    ),
    index("resume_parsed_data_skills_gin").using("gin", table.extractedSkills),
    index("resume_parsed_data_experience_gin").using("gin", table.extractedExperience),
    index("resume_parsed_data_education_gin").using("gin", table.extractedEducation),
    ...tenantIsolationPolicies("resume_parsed_data"),
    serviceBypassPolicy("resume_parsed_data"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS - PHASE 6B
// ============================================================================

export const insertRecruitmentPipelineStageSchema = z.object({
  id: RecruitmentPipelineStageIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  jobOpeningId: JobOpeningIdSchema,
  stageCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  stageOrder: z.number().int().positive(),
  configurationStatus: RecruitmentPipelineStageStatusSchema.optional().default("active"),
  isDefault: z.boolean().default(false),
  autoAdvanceCriteria: recruitmentAutoAdvanceCriteriaSchema,
  notificationTemplate: z.string().optional(),
});

export const insertRecruitmentAnalyticsSchema = z
  .object({
    id: RecruitmentAnalyticsIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    jobOpeningId: JobOpeningIdSchema,
    periodStart: z.iso.date(),
    periodEnd: z.iso.date(),
    totalApplications: z.number().int().min(0).default(0),
    shortlisted: z.number().int().min(0).default(0),
    interviewed: z.number().int().min(0).default(0),
    offersExtended: z.number().int().min(0).default(0),
    offersAccepted: z.number().int().min(0).default(0),
    avgTimeToHire: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .optional(),
    avgTimeToOffer: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .optional(),
    sourceBreakdown: z.record(z.string(), z.number()).optional(),
    costPerHire: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .optional(),
    currencyId: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.periodStart && data.periodEnd && data.periodStart > data.periodEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Period start cannot be after period end",
        path: ["periodStart"],
      });
    }
  });

export const insertResumeParsedDataSchema = z
  .object({
    id: ResumeParsedDataIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    applicationId: JobApplicationIdSchema,
    parsedAt: z.iso.datetime().optional(),
    parseStatus: ResumeParseStatusSchema.optional().default("success"),
    parseErrorMessage: z.string().max(2000).optional(),
    parserVersion: z.string().min(1).max(50),
    extractedName: z.string().max(200).optional(),
    extractedEmail: z.string().email().optional(),
    extractedPhone: z.string().max(50).optional(),
    extractedSkills: z.json().optional(),
    extractedExperience: z.json().optional(),
    extractedEducation: z.json().optional(),
    matchScore: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .refine((val) => {
        const num = parseFloat(val);
        return num >= 0 && num <= 100;
      }, "Match score must be between 0 and 100")
      .optional(),
    rawParseOutput: z.json().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.parseStatus === "success" && data.parseErrorMessage != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "parseErrorMessage must be omitted when parseStatus is success",
        path: ["parseErrorMessage"],
      });
    }
  });
