// ============================================================================
// HR DOMAIN: TALENT & PERFORMANCE (Phase 4)
// Covers performance review cycles, reviews, goals, and certifications.
// Tables: performance_review_cycles, performance_reviews, goals, certifications, employee_certifications
//
// Cycles use `performance_review_cycle_status` (draft/open/closed/archived); individual reviews use
// `performance_review_status` (not_started → approved/rejected). DB CHECKs mirror Zod date and length rules.
// ============================================================================
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  text,
  date,
  uuid,
  uniqueIndex,
  timestamp,
} from "drizzle-orm/pg-core";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../columns/index.js";
import { tenants } from "../core/tenants.js";
import { hrSchema } from "./_schema.js";
import {
  performanceReviewCycleStatusEnum,
  performanceReviewStatusEnum,
  performanceRatingEnum,
  goalStatusEnum,
  goalPriorityEnum,
  certificationStatusEnum,
  PerformanceReviewCycleStatusSchema,
  PerformanceReviewStatusSchema,
  PerformanceRatingSchema,
  GoalStatusSchema,
  GoalPrioritySchema,
  CertificationStatusSchema,
} from "./_enums.js";
import { employees } from "./people.js";
import { z } from "zod/v4";
import {
  PerformanceReviewCycleIdSchema,
  PerformanceReviewIdSchema,
  GoalIdSchema,
  CertificationIdSchema,
  EmployeeCertificationIdSchema,
  EmployeeIdSchema,
  hrTenantIdSchema,
} from "./_zodShared.js";

// ============================================================================
// PERFORMANCE REVIEW CYCLES
// ============================================================================

export const performanceReviewCycles = hrSchema.table(
  "performance_review_cycles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    cycleCode: text("cycle_code").notNull(),
    ...nameColumn,
    description: text("description"),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    reviewDeadline: date("review_deadline", { mode: "string" }).notNull(),
    cycleStatus: performanceReviewCycleStatusEnum("cycle_status").notNull().default("draft"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("performance_review_cycles_tenant_code_unique")
      .on(table.tenantId, table.cycleCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("performance_review_cycles_tenant_idx").on(table.tenantId),
    index("performance_review_cycles_status_idx").on(table.tenantId, table.cycleStatus),
    check(
      "performance_review_cycles_date_range",
      sql`${table.endDate} >= ${table.startDate}`
    ),
    check(
      "performance_review_cycles_deadline_on_or_after_start",
      sql`${table.reviewDeadline} >= ${table.startDate}`
    ),
    check(
      "performance_review_cycles_name_max_len",
      sql`char_length(${table.name}) <= 200`
    ),
    check(
      "performance_review_cycles_description_max_len",
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 2000`
    ),
    ...tenantIsolationPolicies("performance_review_cycles"),
    serviceBypassPolicy("performance_review_cycles"),
  ]
);

// ============================================================================
// PERFORMANCE REVIEWS
// ============================================================================

export const performanceReviews = hrSchema.table(
  "performance_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    reviewNumber: text("review_number").notNull(),
    cycleId: uuid("cycle_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    reviewerId: uuid("reviewer_id").notNull(),
    reviewDate: date("review_date", { mode: "string" }),
    overallRating: performanceRatingEnum("overall_rating"),
    strengths: text("strengths"),
    areasForImprovement: text("areas_for_improvement"),
    goals: text("goals"),
    employeeComments: text("employee_comments"),
    reviewerComments: text("reviewer_comments"),
    performanceReviewStatus: performanceReviewStatusEnum("performance_review_status")
      .notNull()
      .default("not_started"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.cycleId],
      foreignColumns: [performanceReviewCycles.tenantId, performanceReviewCycles.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.reviewerId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("performance_reviews_tenant_number_unique")
      .on(table.tenantId, table.reviewNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("performance_reviews_tenant_idx").on(table.tenantId),
    index("performance_reviews_employee_idx").on(table.tenantId, table.employeeId),
    index("performance_reviews_tenant_status_idx").on(table.tenantId, table.performanceReviewStatus),
    check(
      "performance_reviews_strengths_max_len",
      sql`${table.strengths} IS NULL OR char_length(${table.strengths}) <= 5000`
    ),
    check(
      "performance_reviews_areas_max_len",
      sql`${table.areasForImprovement} IS NULL OR char_length(${table.areasForImprovement}) <= 5000`
    ),
    check(
      "performance_reviews_goals_text_max_len",
      sql`${table.goals} IS NULL OR char_length(${table.goals}) <= 5000`
    ),
    check(
      "performance_reviews_employee_comments_max_len",
      sql`${table.employeeComments} IS NULL OR char_length(${table.employeeComments}) <= 5000`
    ),
    check(
      "performance_reviews_reviewer_comments_max_len",
      sql`${table.reviewerComments} IS NULL OR char_length(${table.reviewerComments}) <= 5000`
    ),
    ...tenantIsolationPolicies("performance_reviews"),
    serviceBypassPolicy("performance_reviews"),
  ]
);

// ============================================================================
// GOALS
// ============================================================================

export const goals = hrSchema.table(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    goalCode: text("goal_code").notNull(),
    ...nameColumn,
    description: text("description"),
    employeeId: uuid("employee_id").notNull(),
    goalStatus: goalStatusEnum("goal_status").notNull().default("draft"),
    goalPriority: goalPriorityEnum("goal_priority").notNull().default("medium"),
    startDate: date("start_date", { mode: "string" }).notNull(),
    targetDate: date("target_date", { mode: "string" }).notNull(),
    completionDate: date("completion_date", { mode: "string" }),
    progressPercentage: integer("progress_percentage").notNull().default(0),
    /** Last time `progress_percentage` was meaningfully updated (audit / analytics). */
    goalProgressUpdatedAt: timestamp("goal_progress_updated_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("goals_tenant_code_unique")
      .on(table.tenantId, table.goalCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("goals_tenant_idx").on(table.tenantId),
    index("goals_employee_idx").on(table.tenantId, table.employeeId),
    index("goals_tenant_status_priority_idx").on(
      table.tenantId,
      table.goalStatus,
      table.goalPriority
    ),
    check(
      "goals_target_on_or_after_start",
      sql`${table.targetDate} >= ${table.startDate}`
    ),
    check(
      "goals_completion_on_or_after_start",
      sql`${table.completionDate} IS NULL OR ${table.completionDate} >= ${table.startDate}`
    ),
    check(
      "goals_progress_percentage_range",
      sql`${table.progressPercentage} >= 0 AND ${table.progressPercentage} <= 100`
    ),
    check(
      "goals_name_max_len",
      sql`char_length(${table.name}) <= 200`
    ),
    check(
      "goals_description_max_len",
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 2000`
    ),
    check(
      "goals_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 2000`
    ),
    ...tenantIsolationPolicies("goals"),
    serviceBypassPolicy("goals"),
  ]
);

// ============================================================================
// CERTIFICATIONS
// ============================================================================

export const certifications = hrSchema.table(
  "certifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    certificationCode: text("certification_code").notNull(),
    ...nameColumn,
    description: text("description"),
    issuingOrganization: text("issuing_organization"),
    /** Catalog validity window; actual employee `expiry_date` is set per grant (app may align to months). */
    validityPeriodMonths: integer("validity_period_months"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("certifications_tenant_code_unique")
      .on(table.tenantId, table.certificationCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("certifications_tenant_idx").on(table.tenantId),
    check(
      "certifications_name_max_len",
      sql`char_length(${table.name}) <= 200`
    ),
    check(
      "certifications_description_max_len",
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 2000`
    ),
    check(
      "certifications_issuing_org_max_len",
      sql`${table.issuingOrganization} IS NULL OR char_length(${table.issuingOrganization}) <= 200`
    ),
    check(
      "certifications_validity_months_non_negative",
      sql`${table.validityPeriodMonths} IS NULL OR ${table.validityPeriodMonths} >= 0`
    ),
    ...tenantIsolationPolicies("certifications"),
    serviceBypassPolicy("certifications"),
  ]
);

// ============================================================================
// EMPLOYEE CERTIFICATIONS
// ============================================================================

export const employeeCertifications = hrSchema.table(
  "employee_certifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    certificationId: uuid("certification_id").notNull(),
    certificationNumber: text("certification_number"),
    issueDate: date("issue_date", { mode: "string" }).notNull(),
    expiryDate: date("expiry_date", { mode: "string" }),
    /** Optional renewal scheduling (e.g. before expiry). */
    renewalDate: date("renewal_date", { mode: "string" }),
    certificationStatus: certificationStatusEnum("certification_status")
      .notNull()
      .default("active"),
    documentUrl: text("document_url"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.certificationId],
      foreignColumns: [certifications.tenantId, certifications.id],
    }),
    index("employee_certifications_tenant_idx").on(table.tenantId),
    index("employee_certifications_employee_idx").on(table.tenantId, table.employeeId),
    index("employee_certifications_status_idx").on(table.tenantId, table.certificationStatus),
    check(
      "employee_certifications_expiry_on_or_after_issue",
      sql`${table.expiryDate} IS NULL OR ${table.expiryDate} >= ${table.issueDate}`
    ),
    check(
      "employee_certifications_renewal_on_or_after_issue",
      sql`${table.renewalDate} IS NULL OR ${table.renewalDate} >= ${table.issueDate}`
    ),
    check(
      "employee_certifications_cert_number_max_len",
      sql`${table.certificationNumber} IS NULL OR char_length(${table.certificationNumber}) <= 120`
    ),
    check(
      "employee_certifications_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 2000`
    ),
    check(
      "employee_certifications_document_url_max_len",
      sql`${table.documentUrl} IS NULL OR char_length(${table.documentUrl}) <= 2048`
    ),
    ...tenantIsolationPolicies("employee_certifications"),
    serviceBypassPolicy("employee_certifications"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertPerformanceReviewCycleSchema = z
  .object({
    id: PerformanceReviewCycleIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    cycleCode: z.string().min(2).max(50),
    name: z.string().min(2).max(200),
    description: z.string().max(2000).optional(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    reviewDeadline: z.iso.date(),
    cycleStatus: PerformanceReviewCycleStatusSchema.optional().default("draft"),
  })
  .superRefine((data, ctx) => {
    if (data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endDate cannot be before startDate",
        path: ["endDate"],
      });
    }
    if (data.reviewDeadline < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "reviewDeadline cannot be before startDate",
        path: ["reviewDeadline"],
      });
    }
  });

export const insertPerformanceReviewSchema = z.object({
  id: PerformanceReviewIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  reviewNumber: z.string().min(3).max(80),
  cycleId: PerformanceReviewCycleIdSchema,
  employeeId: EmployeeIdSchema,
  reviewerId: EmployeeIdSchema,
  reviewDate: z.iso.date().optional(),
  overallRating: PerformanceRatingSchema.optional(),
  strengths: z.string().max(5000).optional(),
  areasForImprovement: z.string().max(5000).optional(),
  goals: z.string().max(5000).optional(),
  employeeComments: z.string().max(5000).optional(),
  reviewerComments: z.string().max(5000).optional(),
  performanceReviewStatus: PerformanceReviewStatusSchema.optional().default("not_started"),
});

export const insertGoalSchema = z
  .object({
    id: GoalIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    goalCode: z.string().min(2).max(80),
    name: z.string().min(2).max(200),
    description: z.string().max(2000).optional(),
    employeeId: EmployeeIdSchema,
    goalStatus: GoalStatusSchema.optional().default("draft"),
    goalPriority: GoalPrioritySchema.optional().default("medium"),
    startDate: z.iso.date(),
    targetDate: z.iso.date(),
    completionDate: z.iso.date().optional(),
    progressPercentage: z.number().int().min(0).max(100).optional().default(0),
    goalProgressUpdatedAt: z.iso.datetime().optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.targetDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "targetDate cannot be before startDate",
        path: ["targetDate"],
      });
    }
    if (data.completionDate && data.completionDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "completionDate cannot be before startDate",
        path: ["completionDate"],
      });
    }
  });

export const insertCertificationSchema = z.object({
  id: CertificationIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  certificationCode: z.string().min(2).max(80),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  issuingOrganization: z.string().max(200).optional(),
  validityPeriodMonths: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional().default(true),
});

export const insertEmployeeCertificationSchema = z
  .object({
    id: EmployeeCertificationIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeId: EmployeeIdSchema,
    certificationId: CertificationIdSchema,
    certificationNumber: z.string().max(120).optional(),
    issueDate: z.iso.date(),
    expiryDate: z.iso.date().optional(),
    renewalDate: z.iso.date().optional(),
    certificationStatus: CertificationStatusSchema.optional().default("active"),
    documentUrl: z.string().url().max(2048).optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.expiryDate && data.expiryDate < data.issueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "expiryDate cannot be before issueDate",
        path: ["expiryDate"],
      });
    }
    if (data.renewalDate && data.renewalDate < data.issueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "renewalDate cannot be on or before issueDate",
        path: ["renewalDate"],
      });
    }
  });
