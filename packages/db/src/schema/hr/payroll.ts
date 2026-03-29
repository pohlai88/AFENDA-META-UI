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
  componentTypeEnum,
  payrollStatusEnum,
  paymentMethodEnum,
} from "./_enums.js";
import { employees } from "./people.js";

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
    effectiveDate: date("effective_date").notNull(),
    endDate: date("end_date"),
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
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    paymentDate: date("payment_date").notNull(),
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
    paymentDate: date("payment_date"),
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
