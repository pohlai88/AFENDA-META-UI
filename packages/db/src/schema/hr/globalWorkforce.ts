// ============================================================================
// HR DOMAIN: GLOBAL MOBILITY (Phase 9)
// Handles international assignments, permits, compliance tracking, relocation, and DEI metrics.
// Tables: international_assignments, assignment_allowances, work_permits, compliance_tracking, relocation_services, dei_metrics
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
  jsonb,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls-policies/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../column-kit/index.js";
import { users } from "../security/index.js";
import { tenants } from "../core/tenants.js";
import { hrSchema } from "./_schema.js";
import {
  assignmentTypeEnum,
  assignmentStatusEnum,
  assignmentReasonEnum,
  permitTypeEnum,
  permitStatusEnum,
  complianceTypeEnum,
  complianceStatusEnum,
  complianceFindingSeverityEnum,
  countryEnum,
  assignmentAllowanceTypeEnum,
  allowancePaymentFrequencyEnum,
  relocationServiceTypeEnum,
  relocationServiceStatusEnum,
  deiMetricTypeEnum,
  deiDimensionTypeEnum,
  AssignmentTypeSchema,
  AssignmentStatusSchema,
  AssignmentReasonSchema,
  PermitTypeSchema,
  PermitStatusSchema,
  ComplianceTypeSchema,
  ComplianceStatusSchema,
  ComplianceFindingSeveritySchema,
  AssignmentAllowanceTypeSchema,
  AllowancePaymentFrequencySchema,
  RelocationServiceTypeSchema,
  RelocationServiceStatusSchema,
  DeiMetricTypeSchema,
  DeiDimensionTypeSchema,
} from "./_enums.js";
import { employees } from "./people.js";
import {
  InternationalAssignmentIdSchema,
  AssignmentAllowanceIdSchema,
  WorkPermitIdSchema,
  ComplianceTrackingIdSchema,
  RelocationServiceIdSchema,
  DeiMetricIdSchema,
  EmployeeIdSchema,
  currencyAmountSchema,
  refineDateRange,
  hrTenantIdSchema,
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
    assignmentReason: assignmentReasonEnum("assignment_reason").notNull().default("business"),
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
    ...auditColumns(() => users.userId),
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
    check(
      "international_assignments_completed_has_actual_end",
      sql`${table.status}::text != 'completed' OR ${table.actualEndDate} IS NOT NULL`
    ),
    index("international_assignments_tenant_idx").on(table.tenantId),
    index("international_assignments_employee_idx").on(table.tenantId, table.employeeId),
    index("international_assignments_status_idx").on(table.tenantId, table.status),
    index("international_assignments_host_country_idx").on(table.tenantId, table.hostCountry),
    index("international_assignments_assignment_reason_idx").on(table.tenantId, table.assignmentReason),
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
    allowanceType: assignmentAllowanceTypeEnum("allowance_type").notNull(),
    ...nameColumn,
    description: text("description"),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    frequency: allowancePaymentFrequencyEnum("frequency").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    /** Optional RRULE / internal recurrence key for recurring allowances. */
    recurrenceRule: text("recurrence_rule"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.assignmentId],
      foreignColumns: [internationalAssignments.tenantId, internationalAssignments.id],
    }),
    check("assignment_allowances_amount_positive", sql`${table.amount} > 0`),
    check(
      "assignment_allowances_date_range",
      sql`${table.endDate} IS NULL OR ${table.endDate} >= ${table.startDate}`
    ),
    check(
      "assignment_allowances_recurrence_rule_max_len",
      sql`${table.recurrenceRule} IS NULL OR char_length(${table.recurrenceRule}) <= 500`
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
    /** Display name when holder differs from sponsored employee. */
    permitHolderName: text("permit_holder_name"),
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
    ...auditColumns(() => users.userId),
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
      "work_permits_renewal_on_or_after_expiry",
      sql`${table.renewalDate} IS NULL OR ${table.expiryDate} IS NULL OR ${table.renewalDate} >= ${table.expiryDate}`
    ),
    check(
      "work_permits_permit_holder_name_max_len",
      sql`${table.permitHolderName} IS NULL OR char_length(${table.permitHolderName}) <= 200`
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
    findingSeverity: complianceFindingSeverityEnum("finding_severity"),
    country: countryEnum("country"),
    reviewDate: date("review_date", { mode: "string" }).notNull(),
    nextReviewDate: date("next_review_date", { mode: "string" }),
    findings: jsonb("findings").$type<Record<string, unknown>>(),
    actionItems: jsonb("action_items").$type<Record<string, unknown>>(),
    remediationPlan: text("remediation_plan"),
    remediationDeadline: date("remediation_deadline", { mode: "string" }),
    reviewedBy: uuid("reviewed_by"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
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
    index("compliance_tracking_finding_severity_idx").on(table.tenantId, table.findingSeverity),
    index("compliance_tracking_findings_gin").using("gin", table.findings),
    index("compliance_tracking_action_items_gin").using("gin", table.actionItems),
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
    serviceType: relocationServiceTypeEnum("service_type").notNull(),
    ...nameColumn,
    description: text("description"),
    provider: text("provider"),
    serviceProviderContact: text("service_provider_contact"),
    scheduledDate: date("scheduled_date", { mode: "string" }),
    completedDate: date("completed_date", { mode: "string" }),
    estimatedCost: numeric("estimated_cost", { precision: 15, scale: 2 }),
    actualCost: numeric("actual_cost", { precision: 15, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    status: relocationServiceStatusEnum("status").notNull().default("planned"),
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.assignmentId],
      foreignColumns: [internationalAssignments.tenantId, internationalAssignments.id],
    }),
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
    check(
      "relocation_services_actual_gte_estimated_when_both_set",
      sql`${table.actualCost} IS NULL OR ${table.estimatedCost} IS NULL OR ${table.actualCost} >= ${table.estimatedCost}`
    ),
    check(
      "relocation_services_service_provider_contact_max_len",
      sql`${table.serviceProviderContact} IS NULL OR char_length(${table.serviceProviderContact}) <= 500`
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
    metricType: deiMetricTypeEnum("metric_type").notNull(),
    measurementDate: date("measurement_date", { mode: "string" }).notNull(),
    dimensionType: deiDimensionTypeEnum("dimension_type"),
    dimensionValue: text("dimension_value"), // Anonymized aggregation
    metricValue: numeric("metric_value", { precision: 15, scale: 2 }).notNull(),
    sampleSize: integer("sample_size").notNull(),
    targetValue: numeric("target_value", { precision: 15, scale: 2 }),
    benchmarkValue: numeric("benchmark_value", { precision: 15, scale: 2 }),
    unit: text("unit"), // %, count, ratio
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("dei_metrics_tenant_code_date_unique")
      .on(table.tenantId, table.metricCode, table.measurementDate)
      .where(sql`${table.deletedAt} IS NULL`),
    check("dei_metrics_sample_size_positive", sql`${table.sampleSize} > 0`),
    check(
      "dei_metrics_percent_unit_value_range",
      sql`${table.unit} IS NULL OR ${table.unit} <> '%' OR (${table.metricValue} >= 0 AND ${table.metricValue} <= 100)`
    ),
    check(
      "dei_metrics_benchmark_non_negative",
      sql`${table.benchmarkValue} IS NULL OR ${table.benchmarkValue} >= 0`
    ),
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
    tenantId: hrTenantIdSchema,
    assignmentCode: z.string().min(3).max(50),
    employeeId: EmployeeIdSchema,
    assignmentType: AssignmentTypeSchema,
    assignmentReason: AssignmentReasonSchema.default("business"),
    status: AssignmentStatusSchema.default("planned"),
    homeCountry: z.string().length(2),
    hostCountry: z.string().length(2),
    startDate: z.iso.date(),
    endDate: z.iso.date().optional(),
    actualEndDate: z.iso.date().optional(),
    estimatedCost: currencyAmountSchema(2).optional(),
    actualCost: currencyAmountSchema(2).optional(),
    currency: z.string().length(3).default("USD"),
    businessJustification: z.string().max(2000).optional(),
    notes: z.string().max(1000).optional(),
  })
  .superRefine(refineDateRange("startDate", "endDate"))
  .superRefine(refineDateRange("startDate", "actualEndDate"))
  .superRefine((data, ctx) => {
    if (data.status === "completed" && !data.actualEndDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Completed assignments must have an actual end date",
        path: ["actualEndDate"],
      });
    }
  });

export const insertAssignmentAllowanceSchema = z
  .object({
    id: AssignmentAllowanceIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    assignmentId: InternationalAssignmentIdSchema,
    allowanceType: AssignmentAllowanceTypeSchema,
    name: z.string().min(2).max(100),
    description: z.string().max(2000).optional(),
    amount: currencyAmountSchema(2),
    currency: z.string().length(3).default("USD"),
    frequency: AllowancePaymentFrequencySchema,
    startDate: z.iso.date(),
    endDate: z.iso.date().optional(),
    recurrenceRule: z.string().max(500).optional(),
  })
  .superRefine(refineDateRange("startDate", "endDate"));

export const insertWorkPermitSchema = z
  .object({
    id: WorkPermitIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    permitNumber: z.string().min(3).max(100),
    employeeId: EmployeeIdSchema,
    permitType: PermitTypeSchema,
    status: PermitStatusSchema.default("applied"),
    permitHolderName: z.string().max(200).optional(),
    country: z.string().length(2),
    applicationDate: z.iso.date(),
    approvalDate: z.iso.date().optional(),
    issueDate: z.iso.date().optional(),
    expiryDate: z.iso.date().optional(),
    renewalDate: z.iso.date().optional(),
    sponsorName: z.string().max(200).optional(),
    applicationCost: currencyAmountSchema(2).optional(),
    currency: z.string().length(3).default("USD"),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.renewalDate &&
      data.expiryDate &&
      data.renewalDate < data.expiryDate
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Renewal date must be on or after expiry date",
        path: ["renewalDate"],
      });
    }
  });

export const insertComplianceTrackingSchema = z.object({
  id: ComplianceTrackingIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  complianceCode: z.string().min(3).max(50),
  complianceType: ComplianceTypeSchema,
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  status: ComplianceStatusSchema.default("under_review"),
  findingSeverity: ComplianceFindingSeveritySchema.optional(),
  country: z.string().length(2).optional(),
  reviewDate: z.iso.date(),
  nextReviewDate: z.iso.date().optional(),
  findings: z.record(z.string(), z.unknown()).optional(),
  actionItems: z.record(z.string(), z.unknown()).optional(),
  remediationPlan: z.string().max(2000).optional(),
  remediationDeadline: z.iso.date().optional(),
  reviewedBy: EmployeeIdSchema.optional(),
});

export const insertRelocationServiceSchema = z
  .object({
    id: RelocationServiceIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    assignmentId: InternationalAssignmentIdSchema,
    serviceType: RelocationServiceTypeSchema,
    name: z.string().min(2).max(100),
    description: z.string().max(2000).optional(),
    provider: z.string().max(200).optional(),
    serviceProviderContact: z.string().max(500).optional(),
    scheduledDate: z.iso.date().optional(),
    completedDate: z.iso.date().optional(),
    estimatedCost: currencyAmountSchema(2).optional(),
    actualCost: currencyAmountSchema(2).optional(),
    currency: z.string().length(3).default("USD"),
    status: RelocationServiceStatusSchema.default("planned"),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.actualCost != null && data.estimatedCost != null) {
      if (parseFloat(data.actualCost) < parseFloat(data.estimatedCost)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Actual cost cannot be less than estimated cost when both are set",
          path: ["actualCost"],
        });
      }
    }
  });

export const insertDeiMetricSchema = z
  .object({
    id: DeiMetricIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    metricCode: z.string().min(3).max(50),
    name: z.string().min(2).max(100),
    description: z.string().max(2000).optional(),
    metricType: DeiMetricTypeSchema,
    measurementDate: z.iso.date(),
    dimensionType: DeiDimensionTypeSchema.optional(),
    dimensionValue: z.string().max(100).optional(),
    metricValue: z.string().regex(/^-?\d+(\.\d{1,2})?$/),
    sampleSize: z.number().int().positive(),
    targetValue: z
      .string()
      .regex(/^-?\d+(\.\d{1,2})?$/)
      .optional(),
    benchmarkValue: z
      .string()
      .regex(/^-?\d+(\.\d{1,2})?$/)
      .optional(),
    unit: z.string().max(20).optional(),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.unit === "%") {
      const v = parseFloat(data.metricValue);
      if (v < 0 || v > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Percentage metrics must be between 0 and 100",
          path: ["metricValue"],
        });
      }
    }
    if (data.benchmarkValue != null && parseFloat(data.benchmarkValue) < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Benchmark value must be non-negative",
        path: ["benchmarkValue"],
      });
    }
  });
