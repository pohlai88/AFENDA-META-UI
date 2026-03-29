import { sql } from "drizzle-orm";
import {
  boolean,
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
  contractTypeEnum,
  contractStatusEnum,
  benefitTypeEnum,
  benefitStatusEnum,
} from "./_enums.js";
import { employees } from "./people.js";

// ============================================================================
// EMPLOYMENT CONTRACTS
// ============================================================================

export const employmentContracts = hrSchema.table(
  "employment_contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    contractNumber: text("contract_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    contractType: contractTypeEnum("contract_type").notNull(),
    contractStatus: contractStatusEnum("contract_status").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    probationPeriodMonths: integer("probation_period_months"),
    noticePeriodDays: integer("notice_period_days"),
    workingHoursPerWeek: numeric("working_hours_per_week", { precision: 5, scale: 2 }),
    annualLeaveEntitlement: integer("annual_leave_entitlement"),
    contractDocumentUrl: text("contract_document_url"),
    signedDate: date("signed_date"),
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
    uniqueIndex("employment_contracts_tenant_number_unique")
      .on(table.tenantId, table.contractNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("employment_contracts_tenant_idx").on(table.tenantId),
    index("employment_contracts_employee_idx").on(table.tenantId, table.employeeId),
    ...tenantIsolationPolicies("employment_contracts"),
    serviceBypassPolicy("employment_contracts"),
  ]
);

// ============================================================================
// BENEFIT PLANS
// ============================================================================

export const benefitPlans = hrSchema.table(
  "benefit_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    planCode: text("plan_code").notNull(),
    ...nameColumn,
    description: text("description"),
    benefitType: benefitTypeEnum("benefit_type").notNull(),
    provider: text("provider"),
    monthlyCost: numeric("monthly_cost", { precision: 15, scale: 2 }),
    employeeContribution: numeric("employee_contribution", { precision: 15, scale: 2 }),
    employerContribution: numeric("employer_contribution", { precision: 15, scale: 2 }),
    currencyId: integer("currency_id"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({ columns: [table.currencyId], foreignColumns: [currencies.currencyId] }),
    uniqueIndex("benefit_plans_tenant_code_unique")
      .on(table.tenantId, table.planCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("benefit_plans_tenant_idx").on(table.tenantId),
    ...tenantIsolationPolicies("benefit_plans"),
    serviceBypassPolicy("benefit_plans"),
  ]
);

// ============================================================================
// EMPLOYEE BENEFITS
// ============================================================================

export const employeeBenefits = hrSchema.table(
  "employee_benefits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    benefitPlanId: uuid("benefit_plan_id").notNull(),
    benefitStatus: benefitStatusEnum("benefit_status").notNull().default("active"),
    enrollmentDate: date("enrollment_date").notNull(),
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
      columns: [table.tenantId, table.benefitPlanId],
      foreignColumns: [benefitPlans.tenantId, benefitPlans.id],
    }),
    index("employee_benefits_tenant_idx").on(table.tenantId),
    index("employee_benefits_employee_idx").on(table.tenantId, table.employeeId),
    ...tenantIsolationPolicies("employee_benefits"),
    serviceBypassPolicy("employee_benefits"),
  ]
);
