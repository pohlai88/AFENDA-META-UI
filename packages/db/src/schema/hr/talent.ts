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
  skillLevelEnum,
  certificationStatusEnum,
} from "./_enums.js";
import { employees } from "./people.js";

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
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    reviewDeadline: date("review_deadline").notNull(),
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
    reviewDate: date("review_date"),
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
    startDate: date("start_date").notNull(),
    targetDate: date("target_date").notNull(),
    completionDate: date("completion_date"),
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
// SKILLS
// ============================================================================

export const skills = hrSchema.table(
  "skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    skillCode: text("skill_code").notNull(),
    ...nameColumn,
    description: text("description"),
    category: text("category"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("skills_tenant_code_unique")
      .on(table.tenantId, table.skillCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("skills_tenant_idx").on(table.tenantId),
    ...tenantIsolationPolicies("skills"),
    serviceBypassPolicy("skills"),
  ]
);

// ============================================================================
// EMPLOYEE SKILLS
// ============================================================================

export const employeeSkills = hrSchema.table(
  "employee_skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    skillId: uuid("skill_id").notNull(),
    skillLevel: skillLevelEnum("skill_level").notNull(),
    acquiredDate: date("acquired_date"),
    verifiedDate: date("verified_date"),
    verifiedBy: uuid("verified_by"),
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
      columns: [table.tenantId, table.skillId],
      foreignColumns: [skills.tenantId, skills.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.verifiedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("employee_skills_employee_skill_unique")
      .on(table.tenantId, table.employeeId, table.skillId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("employee_skills_tenant_idx").on(table.tenantId),
    index("employee_skills_employee_idx").on(table.tenantId, table.employeeId),
    ...tenantIsolationPolicies("employee_skills"),
    serviceBypassPolicy("employee_skills"),
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
    issueDate: date("issue_date").notNull(),
    expiryDate: date("expiry_date"),
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
