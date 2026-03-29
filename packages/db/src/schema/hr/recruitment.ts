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
} from "./_enums.js";
import { departments, employees, jobPositions } from "./people.js";

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
