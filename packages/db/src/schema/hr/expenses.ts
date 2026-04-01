// ============================================================================
// HR DOMAIN: EXPENSE MANAGEMENT (Upgrade Module)
// Defines expense categories, policies, claims, reports, advances, line items, and approvals.
// Tables: expense_categories, expense_policies, expense_claims, expense_reports, cash_advances, expense_lines, expense_approvals
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
  numeric,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls-policies/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../column-kit/index.js";
import { users } from "../security/index.js";
import { tenants } from "../core/tenants.js";
import { currencies } from "../reference/index.js";
import { hrSchema } from "./_schema.js";
import {
  expenseCategoryEnum,
  expenseStatusEnum,
  approvalLevelEnum,
  expensePolicyApplicableToEnum,
  expenseTaxTreatmentEnum,
  expenseReportTypeEnum,
  expenseWorkflowTypeEnum,
  cashAdvanceStatusEnum,
  ExpenseCategorySchema,
  ExpenseStatusSchema,
  ApprovalLevelSchema,
  ExpensePolicyApplicableToSchema,
  ExpenseTaxTreatmentSchema,
  ExpenseReportTypeSchema,
  ExpenseWorkflowTypeSchema,
  CashAdvanceStatusSchema,
} from "./_enums.js";
import { employees } from "./people.js";
import { z } from "zod/v4";
import {
  ExpenseCategoryIdSchema,
  ExpenseClaimIdSchema,
  ExpensePolicyIdSchema,
  ExpenseReportIdSchema,
  ExpenseLineIdSchema,
  ExpenseApprovalIdSchema,
  CashAdvanceIdSchema,
  ExpenseLineProjectRefIdSchema,
  EmployeeIdSchema,
  currencyAmountSchema,
  hrTenantIdSchema,
  refineApprovedRequiresActor,
  refineApprovalFieldsAbsentUnlessApproved,
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
    taxTreatment: expenseTaxTreatmentEnum("tax_treatment").notNull().default("deductible"),
    maxAmount: numeric("max_amount", { precision: 15, scale: 2 }), // Per-expense limit
    requiresReceipt: boolean("requires_receipt").notNull().default(true),
    accountCode: text("account_code"), // GL integration
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("expense_categories_tenant_code_unique")
      .on(table.tenantId, table.categoryCode)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "expense_categories_description_max_len",
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 500`
    ),
    index("expense_categories_tenant_idx").on(table.tenantId),
    index("expense_categories_category_idx").on(table.tenantId, table.category),
    index("expense_categories_tax_treatment_idx").on(table.tenantId, table.taxTreatment),
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
    applicableTo: expensePolicyApplicableToEnum("applicable_to").notNull(),
    applicableIds: jsonb("applicable_ids").$type<string[]>(),
    dailyLimit: numeric("daily_limit", { precision: 15, scale: 2 }),
    monthlyLimit: numeric("monthly_limit", { precision: 15, scale: 2 }),
    requiresPreApproval: boolean("requires_pre_approval").notNull().default(false),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveTo: date("effective_to", { mode: "string" }),
    policyVersion: text("policy_version").notNull().default("1.0"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("expense_policies_tenant_code_unique")
      .on(table.tenantId, table.policyCode)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "expense_policies_effective_range",
      sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} >= ${table.effectiveFrom}`
    ),
    check(
      "expense_policies_policy_version_len",
      sql`char_length(${table.policyVersion}) >= 1 AND char_length(${table.policyVersion}) <= 32`
    ),
    check(
      "expense_policies_description_max_len",
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 500`
    ),
    index("expense_policies_tenant_idx").on(table.tenantId),
    index("expense_policies_applicable_idx").on(table.tenantId, table.applicableTo),
    index("expense_policies_applicable_ids_gin").using("gin", table.applicableIds),
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
    ...auditColumns(() => users.userId),
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
    check("expense_claims_total_amount_non_negative", sql`${table.totalAmount} >= 0`),
    check(
      "expense_claims_approved_has_approver_and_date",
      sql`${table.expenseStatus}::text != 'approved' OR (${table.approvedBy} IS NOT NULL AND ${table.approvedDate} IS NOT NULL)`
    ),
    check(
      "expense_claims_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 2000`
    ),
    check(
      "expense_claims_rejection_reason_max_len",
      sql`${table.rejectionReason} IS NULL OR char_length(${table.rejectionReason}) <= 2000`
    ),
    check(
      "expense_claims_claim_number_max_len",
      sql`char_length(${table.claimNumber}) <= 50`
    ),
    index("expense_claims_tenant_idx").on(table.tenantId),
    index("expense_claims_employee_idx").on(table.tenantId, table.employeeId),
    index("expense_claims_status_idx").on(table.tenantId, table.expenseStatus),
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
    reportType: expenseReportTypeEnum("report_type").notNull().default("other"),
    /** Reimbursement vs advance settlement vs petty cash vs company-paid tracking. */
    expenseWorkflowType: expenseWorkflowTypeEnum("expense_workflow_type")
      .notNull()
      .default("reimbursement"),
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
    ...auditColumns(() => users.userId),
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
    check("expense_reports_total_non_negative", sql`${table.totalAmount} >= 0`),
    check(
      "expense_reports_period_range",
      sql`${table.periodEnd} IS NULL OR ${table.periodStart} IS NULL OR ${table.periodEnd} >= ${table.periodStart}`
    ),
    check(
      "expense_reports_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 2000`
    ),
    check(
      "expense_reports_payment_reference_max_len",
      sql`${table.paymentReference} IS NULL OR char_length(${table.paymentReference}) <= 100`
    ),
    check(
      "expense_reports_report_number_max_len",
      sql`char_length(${table.reportNumber}) <= 50`
    ),
    index("expense_reports_tenant_idx").on(table.tenantId),
    index("expense_reports_employee_idx").on(table.tenantId, table.employeeId),
    index("expense_reports_status_idx").on(table.tenantId, table.status),
    index("expense_reports_date_idx").on(table.tenantId, table.reportDate),
    index("expense_reports_report_type_idx").on(table.tenantId, table.reportType),
    index("expense_reports_expense_workflow_type_idx").on(table.tenantId, table.expenseWorkflowType),
    ...tenantIsolationPolicies("expense_reports"),
    serviceBypassPolicy("expense_reports"),
  ]
);

// ============================================================================
// CASH ADVANCES - Issued advances reconciled via expense reports
// ============================================================================

export const cashAdvances = hrSchema.table(
  "cash_advances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    advanceNumber: text("advance_number").notNull(),
    issueDate: date("issue_date", { mode: "string" }).notNull(),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currencyId: integer("currency_id").notNull(),
    status: cashAdvanceStatusEnum("status").notNull().default("issued"),
    /** Expense report used to settle / reconcile this advance (when status = settled). */
    settlementReportId: uuid("settlement_report_id"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
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
      columns: [table.tenantId, table.settlementReportId],
      foreignColumns: [expenseReports.tenantId, expenseReports.id],
    }),
    uniqueIndex("cash_advances_tenant_number_unique")
      .on(table.tenantId, table.advanceNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    check("cash_advances_amount_positive", sql`${table.amount} > 0`),
    check(
      "cash_advances_settled_has_settlement_report",
      sql`${table.status}::text != 'settled' OR ${table.settlementReportId} IS NOT NULL`
    ),
    check(
      "cash_advances_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 2000`
    ),
    check(
      "cash_advances_advance_number_max_len",
      sql`char_length(${table.advanceNumber}) <= 50`
    ),
    index("cash_advances_tenant_idx").on(table.tenantId),
    index("cash_advances_employee_idx").on(table.tenantId, table.employeeId),
    index("cash_advances_status_idx").on(table.tenantId, table.status),
    index("cash_advances_settlement_report_idx").on(table.tenantId, table.settlementReportId),
    ...tenantIsolationPolicies("cash_advances"),
    serviceBypassPolicy("cash_advances"),
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
    exchangeRate: numeric("exchange_rate", { precision: 15, scale: 6 }).notNull().default("1"),
    receiptUrl: text("receipt_url"),
    receiptHash: text("receipt_hash"),
    merchantName: text("merchant_name"),
    isBillable: boolean("is_billable").notNull().default(false),
    projectId: uuid("project_id"), // Optional project allocation
    /** ERP-facing dimensions (GL, cost center, tax codes, etc.). */
    accountingMap: jsonb("accounting_map").$type<Record<string, unknown>>(),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
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
    check("expense_lines_amount_positive", sql`${table.amount} > 0`),
    check("expense_lines_exchange_rate_positive", sql`${table.exchangeRate} > 0`),
    check(
      "expense_lines_description_max_len",
      sql`char_length(${table.description}) <= 500`
    ),
    check(
      "expense_lines_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 1000`
    ),
    check(
      "expense_lines_receipt_hash_max_len",
      sql`${table.receiptHash} IS NULL OR char_length(${table.receiptHash}) <= 128`
    ),
    check(
      "expense_lines_merchant_name_max_len",
      sql`${table.merchantName} IS NULL OR char_length(${table.merchantName}) <= 200`
    ),
    index("expense_lines_tenant_idx").on(table.tenantId),
    index("expense_lines_report_idx").on(table.tenantId, table.expenseReportId),
    index("expense_lines_category_idx").on(table.tenantId, table.categoryId),
    index("expense_lines_date_idx").on(table.tenantId, table.expenseDate),
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
    /** Step order within the report approval chain (sort ascending). */
    approvalSequence: integer("approval_sequence").notNull().default(1),
    status: expenseStatusEnum("status").notNull().default("submitted"),
    comments: text("comments"),
    actionDate: timestamp("action_date"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
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
    check("expense_approvals_sequence_positive", sql`${table.approvalSequence} > 0`),
    check(
      "expense_approvals_approved_has_action_date",
      sql`${table.status}::text != 'approved' OR ${table.actionDate} IS NOT NULL`
    ),
    check(
      "expense_approvals_comments_max_len",
      sql`${table.comments} IS NULL OR char_length(${table.comments}) <= 2000`
    ),
    index("expense_approvals_tenant_idx").on(table.tenantId),
    index("expense_approvals_report_idx").on(table.tenantId, table.expenseReportId),
    index("expense_approvals_report_sequence_idx").on(
      table.tenantId,
      table.expenseReportId,
      table.approvalSequence
    ),
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
  category: ExpenseCategorySchema,
  taxTreatment: ExpenseTaxTreatmentSchema.default("deductible"),
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
    applicableTo: ExpensePolicyApplicableToSchema,
    applicableIds: z.array(z.string().uuid()).optional(),
    dailyLimit: currencyAmountSchema(2).optional(),
    monthlyLimit: currencyAmountSchema(2).optional(),
    requiresPreApproval: z.boolean().default(false),
    effectiveFrom: z.iso.date(),
    effectiveTo: z.iso.date().optional(),
    policyVersion: z.string().min(1).max(32).default("1.0"),
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

export const insertExpenseClaimSchema = z
  .object({
    id: ExpenseClaimIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    claimNumber: z.string().min(3).max(50),
    employeeId: EmployeeIdSchema,
    claimDate: z.iso.date(),
    totalAmount: currencyAmountSchema(2)
      .default("0")
      .refine((v) => parseFloat(v) >= 0, "totalAmount must be non-negative"),
    currencyId: z.number().int().positive(),
    expenseStatus: ExpenseStatusSchema.default("draft"),
    submittedDate: z.iso.date().optional(),
    approvedBy: EmployeeIdSchema.optional(),
    approvedDate: z.iso.date().optional(),
    rejectionReason: z.string().max(2000).optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine(
    refineApprovedRequiresActor({
      statusField: "expenseStatus",
      approvedValue: "approved",
      actorField: "approvedBy",
      atField: "approvedDate",
      messages: {
        actor: "Approved claims require approver and approval date",
        at: "Approved claims require approver and approval date",
      },
    })
  )
  .superRefine(
    refineApprovalFieldsAbsentUnlessApproved({
      statusField: "expenseStatus",
      approvedValue: "approved",
      actorField: "approvedBy",
      atField: "approvedDate",
    })
  );

export const insertExpenseReportSchema = z
  .object({
    id: ExpenseReportIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    reportNumber: z.string().min(1).max(50),
    employeeId: EmployeeIdSchema,
    reportDate: z.iso.date(),
    reportType: ExpenseReportTypeSchema.default("other"),
    expenseWorkflowType: ExpenseWorkflowTypeSchema.default("reimbursement"),
    periodStart: z.iso.date().optional(),
    periodEnd: z.iso.date().optional(),
    totalAmount: currencyAmountSchema(2).default("0"),
    currencyId: z.number().int().positive(),
    status: ExpenseStatusSchema.default("draft"),
    submittedDate: z.date().optional(),
    approvedBy: EmployeeIdSchema.optional(),
    approvedDate: z.date().optional(),
    paymentDate: z.iso.date().optional(),
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

export const insertCashAdvanceSchema = z
  .object({
    id: CashAdvanceIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeId: EmployeeIdSchema,
    advanceNumber: z.string().min(3).max(50),
    issueDate: z.iso.date(),
    amount: currencyAmountSchema(2).refine((v) => parseFloat(v) > 0, "Amount must be positive"),
    currencyId: z.number().int().positive(),
    status: CashAdvanceStatusSchema.default("issued"),
    settlementReportId: ExpenseReportIdSchema.optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "settled" && !data.settlementReportId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Settled advances must reference a settlement expense report",
        path: ["settlementReportId"],
      });
    }
  });

export const insertExpenseLineSchema = z
  .object({
    id: ExpenseLineIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    expenseReportId: ExpenseReportIdSchema,
    categoryId: ExpenseCategoryIdSchema,
    expenseDate: z.iso.date(),
    description: z.string().min(1).max(500),
    amount: currencyAmountSchema(2).refine((val) => parseFloat(val) > 0, "Amount must be positive"),
    currencyId: z.number().int().positive(),
    exchangeRate: z
      .string()
      .regex(/^\d+(\.\d{1,6})?$/)
      .default("1"),
    receiptUrl: z.string().url().optional(),
    receiptHash: z.string().max(128).optional(),
    accountingMap: z.record(z.string(), z.unknown()).optional(),
    merchantName: z.string().max(200).optional(),
    isBillable: z.boolean().default(false),
    projectId: ExpenseLineProjectRefIdSchema.optional(),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (parseFloat(data.exchangeRate) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exchange rate must be positive",
        path: ["exchangeRate"],
      });
    }
  });

export const insertExpenseApprovalSchema = z
  .object({
    id: ExpenseApprovalIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    expenseReportId: ExpenseReportIdSchema,
    approverId: EmployeeIdSchema,
    approvalLevel: ApprovalLevelSchema,
    approvalSequence: z.number().int().positive().default(1),
    status: ExpenseStatusSchema.default("submitted"),
    comments: z.string().max(2000).optional(),
    actionDate: z.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "approved" && !data.actionDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Approved steps require action date",
        path: ["actionDate"],
      });
    }
  });
