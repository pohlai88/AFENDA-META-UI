// ============================================================================
// HR DOMAIN: GLOBAL MOBILITY & COMPLIANCE MODULE (Phase 9)
// Implements: international_assignments, assignment_allowances, work_permits,
// compliance_tracking, relocation_services, dei_metrics
// ============================================================================

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
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
import { z } from "zod/v4";

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
  assignmentTypeEnum,
  assignmentStatusEnum,
  permitTypeEnum,
  permitStatusEnum,
  complianceTypeEnum,
  complianceStatusEnum,
  countryEnum,
} from "./_enums.js";
import { employees } from "./people.js";
import {
  InternationalAssignmentIdSchema,
  AssignmentAllowanceIdSchema,
  WorkPermitIdSchema,
  ComplianceTrackingIdSchema,
  RelocationServiceIdSchema,
  DeiMetricIdSchema,
  currencyAmountSchema,
  refineDateRange,
} from "./_zodShared.js";

// ============================================================================
// TABLE: international_assignments
// Global assignment management
// ============================================================================
export const internationalAssignments = hrSchema.table(
  "international_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    assignmentCode: text("assignment_code").notNull(),
    employeeId: uuid("employee_id").notNull(),
    assignmentType: assignmentTypeEnum("assignment_type").notNull(),
    status: assignmentStatusEnum("status").notNull().default("planned"),
    homeCountry: countryEnum("home_country").notNull(),
    hostCountry: countryEnum("host_country").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    actualEndDate: date("actual_end_date", { mode: "string" }),
    estimatedCost: numeric("estimated_cost", { precision: 15, scale: 2 }),
    actualCost: numeric("actual_cost", { precision: 15, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    businessJustification: text("business_justification"),
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("international_assignments_tenant_code_unique")
      .on(table.tenantId, table.assignmentCode)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "international_assignments_date_range",
      sql`${table.endDate} IS NULL OR ${table.endDate} >= ${table.startDate}`
    ),
    check(
      "international_assignments_actual_end_valid",
      sql`${table.actualEndDate} IS NULL OR ${table.actualEndDate} >= ${table.startDate}`
    ),
    check(
      "international_assignments_cost_positive",
      sql`${table.estimatedCost} IS NULL OR ${table.estimatedCost} >= 0`
    ),
    check(
      "international_assignments_actual_cost_positive",
      sql`${table.actualCost} IS NULL OR ${table.actualCost} >= 0`
    ),
    index("international_assignments_tenant_idx").on(table.tenantId),
    index("international_assignments_employee_idx").on(table.tenantId, table.employeeId),
    index("international_assignments_status_idx").on(table.tenantId, table.status),
    index("international_assignments_host_country_idx").on(table.tenantId, table.hostCountry),
    ...tenantIsolationPolicies("international_assignments"),
    serviceBypassPolicy("international_assignments"),
  ]
);

// ============================================================================
// TABLE: assignment_allowances
// Expatriate allowances (housing, education, etc.)
// ============================================================================
export const assignmentAllowances = hrSchema.table(
  "assignment_allowances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    assignmentId: uuid("assignment_id").notNull(),
    allowanceType: text("allowance_type").notNull(), // housing, education, relocation, hardship, etc.
    ...nameColumn,
    description: text("description"),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    frequency: text("frequency").notNull(), // one_time, monthly, quarterly, annual
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.assignmentId],
      foreignColumns: [internationalAssignments.tenantId, internationalAssignments.id],
    }),
    check(
      "assignment_allowances_type_valid",
      sql`${table.allowanceType} IN ('housing', 'education', 'relocation', 'hardship', 'cost_of_living', 'transportation', 'other')`
    ),
    check(
      "assignment_allowances_frequency_valid",
      sql`${table.frequency} IN ('one_time', 'monthly', 'quarterly', 'annual')`
    ),
    check("assignment_allowances_amount_positive", sql`${table.amount} > 0`),
    check(
      "assignment_allowances_date_range",
      sql`${table.endDate} IS NULL OR ${table.endDate} >= ${table.startDate}`
    ),
    index("assignment_allowances_tenant_idx").on(table.tenantId),
    index("assignment_allowances_assignment_idx").on(table.tenantId, table.assignmentId),
    index("assignment_allowances_type_idx").on(table.tenantId, table.allowanceType),
    ...tenantIsolationPolicies("assignment_allowances"),
    serviceBypassPolicy("assignment_allowances"),
  ]
);

// ============================================================================
// TABLE: work_permits
// Visa and work authorization tracking
// ============================================================================
export const workPermits = hrSchema.table(
  "work_permits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    permitNumber: text("permit_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    permitType: permitTypeEnum("permit_type").notNull(),
    status: permitStatusEnum("status").notNull().default("applied"),
    country: countryEnum("country").notNull(),
    applicationDate: date("application_date", { mode: "string" }).notNull(),
    approvalDate: date("approval_date", { mode: "string" }),
    issueDate: date("issue_date", { mode: "string" }),
    expiryDate: date("expiry_date", { mode: "string" }),
    renewalDate: date("renewal_date", { mode: "string" }),
    sponsorName: text("sponsor_name"),
    applicationCost: numeric("application_cost", { precision: 15, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("work_permits_tenant_number_unique")
      .on(table.tenantId, table.permitNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "work_permits_approval_after_application",
      sql`${table.approvalDate} IS NULL OR ${table.approvalDate} >= ${table.applicationDate}`
    ),
    check(
      "work_permits_issue_after_approval",
      sql`${table.issueDate} IS NULL OR ${table.approvalDate} IS NULL OR ${table.issueDate} >= ${table.approvalDate}`
    ),
    check(
      "work_permits_expiry_after_issue",
      sql`${table.expiryDate} IS NULL OR ${table.issueDate} IS NULL OR ${table.expiryDate} > ${table.issueDate}`
    ),
    check(
      "work_permits_cost_positive",
      sql`${table.applicationCost} IS NULL OR ${table.applicationCost} >= 0`
    ),
    index("work_permits_tenant_idx").on(table.tenantId),
    index("work_permits_employee_idx").on(table.tenantId, table.employeeId),
    index("work_permits_status_idx").on(table.tenantId, table.status),
    index("work_permits_country_idx").on(table.tenantId, table.country),
    index("work_permits_expiry_idx").on(table.expiryDate),
    ...tenantIsolationPolicies("work_permits"),
    serviceBypassPolicy("work_permits"),
  ]
);

// ============================================================================
// TABLE: compliance_tracking
// EEO, OFCCP, GDPR, and other compliance tracking
// ============================================================================
export const complianceTracking = hrSchema.table(
  "compliance_tracking",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    complianceCode: text("compliance_code").notNull(),
    complianceType: complianceTypeEnum("compliance_type").notNull(),
    ...nameColumn,
    description: text("description"),
    status: complianceStatusEnum("status").notNull().default("under_review"),
    country: countryEnum("country"),
    reviewDate: date("review_date", { mode: "string" }).notNull(),
    nextReviewDate: date("next_review_date", { mode: "string" }),
    findings: text("findings"), // JSON
    actionItems: text("action_items"), // JSON
    remediationPlan: text("remediation_plan"),
    remediationDeadline: date("remediation_deadline", { mode: "string" }),
    reviewedBy: uuid("reviewed_by"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.reviewedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("compliance_tracking_tenant_code_unique")
      .on(table.tenantId, table.complianceCode)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "compliance_tracking_next_review_valid",
      sql`${table.nextReviewDate} IS NULL OR ${table.nextReviewDate} >= ${table.reviewDate}`
    ),
    check(
      "compliance_tracking_remediation_deadline_valid",
      sql`${table.remediationDeadline} IS NULL OR ${table.remediationDeadline} >= ${table.reviewDate}`
    ),
    index("compliance_tracking_tenant_idx").on(table.tenantId),
    index("compliance_tracking_type_idx").on(table.tenantId, table.complianceType),
    index("compliance_tracking_status_idx").on(table.tenantId, table.status),
    index("compliance_tracking_country_idx").on(table.tenantId, table.country),
    index("compliance_tracking_next_review_idx").on(table.nextReviewDate),
    ...tenantIsolationPolicies("compliance_tracking"),
    serviceBypassPolicy("compliance_tracking"),
  ]
);

// ============================================================================
// TABLE: relocation_services
// Moving and settlement services
// ============================================================================
export const relocationServices = hrSchema.table(
  "relocation_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    assignmentId: uuid("assignment_id").notNull(),
    serviceType: text("service_type").notNull(), // moving, temporary_housing, home_search, etc.
    ...nameColumn,
    description: text("description"),
    provider: text("provider"),
    scheduledDate: date("scheduled_date", { mode: "string" }),
    completedDate: date("completed_date", { mode: "string" }),
    estimatedCost: numeric("estimated_cost", { precision: 15, scale: 2 }),
    actualCost: numeric("actual_cost", { precision: 15, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    status: text("status").notNull().default("planned"),
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.assignmentId],
      foreignColumns: [internationalAssignments.tenantId, internationalAssignments.id],
    }),
    check(
      "relocation_services_type_valid",
      sql`${table.serviceType} IN ('moving', 'temporary_housing', 'home_search', 'school_search', 'orientation', 'immigration_support', 'other')`
    ),
    check(
      "relocation_services_status_valid",
      sql`${table.status} IN ('planned', 'scheduled', 'in_progress', 'completed', 'cancelled')`
    ),
    check(
      "relocation_services_completed_after_scheduled",
      sql`${table.completedDate} IS NULL OR ${table.scheduledDate} IS NULL OR ${table.completedDate} >= ${table.scheduledDate}`
    ),
    check(
      "relocation_services_estimated_cost_positive",
      sql`${table.estimatedCost} IS NULL OR ${table.estimatedCost} >= 0`
    ),
    check(
      "relocation_services_actual_cost_positive",
      sql`${table.actualCost} IS NULL OR ${table.actualCost} >= 0`
    ),
    index("relocation_services_tenant_idx").on(table.tenantId),
    index("relocation_services_assignment_idx").on(table.tenantId, table.assignmentId),
    index("relocation_services_type_idx").on(table.tenantId, table.serviceType),
    index("relocation_services_status_idx").on(table.tenantId, table.status),
    ...tenantIsolationPolicies("relocation_services"),
    serviceBypassPolicy("relocation_services"),
  ]
);

// ============================================================================
// TABLE: dei_metrics
// Diversity, Equity & Inclusion measurements (anonymized)
// ============================================================================
export const deiMetrics = hrSchema.table(
  "dei_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    metricCode: text("metric_code").notNull(),
    ...nameColumn,
    description: text("description"),
    metricType: text("metric_type").notNull(), // diversity, equity, inclusion, pay_gap, representation
    measurementDate: date("measurement_date", { mode: "string" }).notNull(),
    dimensionType: text("dimension_type"), // gender, ethnicity, age_group, department, level
    dimensionValue: text("dimension_value"), // Anonymized aggregation
    metricValue: numeric("metric_value", { precision: 15, scale: 2 }).notNull(),
    sampleSize: integer("sample_size").notNull(),
    targetValue: numeric("target_value", { precision: 15, scale: 2 }),
    unit: text("unit"), // %, count, ratio
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("dei_metrics_tenant_code_date_unique")
      .on(table.tenantId, table.metricCode, table.measurementDate)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "dei_metrics_type_valid",
      sql`${table.metricType} IN ('diversity', 'equity', 'inclusion', 'pay_gap', 'representation', 'promotion_rate', 'retention')`
    ),
    check(
      "dei_metrics_dimension_type_valid",
      sql`${table.dimensionType} IS NULL OR ${table.dimensionType} IN ('gender', 'ethnicity', 'age_group', 'department', 'level', 'location')`
    ),
    check("dei_metrics_sample_size_positive", sql`${table.sampleSize} > 0`),
    index("dei_metrics_tenant_idx").on(table.tenantId),
    index("dei_metrics_type_idx").on(table.tenantId, table.metricType),
    index("dei_metrics_date_idx").on(table.tenantId, table.measurementDate),
    index("dei_metrics_dimension_idx").on(table.tenantId, table.dimensionType),
    ...tenantIsolationPolicies("dei_metrics"),
    serviceBypassPolicy("dei_metrics"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertInternationalAssignmentSchema = z
  .object({
    id: InternationalAssignmentIdSchema.optional(),
    tenantId: z.number().int().positive(),
    assignmentCode: z.string().min(3).max(50),
    employeeId: z.string().uuid(),
    assignmentType: z.enum(["short_term", "long_term", "permanent", "rotational", "commuter"]),
    status: z.enum(["planned", "active", "completed", "cancelled", "extended"]).default("planned"),
    homeCountry: z.string().length(2),
    hostCountry: z.string().length(2),
    startDate: z.string().date(),
    endDate: z.string().date().optional(),
    actualEndDate: z.string().date().optional(),
    estimatedCost: currencyAmountSchema(2).optional(),
    actualCost: currencyAmountSchema(2).optional(),
    currency: z.string().length(3).default("USD"),
    businessJustification: z.string().max(2000).optional(),
    notes: z.string().max(1000).optional(),
  })
  .superRefine(refineDateRange("startDate", "endDate"))
  .superRefine(refineDateRange("startDate", "actualEndDate"));

export const insertAssignmentAllowanceSchema = z
  .object({
    id: AssignmentAllowanceIdSchema.optional(),
    tenantId: z.number().int().positive(),
    assignmentId: z.string().uuid(),
    allowanceType: z.enum([
      "housing",
      "education",
      "relocation",
      "hardship",
      "cost_of_living",
      "transportation",
      "other",
    ]),
    name: z.string().min(2).max(100),
    description: z.string().max(2000).optional(),
    amount: currencyAmountSchema(2),
    currency: z.string().length(3).default("USD"),
    frequency: z.enum(["one_time", "monthly", "quarterly", "annual"]),
    startDate: z.string().date(),
    endDate: z.string().date().optional(),
  })
  .superRefine(refineDateRange("startDate", "endDate"));

export const insertWorkPermitSchema = z.object({
  id: WorkPermitIdSchema.optional(),
  tenantId: z.number().int().positive(),
  permitNumber: z.string().min(3).max(100),
  employeeId: z.string().uuid(),
  permitType: z.enum(["work_visa", "residence_permit", "citizenship", "dependent_visa", "other"]),
  status: z.enum(["applied", "approved", "rejected", "expired", "renewed"]).default("applied"),
  country: z.string().length(2),
  applicationDate: z.string().date(),
  approvalDate: z.string().date().optional(),
  issueDate: z.string().date().optional(),
  expiryDate: z.string().date().optional(),
  renewalDate: z.string().date().optional(),
  sponsorName: z.string().max(200).optional(),
  applicationCost: currencyAmountSchema(2).optional(),
  currency: z.string().length(3).default("USD"),
  notes: z.string().max(1000).optional(),
});

export const insertComplianceTrackingSchema = z.object({
  id: ComplianceTrackingIdSchema.optional(),
  tenantId: z.number().int().positive(),
  complianceCode: z.string().min(3).max(50),
  complianceType: z.enum(["eeo", "ofccp", "gdpr", "local_labor_law", "tax_compliance", "other"]),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  status: z
    .enum(["compliant", "non_compliant", "under_review", "remediated"])
    .default("under_review"),
  country: z.string().length(2).optional(),
  reviewDate: z.string().date(),
  nextReviewDate: z.string().date().optional(),
  findings: z.string().optional(), // JSON string
  actionItems: z.string().optional(), // JSON string
  remediationPlan: z.string().max(2000).optional(),
  remediationDeadline: z.string().date().optional(),
  reviewedBy: z.string().uuid().optional(),
});

export const insertRelocationServiceSchema = z.object({
  id: RelocationServiceIdSchema.optional(),
  tenantId: z.number().int().positive(),
  assignmentId: z.string().uuid(),
  serviceType: z.enum([
    "moving",
    "temporary_housing",
    "home_search",
    "school_search",
    "orientation",
    "immigration_support",
    "other",
  ]),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  provider: z.string().max(200).optional(),
  scheduledDate: z.string().date().optional(),
  completedDate: z.string().date().optional(),
  estimatedCost: currencyAmountSchema(2).optional(),
  actualCost: currencyAmountSchema(2).optional(),
  currency: z.string().length(3).default("USD"),
  status: z
    .enum(["planned", "scheduled", "in_progress", "completed", "cancelled"])
    .default("planned"),
  notes: z.string().max(1000).optional(),
});

export const insertDeiMetricSchema = z.object({
  id: DeiMetricIdSchema.optional(),
  tenantId: z.number().int().positive(),
  metricCode: z.string().min(3).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  metricType: z.enum([
    "diversity",
    "equity",
    "inclusion",
    "pay_gap",
    "representation",
    "promotion_rate",
    "retention",
  ]),
  measurementDate: z.string().date(),
  dimensionType: z
    .enum(["gender", "ethnicity", "age_group", "department", "level", "location"])
    .optional(),
  dimensionValue: z.string().max(100).optional(),
  metricValue: z.string().regex(/^-?\d+(\.\d{1,2})?$/),
  sampleSize: z.number().int().positive(),
  targetValue: z
    .string()
    .regex(/^-?\d+(\.\d{1,2})?$/)
    .optional(),
  unit: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
});
