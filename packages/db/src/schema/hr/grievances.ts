// ============================================================================
// HR DOMAIN: GRIEVANCE MANAGEMENT (SWOT Proposal - P0)
// Defines grievance category taxonomy and employee grievance lifecycle records.
// Tables: grievance_categories, employee_grievances
// Hierarchy: parent_category_id != id prevents self-reference; longer cycles need app/trigger checks.
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
  grievanceCategoryTypeEnum,
  grievanceStatusEnum,
  grievancePriorityEnum,
  grievanceChannelEnum,
  grievanceAppealStatusEnum,
  GrievanceCategoryTypeSchema,
  GrievanceStatusSchema,
  GrievancePrioritySchema,
  GrievanceChannelSchema,
  GrievanceAppealStatusSchema,
} from "./_enums.js";
import { employees, departments } from "./people.js";
import {
  GrievanceCategoryIdSchema,
  GrievanceIdSchema,
  EmployeeIdSchema,
  DepartmentIdSchema,
  hrTenantIdSchema,
} from "./_zodShared.js";

// ============================================================================
// TABLE: grievance_categories
// Configurable grievance classification taxonomy
// ============================================================================
export const grievanceCategories = hrSchema.table(
  "grievance_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    categoryCode: text("category_code").notNull(),
    ...nameColumn,
    description: text("description"),
    categoryType: grievanceCategoryTypeEnum("category_type").notNull(),
    parentCategoryId: uuid("parent_category_id"),
    requiresInvestigation: boolean("requires_investigation").notNull().default(false),
    defaultPriority: grievancePriorityEnum("default_priority").notNull().default("medium"),
    escalationDays: integer("escalation_days").notNull().default(7),
    /** Target calendar days to resolve from filing (optional SLA). */
    slaDays: integer("sla_days"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.parentCategoryId],
      foreignColumns: [table.tenantId, table.id],
    }),
    uniqueIndex("grievance_categories_tenant_code_unique")
      .on(table.tenantId, table.categoryCode)
      .where(sql`${table.deletedAt} IS NULL`),
    check("grievance_categories_escalation_days_positive", sql`${table.escalationDays} > 0`),
    check(
      "grievance_categories_sla_days_positive",
      sql`${table.slaDays} IS NULL OR ${table.slaDays} > 0`
    ),
    check(
      "grievance_categories_no_self_parent",
      sql`${table.parentCategoryId} IS NULL OR ${table.parentCategoryId} != ${table.id}`
    ),
    check(
      "grievance_categories_description_max_len",
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 2000`
    ),
    index("grievance_categories_tenant_idx").on(table.tenantId),
    index("grievance_categories_type_idx").on(table.tenantId, table.categoryType),
    index("grievance_categories_active_idx").on(table.tenantId, table.isActive),
    ...tenantIsolationPolicies("grievance_categories"),
    serviceBypassPolicy("grievance_categories"),
  ]
);

// ============================================================================
// TABLE: employee_grievances
// Core grievance records with full lifecycle tracking
// ============================================================================
export const employeeGrievances = hrSchema.table(
  "employee_grievances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    grievanceNumber: text("grievance_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    categoryId: uuid("category_id").notNull(),
    departmentId: uuid("department_id"),
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    status: grievanceStatusEnum("status").notNull().default("submitted"),
    priority: grievancePriorityEnum("priority").notNull().default("medium"),
    grievanceChannel: grievanceChannelEnum("grievance_channel").notNull().default("portal"),
    filedDate: date("filed_date", { mode: "string" }).notNull(),
    acknowledgedDate: date("acknowledged_date", { mode: "string" }),
    investigationStartDate: date("investigation_start_date", { mode: "string" }),
    targetResolutionDate: date("target_resolution_date", { mode: "string" }),
    actualResolutionDate: date("actual_resolution_date", { mode: "string" }),
    assignedToId: uuid("assigned_to_id"),
    againstEmployeeId: uuid("against_employee_id"),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    isEscalated: boolean("is_escalated").notNull().default(false),
    escalatedDate: date("escalated_date", { mode: "string" }),
    escalatedToId: uuid("escalated_to_id"),
    escalationReason: text("escalation_reason"),
    investigationFindings: text("investigation_findings"),
    resolution: text("resolution"),
    resolutionSatisfaction: integer("resolution_satisfaction"),
    appealNotes: text("appeal_notes"),
    appealDate: date("appeal_date", { mode: "string" }),
    appealStatus: grievanceAppealStatusEnum("appeal_status"),
    /** Structured confidential notes (e.g. visibility, redaction metadata). */
    confidentialNotes: jsonb("confidential_notes").$type<Record<string, unknown>>(),
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
    foreignKey({
      columns: [table.tenantId, table.categoryId],
      foreignColumns: [grievanceCategories.tenantId, grievanceCategories.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.departmentId],
      foreignColumns: [departments.tenantId, departments.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.assignedToId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.againstEmployeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.escalatedToId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("employee_grievances_tenant_number_unique")
      .on(table.tenantId, table.grievanceNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "employee_grievances_acknowledged_after_filed",
      sql`${table.acknowledgedDate} IS NULL OR ${table.acknowledgedDate} >= ${table.filedDate}`
    ),
    check(
      "employee_grievances_investigation_after_acknowledged",
      sql`${table.investigationStartDate} IS NULL OR ${table.acknowledgedDate} IS NULL OR ${table.investigationStartDate} >= ${table.acknowledgedDate}`
    ),
    check(
      "employee_grievances_resolution_after_filed",
      sql`${table.actualResolutionDate} IS NULL OR ${table.actualResolutionDate} >= ${table.filedDate}`
    ),
    check(
      "employee_grievances_satisfaction_range",
      sql`${table.resolutionSatisfaction} IS NULL OR (${table.resolutionSatisfaction} >= 1 AND ${table.resolutionSatisfaction} <= 5)`
    ),
    check(
      "employee_grievances_escalated_after_filed",
      sql`${table.escalatedDate} IS NULL OR ${table.escalatedDate} >= ${table.filedDate}`
    ),
    check(
      "employee_grievances_appeal_after_resolution",
      sql`${table.appealDate} IS NULL OR ${table.actualResolutionDate} IS NULL OR ${table.appealDate} >= ${table.actualResolutionDate}`
    ),
    check(
      "employee_grievances_resolved_has_actual_resolution_date",
      sql`${table.status}::text != 'resolved' OR ${table.actualResolutionDate} IS NOT NULL`
    ),
    check(
      "employee_grievances_escalated_has_target",
      sql`${table.isEscalated} IS NOT TRUE OR ${table.escalatedToId} IS NOT NULL`
    ),
    check(
      "employee_grievances_appealed_has_appeal_date",
      sql`${table.status}::text != 'appealed' OR ${table.appealDate} IS NOT NULL`
    ),
    check(
      "employee_grievances_appealed_has_appeal_status",
      sql`${table.status}::text != 'appealed' OR ${table.appealStatus} IS NOT NULL`
    ),
    check(
      "employee_grievances_grievance_number_max_len",
      sql`char_length(${table.grievanceNumber}) <= 50`
    ),
    check(
      "employee_grievances_subject_max_len",
      sql`char_length(${table.subject}) <= 200`
    ),
    check(
      "employee_grievances_description_max_len",
      sql`char_length(${table.description}) <= 5000`
    ),
    check(
      "employee_grievances_investigation_findings_max_len",
      sql`${table.investigationFindings} IS NULL OR char_length(${table.investigationFindings}) <= 5000`
    ),
    check(
      "employee_grievances_resolution_max_len",
      sql`${table.resolution} IS NULL OR char_length(${table.resolution}) <= 5000`
    ),
    check(
      "employee_grievances_appeal_notes_max_len",
      sql`${table.appealNotes} IS NULL OR char_length(${table.appealNotes}) <= 5000`
    ),
    check(
      "employee_grievances_escalation_reason_max_len",
      sql`${table.escalationReason} IS NULL OR char_length(${table.escalationReason}) <= 2000`
    ),
    index("employee_grievances_tenant_idx").on(table.tenantId),
    index("employee_grievances_employee_idx").on(table.tenantId, table.employeeId),
    index("employee_grievances_status_idx").on(table.tenantId, table.status),
    index("employee_grievances_priority_idx").on(table.tenantId, table.priority),
    index("employee_grievances_category_idx").on(table.tenantId, table.categoryId),
    index("employee_grievances_assigned_idx").on(table.tenantId, table.assignedToId),
    index("employee_grievances_filed_date_idx").on(table.tenantId, table.filedDate),
    index("employee_grievances_grievance_channel_idx").on(table.tenantId, table.grievanceChannel),
    index("employee_grievances_appeal_status_idx").on(table.tenantId, table.appealStatus),
    index("employee_grievances_confidential_notes_gin").using("gin", table.confidentialNotes),
    ...tenantIsolationPolicies("employee_grievances"),
    serviceBypassPolicy("employee_grievances"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertGrievanceCategorySchema = z
  .object({
    id: GrievanceCategoryIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    categoryCode: z.string().min(2).max(50),
    name: z.string().min(2).max(100),
    description: z.string().max(2000).optional(),
    categoryType: GrievanceCategoryTypeSchema,
    parentCategoryId: GrievanceCategoryIdSchema.optional(),
    requiresInvestigation: z.boolean().default(false),
    defaultPriority: GrievancePrioritySchema.default("medium"),
    escalationDays: z.number().int().positive().default(7),
    slaDays: z.number().int().positive().optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.id && data.parentCategoryId && data.parentCategoryId === data.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Category cannot be its own parent",
        path: ["parentCategoryId"],
      });
    }
  });

export const insertEmployeeGrievanceSchema = z
  .object({
    id: GrievanceIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    grievanceNumber: z.string().min(3).max(50),
    employeeId: EmployeeIdSchema,
    categoryId: GrievanceCategoryIdSchema,
    departmentId: DepartmentIdSchema.optional(),
    subject: z.string().min(5).max(200),
    description: z.string().min(10).max(5000),
    status: GrievanceStatusSchema.default("submitted"),
    priority: GrievancePrioritySchema.default("medium"),
    grievanceChannel: GrievanceChannelSchema.default("portal"),
    filedDate: z.iso.date(),
    acknowledgedDate: z.iso.date().optional(),
    investigationStartDate: z.iso.date().optional(),
    targetResolutionDate: z.iso.date().optional(),
    actualResolutionDate: z.iso.date().optional(),
    assignedToId: EmployeeIdSchema.optional(),
    againstEmployeeId: EmployeeIdSchema.optional(),
    isAnonymous: z.boolean().default(false),
    isEscalated: z.boolean().default(false),
    escalatedDate: z.iso.date().optional(),
    escalatedToId: EmployeeIdSchema.optional(),
    escalationReason: z.string().max(2000).optional(),
    investigationFindings: z.string().max(5000).optional(),
    resolution: z.string().max(5000).optional(),
    resolutionSatisfaction: z.number().int().min(1).max(5).optional(),
    appealNotes: z.string().max(5000).optional(),
    appealDate: z.iso.date().optional(),
    appealStatus: GrievanceAppealStatusSchema.optional(),
    confidentialNotes: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.acknowledgedDate && data.filedDate && data.acknowledgedDate < data.filedDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Acknowledged date cannot be before filed date",
        path: ["acknowledgedDate"],
      });
    }
    if (data.actualResolutionDate && data.filedDate && data.actualResolutionDate < data.filedDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Resolution date cannot be before filed date",
        path: ["actualResolutionDate"],
      });
    }
    if (data.isEscalated && !data.escalatedToId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Escalated grievance must have an escalation target",
        path: ["escalatedToId"],
      });
    }
    if (data.status === "resolved" && !data.actualResolutionDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Resolved status requires an actual resolution date",
        path: ["actualResolutionDate"],
      });
    }
    if (data.status === "appealed") {
      if (!data.appealDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Appealed status requires an appeal date",
          path: ["appealDate"],
        });
      }
      if (!data.appealStatus) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Appealed status requires an appeal status",
          path: ["appealStatus"],
        });
      }
    }
  });
