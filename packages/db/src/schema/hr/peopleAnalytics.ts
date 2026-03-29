// ============================================================================
// HR DOMAIN: PEOPLE ANALYTICS & INTELLIGENCE (Phase 8)
// Defines metrics facts, dashboards, exports, subscriptions, and dimensional analytics.
// Tables: analytics_facts, hr_metrics, analytics_dashboards, data_exports, report_subscriptions, analytics_dimensions
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
  metricTypeEnum,
  metricFrequencyEnum,
  exportFormatEnum,
  exportStatusEnum,
  dashboardTypeEnum,
} from "./_enums.js";
import { employees } from "./people.js";
import {
  AnalyticsFactIdSchema,
  HrMetricIdSchema,
  AnalyticsDashboardIdSchema,
  DataExportIdSchema,
  ReportSubscriptionIdSchema,
  AnalyticsDimensionIdSchema,
  EmployeeIdSchema,
  refineDateRange,
  hrTenantIdSchema,
  hrAuditUserIdSchema,
} from "./_zodShared.js";

// ============================================================================
// TABLE: analytics_facts (PARTITIONED BY fact_date)
// Core partitioned fact table for daily HR metrics snapshots
// NOTE: Partition creation must be done manually in migration SQL
// ============================================================================
export const analyticsFacts = hrSchema.table(
  "analytics_facts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    factDate: date("fact_date", { mode: "string" }).notNull(),
    metricType: metricTypeEnum("metric_type").notNull(),
    dimensionKey: text("dimension_key"), // e.g., "department:123", "position:456"
    metricValue: numeric("metric_value", { precision: 15, scale: 2 }).notNull(),
    metricCount: integer("metric_count"),
    metadata: text("metadata"), // JSON
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
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("hr_metrics_tenant_code_unique")
      .on(table.tenantId, table.metricCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("hr_metrics_tenant_idx").on(table.tenantId),
    index("hr_metrics_type_idx").on(table.tenantId, table.metricType),
    index("hr_metrics_active_idx").on(table.tenantId, table.isActive),
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
    layout: text("layout"), // JSON: widget positions, sizes
    widgets: text("widgets").notNull(), // JSON: widget configurations
    filters: text("filters"), // JSON: default filters
    isPublic: boolean("is_public").notNull().default(false),
    ownerId: uuid("owner_id"),
    sharedWith: text("shared_with"), // JSON: employee IDs or role IDs
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
    index("analytics_dashboards_layout_gin")
      .using("gin", sql`(${table.layout}::jsonb)`)
      .where(sql`${table.layout} IS NOT NULL AND ${table.layout} <> ''`),
    index("analytics_dashboards_widgets_gin").using("gin", sql`(${table.widgets}::jsonb)`),
    index("analytics_dashboards_filters_gin")
      .using("gin", sql`(${table.filters}::jsonb)`)
      .where(sql`${table.filters} IS NOT NULL AND ${table.filters} <> ''`),
    index("analytics_dashboards_shared_with_gin")
      .using("gin", sql`(${table.sharedWith}::jsonb)`)
      .where(sql`${table.sharedWith} IS NOT NULL AND ${table.sharedWith} <> ''`),
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
    exportType: text("export_type").notNull(), // report, data_dump, scheduled
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
    parameters: text("parameters"), // JSON: filters, date ranges, etc.
    ...timestampColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.requestedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("data_exports_tenant_code_unique").on(table.tenantId, table.exportCode),
    check(
      "data_exports_type_valid",
      sql`${table.exportType} IN ('report', 'data_dump', 'scheduled')`
    ),
    index("data_exports_tenant_idx").on(table.tenantId),
    index("data_exports_status_idx").on(table.tenantId, table.status),
    index("data_exports_requested_by_idx").on(table.tenantId, table.requestedBy),
    index("data_exports_requested_at_idx").on(table.tenantId, table.requestedAt),
    index("data_exports_parameters_gin")
      .using("gin", sql`(${table.parameters}::jsonb)`)
      .where(sql`${table.parameters} IS NOT NULL AND ${table.parameters} <> ''`),
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
    recipients: text("recipients").notNull(), // JSON: email addresses
    parameters: text("parameters"), // JSON: filters, date ranges
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
    ...tenantIsolationPolicies("report_subscriptions"),
    serviceBypassPolicy("report_subscriptions"),
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
    dimensionType: text("dimension_type").notNull(), // employee, department, position, etc.
    dimensionKey: text("dimension_key").notNull(), // e.g., "employee:uuid"
    dimensionValue: text("dimension_value").notNull(), // JSON: snapshot of attributes
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
      "analytics_dimensions_type_valid",
      sql`${table.dimensionType} IN ('employee', 'department', 'position', 'location', 'custom')`
    ),
    check(
      "analytics_dimensions_date_range",
      sql`${table.validTo} IS NULL OR ${table.validTo} >= ${table.validFrom}`
    ),
    index("analytics_dimensions_tenant_idx").on(table.tenantId),
    index("analytics_dimensions_type_key_idx").on(
      table.tenantId,
      table.dimensionType,
      table.dimensionKey
    ),
    index("analytics_dimensions_current_idx").on(table.tenantId, table.isCurrent),
    index("analytics_dimensions_valid_from_idx").on(table.validFrom),
    index("analytics_dimensions_dimension_value_gin").using(
      "gin",
      sql`(${table.dimensionValue}::jsonb)`
    ),
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
  factDate: z.string().date(),
  metricType: z.enum(["headcount", "turnover", "engagement", "productivity", "cost", "custom"]),
  dimensionKey: z.string().max(200).optional(),
  metricValue: z.string().regex(/^-?\d+(\.\d{1,2})?$/),
  metricCount: z.number().int().optional(),
  metadata: z.string().optional(), // JSON string
});

export const insertHrMetricSchema = z.object({
  id: HrMetricIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  metricCode: z.string().min(3).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  metricType: z.enum(["headcount", "turnover", "engagement", "productivity", "cost", "custom"]),
  calculationFormula: z.string().max(2000).optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "annual"]),
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
  isActive: z.boolean().default(true),
});

export const insertAnalyticsDashboardSchema = z.object({
  id: AnalyticsDashboardIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  dashboardCode: z.string().min(3).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  dashboardType: z.enum(["executive", "manager", "hr_admin", "custom"]),
  layout: z.string().optional(), // JSON string
  widgets: z.string().min(1), // JSON string
  filters: z.string().optional(), // JSON string
  isPublic: z.boolean().default(false),
  ownerId: EmployeeIdSchema.optional(),
  sharedWith: z.string().optional(), // JSON string
});

export const insertDataExportSchema = z.object({
  id: DataExportIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  exportCode: z.string().min(3).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  exportType: z.enum(["report", "data_dump", "scheduled"]),
  format: z.enum(["csv", "xlsx", "json", "pdf"]),
  status: z.enum(["pending", "processing", "completed", "failed"]).default("pending"),
  requestedBy: EmployeeIdSchema,
  requestedAt: z.string().datetime().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  filePath: z.string().max(500).optional(),
  fileSize: z.number().int().nonnegative().optional(),
  rowCount: z.number().int().nonnegative().optional(),
  errorMessage: z.string().max(2000).optional(),
  parameters: z.string().optional(), // JSON string
});

export const insertReportSubscriptionSchema = z.object({
  id: ReportSubscriptionIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  subscriptionCode: z.string().min(3).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  reportType: z.string().min(3).max(50),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "annual"]),
  format: z.enum(["csv", "xlsx", "json", "pdf"]),
  recipients: z.string().min(1), // JSON string
  parameters: z.string().optional(), // JSON string
  isActive: z.boolean().default(true),
  lastRunAt: z.string().datetime().optional(),
  nextRunAt: z.string().datetime().optional(),
  createdBy: hrAuditUserIdSchema,
});

export const insertAnalyticsDimensionSchema = z
  .object({
    id: AnalyticsDimensionIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    dimensionType: z.enum(["employee", "department", "position", "location", "custom"]),
    dimensionKey: z.string().min(3).max(200),
    dimensionValue: z.string().min(1), // JSON string
    validFrom: z.string().date(),
    validTo: z.string().date().optional(),
    isCurrent: z.boolean().default(true),
  })
  .superRefine(refineDateRange("validFrom", "validTo"));
