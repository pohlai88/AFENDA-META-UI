// ============================================================================
// HR DOMAIN: LOAN MANAGEMENT (SWOT Proposal - P1)
// Defines loan product catalogs, employee loan lifecycle, and per-installment rows.
// Tables: loan_types, employee_loans, employee_loan_installments
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
import { currencies } from "../reference/index.js";
import { hrSchema } from "./_schema.js";
import {
  loanCategoryEnum,
  loanStatusEnum,
  loanRepaymentFrequencyEnum,
  loanInterestTypeEnum,
  loanInstallmentStatusEnum,
  LoanCategorySchema,
  LoanStatusSchema,
  LoanRepaymentFrequencySchema,
  LoanInterestTypeSchema,
  LoanInstallmentStatusSchema,
} from "./_enums.js";
import { employees } from "./people.js";
import {
  LoanTypeIdSchema,
  EmployeeLoanIdSchema,
  EmployeeLoanInstallmentIdSchema,
  EmployeeIdSchema,
  currencyAmountSchema,
  hrTenantIdSchema,
  hrAuditUserIdSchema,
} from "./_zodShared.js";

// ============================================================================
// TABLE: loan_types
// Configurable loan product definitions
// ============================================================================
export const loanTypes = hrSchema.table(
  "loan_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    loanCode: text("loan_code").notNull(),
    /** Product catalog version (unique with `loan_code` per tenant). */
    catalogVersion: integer("catalog_version").notNull().default(1),
    ...nameColumn,
    description: text("description"),
    category: loanCategoryEnum("category").notNull(),
    interestType: loanInterestTypeEnum("interest_type").notNull().default("reducing_balance"),
    maxAmount: numeric("max_amount", { precision: 15, scale: 2 }),
    maxTenureMonths: integer("max_tenure_months"),
    interestRate: numeric("interest_rate", { precision: 5, scale: 2 }).notNull().default("0"),
    maxPercentOfSalary: numeric("max_percent_of_salary", { precision: 5, scale: 2 }),
    requiresApproval: boolean("requires_approval").notNull().default(true),
    minServiceMonths: integer("min_service_months").default(0),
    allowMultiple: boolean("allow_multiple").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("loan_types_tenant_code_version_unique")
      .on(table.tenantId, table.loanCode, table.catalogVersion)
      .where(sql`${table.deletedAt} IS NULL`),
    check("loan_types_catalog_version_positive", sql`${table.catalogVersion} > 0`),
    check(
      "loan_types_max_amount_positive",
      sql`${table.maxAmount} IS NULL OR ${table.maxAmount} > 0`
    ),
    check(
      "loan_types_max_tenure_positive",
      sql`${table.maxTenureMonths} IS NULL OR ${table.maxTenureMonths} > 0`
    ),
    check(
      "loan_types_interest_rate_valid",
      sql`${table.interestRate} >= 0 AND ${table.interestRate} <= 100`
    ),
    check(
      "loan_types_max_percent_valid",
      sql`${table.maxPercentOfSalary} IS NULL OR (${table.maxPercentOfSalary} > 0 AND ${table.maxPercentOfSalary} <= 100)`
    ),
    check(
      "loan_types_min_service_valid",
      sql`${table.minServiceMonths} IS NULL OR ${table.minServiceMonths} >= 0`
    ),
    check(
      "loan_types_description_max_len",
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 2000`
    ),
    index("loan_types_tenant_idx").on(table.tenantId),
    index("loan_types_category_idx").on(table.tenantId, table.category),
    index("loan_types_active_idx").on(table.tenantId, table.isActive),
    ...tenantIsolationPolicies("loan_types"),
    serviceBypassPolicy("loan_types"),
  ]
);

// ============================================================================
// TABLE: employee_loans
// Individual employee loan records with repayment tracking
// ============================================================================
export const employeeLoans = hrSchema.table(
  "employee_loans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    loanNumber: text("loan_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    loanTypeId: uuid("loan_type_id").notNull(),
    status: loanStatusEnum("status").notNull().default("applied"),
    /** Snapshot at origination (product `interest_type` may change later). */
    interestType: loanInterestTypeEnum("interest_type").notNull().default("reducing_balance"),
    principalAmount: numeric("principal_amount", { precision: 15, scale: 2 }).notNull(),
    interestRate: numeric("interest_rate", { precision: 5, scale: 2 }).notNull().default("0"),
    totalRepayable: numeric("total_repayable", { precision: 15, scale: 2 }).notNull(),
    emiAmount: numeric("emi_amount", { precision: 15, scale: 2 }).notNull(),
    repaymentFrequency: loanRepaymentFrequencyEnum("repayment_frequency")
      .notNull()
      .default("monthly"),
    tenureMonths: integer("tenure_months").notNull(),
    currencyId: integer("currency_id").notNull(),
    applicationDate: date("application_date", { mode: "string" }).notNull(),
    approvalDate: date("approval_date", { mode: "string" }),
    disbursementDate: date("disbursement_date", { mode: "string" }),
    firstDeductionDate: date("first_deduction_date", { mode: "string" }),
    lastDeductionDate: date("last_deduction_date", { mode: "string" }),
    closedDate: date("closed_date", { mode: "string" }),
    defaultedDate: date("defaulted_date", { mode: "string" }),
    totalPaid: numeric("total_paid", { precision: 15, scale: 2 }).notNull().default("0"),
    totalOutstanding: numeric("total_outstanding", { precision: 15, scale: 2 }).notNull(),
    installmentsPaid: integer("installments_paid").notNull().default(0),
    installmentsRemaining: integer("installments_remaining").notNull(),
    approvedBy: uuid("approved_by"),
    reason: text("reason"),
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
      columns: [table.tenantId, table.loanTypeId],
      foreignColumns: [loanTypes.tenantId, loanTypes.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.approvedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({ columns: [table.currencyId], foreignColumns: [currencies.currencyId] }),
    uniqueIndex("employee_loans_tenant_number_unique")
      .on(table.tenantId, table.loanNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    check("employee_loans_principal_positive", sql`${table.principalAmount} > 0`),
    check(
      "employee_loans_interest_rate_valid",
      sql`${table.interestRate} >= 0 AND ${table.interestRate} <= 100`
    ),
    check(
      "employee_loans_total_repayable_valid",
      sql`${table.totalRepayable} >= ${table.principalAmount}`
    ),
    check("employee_loans_emi_positive", sql`${table.emiAmount} > 0`),
    check("employee_loans_tenure_positive", sql`${table.tenureMonths} > 0`),
    check("employee_loans_total_paid_valid", sql`${table.totalPaid} >= 0`),
    check("employee_loans_outstanding_valid", sql`${table.totalOutstanding} >= 0`),
    check(
      "employee_loans_outstanding_equals_repayable_minus_paid",
      sql`${table.totalOutstanding} = ${table.totalRepayable} - ${table.totalPaid}`
    ),
    check(
      "employee_loans_total_paid_lte_repayable",
      sql`${table.totalPaid} <= ${table.totalRepayable}`
    ),
    check("employee_loans_installments_paid_valid", sql`${table.installmentsPaid} >= 0`),
    check("employee_loans_installments_remaining_valid", sql`${table.installmentsRemaining} >= 0`),
    check(
      "employee_loans_installments_sum_tenure",
      sql`${table.installmentsPaid} + ${table.installmentsRemaining} = ${table.tenureMonths}`
    ),
    check(
      "employee_loans_approval_after_application",
      sql`${table.approvalDate} IS NULL OR ${table.approvalDate} >= ${table.applicationDate}`
    ),
    check(
      "employee_loans_disbursement_after_approval",
      sql`${table.disbursementDate} IS NULL OR ${table.approvalDate} IS NULL OR ${table.disbursementDate} >= ${table.approvalDate}`
    ),
    check(
      "employee_loans_first_deduction_after_disbursement",
      sql`${table.firstDeductionDate} IS NULL OR ${table.disbursementDate} IS NULL OR ${table.firstDeductionDate} >= ${table.disbursementDate}`
    ),
    check(
      "employee_loans_last_after_first_deduction",
      sql`${table.lastDeductionDate} IS NULL OR ${table.firstDeductionDate} IS NULL OR ${table.lastDeductionDate} >= ${table.firstDeductionDate}`
    ),
    check(
      "employee_loans_reason_max_len",
      sql`${table.reason} IS NULL OR char_length(${table.reason}) <= 2000`
    ),
    check(
      "employee_loans_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 2000`
    ),
    index("employee_loans_tenant_idx").on(table.tenantId),
    index("employee_loans_employee_idx").on(table.tenantId, table.employeeId),
    index("employee_loans_status_idx").on(table.tenantId, table.status),
    index("employee_loans_type_idx").on(table.tenantId, table.loanTypeId),
    index("employee_loans_application_date_idx").on(table.tenantId, table.applicationDate),
    index("employee_loans_closed_date_idx").on(table.tenantId, table.closedDate),
    index("employee_loans_defaulted_date_idx").on(table.tenantId, table.defaultedDate),
    ...tenantIsolationPolicies("employee_loans"),
    serviceBypassPolicy("employee_loans"),
  ]
);

// ============================================================================
// TABLE: employee_loan_installments
// Per-EMI schedule rows (optional; aggregates on `employee_loans` remain for reporting).
// ============================================================================
export const employeeLoanInstallments = hrSchema.table(
  "employee_loan_installments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeLoanId: uuid("employee_loan_id").notNull(),
    installmentNumber: integer("installment_number").notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    amountDue: numeric("amount_due", { precision: 15, scale: 2 }).notNull(),
    amountPaid: numeric("amount_paid", { precision: 15, scale: 2 }).notNull().default("0"),
    paidDate: date("paid_date", { mode: "string" }),
    status: loanInstallmentStatusEnum("status").notNull().default("pending"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeLoanId],
      foreignColumns: [employeeLoans.tenantId, employeeLoans.id],
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    uniqueIndex("employee_loan_installments_loan_number_unique").on(
      table.tenantId,
      table.employeeLoanId,
      table.installmentNumber
    ),
    check("employee_loan_installments_number_positive", sql`${table.installmentNumber} > 0`),
    check("employee_loan_installments_amount_due_positive", sql`${table.amountDue} > 0`),
    check("employee_loan_installments_amount_paid_non_negative", sql`${table.amountPaid} >= 0`),
    check(
      "employee_loan_installments_amount_paid_lte_due",
      sql`${table.amountPaid} <= ${table.amountDue}`
    ),
    check(
      "employee_loan_installments_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 2000`
    ),
    index("employee_loan_installments_tenant_idx").on(table.tenantId),
    index("employee_loan_installments_loan_idx").on(table.tenantId, table.employeeLoanId),
    index("employee_loan_installments_due_idx").on(table.tenantId, table.dueDate),
    index("employee_loan_installments_status_idx").on(table.tenantId, table.status),
    ...tenantIsolationPolicies("employee_loan_installments"),
    serviceBypassPolicy("employee_loan_installments"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertLoanTypeSchema = z.object({
  id: LoanTypeIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  loanCode: z.string().min(2).max(50),
  catalogVersion: z.number().int().positive().default(1),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  category: LoanCategorySchema,
  interestType: LoanInterestTypeSchema.default("reducing_balance"),
  maxAmount: currencyAmountSchema(2).optional(),
  maxTenureMonths: z.number().int().positive().optional(),
  interestRate: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .refine((v) => Number(v) >= 0 && Number(v) <= 100, "Interest rate must be 0-100")
    .default("0"),
  maxPercentOfSalary: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .refine((v) => Number(v) > 0 && Number(v) <= 100, "Must be 1-100")
    .optional(),
  requiresApproval: z.boolean().default(true),
  minServiceMonths: z.number().int().nonnegative().default(0),
  allowMultiple: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const insertEmployeeLoanSchema = z
  .object({
    id: EmployeeLoanIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    loanNumber: z.string().min(3).max(50),
    employeeId: EmployeeIdSchema,
    loanTypeId: LoanTypeIdSchema,
    status: LoanStatusSchema.default("applied"),
    interestType: LoanInterestTypeSchema.default("reducing_balance"),
    principalAmount: currencyAmountSchema(2),
    interestRate: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .refine((v) => Number(v) >= 0 && Number(v) <= 100, "Interest rate must be 0-100")
      .default("0"),
    totalRepayable: currencyAmountSchema(2),
    emiAmount: currencyAmountSchema(2),
    repaymentFrequency: LoanRepaymentFrequencySchema.default("monthly"),
    tenureMonths: z.number().int().positive(),
    currencyId: z.number().int().positive(),
    applicationDate: z.iso.date(),
    approvalDate: z.iso.date().optional(),
    disbursementDate: z.iso.date().optional(),
    firstDeductionDate: z.iso.date().optional(),
    lastDeductionDate: z.iso.date().optional(),
    closedDate: z.iso.date().optional(),
    defaultedDate: z.iso.date().optional(),
    totalPaid: currencyAmountSchema(2).default("0"),
    totalOutstanding: currencyAmountSchema(2),
    installmentsPaid: z.number().int().nonnegative().default(0),
    installmentsRemaining: z.number().int().nonnegative(),
    approvedBy: EmployeeIdSchema.optional(),
    reason: z.string().max(2000).optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    const principal = Number(data.principalAmount);
    const repayable = Number(data.totalRepayable);
    const paid = Number(data.totalPaid);
    const outstanding = Number(data.totalOutstanding);
    if (repayable < principal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Total repayable cannot be less than principal amount",
        path: ["totalRepayable"],
      });
    }
    if (Math.abs(outstanding - (repayable - paid)) > 1e-6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "totalOutstanding must equal totalRepayable minus totalPaid",
        path: ["totalOutstanding"],
      });
    }
    if (paid - repayable > 1e-6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "totalPaid cannot exceed totalRepayable",
        path: ["totalPaid"],
      });
    }
    if (data.installmentsPaid + data.installmentsRemaining !== data.tenureMonths) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "installmentsPaid + installmentsRemaining must equal tenureMonths",
        path: ["installmentsRemaining"],
      });
    }
    if (data.approvalDate && data.applicationDate && data.approvalDate < data.applicationDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Approval date cannot be before application date",
        path: ["approvalDate"],
      });
    }
    if (data.disbursementDate && data.approvalDate && data.disbursementDate < data.approvalDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Disbursement date cannot be before approval date",
        path: ["disbursementDate"],
      });
    }
    if (data.status === "completed" && data.closedDate == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "closedDate is required when status is completed",
        path: ["closedDate"],
      });
    }
    if (data.status === "defaulted" && data.defaultedDate == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "defaultedDate is required when status is defaulted",
        path: ["defaultedDate"],
      });
    }
  });

export const insertEmployeeLoanInstallmentSchema = z
  .object({
    id: EmployeeLoanInstallmentIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeLoanId: EmployeeLoanIdSchema,
    installmentNumber: z.number().int().positive(),
    dueDate: z.iso.date(),
    amountDue: currencyAmountSchema(2),
    amountPaid: currencyAmountSchema(2).default("0"),
    paidDate: z.iso.date().optional(),
    status: LoanInstallmentStatusSchema.default("pending"),
    notes: z.string().max(2000).optional(),
    createdBy: hrAuditUserIdSchema,
    updatedBy: hrAuditUserIdSchema,
  })
  .superRefine((data, ctx) => {
    const due = Number(data.amountDue);
    const paid = Number(data.amountPaid);
    if (paid - due > 1e-6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "amountPaid cannot exceed amountDue",
        path: ["amountPaid"],
      });
    }
    if (paid > 0 && data.paidDate == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "paidDate is required when amountPaid is greater than zero",
        path: ["paidDate"],
      });
    }
  });
