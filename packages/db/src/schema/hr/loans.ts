// ============================================================================
// HR DOMAIN: LOAN MANAGEMENT (SWOT Proposal - P1)
// Defines loan product catalogs and employee loan lifecycle records.
// Tables: loan_types, employee_loans
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
import { loanCategoryEnum, loanStatusEnum, loanRepaymentFrequencyEnum } from "./_enums.js";
import { employees } from "./people.js";
import {
  LoanTypeIdSchema,
  EmployeeLoanIdSchema,
  EmployeeIdSchema,
  currencyAmountSchema,
  hrTenantIdSchema,
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
    ...nameColumn,
    description: text("description"),
    category: loanCategoryEnum("category").notNull(),
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
    uniqueIndex("loan_types_tenant_code_unique")
      .on(table.tenantId, table.loanCode)
      .where(sql`${table.deletedAt} IS NULL`),
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
    principalAmount: numeric("principal_amount", { precision: 15, scale: 2 }).notNull(),
    interestRate: numeric("interest_rate", { precision: 5, scale: 2 }).notNull().default("0"),
    totalRepayable: numeric("total_repayable", { precision: 15, scale: 2 }).notNull(),
    emiAmount: numeric("emi_amount", { precision: 15, scale: 2 }).notNull(),
    repaymentFrequency: loanRepaymentFrequencyEnum("repayment_frequency")
      .notNull()
      .default("monthly"),
    tenureMonths: integer("tenure_months").notNull(),
    currencyId: integer("currency_id"),
    applicationDate: date("application_date", { mode: "string" }).notNull(),
    approvalDate: date("approval_date", { mode: "string" }),
    disbursementDate: date("disbursement_date", { mode: "string" }),
    firstDeductionDate: date("first_deduction_date", { mode: "string" }),
    lastDeductionDate: date("last_deduction_date", { mode: "string" }),
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
    check("employee_loans_installments_paid_valid", sql`${table.installmentsPaid} >= 0`),
    check("employee_loans_installments_remaining_valid", sql`${table.installmentsRemaining} >= 0`),
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
    index("employee_loans_tenant_idx").on(table.tenantId),
    index("employee_loans_employee_idx").on(table.tenantId, table.employeeId),
    index("employee_loans_status_idx").on(table.tenantId, table.status),
    index("employee_loans_type_idx").on(table.tenantId, table.loanTypeId),
    index("employee_loans_application_date_idx").on(table.tenantId, table.applicationDate),
    ...tenantIsolationPolicies("employee_loans"),
    serviceBypassPolicy("employee_loans"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertLoanTypeSchema = z.object({
  id: LoanTypeIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  loanCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  category: z.enum([
    "salary_advance",
    "personal_loan",
    "housing_loan",
    "vehicle_loan",
    "education_loan",
    "medical_loan",
    "emergency_loan",
    "other",
  ]),
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
    status: z
      .enum(["applied", "approved", "disbursed", "repaying", "completed", "defaulted", "cancelled"])
      .default("applied"),
    principalAmount: currencyAmountSchema(2),
    interestRate: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .refine((v) => Number(v) >= 0 && Number(v) <= 100, "Interest rate must be 0-100")
      .default("0"),
    totalRepayable: currencyAmountSchema(2),
    emiAmount: currencyAmountSchema(2),
    repaymentFrequency: z.enum(["monthly", "bi_weekly", "weekly"]).default("monthly"),
    tenureMonths: z.number().int().positive(),
    currencyId: z.number().int().positive().optional(),
    applicationDate: z.string().date(),
    approvalDate: z.string().date().optional(),
    disbursementDate: z.string().date().optional(),
    firstDeductionDate: z.string().date().optional(),
    lastDeductionDate: z.string().date().optional(),
    totalPaid: currencyAmountSchema(2).default("0"),
    totalOutstanding: currencyAmountSchema(2),
    installmentsPaid: z.number().int().nonnegative().default(0),
    installmentsRemaining: z.number().int().nonnegative(),
    approvedBy: EmployeeIdSchema.optional(),
    reason: z.string().max(2000).optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (Number(data.totalRepayable) < Number(data.principalAmount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Total repayable cannot be less than principal amount",
        path: ["totalRepayable"],
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
  });
