// ============================================================================
// HR DOMAIN: PEOPLE ANALYTICS & INTELLIGENCE (Phase 8)
// Metrics facts, KPI definitions, dashboards, exports, subscriptions, dimensions, subscription recipients.
// Tables: analytics_facts, hr_metrics, analytics_dashboards, data_exports, report_subscriptions,
//         report_subscription_recipients, analytics_dimensions
//
// JSON-heavy columns use native jsonb + GIN where useful; exports and dimensions carry extra lifecycle CHECKs.
// ============================================================================
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
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
  metricTypeEnum,
  metricFrequencyEnum,
  exportFormatEnum,
  exportStatusEnum,
  dashboardTypeEnum,
  dataExportTypeEnum,
  analyticsDimensionTypeEnum,
  analyticsFactGranularityEnum,
  MetricTypeSchema,
  MetricFrequencySchema,
  ExportFormatSchema,
  ExportStatusSchema,
  DashboardTypeSchema,
  DataExportTypeSchema,
  AnalyticsDimensionTypeSchema,
  AnalyticsFactGranularitySchema,
} from "./_enums.js";
import { employees } from "./people.js";
import {
  AnalyticsFactIdSchema,
  HrMetricIdSchema,
  AnalyticsDashboardIdSchema,
  DataExportIdSchema,
  ReportSubscriptionIdSchema,
  ReportSubscriptionRecipientIdSchema,
  AnalyticsDimensionIdSchema,
  EmployeeIdSchema,
  refineDateRange,
  hrTenantIdSchema,
  hrAuditUserIdSchema,
  jsonObjectNullishSchema,
} from "./_zodShared.js";

// ============================================================================
// TABLE: analytics_facts (PARTITIONED BY fact_date)
// Core partitioned fact table for HR metrics snapshots
// NOTE: Partition creation must be done manually in migration SQL
// ============================================================================
export const analyticsFacts = hrSchema.table(
  "analytics_facts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    factDate: date("fact_date", { mode: "string" }).notNull(),
    factGranularity: analyticsFactGranularityEnum("fact_granularity").notNull().default("daily"),
    metricType: metricTypeEnum("metric_type").notNull(),
    dimensionKey: text("dimension_key"), // e.g., "department:123", "position:456"
    metricValue: numeric("metric_value", { precision: 15, scale: 2 }).notNull(),
    metricCount: integer("metric_count"),
    metadata: jsonb("metadata").$type<unknown>(),
    ...timestampColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    index("analytics_facts_tenant_idx").on(table.tenantId),
    index("analytics_facts_date_idx").on(table.factDate),
    index("analytics_facts_tenant_date_metric_idx").on(
      table.tenantId,
      table.factDate,
      table.metricType
    ),
    index("analytics_facts_metric_date_idx").on(table.metricType, table.factDate),
    index("analytics_facts_granularity_idx").on(table.tenantId, table.factGranularity),
    index("analytics_facts_metadata_gin").using("gin", table.metadata),
    check(
      "analytics_facts_metric_count_non_negative",
      sql`${table.metricCount} IS NULL OR ${table.metricCount} >= 0`
    ),
    ...tenantIsolationPolicies("analytics_facts"),
    serviceBypassPolicy("analytics_facts"),
  ]
);

// ============================================================================
// TABLE: hr_metrics
// KPI definitions and calculations
// ============================================================================
export const hrMetrics = hrSchema.table(
  "hr_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    metricCode: text("metric_code").notNull(),
    ...nameColumn,
    description: text("description"),
    metricType: metricTypeEnum("metric_type").notNull(),
    calculationFormula: text("calculation_formula"), // SQL or expression
    frequency: metricFrequencyEnum("frequency").notNull(),
    targetValue: numeric("target_value", { precision: 15, scale: 2 }),
    thresholdLow: numeric("threshold_low", { precision: 15, scale: 2 }),
    thresholdHigh: numeric("threshold_high", { precision: 15, scale: 2 }),
    unit: text("unit"), // %, count, days, etc.
    ownerId: uuid("owner_id"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.ownerId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("hr_metrics_tenant_code_unique")
      .on(table.tenantId, table.metricCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("hr_metrics_tenant_idx").on(table.tenantId),
    index("hr_metrics_type_idx").on(table.tenantId, table.metricType),
    index("hr_metrics_active_idx").on(table.tenantId, table.isActive),
    index("hr_metrics_owner_idx").on(table.tenantId, table.ownerId),
    check(
      "hr_metrics_threshold_low_lte_high",
      sql`${table.thresholdLow} IS NULL OR ${table.thresholdHigh} IS NULL OR ${table.thresholdLow} <= ${table.thresholdHigh}`
    ),
    ...tenantIsolationPolicies("hr_metrics"),
    serviceBypassPolicy("hr_metrics"),
  ]
);

// ============================================================================
// TABLE: analytics_dashboards
// Dashboard configurations
// ============================================================================
export const analyticsDashboards = hrSchema.table(
  "analytics_dashboards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    dashboardCode: text("dashboard_code").notNull(),
    ...nameColumn,
    description: text("description"),
    dashboardType: dashboardTypeEnum("dashboard_type").notNull(),
    layout: jsonb("layout").$type<unknown>(),
    widgets: jsonb("widgets").$type<unknown>().notNull().default(sql`'[]'::jsonb`),
    filters: jsonb("filters").$type<unknown>(),
    isPublic: boolean("is_public").notNull().default(false),
    ownerId: uuid("owner_id"),
    sharedWith: jsonb("shared_with").$type<unknown>(),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.ownerId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("analytics_dashboards_tenant_code_unique")
      .on(table.tenantId, table.dashboardCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("analytics_dashboards_tenant_idx").on(table.tenantId),
    index("analytics_dashboards_type_idx").on(table.tenantId, table.dashboardType),
    index("analytics_dashboards_owner_idx").on(table.tenantId, table.ownerId),
    index("analytics_dashboards_layout_gin").using("gin", table.layout),
    index("analytics_dashboards_widgets_gin").using("gin", table.widgets),
    index("analytics_dashboards_filters_gin").using("gin", table.filters),
    index("analytics_dashboards_shared_with_gin").using("gin", table.sharedWith),
    ...tenantIsolationPolicies("analytics_dashboards"),
    serviceBypassPolicy("analytics_dashboards"),
  ]
);

// ============================================================================
// TABLE: data_exports
// Export job tracking
// ============================================================================
export const dataExports = hrSchema.table(
  "data_exports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    exportCode: text("export_code").notNull(),
    ...nameColumn,
    description: text("description"),
    exportType: dataExportTypeEnum("export_type").notNull(),
    format: exportFormatEnum("format").notNull(),
    status: exportStatusEnum("status").notNull().default("pending"),
    requestedBy: uuid("requested_by").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    filePath: text("file_path"),
    fileSize: integer("file_size"), // bytes
    rowCount: integer("row_count"),
    errorMessage: text("error_message"),
    parameters: jsonb("parameters").$type<unknown>(),
    retryCount: integer("retry_count").notNull().default(0),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    ...timestampColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.requestedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("data_exports_tenant_code_unique").on(table.tenantId, table.exportCode),
    index("data_exports_tenant_idx").on(table.tenantId),
    index("data_exports_status_idx").on(table.tenantId, table.status),
    index("data_exports_requested_by_idx").on(table.tenantId, table.requestedBy),
    index("data_exports_requested_at_idx").on(table.tenantId, table.requestedAt),
    index("data_exports_parameters_gin").using("gin", table.parameters),
    check(
      "data_exports_file_size_positive",
      sql`${table.fileSize} IS NULL OR ${table.fileSize} > 0`
    ),
    check(
      "data_exports_row_count_non_negative",
      sql`${table.rowCount} IS NULL OR ${table.rowCount} >= 0`
    ),
    check(
      "data_exports_retry_count_non_negative",
      sql`${table.retryCount} >= 0`
    ),
    check(
      "data_exports_completed_requires_completed_at",
      sql`${table.status} <> 'completed'::hr.export_status OR ${table.completedAt} IS NOT NULL`
    ),
    ...tenantIsolationPolicies("data_exports"),
    serviceBypassPolicy("data_exports"),
  ]
);

// ============================================================================
// TABLE: report_subscriptions
// Scheduled report delivery
// ============================================================================
export const reportSubscriptions = hrSchema.table(
  "report_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    subscriptionCode: text("subscription_code").notNull(),
    ...nameColumn,
    description: text("description"),
    reportType: text("report_type").notNull(), // headcount, turnover, performance, etc.
    frequency: metricFrequencyEnum("frequency").notNull(),
    format: exportFormatEnum("format").notNull(),
    /** @deprecated Prefer `report_subscription_recipients` for delivery lists. */
    recipients: text("recipients"),
    parameters: jsonb("parameters").$type<unknown>(),
    isActive: boolean("is_active").notNull().default(true),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("report_subscriptions_tenant_code_unique")
      .on(table.tenantId, table.subscriptionCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("report_subscriptions_tenant_idx").on(table.tenantId),
    index("report_subscriptions_active_idx").on(table.tenantId, table.isActive),
    index("report_subscriptions_next_run_idx").on(table.nextRunAt),
    index("report_subscriptions_parameters_gin").using("gin", table.parameters),
    check(
      "report_subscriptions_next_run_on_or_after_last",
      sql`${table.lastRunAt} IS NULL OR ${table.nextRunAt} IS NULL OR ${table.nextRunAt} >= ${table.lastRunAt}`
    ),
    ...tenantIsolationPolicies("report_subscriptions"),
    serviceBypassPolicy("report_subscriptions"),
  ]
);

// ============================================================================
// TABLE: report_subscription_recipients
// Normalized email recipients for scheduled reports
// ============================================================================
export const reportSubscriptionRecipients = hrSchema.table(
  "report_subscription_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    subscriptionId: uuid("subscription_id").notNull(),
    recipientEmail: text("recipient_email").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.subscriptionId],
      foreignColumns: [reportSubscriptions.tenantId, reportSubscriptions.id],
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    uniqueIndex("report_subscription_recipients_tenant_sub_email_unique").on(
      table.tenantId,
      table.subscriptionId,
      table.recipientEmail
    ),
    index("report_subscription_recipients_tenant_idx").on(table.tenantId),
    index("report_subscription_recipients_subscription_idx").on(table.tenantId, table.subscriptionId),
    check(
      "report_subscription_recipients_email_max_len",
      sql`char_length(${table.recipientEmail}) <= 320`
    ),
    check(
      "report_subscription_recipients_sort_non_negative",
      sql`${table.sortOrder} >= 0`
    ),
    ...tenantIsolationPolicies("report_subscription_recipients"),
    serviceBypassPolicy("report_subscription_recipients"),
  ]
);

// ============================================================================
// TABLE: analytics_dimensions
// Slowly changing dimension tables for historical analysis
// ============================================================================
export const analyticsDimensions = hrSchema.table(
  "analytics_dimensions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    dimensionType: analyticsDimensionTypeEnum("dimension_type").notNull(),
    dimensionKey: text("dimension_key").notNull(), // e.g., "employee:uuid"
    dimensionValue: jsonb("dimension_value").$type<unknown>().notNull(),
    validFrom: date("valid_from", { mode: "string" }).notNull(),
    validTo: date("valid_to", { mode: "string" }),
    isCurrent: boolean("is_current").notNull().default(true),
    ...timestampColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("analytics_dimensions_current_unique")
      .on(table.tenantId, table.dimensionType, table.dimensionKey)
      .where(sql`${table.isCurrent} = true`),
    check(
      "analytics_dimensions_date_range",
      sql`${table.validTo} IS NULL OR ${table.validTo} >= ${table.validFrom}`
    ),
    check(
      "analytics_dimensions_current_open_ended",
      sql`NOT (${table.isCurrent} = true) OR ${table.validTo} IS NULL`
    ),
    index("analytics_dimensions_tenant_idx").on(table.tenantId),
    index("analytics_dimensions_type_key_idx").on(
      table.tenantId,
      table.dimensionType,
      table.dimensionKey
    ),
    index("analytics_dimensions_current_idx").on(table.tenantId, table.isCurrent),
    index("analytics_dimensions_valid_from_idx").on(table.validFrom),
    index("analytics_dimensions_dimension_value_gin").using("gin", table.dimensionValue),
    ...tenantIsolationPolicies("analytics_dimensions"),
    serviceBypassPolicy("analytics_dimensions"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertAnalyticsFactSchema = z.object({
  id: AnalyticsFactIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  factDate: z.iso.date(),
  factGranularity: AnalyticsFactGranularitySchema.optional().default("daily"),
  metricType: MetricTypeSchema,
  dimensionKey: z.string().max(200).optional(),
  metricValue: z.string().regex(/^-?\d+(\.\d{1,2})?$/),
  metricCount: z.number().int().nonnegative().optional(),
  metadata: jsonObjectNullishSchema.optional(),
});

export const insertHrMetricSchema = z
  .object({
    id: HrMetricIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    metricCode: z.string().min(3).max(50),
    name: z.string().min(2).max(100),
    description: z.string().max(2000).optional(),
    metricType: MetricTypeSchema,
    calculationFormula: z.string().max(2000).optional(),
    frequency: MetricFrequencySchema,
    targetValue: z
      .string()
      .regex(/^-?\d+(\.\d{1,2})?$/)
      .optional(),
    thresholdLow: z
      .string()
      .regex(/^-?\d+(\.\d{1,2})?$/)
      .optional(),
    thresholdHigh: z
      .string()
      .regex(/^-?\d+(\.\d{1,2})?$/)
      .optional(),
    unit: z.string().max(20).optional(),
    ownerId: EmployeeIdSchema.optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.thresholdLow != null && data.thresholdHigh != null) {
      const lo = parseFloat(data.thresholdLow);
      const hi = parseFloat(data.thresholdHigh);
      if (Number.isFinite(lo) && Number.isFinite(hi) && lo > hi) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "thresholdLow must be <= thresholdHigh",
          path: ["thresholdLow"],
        });
      }
    }
  });

export const insertAnalyticsDashboardSchema = z.object({
  id: AnalyticsDashboardIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  dashboardCode: z.string().min(3).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  dashboardType: DashboardTypeSchema,
  layout: z.json().optional(),
  widgets: z.json(),
  filters: z.json().optional(),
  isPublic: z.boolean().default(false),
  ownerId: EmployeeIdSchema.optional(),
  sharedWith: z.json().optional(),
});

export const insertDataExportSchema = z
  .object({
    id: DataExportIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    exportCode: z.string().min(3).max(50),
    name: z.string().min(2).max(100),
    description: z.string().max(2000).optional(),
    exportType: DataExportTypeSchema,
    format: ExportFormatSchema,
    status: ExportStatusSchema.default("pending"),
    requestedBy: EmployeeIdSchema,
    requestedAt: z.iso.datetime().optional(),
    startedAt: z.iso.datetime().optional(),
    completedAt: z.iso.datetime().optional(),
    filePath: z.string().max(500).optional(),
    fileSize: z.number().int().positive().optional(),
    rowCount: z.number().int().nonnegative().optional(),
    errorMessage: z.string().max(2000).optional(),
    parameters: z.json().optional(),
    retryCount: z.number().int().nonnegative().optional().default(0),
    lastErrorAt: z.iso.datetime().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "completed" && data.completedAt == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "completedAt is required when status is completed",
        path: ["completedAt"],
      });
    }
  });

export const insertReportSubscriptionSchema = z
  .object({
    id: ReportSubscriptionIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    subscriptionCode: z.string().min(3).max(50),
    name: z.string().min(2).max(100),
    description: z.string().max(2000).optional(),
    reportType: z.string().min(3).max(50),
    frequency: MetricFrequencySchema,
    format: ExportFormatSchema,
    recipients: z.string().optional(),
    parameters: z.json().optional(),
    isActive: z.boolean().default(true),
    lastRunAt: z.iso.datetime().optional(),
    nextRunAt: z.iso.datetime().optional(),
    createdBy: hrAuditUserIdSchema,
    updatedBy: hrAuditUserIdSchema,
  })
  .superRefine((data, ctx) => {
    if (data.lastRunAt != null && data.nextRunAt != null) {
      const last = Date.parse(data.lastRunAt);
      const next = Date.parse(data.nextRunAt);
      if (Number.isFinite(last) && Number.isFinite(next) && next < last) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "nextRunAt must be on or after lastRunAt",
          path: ["nextRunAt"],
        });
      }
    }
  });

export const insertReportSubscriptionRecipientSchema = z.object({
  id: ReportSubscriptionRecipientIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  subscriptionId: ReportSubscriptionIdSchema,
  recipientEmail: z.string().email().max(320),
  sortOrder: z.number().int().min(0).default(0),
  createdBy: hrAuditUserIdSchema,
  updatedBy: hrAuditUserIdSchema,
});

export const insertAnalyticsDimensionSchema = z
  .object({
    id: AnalyticsDimensionIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    dimensionType: AnalyticsDimensionTypeSchema,
    dimensionKey: z.string().min(3).max(200),
    dimensionValue: z.json(),
    validFrom: z.iso.date(),
    validTo: z.iso.date().optional(),
    isCurrent: z.boolean().default(true),
  })
  .superRefine(refineDateRange("validFrom", "validTo"))
  .superRefine((data, ctx) => {
    if (data.isCurrent === true && data.validTo != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "validTo must be omitted when isCurrent is true",
        path: ["validTo"],
      });
    }
  });
