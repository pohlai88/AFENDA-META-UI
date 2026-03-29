// ============================================================================
// HR DOMAIN: EXPENSE MANAGEMENT (Upgrade Module)
// Defines expense categories, policies, claims, reports, line items, and approvals.
// Tables: expense_categories, expense_policies, expense_claims, expense_reports, expense_lines, expense_approvals
// ============================================================================
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
  numeric,
  timestamp,
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
import { expenseCategoryEnum, expenseStatusEnum, approvalLevelEnum } from "./_enums.js";
import { employees } from "./people.js";
import { z } from "zod/v4";
import {
  ExpenseCategoryIdSchema,
  ExpensePolicyIdSchema,
  ExpenseReportIdSchema,
  ExpenseLineIdSchema,
  ExpenseApprovalIdSchema,
  ExpenseLineProjectRefIdSchema,
  EmployeeIdSchema,
  currencyAmountSchema,
  hrTenantIdSchema,
} from "./_zodShared.js";

// ============================================================================
// EXPENSE CATEGORIES - Define expense categories
// ============================================================================

export const hrExpenseCategories = hrSchema.table(
  "expense_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    categoryCode: text("category_code").notNull(),
    ...nameColumn,
    description: text("description"),
    category: expenseCategoryEnum("category").notNull(),
    maxAmount: numeric("max_amount", { precision: 15, scale: 2 }), // Per-expense limit
    requiresReceipt: boolean("requires_receipt").notNull().default(true),
    accountCode: text("account_code"), // GL integration
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("expense_categories_tenant_code_unique")
      .on(table.tenantId, table.categoryCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("expense_categories_tenant_idx").on(table.tenantId),
    index("expense_categories_category_idx").on(table.tenantId, table.category),
    ...tenantIsolationPolicies("expense_categories"),
    serviceBypassPolicy("expense_categories"),
  ]
);

// ============================================================================
// EXPENSE POLICIES - Define expense policies
// ============================================================================

export const expensePolicies = hrSchema.table(
  "expense_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    policyCode: text("policy_code").notNull(),
    ...nameColumn,
    description: text("description"),
    applicableTo: text("applicable_to").notNull(), // 'all' | 'department' | 'position' | 'employee'
    applicableIds: text("applicable_ids"), // JSON array of IDs
    dailyLimit: numeric("daily_limit", { precision: 15, scale: 2 }),
    monthlyLimit: numeric("monthly_limit", { precision: 15, scale: 2 }),
    requiresPreApproval: boolean("requires_pre_approval").notNull().default(false),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveTo: date("effective_to", { mode: "string" }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("expense_policies_tenant_code_unique")
      .on(table.tenantId, table.policyCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("expense_policies_tenant_idx").on(table.tenantId),
    index("expense_policies_applicable_idx").on(table.tenantId, table.applicableTo),
    ...tenantIsolationPolicies("expense_policies"),
    serviceBypassPolicy("expense_policies"),
  ]
);

// ============================================================================
// EXPENSE CLAIMS - Legacy claim workflow records
// ============================================================================

export const expenseClaims = hrSchema.table(
  "expense_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    claimNumber: text("claim_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    claimDate: date("claim_date", { mode: "string" }).notNull(),
    totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
    currencyId: integer("currency_id").notNull(),
    expenseStatus: expenseStatusEnum("expense_status").notNull().default("draft"),
    submittedDate: date("submitted_date", { mode: "string" }),
    approvedBy: uuid("approved_by"),
    approvedDate: date("approved_date", { mode: "string" }),
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
    sql`CONSTRAINT expense_claims_total_amount_check CHECK (total_amount >= 0)`,
    ...tenantIsolationPolicies("expense_claims"),
    serviceBypassPolicy("expense_claims"),
  ]
);

// ============================================================================
// EXPENSE REPORTS - Employee expense reports
// ============================================================================

export const expenseReports = hrSchema.table(
  "expense_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    reportNumber: text("report_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    reportDate: date("report_date", { mode: "string" }).notNull(),
    periodStart: date("period_start", { mode: "string" }),
    periodEnd: date("period_end", { mode: "string" }),
    totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
    currencyId: integer("currency_id").notNull(),
    status: expenseStatusEnum("status").notNull().default("draft"),
    submittedDate: timestamp("submitted_date"),
    approvedBy: uuid("approved_by"),
    approvedDate: timestamp("approved_date"),
    paymentDate: date("payment_date", { mode: "string" }),
    paymentReference: text("payment_reference"),
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
      columns: [table.tenantId, table.approvedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
    }),
    uniqueIndex("expense_reports_tenant_number_unique")
      .on(table.tenantId, table.reportNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("expense_reports_tenant_idx").on(table.tenantId),
    index("expense_reports_employee_idx").on(table.tenantId, table.employeeId),
    index("expense_reports_status_idx").on(table.tenantId, table.status),
    index("expense_reports_date_idx").on(table.tenantId, table.reportDate),
    ...tenantIsolationPolicies("expense_reports"),
    serviceBypassPolicy("expense_reports"),
  ]
);

// ============================================================================
// EXPENSE LINES - Individual expense items
// ============================================================================

export const hrExpenseLines = hrSchema.table(
  "expense_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    expenseReportId: uuid("expense_report_id").notNull(),
    categoryId: uuid("category_id").notNull(),
    expenseDate: date("expense_date", { mode: "string" }).notNull(),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currencyId: integer("currency_id").notNull(),
    exchangeRate: numeric("exchange_rate", { precision: 15, scale: 6 }).default("1"),
    receiptUrl: text("receipt_url"),
    merchantName: text("merchant_name"),
    isBillable: boolean("is_billable").notNull().default(false),
    projectId: uuid("project_id"), // Optional project allocation
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.expenseReportId],
      foreignColumns: [expenseReports.tenantId, expenseReports.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.categoryId],
      foreignColumns: [hrExpenseCategories.tenantId, hrExpenseCategories.id],
    }),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
    }),
    index("expense_lines_tenant_idx").on(table.tenantId),
    index("expense_lines_report_idx").on(table.tenantId, table.expenseReportId),
    index("expense_lines_category_idx").on(table.tenantId, table.categoryId),
    index("expense_lines_date_idx").on(table.tenantId, table.expenseDate),
    sql`CONSTRAINT expense_lines_amount_positive CHECK (amount > 0)`,
    ...tenantIsolationPolicies("expense_lines"),
    serviceBypassPolicy("expense_lines"),
  ]
);

// ============================================================================
// EXPENSE APPROVALS - Multi-level approval workflow
// ============================================================================

export const expenseApprovals = hrSchema.table(
  "expense_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    expenseReportId: uuid("expense_report_id").notNull(),
    approverId: uuid("approver_id").notNull(),
    approvalLevel: approvalLevelEnum("approval_level").notNull(),
    status: expenseStatusEnum("status").notNull().default("submitted"),
    comments: text("comments"),
    actionDate: timestamp("action_date"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.expenseReportId],
      foreignColumns: [expenseReports.tenantId, expenseReports.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.approverId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("expense_approvals_report_level_unique")
      .on(table.tenantId, table.expenseReportId, table.approvalLevel)
      .where(sql`${table.deletedAt} IS NULL`),
    index("expense_approvals_tenant_idx").on(table.tenantId),
    index("expense_approvals_report_idx").on(table.tenantId, table.expenseReportId),
    index("expense_approvals_approver_idx").on(table.tenantId, table.approverId),
    index("expense_approvals_status_idx").on(table.tenantId, table.status),
    ...tenantIsolationPolicies("expense_approvals"),
    serviceBypassPolicy("expense_approvals"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertExpenseCategorySchema = z.object({
  id: ExpenseCategoryIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  categoryCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  category: z.enum([
    "travel",
    "accommodation",
    "meals",
    "transport",
    "supplies",
    "training",
    "entertainment",
    "communication",
    "equipment",
    "other",
  ]),
  maxAmount: currencyAmountSchema(2).optional(),
  requiresReceipt: z.boolean().default(true),
  accountCode: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
});

export const insertExpensePolicySchema = z
  .object({
    id: ExpensePolicyIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    policyCode: z.string().min(2).max(50),
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    applicableTo: z.enum(["all", "department", "position", "employee"]),
    applicableIds: z.string().optional(),
    dailyLimit: currencyAmountSchema(2).optional(),
    monthlyLimit: currencyAmountSchema(2).optional(),
    requiresPreApproval: z.boolean().default(false),
    effectiveFrom: z.string().date(),
    effectiveTo: z.string().date().optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.effectiveFrom && data.effectiveTo && data.effectiveFrom > data.effectiveTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Effective from date cannot be after effective to date",
        path: ["effectiveFrom"],
      });
    }
  });

export const insertExpenseReportSchema = z
  .object({
    id: ExpenseReportIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    reportNumber: z.string().min(1).max(50),
    employeeId: EmployeeIdSchema,
    reportDate: z.string().date(),
    periodStart: z.string().date().optional(),
    periodEnd: z.string().date().optional(),
    totalAmount: currencyAmountSchema(2).default("0"),
    currencyId: z.number().int().positive(),
    status: z.enum(["draft", "submitted", "approved", "rejected", "reimbursed"]).default("draft"),
    submittedDate: z.date().optional(),
    approvedBy: EmployeeIdSchema.optional(),
    approvedDate: z.date().optional(),
    paymentDate: z.string().date().optional(),
    paymentReference: z.string().max(100).optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.periodStart && data.periodEnd && data.periodStart > data.periodEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Period start date cannot be after period end date",
        path: ["periodStart"],
      });
    }
  });

export const insertExpenseLineSchema = z.object({
  id: ExpenseLineIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  expenseReportId: ExpenseReportIdSchema,
  categoryId: ExpenseCategoryIdSchema,
  expenseDate: z.string().date(),
  description: z.string().min(1).max(500),
  amount: currencyAmountSchema(2).refine((val) => parseFloat(val) > 0, "Amount must be positive"),
  currencyId: z.number().int().positive(),
  exchangeRate: z
    .string()
    .regex(/^\d+(\.\d{1,6})?$/)
    .default("1"),
  receiptUrl: z.string().url().optional(),
  merchantName: z.string().max(200).optional(),
  isBillable: z.boolean().default(false),
  projectId: ExpenseLineProjectRefIdSchema.optional(),
  notes: z.string().max(1000).optional(),
});

export const insertExpenseApprovalSchema = z.object({
  id: ExpenseApprovalIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  expenseReportId: ExpenseReportIdSchema,
  approverId: EmployeeIdSchema,
  approvalLevel: z.enum(["level_1", "level_2", "level_3", "final"]),
  status: z.enum(["draft", "submitted", "approved", "rejected", "reimbursed"]).default("submitted"),
  comments: z.string().max(2000).optional(),
  actionDate: z.date().optional(),
});
