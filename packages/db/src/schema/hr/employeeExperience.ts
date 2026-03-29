// ============================================================================
// HR DOMAIN: EMPLOYEE EXPERIENCE & SELF-SERVICE MODULE (Phase 6)
// Implements: employee_self_service_profiles, employee_requests,
// employee_notifications, employee_preferences, employee_surveys, survey_responses
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
  requestTypeEnum,
  requestStatusEnum,
  notificationPriorityEnum,
  notificationStatusEnum,
  surveyTypeEnum,
} from "./_enums.js";
import { employees } from "./people.js";
import {
  EmployeeSelfServiceProfileIdSchema,
  EmployeeRequestIdSchema,
  EmployeeNotificationIdSchema,
  EmployeePreferenceIdSchema,
  EmployeeSurveyIdSchema,
  SurveyResponseIdSchema,
  boundedPercentageSchema,
  businessEmailSchema,
  refineDateRange,
  refineConditionalRequired,
} from "./_zodShared.js";

// ============================================================================
// TABLE: employee_self_service_profiles
// Portal access and login tracking
// ============================================================================
export const employeeSelfServiceProfiles = hrSchema.table(
  "employee_self_service_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    isEnabled: boolean("is_enabled").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    loginCount: integer("login_count").notNull().default(0),
    preferredLanguage: text("preferred_language").default("en"),
    timezone: text("timezone").default("UTC"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("employee_self_service_profiles_employee_unique").on(
      table.tenantId,
      table.employeeId
    ),
    check("login_count_positive", sql`${table.loginCount} >= 0`),
    index("employee_self_service_profiles_tenant_idx").on(table.tenantId),
    index("employee_self_service_profiles_employee_idx").on(table.tenantId, table.employeeId),
    ...tenantIsolationPolicies("employee_self_service_profiles"),
    serviceBypassPolicy("employee_self_service_profiles"),
  ]
);

// ============================================================================
// TABLE: employee_requests
// Generic request workflow (time off, document, pay change, etc.)
// ============================================================================
export const employeeRequests = hrSchema.table(
  "employee_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    requestNumber: text("request_number").notNull(),
    requestType: requestTypeEnum("request_type").notNull(),
    requestDate: date("request_date", { mode: "string" }).notNull(),
    requestStatus: requestStatusEnum("request_status").notNull().default("draft"),
    requestData: text("request_data"), // JSON
    approvedBy: uuid("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedReason: text("rejected_reason"),
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
    foreignKey({
      columns: [table.tenantId, table.approvedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("employee_requests_tenant_number_unique")
      .on(table.tenantId, table.requestNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "employee_requests_approval_consistency",
      sql`(${table.approvedBy} IS NULL AND ${table.approvedAt} IS NULL) OR (${table.approvedBy} IS NOT NULL AND ${table.approvedAt} IS NOT NULL)`
    ),
    index("employee_requests_tenant_idx").on(table.tenantId),
    index("employee_requests_employee_idx").on(table.tenantId, table.employeeId),
    index("employee_requests_status_idx").on(table.tenantId, table.requestStatus),
    index("employee_requests_type_idx").on(table.tenantId, table.requestType),
    ...tenantIsolationPolicies("employee_requests"),
    serviceBypassPolicy("employee_requests"),
  ]
);

// ============================================================================
// TABLE: employee_notifications
// System notifications and alerts
// ============================================================================
export const employeeNotifications = hrSchema.table(
  "employee_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    notificationType: text("notification_type").notNull(), // info, warning, error, success
    priority: notificationPriorityEnum("priority").notNull().default("medium"),
    status: notificationStatusEnum("status").notNull().default("unread"),
    actionUrl: text("action_url"),
    actionLabel: text("action_label"),
    readAt: timestamp("read_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    metadata: text("metadata"), // JSON
    ...timestampColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    check(
      "employee_notifications_type_valid",
      sql`${table.notificationType} IN ('info', 'warning', 'error', 'success')`
    ),
    index("employee_notifications_tenant_idx").on(table.tenantId),
    index("employee_notifications_employee_idx").on(table.tenantId, table.employeeId),
    index("employee_notifications_status_idx").on(table.tenantId, table.status),
    index("employee_notifications_priority_idx").on(table.tenantId, table.priority),
    index("employee_notifications_employee_status_idx").on(table.employeeId, table.status),
    ...tenantIsolationPolicies("employee_notifications"),
    serviceBypassPolicy("employee_notifications"),
  ]
);

// ============================================================================
// TABLE: employee_preferences
// Key-value preferences (UI, communication, privacy, notification)
// ============================================================================
export const employeePreferences = hrSchema.table(
  "employee_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    preferenceKey: text("preference_key").notNull(),
    preferenceValue: text("preference_value").notNull(),
    preferenceType: text("preference_type").notNull(), // ui, communication, privacy, notification
    description: text("description"),
    ...timestampColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("employee_preferences_employee_key_unique").on(
      table.tenantId,
      table.employeeId,
      table.preferenceKey
    ),
    check(
      "employee_preferences_type_valid",
      sql`${table.preferenceType} IN ('ui', 'communication', 'privacy', 'notification')`
    ),
    index("employee_preferences_tenant_idx").on(table.tenantId),
    index("employee_preferences_employee_idx").on(table.tenantId, table.employeeId),
    ...tenantIsolationPolicies("employee_preferences"),
    serviceBypassPolicy("employee_preferences"),
  ]
);

// ============================================================================
// TABLE: employee_surveys
// Survey definitions (engagement, pulse, exit, onboarding, custom)
// ============================================================================
export const employeeSurveys = hrSchema.table(
  "employee_surveys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    surveyCode: text("survey_code").notNull(),
    ...nameColumn,
    description: text("description"),
    surveyType: surveyTypeEnum("survey_type").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    isAnonymous: boolean("is_anonymous").notNull().default(true),
    targetAudience: text("target_audience"), // JSON: department IDs, position IDs, etc.
    questions: text("questions").notNull(), // JSON array of questions
    status: text("status").notNull().default("draft"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("employee_surveys_tenant_code_unique")
      .on(table.tenantId, table.surveyCode)
      .where(sql`${table.deletedAt} IS NULL`),
    check("employee_surveys_date_range", sql`${table.endDate} >= ${table.startDate}`),
    check(
      "employee_surveys_status_valid",
      sql`${table.status} IN ('draft', 'active', 'closed', 'archived')`
    ),
    index("employee_surveys_tenant_idx").on(table.tenantId),
    index("employee_surveys_type_idx").on(table.tenantId, table.surveyType),
    index("employee_surveys_status_idx").on(table.tenantId, table.status),
    ...tenantIsolationPolicies("employee_surveys"),
    serviceBypassPolicy("employee_surveys"),
  ]
);

// ============================================================================
// TABLE: survey_responses
// Anonymous survey responses
// ============================================================================
export const surveyResponses = hrSchema.table(
  "survey_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    surveyId: uuid("survey_id").notNull(),
    employeeId: uuid("employee_id"), // Nullable for anonymous surveys
    responseDate: timestamp("response_date", { withTimezone: true }).notNull().defaultNow(),
    responses: text("responses").notNull(), // JSON array of answers
    completionPercentage: numeric("completion_percentage", { precision: 5, scale: 2 }).notNull(),
    isCompleted: boolean("is_completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ipAddress: text("ip_address"), // For fraud detection
    userAgent: text("user_agent"),
    ...timestampColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.surveyId],
      foreignColumns: [employeeSurveys.tenantId, employeeSurveys.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    check(
      "survey_responses_completion_valid",
      sql`${table.completionPercentage} >= 0 AND ${table.completionPercentage} <= 100`
    ),
    check(
      "survey_responses_completed_consistency",
      sql`${table.isCompleted} = false OR (${table.isCompleted} = true AND ${table.completedAt} IS NOT NULL)`
    ),
    index("survey_responses_tenant_idx").on(table.tenantId),
    index("survey_responses_survey_idx").on(table.tenantId, table.surveyId),
    index("survey_responses_employee_idx").on(table.tenantId, table.employeeId),
    index("survey_responses_completed_idx").on(table.tenantId, table.isCompleted),
    ...tenantIsolationPolicies("survey_responses"),
    serviceBypassPolicy("survey_responses"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertEmployeeSelfServiceProfileSchema = z.object({
  id: EmployeeSelfServiceProfileIdSchema.optional(),
  tenantId: z.number().int().positive(),
  employeeId: z.string().uuid(),
  isEnabled: z.boolean().default(true),
  lastLoginAt: z.string().datetime().optional(),
  loginCount: z.number().int().nonnegative().default(0),
  preferredLanguage: z.string().length(2).default("en"),
  timezone: z.string().max(50).default("UTC"),
});

export const insertEmployeeRequestSchema = z
  .object({
    id: EmployeeRequestIdSchema.optional(),
    tenantId: z.number().int().positive(),
    employeeId: z.string().uuid(),
    requestNumber: z.string().min(5).max(50),
    requestType: z.enum(["time_off", "document", "pay_change", "profile_update", "other"]),
    requestDate: z.string().date(),
    requestStatus: z
      .enum(["draft", "submitted", "approved", "rejected", "cancelled"])
      .default("draft"),
    requestData: z.string().optional(), // JSON string
    approvedBy: z.string().uuid().optional(),
    approvedAt: z.string().datetime().optional(),
    rejectedReason: z.string().max(500).optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.approvedBy && !data.approvedAt) return false;
      if (!data.approvedBy && data.approvedAt) return false;
      return true;
    },
    {
      message: "Both approvedBy and approvedAt must be provided together",
      path: ["approvedAt"],
    }
  );

export const insertEmployeeNotificationSchema = z
  .object({
    id: EmployeeNotificationIdSchema.optional(),
    tenantId: z.number().int().positive(),
    employeeId: z.string().uuid(),
    title: z.string().min(1).max(200),
    message: z.string().min(1).max(2000),
    notificationType: z.enum(["info", "warning", "error", "success"]),
    priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
    status: z.enum(["unread", "read", "archived"]).default("unread"),
    actionUrl: z.string().url().optional(),
    actionLabel: z.string().max(50).optional(),
    readAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
    metadata: z.string().optional(), // JSON string
  })
  .refine(
    (data) => {
      if (data.actionUrl && !data.actionLabel) return false;
      return true;
    },
    {
      message: "actionLabel is required when actionUrl is provided",
      path: ["actionLabel"],
    }
  );

export const insertEmployeePreferenceSchema = z.object({
  id: EmployeePreferenceIdSchema.optional(),
  tenantId: z.number().int().positive(),
  employeeId: z.string().uuid(),
  preferenceKey: z.string().min(1).max(100),
  preferenceValue: z.string().min(1).max(500),
  preferenceType: z.enum(["ui", "communication", "privacy", "notification"]),
  description: z.string().max(500).optional(),
});

export const insertEmployeeSurveySchema = z
  .object({
    id: EmployeeSurveyIdSchema.optional(),
    tenantId: z.number().int().positive(),
    surveyCode: z.string().min(3).max(50),
    name: z.string().min(2).max(100),
    description: z.string().max(2000).optional(),
    surveyType: z.enum(["engagement", "pulse", "exit", "onboarding", "custom"]),
    startDate: z.string().date(),
    endDate: z.string().date(),
    isAnonymous: z.boolean().default(true),
    targetAudience: z.string().optional(), // JSON string
    questions: z.string().min(1), // JSON string
    status: z.enum(["draft", "active", "closed", "archived"]).default("draft"),
  })
  .superRefine(refineDateRange("startDate", "endDate"));

export const insertSurveyResponseSchema = z
  .object({
    id: SurveyResponseIdSchema.optional(),
    tenantId: z.number().int().positive(),
    surveyId: z.string().uuid(),
    employeeId: z.string().uuid().optional(), // Nullable for anonymous
    responseDate: z.string().datetime().optional(),
    responses: z.string().min(1), // JSON string
    completionPercentage: boundedPercentageSchema,
    isCompleted: z.boolean().default(false),
    completedAt: z.string().datetime().optional(),
    ipAddress: z
      .string()
      .regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[a-fA-F0-9:]+:+)+[a-fA-F0-9]+$/)
      .optional(),
    userAgent: z.string().max(500).optional(),
  })
  .superRefine(refineConditionalRequired("completedAt", (data) => data.isCompleted === true));
