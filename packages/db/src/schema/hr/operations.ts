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
import { currencies } from "../reference/index.js";
import { hrSchema } from "./_schema.js";
import {
  documentTypeEnum,
  documentStatusEnum,
  expenseTypeEnum,
  expenseStatusEnum,
  disciplinaryActionTypeEnum,
  exitInterviewStatusEnum,
  onboardingStatusEnum,
} from "./_enums.js";
import { departments, employees, jobPositions } from "./people.js";

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
    uploadDate: date("upload_date").notNull(),
    expiryDate: date("expiry_date"),
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
// EXPENSE CLAIMS
// ============================================================================

export const expenseClaims = hrSchema.table(
  "expense_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    claimNumber: text("claim_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    claimDate: date("claim_date").notNull(),
    totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
    currencyId: integer("currency_id").notNull(),
    expenseStatus: expenseStatusEnum("expense_status").notNull().default("draft"),
    submittedDate: date("submitted_date"),
    approvedBy: uuid("approved_by"),
    approvedDate: date("approved_date"),
    rejectionReason: text("rejection_reason"),
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
    foreignKey({ columns: [table.currencyId], foreignColumns: [currencies.currencyId] }),
    foreignKey({
      columns: [table.tenantId, table.approvedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("expense_claims_tenant_number_unique")
      .on(table.tenantId, table.claimNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("expense_claims_tenant_idx").on(table.tenantId),
    index("expense_claims_employee_idx").on(table.tenantId, table.employeeId),
    index("expense_claims_status_idx").on(table.tenantId, table.expenseStatus),
    check("expense_claims_total_amount_check", sql`${table.totalAmount} >= 0`),
    ...tenantIsolationPolicies("expense_claims"),
    serviceBypassPolicy("expense_claims"),
  ]
);

// ============================================================================
// EXPENSE LINES
// ============================================================================

export const expenseLines = hrSchema.table(
  "expense_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    expenseClaimId: uuid("expense_claim_id").notNull(),
    expenseType: expenseTypeEnum("expense_type").notNull(),
    expenseDate: date("expense_date").notNull(),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    description: text("description"),
    receiptUrl: text("receipt_url"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.expenseClaimId],
      foreignColumns: [expenseClaims.tenantId, expenseClaims.id],
    }),
    index("expense_lines_tenant_idx").on(table.tenantId),
    index("expense_lines_claim_idx").on(table.tenantId, table.expenseClaimId),
    check("expense_lines_amount_check", sql`${table.amount} > 0`),
    ...tenantIsolationPolicies("expense_lines"),
    serviceBypassPolicy("expense_lines"),
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
    incidentDate: date("incident_date").notNull(),
    reportedDate: date("reported_date").notNull(),
    incidentDescription: text("incident_description").notNull(),
    actionTaken: text("action_taken"),
    issuedBy: uuid("issued_by").notNull(),
    issuedDate: date("issued_date").notNull(),
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
// EXIT INTERVIEWS
// ============================================================================

export const exitInterviews = hrSchema.table(
  "exit_interviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    interviewNumber: text("interview_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    interviewDate: date("interview_date").notNull(),
    interviewerId: uuid("interviewer_id").notNull(),
    reasonForLeaving: text("reason_for_leaving"),
    wouldRehire: boolean("would_rehire"),
    feedback: text("feedback"),
    suggestions: text("suggestions"),
    exitInterviewStatus: exitInterviewStatusEnum("exit_interview_status")
      .notNull()
      .default("scheduled"),
    notes: text("notes"),
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
      columns: [table.tenantId, table.interviewerId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("exit_interviews_tenant_number_unique").on(table.tenantId, table.interviewNumber),
    index("exit_interviews_tenant_idx").on(table.tenantId),
    index("exit_interviews_employee_idx").on(table.tenantId, table.employeeId),
    ...tenantIsolationPolicies("exit_interviews"),
    serviceBypassPolicy("exit_interviews"),
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
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.checklistId],
      foreignColumns: [onboardingChecklists.tenantId, onboardingChecklists.id],
    }),
    index("onboarding_tasks_tenant_idx").on(table.tenantId),
    index("onboarding_tasks_checklist_idx").on(table.tenantId, table.checklistId),
    check("onboarding_tasks_order_check", sql`${table.taskOrder} > 0`),
    check("onboarding_tasks_days_check", sql`${table.daysFromStart} >= 0`),
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
    dueDate: date("due_date"),
    completedDate: date("completed_date"),
    completedBy: uuid("completed_by"),
    notes: text("notes"),
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
