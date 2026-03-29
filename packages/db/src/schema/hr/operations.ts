// ============================================================================
// HR DOMAIN: DOCUMENTS & ONBOARDING (Phase 5)
// Manages employee documents, disciplinary actions, onboarding workflows, and policy links on tasks.
// Tables: employee_documents, disciplinary_actions, onboarding_checklists, onboarding_tasks, onboarding_progress
// Related: hr_policy_documents / employee_policy_acknowledgments in policyAcknowledgments.ts
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
  documentTypeEnum,
  documentStatusEnum,
  disciplinaryActionTypeEnum,
  onboardingStatusEnum,
  onboardingTaskCategoryEnum,
  onboardingTaskStatusEnum,
  DocumentTypeSchema,
  DocumentStatusSchema,
  DisciplinaryActionTypeSchema,
  OnboardingStatusSchema,
  OnboardingTaskCategorySchema,
  OnboardingTaskStatusSchema,
} from "./_enums.js";
import { departments, employees, jobPositions } from "./people.js";
import { hrPolicyDocuments } from "./policyAcknowledgments.js";
import {
  EmployeeDocumentIdSchema,
  DisciplinaryActionIdSchema,
  OnboardingChecklistIdSchema,
  OnboardingTaskIdSchema,
  OnboardingProgressIdSchema,
  EmployeeIdSchema,
  HrPolicyDocumentIdSchema,
  DepartmentIdSchema,
  JobPositionIdSchema,
  hrTenantIdSchema,
} from "./_zodShared.js";

// ============================================================================
// EMPLOYEE DOCUMENTS
// ============================================================================

export const employeeDocuments = hrSchema.table(
  "employee_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    documentNumber: text("document_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    documentType: documentTypeEnum("document_type").notNull(),
    ...nameColumn,
    description: text("description"),
    documentUrl: text("document_url").notNull(),
    uploadDate: date("upload_date", { mode: "string" }).notNull(),
    expiryDate: date("expiry_date", { mode: "string" }),
    documentStatus: documentStatusEnum("document_status").notNull().default("pending"),
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
    uniqueIndex("employee_documents_tenant_number_unique")
      .on(table.tenantId, table.documentNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("employee_documents_tenant_idx").on(table.tenantId),
    index("employee_documents_employee_idx").on(table.tenantId, table.employeeId),
    ...tenantIsolationPolicies("employee_documents"),
    serviceBypassPolicy("employee_documents"),
  ]
);

// ============================================================================
// DISCIPLINARY ACTIONS
// ============================================================================

export const disciplinaryActions = hrSchema.table(
  "disciplinary_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    actionNumber: text("action_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    actionType: disciplinaryActionTypeEnum("action_type").notNull(),
    incidentDate: date("incident_date", { mode: "string" }).notNull(),
    reportedDate: date("reported_date", { mode: "string" }).notNull(),
    incidentDescription: text("incident_description").notNull(),
    actionTaken: text("action_taken"),
    issuedBy: uuid("issued_by").notNull(),
    issuedDate: date("issued_date", { mode: "string" }).notNull(),
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
      columns: [table.tenantId, table.issuedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("disciplinary_actions_tenant_number_unique")
      .on(table.tenantId, table.actionNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("disciplinary_actions_tenant_idx").on(table.tenantId),
    index("disciplinary_actions_employee_idx").on(table.tenantId, table.employeeId),
    ...tenantIsolationPolicies("disciplinary_actions"),
    serviceBypassPolicy("disciplinary_actions"),
  ]
);

// ============================================================================
// ONBOARDING CHECKLISTS
// ============================================================================

export const onboardingChecklists = hrSchema.table(
  "onboarding_checklists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    checklistCode: text("checklist_code").notNull(),
    ...nameColumn,
    description: text("description"),
    departmentId: uuid("department_id"),
    jobPositionId: uuid("job_position_id"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.departmentId],
      foreignColumns: [departments.tenantId, departments.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.jobPositionId],
      foreignColumns: [jobPositions.tenantId, jobPositions.id],
    }),
    uniqueIndex("onboarding_checklists_tenant_code_unique")
      .on(table.tenantId, table.checklistCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("onboarding_checklists_tenant_idx").on(table.tenantId),
    ...tenantIsolationPolicies("onboarding_checklists"),
    serviceBypassPolicy("onboarding_checklists"),
  ]
);

// ============================================================================
// ONBOARDING TASKS
// ============================================================================

export const onboardingTasks = hrSchema.table(
  "onboarding_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    checklistId: uuid("checklist_id").notNull(),
    ...nameColumn,
    description: text("description"),
    taskOrder: integer("task_order").notNull(),
    daysFromStart: integer("days_from_start").notNull().default(0),
    assignedToRole: text("assigned_to_role"),
    isRequired: boolean("is_required").notNull().default(true),
    taskCategory: onboardingTaskCategoryEnum("task_category").notNull().default("other"),
    requiresDocument: boolean("requires_document").notNull().default(false),
    requiresAcknowledgment: boolean("requires_acknowledgment").notNull().default(false),
    linkedPolicyDocumentId: uuid("linked_policy_document_id"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.checklistId],
      foreignColumns: [onboardingChecklists.tenantId, onboardingChecklists.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.linkedPolicyDocumentId],
      foreignColumns: [hrPolicyDocuments.tenantId, hrPolicyDocuments.id],
    }),
    index("onboarding_tasks_tenant_idx").on(table.tenantId),
    index("onboarding_tasks_checklist_idx").on(table.tenantId, table.checklistId),
    index("onboarding_tasks_category_idx").on(table.tenantId, table.taskCategory),
    check("onboarding_tasks_order_check", sql`${table.taskOrder} > 0`),
    check("onboarding_tasks_days_check", sql`${table.daysFromStart} >= 0`),
    check(
      "onboarding_tasks_policy_when_ack_required",
      sql`NOT ${table.requiresAcknowledgment} OR ${table.linkedPolicyDocumentId} IS NOT NULL`
    ),
    ...tenantIsolationPolicies("onboarding_tasks"),
    serviceBypassPolicy("onboarding_tasks"),
  ]
);

// ============================================================================
// ONBOARDING PROGRESS
// ============================================================================

export const onboardingProgress = hrSchema.table(
  "onboarding_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    onboardingTaskId: uuid("onboarding_task_id").notNull(),
    onboardingStatus: onboardingStatusEnum("onboarding_status").notNull().default("not_started"),
    dueDate: date("due_date", { mode: "string" }),
    completedDate: date("completed_date", { mode: "string" }),
    completedBy: uuid("completed_by"),
    notes: text("notes"),
    detailedTaskStatus: onboardingTaskStatusEnum("detailed_task_status").notNull().default("pending"),
    submittedDocumentUrl: text("submitted_document_url"),
    taskAcknowledgedAt: timestamp("task_acknowledged_at", { withTimezone: true }),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.onboardingTaskId],
      foreignColumns: [onboardingTasks.tenantId, onboardingTasks.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.completedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    check(
      "onboarding_progress_completed_implies_detailed_done",
      sql`${table.onboardingStatus} <> 'completed' OR ${table.detailedTaskStatus} IN ('completed', 'skipped')`
    ),
    uniqueIndex("onboarding_progress_employee_task_unique").on(
      table.tenantId,
      table.employeeId,
      table.onboardingTaskId
    ),
    index("onboarding_progress_tenant_idx").on(table.tenantId),
    index("onboarding_progress_employee_idx").on(table.tenantId, table.employeeId),
    ...tenantIsolationPolicies("onboarding_progress"),
    serviceBypassPolicy("onboarding_progress"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertEmployeeDocumentSchema = z.object({
  id: EmployeeDocumentIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  documentNumber: z.string().min(1).max(80),
  employeeId: EmployeeIdSchema,
  documentType: DocumentTypeSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  documentUrl: z.string().url().max(2048),
  uploadDate: z.string().date(),
  expiryDate: z.string().date().optional(),
  documentStatus: DocumentStatusSchema.default("pending"),
  notes: z.string().max(2000).optional(),
});

export const insertDisciplinaryActionSchema = z.object({
  id: DisciplinaryActionIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  actionNumber: z.string().min(1).max(80),
  employeeId: EmployeeIdSchema,
  actionType: DisciplinaryActionTypeSchema,
  incidentDate: z.string().date(),
  reportedDate: z.string().date(),
  incidentDescription: z.string().min(10).max(4000),
  actionTaken: z.string().max(2000).optional(),
  issuedBy: EmployeeIdSchema,
  issuedDate: z.string().date(),
  notes: z.string().max(2000).optional(),
});

export const insertOnboardingChecklistSchema = z.object({
  id: OnboardingChecklistIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  checklistCode: z.string().min(2).max(80),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  departmentId: DepartmentIdSchema.optional(),
  jobPositionId: JobPositionIdSchema.optional(),
  isActive: z.boolean().default(true),
});

export const insertOnboardingTaskSchema = z
  .object({
    id: OnboardingTaskIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    checklistId: OnboardingChecklistIdSchema,
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    taskOrder: z.number().int().positive(),
    daysFromStart: z.number().int().nonnegative().default(0),
    assignedToRole: z.string().max(120).optional(),
    isRequired: z.boolean().default(true),
    taskCategory: OnboardingTaskCategorySchema.default("other"),
    requiresDocument: z.boolean().default(false),
    requiresAcknowledgment: z.boolean().default(false),
    linkedPolicyDocumentId: HrPolicyDocumentIdSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.requiresAcknowledgment && !data.linkedPolicyDocumentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "linkedPolicyDocumentId is required when requiresAcknowledgment is true",
        path: ["linkedPolicyDocumentId"],
      });
    }
  });

export const insertOnboardingProgressSchema = z
  .object({
    id: OnboardingProgressIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeId: EmployeeIdSchema,
    onboardingTaskId: OnboardingTaskIdSchema,
    onboardingStatus: OnboardingStatusSchema.default("not_started"),
    dueDate: z.string().date().optional(),
    completedDate: z.string().date().optional(),
    completedBy: EmployeeIdSchema.optional(),
    notes: z.string().max(2000).optional(),
    detailedTaskStatus: OnboardingTaskStatusSchema.default("pending"),
    submittedDocumentUrl: z.string().url().max(2048).optional(),
    taskAcknowledgedAt: z.coerce.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.onboardingStatus === "completed" &&
      data.detailedTaskStatus !== "completed" &&
      data.detailedTaskStatus !== "skipped"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "When onboardingStatus is completed, detailedTaskStatus must be completed or skipped",
        path: ["detailedTaskStatus"],
      });
    }
  });
