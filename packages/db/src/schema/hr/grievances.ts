// ============================================================================
// HR DOMAIN: GRIEVANCE MANAGEMENT (SWOT Proposal - P0)
// Defines grievance category taxonomy and employee grievance lifecycle records.
// Tables: grievance_categories, employee_grievances
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
import { grievanceCategoryTypeEnum, grievanceStatusEnum, grievancePriorityEnum } from "./_enums.js";
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
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
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
    investigationFindings: text("investigation_findings"),
    resolution: text("resolution"),
    resolutionSatisfaction: integer("resolution_satisfaction"),
    appealNotes: text("appeal_notes"),
    appealDate: date("appeal_date", { mode: "string" }),
    confidentialNotes: text("confidential_notes"),
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
    index("employee_grievances_tenant_idx").on(table.tenantId),
    index("employee_grievances_employee_idx").on(table.tenantId, table.employeeId),
    index("employee_grievances_status_idx").on(table.tenantId, table.status),
    index("employee_grievances_priority_idx").on(table.tenantId, table.priority),
    index("employee_grievances_category_idx").on(table.tenantId, table.categoryId),
    index("employee_grievances_assigned_idx").on(table.tenantId, table.assignedToId),
    index("employee_grievances_filed_date_idx").on(table.tenantId, table.filedDate),
    ...tenantIsolationPolicies("employee_grievances"),
    serviceBypassPolicy("employee_grievances"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertGrievanceCategorySchema = z.object({
  id: GrievanceCategoryIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  categoryCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  categoryType: z.enum([
    "harassment",
    "discrimination",
    "workplace_safety",
    "compensation",
    "management",
    "policy_violation",
    "work_conditions",
    "bullying",
    "retaliation",
    "other",
  ]),
  parentCategoryId: GrievanceCategoryIdSchema.optional(),
  requiresInvestigation: z.boolean().default(false),
  defaultPriority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  escalationDays: z.number().int().positive().default(7),
  isActive: z.boolean().default(true),
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
    status: z
      .enum([
        "submitted",
        "acknowledged",
        "under_investigation",
        "resolved",
        "closed",
        "appealed",
        "withdrawn",
      ])
      .default("submitted"),
    priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    filedDate: z.string().date(),
    acknowledgedDate: z.string().date().optional(),
    investigationStartDate: z.string().date().optional(),
    targetResolutionDate: z.string().date().optional(),
    actualResolutionDate: z.string().date().optional(),
    assignedToId: EmployeeIdSchema.optional(),
    againstEmployeeId: EmployeeIdSchema.optional(),
    isAnonymous: z.boolean().default(false),
    isEscalated: z.boolean().default(false),
    escalatedDate: z.string().date().optional(),
    escalatedToId: EmployeeIdSchema.optional(),
    investigationFindings: z.string().max(5000).optional(),
    resolution: z.string().max(5000).optional(),
    resolutionSatisfaction: z.number().int().min(1).max(5).optional(),
    appealNotes: z.string().max(5000).optional(),
    appealDate: z.string().date().optional(),
    confidentialNotes: z.string().max(5000).optional(),
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
  });
