// ============================================================================
// HR DOMAIN: TALENT & PERFORMANCE (Phase 4)
// Covers performance reviews, goals, and certification management.
// Tables: performance_review_cycles, performance_reviews, goals, certifications, employee_certifications
// ============================================================================
import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  text,
  date,
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
import { hrSchema } from "./_schema.js";
import {
  performanceReviewStatusEnum,
  performanceRatingEnum,
  goalStatusEnum,
  goalPriorityEnum,
  certificationStatusEnum,
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
    performanceReviewStatus: performanceReviewStatusEnum("performance_review_status")
      .notNull()
      .default("not_started"),
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
    startDate: z.string().date(),
    endDate: z.string().date(),
    reviewDeadline: z.string().date(),
    performanceReviewStatus: PerformanceReviewStatusSchema.optional().default("not_started"),
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
  reviewDate: z.string().date().optional(),
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
    startDate: z.string().date(),
    targetDate: z.string().date(),
    completionDate: z.string().date().optional(),
    progressPercentage: z.number().int().min(0).max(100).optional().default(0),
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
    if (
      data.completionDate &&
      data.completionDate < data.startDate
    ) {
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
    issueDate: z.string().date(),
    expiryDate: z.string().date().optional(),
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
  });
