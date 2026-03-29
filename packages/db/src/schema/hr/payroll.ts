// ============================================================================
// HR DOMAIN: PAYROLL & COMPENSATION (Phase 2)
// Salary, pay periods, entries/lines, tax & statutory, adjustments, payslips, payment distributions (10 tables).
// Tables: salary_components, employee_salaries, payroll_periods, payroll_entries, payroll_lines,
//         tax_brackets, statutory_deductions, payroll_adjustments, payslips, payment_distributions
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
  componentTypeEnum,
  payrollStatusEnum,
  paymentMethodEnum,
  countryEnum,
  taxTypeEnum,
  statutoryDeductionTypeEnum,
  payrollAdjustmentTypeEnum,
  PayrollAdjustmentTypeSchema,
} from "./_enums.js";
import { employees } from "./people.js";
import {
  TaxBracketIdSchema,
  StatutoryDeductionIdSchema,
  PayrollAdjustmentIdSchema,
  PayslipIdSchema,
  PaymentDistributionIdSchema,
  SalaryComponentIdSchema,
  EmployeeSalaryIdSchema,
  PayrollPeriodIdSchema,
  PayrollEntryIdSchema,
  PayrollLineIdSchema,
  EmployeeIdSchema,
  hrTenantIdSchema,
} from "./_zodShared.js";

// ============================================================================
// SALARY COMPONENTS
// ============================================================================

export const salaryComponents = hrSchema.table(
  "salary_components",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    componentCode: text("component_code").notNull(),
    ...nameColumn,
    description: text("description"),
    componentType: componentTypeEnum("component_type").notNull(),
    isRecurring: boolean("is_recurring").notNull().default(true),
    isTaxable: boolean("is_taxable").notNull().default(true),
    isStatutory: boolean("is_statutory").notNull().default(false),
    calculationFormula: text("calculation_formula"),
    displayOrder: integer("display_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("salary_components_tenant_code_unique")
      .on(table.tenantId, table.componentCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("salary_components_tenant_idx").on(table.tenantId),
    ...tenantIsolationPolicies("salary_components"),
    serviceBypassPolicy("salary_components"),
  ]
);

// ============================================================================
// EMPLOYEE SALARIES
// ============================================================================

export const employeeSalaries = hrSchema.table(
  "employee_salaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    salaryComponentId: uuid("salary_component_id").notNull(),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currencyId: integer("currency_id").notNull(),
    effectiveDate: date("effective_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
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
      columns: [table.tenantId, table.salaryComponentId],
      foreignColumns: [salaryComponents.tenantId, salaryComponents.id],
    }),
    foreignKey({ columns: [table.currencyId], foreignColumns: [currencies.currencyId] }),
    check("employee_salaries_amount_positive", sql`${table.amount} >= 0`),
    index("employee_salaries_tenant_idx").on(table.tenantId),
    index("employee_salaries_employee_idx").on(table.tenantId, table.employeeId),
    index("employee_salaries_effective_date_idx").on(table.tenantId, table.effectiveDate),
    ...tenantIsolationPolicies("employee_salaries"),
    serviceBypassPolicy("employee_salaries"),
  ]
);

// ============================================================================
// PAYROLL PERIODS
// ============================================================================

export const payrollPeriods = hrSchema.table(
  "payroll_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    periodCode: text("period_code").notNull(),
    ...nameColumn,
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    paymentDate: date("payment_date", { mode: "string" }).notNull(),
    payrollStatus: payrollStatusEnum("payroll_status").notNull().default("draft"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    check("payroll_periods_date_range", sql`${table.startDate} <= ${table.endDate}`),
    uniqueIndex("payroll_periods_tenant_code_unique")
      .on(table.tenantId, table.periodCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("payroll_periods_tenant_idx").on(table.tenantId),
    index("payroll_periods_status_idx").on(table.tenantId, table.payrollStatus),
    ...tenantIsolationPolicies("payroll_periods"),
    serviceBypassPolicy("payroll_periods"),
  ]
);

// ============================================================================
// PAYROLL ENTRIES
// ============================================================================

export const payrollEntries = hrSchema.table(
  "payroll_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    payrollPeriodId: uuid("payroll_period_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    grossPay: numeric("gross_pay", { precision: 15, scale: 2 }).notNull().default("0"),
    totalDeductions: numeric("total_deductions", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    netPay: numeric("net_pay", { precision: 15, scale: 2 }).notNull().default("0"),
    currencyId: integer("currency_id").notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("bank_transfer"),
    paymentReference: text("payment_reference"),
    paymentDate: date("payment_date", { mode: "string" }),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.payrollPeriodId],
      foreignColumns: [payrollPeriods.tenantId, payrollPeriods.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({ columns: [table.currencyId], foreignColumns: [currencies.currencyId] }),
    check("payroll_entries_gross_positive", sql`${table.grossPay} >= 0`),
    check("payroll_entries_net_positive", sql`${table.netPay} >= 0`),
    uniqueIndex("payroll_entries_period_employee_unique").on(
      table.tenantId,
      table.payrollPeriodId,
      table.employeeId
    ),
    index("payroll_entries_tenant_idx").on(table.tenantId),
    index("payroll_entries_period_idx").on(table.tenantId, table.payrollPeriodId),
    index("payroll_entries_employee_idx").on(table.tenantId, table.employeeId),
    index("payroll_entries_employee_payment_idx")
      .on(table.tenantId, table.employeeId, table.paymentDate)
      .where(sql`${table.deletedAt} IS NULL`),
    ...tenantIsolationPolicies("payroll_entries"),
    serviceBypassPolicy("payroll_entries"),
  ]
);

// ============================================================================
// PAYROLL LINES
// ============================================================================

export const payrollLines = hrSchema.table(
  "payroll_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    payrollEntryId: uuid("payroll_entry_id").notNull(),
    salaryComponentId: uuid("salary_component_id").notNull(),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.payrollEntryId],
      foreignColumns: [payrollEntries.tenantId, payrollEntries.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.salaryComponentId],
      foreignColumns: [salaryComponents.tenantId, salaryComponents.id],
    }),
    check("payroll_lines_quantity_positive", sql`${table.quantity} > 0`),
    index("payroll_lines_tenant_idx").on(table.tenantId),
    index("payroll_lines_entry_idx").on(table.tenantId, table.payrollEntryId),
    ...tenantIsolationPolicies("payroll_lines"),
    serviceBypassPolicy("payroll_lines"),
  ]
);

// ============================================================================
// PHASE 3: PAYROLL ENHANCEMENT TABLES
// ============================================================================

// ============================================================================
// TABLE: tax_brackets
// Country-specific tax rules
// ============================================================================
export const taxBrackets = hrSchema.table(
  "tax_brackets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    country: countryEnum("country").notNull(),
    taxType: taxTypeEnum("tax_type").notNull(),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveTo: date("effective_to", { mode: "string" }),
    minIncome: numeric("min_income", { precision: 15, scale: 2 }).notNull(),
    maxIncome: numeric("max_income", { precision: 15, scale: 2 }),
    rate: numeric("rate", { precision: 5, scale: 4 }).notNull(), // Tax rate as decimal (e.g., 0.2250 for 22.5%)
    baseAmount: numeric("base_amount", { precision: 15, scale: 2 }).default("0"),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    check(
      "tax_brackets_income_range",
      sql`${table.maxIncome} IS NULL OR ${table.maxIncome} > ${table.minIncome}`
    ),
    check("tax_brackets_rate_valid", sql`${table.rate} >= 0 AND ${table.rate} <= 1`),
    check("tax_brackets_base_valid", sql`${table.baseAmount} >= 0`),
    check(
      "tax_brackets_date_range",
      sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} >= ${table.effectiveFrom}`
    ),
    index("tax_brackets_tenant_idx").on(table.tenantId),
    index("tax_brackets_country_idx").on(table.tenantId, table.country),
    index("tax_brackets_type_idx").on(table.tenantId, table.taxType),
    index("tax_brackets_effective_idx").on(table.tenantId, table.effectiveFrom),
    ...tenantIsolationPolicies("tax_brackets"),
    serviceBypassPolicy("tax_brackets"),
  ]
);

// ============================================================================
// TABLE: statutory_deductions
// Mandatory deductions (CPF, EPF, Social Security, etc.)
// ============================================================================
export const statutoryDeductions = hrSchema.table(
  "statutory_deductions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    country: countryEnum("country").notNull(),
    deductionType: statutoryDeductionTypeEnum("deduction_type").notNull(),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveTo: date("effective_to", { mode: "string" }),
    employeeRate: numeric("employee_rate", { precision: 5, scale: 4 }).notNull(), // Employee contribution rate
    employerRate: numeric("employer_rate", { precision: 5, scale: 4 }).notNull(), // Employer contribution rate
    maxMonthlySalary: numeric("max_monthly_salary", { precision: 15, scale: 2 }), // Salary cap for calculation
    maxMonthlyContribution: numeric("max_monthly_contribution", { precision: 15, scale: 2 }), // Maximum contribution
    minAge: integer("min_age"),
    maxAge: integer("max_age"),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    check(
      "statutory_deductions_rates_valid",
      sql`${table.employeeRate} >= 0 AND ${table.employeeRate} <= 1`
    ),
    check(
      "statutory_deductions_employer_rate_valid",
      sql`${table.employerRate} >= 0 AND ${table.employerRate} <= 1`
    ),
    check(
      "statutory_deductions_salary_positive",
      sql`${table.maxMonthlySalary} IS NULL OR ${table.maxMonthlySalary} > 0`
    ),
    check(
      "statutory_deductions_contribution_positive",
      sql`${table.maxMonthlyContribution} IS NULL OR ${table.maxMonthlyContribution} > 0`
    ),
    check(
      "statutory_deductions_age_range",
      sql`${table.minAge} IS NULL OR ${table.maxAge} IS NULL OR ${table.maxAge} > ${table.minAge}`
    ),
    check(
      "statutory_deductions_date_range",
      sql`${table.effectiveTo} IS NULL OR ${table.effectiveTo} >= ${table.effectiveFrom}`
    ),
    index("statutory_deductions_tenant_idx").on(table.tenantId),
    index("statutory_deductions_country_idx").on(table.tenantId, table.country),
    index("statutory_deductions_type_idx").on(table.tenantId, table.deductionType),
    index("statutory_deductions_effective_idx").on(table.tenantId, table.effectiveFrom),
    ...tenantIsolationPolicies("statutory_deductions"),
    serviceBypassPolicy("statutory_deductions"),
  ]
);

// ============================================================================
// TABLE: payroll_adjustments
// One-time adjustments, corrections
// ============================================================================
export const payrollAdjustments = hrSchema.table(
  "payroll_adjustments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    payrollEntryId: uuid("payroll_entry_id").notNull(),
    adjustmentType: payrollAdjustmentTypeEnum("adjustment_type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    reason: text("reason").notNull(),
    approvedBy: uuid("approved_by"),
    approvedAt: date("approved_at", { mode: "string" }),
    isTaxable: boolean("is_taxable").notNull().default(true),
    isRecurring: boolean("is_recurring").notNull().default(false),
    appliesToPeriod: date("applies_to_period"), // If recurring, the period it applies to
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.payrollEntryId],
      foreignColumns: [payrollEntries.tenantId, payrollEntries.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.approvedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    check(
      "payroll_adjustments_approved_consistency",
      sql`(${table.approvedBy} IS NULL AND ${table.approvedAt} IS NULL) OR (${table.approvedBy} IS NOT NULL AND ${table.approvedAt} IS NOT NULL)`
    ),
    index("payroll_adjustments_tenant_idx").on(table.tenantId),
    index("payroll_adjustments_entry_idx").on(table.tenantId, table.payrollEntryId),
    index("payroll_adjustments_type_idx").on(table.tenantId, table.adjustmentType),
    index("payroll_adjustments_approved_idx").on(table.tenantId, table.approvedBy),
    ...tenantIsolationPolicies("payroll_adjustments"),
    serviceBypassPolicy("payroll_adjustments"),
  ]
);

// ============================================================================
// TABLE: payslips
// Generated payslip documents
// ============================================================================
export const payslips = hrSchema.table(
  "payslips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    payrollEntryId: uuid("payroll_entry_id").notNull(),
    payslipNumber: text("payslip_number").notNull(),
    payslipPeriod: text("payslip_period").notNull(), // e.g., "January 2024"
    payDate: date("pay_date", { mode: "string" }).notNull(),
    documentUrl: text("document_url"), // URL to PDF payslip
    documentHash: text("document_hash"), // For integrity verification
    isAccessible: boolean("is_accessible").notNull().default(true), // Employee can view
    accessCode: text("access_code"), // Secure access code
    emailedAt: date("emailed_at", { mode: "string" }),
    viewedAt: date("viewed_at", { mode: "string" }),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.payrollEntryId],
      foreignColumns: [payrollEntries.tenantId, payrollEntries.id],
    }),
    uniqueIndex("payslips_tenant_number_unique")
      .on(table.tenantId, table.payslipNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("payslips_access_code_unique").on(table.accessCode),
    index("payslips_tenant_idx").on(table.tenantId),
    index("payslips_entry_idx").on(table.tenantId, table.payrollEntryId),
    index("payslips_period_idx").on(table.tenantId, table.payslipPeriod),
    index("payslips_pay_date_idx").on(table.tenantId, table.payDate),
    ...tenantIsolationPolicies("payslips"),
    serviceBypassPolicy("payslips"),
  ]
);

// ============================================================================
// TABLE: payment_distributions
// Bank transfer records
// ============================================================================
export const paymentDistributions = hrSchema.table(
  "payment_distributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    payrollEntryId: uuid("payroll_entry_id").notNull(),
    batchId: text("batch_id").notNull(), // Payment batch identifier
    transactionId: text("transaction_id"), // Bank transaction ID
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    bankName: text("bank_name"),
    bankCode: text("bank_code"),
    accountNumber: text("account_number"), // Encrypted
    accountName: text("account_name"),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currencyId: integer("currency_id").notNull(),
    status: text("status").notNull().default("pending"), // pending, processing, completed, failed, returned
    processedAt: date("processed_at", { mode: "string" }),
    settledAt: date("settled_at", { mode: "string" }),
    failureReason: text("failure_reason"),
    reference: text("reference"), // Payment reference
    metadata: text("metadata"), // JSON for additional bank-specific data
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.payrollEntryId],
      foreignColumns: [payrollEntries.tenantId, payrollEntries.id],
    }),
    foreignKey({ columns: [table.currencyId], foreignColumns: [currencies.currencyId] }),
    check("payment_distributions_amount_positive", sql`${table.amount} > 0`),
    check(
      "payment_distributions_status_valid",
      sql`${table.status} IN ('pending', 'processing', 'completed', 'failed', 'returned')`
    ),
    check(
      "payment_distributions_date_consistency",
      sql`(${table.processedAt} IS NULL AND ${table.settledAt} IS NULL) OR (${table.processedAt} IS NOT NULL AND ${table.settledAt} IS NULL OR ${table.settledAt} >= ${table.processedAt})`
    ),
    index("payment_distributions_tenant_idx").on(table.tenantId),
    index("payment_distributions_entry_idx").on(table.tenantId, table.payrollEntryId),
    index("payment_distributions_batch_idx").on(table.tenantId, table.batchId),
    index("payment_distributions_status_idx").on(table.tenantId, table.status),
    index("payment_distributions_transaction_idx").on(table.tenantId, table.transactionId),
    ...tenantIsolationPolicies("payment_distributions"),
    serviceBypassPolicy("payment_distributions"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertSalaryComponentSchema = z.object({
  id: SalaryComponentIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  componentCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  componentType: z.enum([
    "allowance",
    "deduction",
    "benefit",
    "tax",
    "contribution",
    "overtime",
    "bonus",
    "commission",
    "other",
  ]),
  isRecurring: z.boolean().default(true),
  isTaxable: z.boolean().default(true),
  isStatutory: z.boolean().default(false),
  calculationFormula: z.string().max(1000).optional(),
  displayOrder: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

export const insertEmployeeSalarySchema = z.object({
  id: EmployeeSalaryIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  employeeId: EmployeeIdSchema,
  salaryComponentId: SalaryComponentIdSchema,
  amount: z.number().positive(),
  currencyId: z.number().int().positive(),
  effectiveDate: z.string().date(),
  endDate: z.string().date().optional(),
  notes: z.string().max(1000).optional(),
});

export const insertPayrollPeriodSchema = z.object({
  id: PayrollPeriodIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  periodCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  startDate: z.string().date(),
  endDate: z.string().date(),
  paymentDate: z.string().date(),
  payrollStatus: z.enum(["draft", "computed", "approved", "paid", "cancelled"]).default("draft"),
  notes: z.string().max(1000).optional(),
});

export const insertPayrollEntrySchema = z.object({
  id: PayrollEntryIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  payrollPeriodId: PayrollPeriodIdSchema,
  employeeId: EmployeeIdSchema,
  grossPay: z.number().nonnegative().default(0),
  totalDeductions: z.number().nonnegative().default(0),
  netPay: z.number().nonnegative().default(0),
  currencyId: z.number().int().positive(),
  paymentMethod: z
    .enum(["bank_transfer", "cash", "check", "payroll_card"])
    .default("bank_transfer"),
  paymentReference: z.string().max(100).optional(),
  paymentDate: z.string().date().optional(),
  notes: z.string().max(1000).optional(),
});

export const insertPayrollLineSchema = z.object({
  id: PayrollLineIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  payrollEntryId: PayrollEntryIdSchema,
  salaryComponentId: SalaryComponentIdSchema,
  amount: z.number(),
  quantity: z.number().positive().default(1),
  notes: z.string().max(500).optional(),
});

// Phase 3 Schemas
export const insertTaxBracketSchema = z
  .object({
    id: TaxBracketIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    country: z.enum([
      "US",
      "SG",
      "MY",
      "ID",
      "GB",
      "AU",
      "CA",
      "IN",
      "PH",
      "TH",
      "VN",
      "HK",
      "TW",
      "JP",
      "KR",
      "NZ",
    ]),
    taxType: z.enum([
      "income_tax",
      "social_security",
      "medicare",
      "provincial_tax",
      "local_tax",
      "disability_insurance",
      "unemployment_insurance",
    ]),
    effectiveFrom: z.string().date(),
    effectiveTo: z.string().date().optional(),
    minIncome: z.number().nonnegative(),
    maxIncome: z.number().positive().optional(),
    rate: z.number().min(0).max(1),
    baseAmount: z.number().nonnegative().default(0),
    description: z.string().max(500).optional(),
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.maxIncome === undefined || data.maxIncome > data.minIncome, {
    message: "maxIncome must be greater than minIncome",
    path: ["maxIncome"],
  });

export const insertStatutoryDeductionSchema = z
  .object({
    id: StatutoryDeductionIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    country: z.enum([
      "US",
      "SG",
      "MY",
      "ID",
      "GB",
      "AU",
      "CA",
      "IN",
      "PH",
      "TH",
      "VN",
      "HK",
      "TW",
      "JP",
      "KR",
      "NZ",
    ]),
    deductionType: z.enum([
      "cpf",
      "epf",
      "socso",
      "eis",
      "pcb",
      "cpf_cpf",
      "cpf_medisave",
      "cpf_oa",
      "cpf_sa",
      "ssn",
      "medicare",
      "futa",
      "suta",
      "national_insurance",
      "pension",
      "superannuation",
      "provident_fund",
      "esi",
      "pf",
      "professional_tax",
    ]),
    effectiveFrom: z.string().date(),
    effectiveTo: z.string().date().optional(),
    employeeRate: z.number().min(0).max(1),
    employerRate: z.number().min(0).max(1),
    maxMonthlySalary: z.number().positive().optional(),
    maxMonthlyContribution: z.number().positive().optional(),
    minAge: z.number().int().positive().optional(),
    maxAge: z.number().int().positive().optional(),
    description: z.string().max(500).optional(),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => data.minAge === undefined || data.maxAge === undefined || data.maxAge > data.minAge,
    {
      message: "maxAge must be greater than minAge",
      path: ["maxAge"],
    }
  );

export const insertPayrollAdjustmentSchema = z
  .object({
    id: PayrollAdjustmentIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    payrollEntryId: PayrollEntryIdSchema,
    adjustmentType: PayrollAdjustmentTypeSchema,
    amount: z.number(),
    reason: z.string().min(5).max(500),
    approvedBy: EmployeeIdSchema.optional(),
    approvedAt: z.string().date().optional(),
    isTaxable: z.boolean().default(true),
    isRecurring: z.boolean().default(false),
    appliesToPeriod: z.string().date().optional(),
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

export const insertPayslipSchema = z.object({
  id: PayslipIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  payrollEntryId: PayrollEntryIdSchema,
  payslipNumber: z.string().min(5).max(50),
  payslipPeriod: z.string().min(3).max(50),
  payDate: z.string().date(),
  documentUrl: z.string().url().optional(),
  documentHash: z.string().max(128).optional(),
  isAccessible: z.boolean().default(true),
  accessCode: z.string().min(8).max(50).optional(),
  emailedAt: z.string().date().optional(),
  viewedAt: z.string().date().optional(),
});

export const insertPaymentDistributionSchema = z.object({
  id: PaymentDistributionIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  payrollEntryId: PayrollEntryIdSchema,
  batchId: z.string().min(3).max(50),
  transactionId: z.string().max(100).optional(),
  paymentMethod: z.enum(["bank_transfer", "cash", "check", "payroll_card"]),
  bankName: z.string().max(100).optional(),
  bankCode: z.string().max(20).optional(),
  accountNumber: z.string().max(50).optional(),
  accountName: z.string().max(100).optional(),
  amount: z.number().positive(),
  currencyId: z.number().int().positive(),
  status: z.enum(["pending", "processing", "completed", "failed", "returned"]).default("pending"),
  processedAt: z.string().date().optional(),
  settledAt: z.string().date().optional(),
  failureReason: z.string().max(500).optional(),
  reference: z.string().max(100).optional(),
  metadata: z.string().optional(), // JSON string
});
