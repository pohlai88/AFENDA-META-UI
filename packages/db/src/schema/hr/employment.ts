// ============================================================================
// HR DOMAIN: EMPLOYMENT CONTRACTS (Phase 1)
// Stores employment contract terms, benefit plan references, and employee enrollment links.
// Tables: employment_contracts, benefit_plans, employee_benefits
// ============================================================================
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
import { z } from "zod/v4";
import {
  EmploymentContractIdSchema,
  BenefitPlanIdSchema,
  EmployeeBenefitIdSchema,
  EmployeeIdSchema,
  refineDateRange,
  hrTenantIdSchema,
} from "./_zodShared.js";

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
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    probationPeriodMonths: integer("probation_period_months"),
    noticePeriodDays: integer("notice_period_days"),
    workingHoursPerWeek: numeric("working_hours_per_week", { precision: 5, scale: 2 }),
    annualLeaveEntitlement: integer("annual_leave_entitlement"),
    contractDocumentUrl: text("contract_document_url"),
    signedDate: date("signed_date", { mode: "string" }),
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
    enrollmentDate: date("enrollment_date", { mode: "string" }).notNull(),
    effectiveDate: date("effective_date", { mode: "string" }).notNull(),
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

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertEmploymentContractSchema = z
  .object({
    id: EmploymentContractIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    contractNumber: z.string().min(5).max(50),
    employeeId: EmployeeIdSchema,
    contractType: z.enum(["permanent", "fixed_term", "casual", "probation"]),
    contractStatus: z.enum(["draft", "active", "expired", "terminated"]),
    startDate: z.string().date(),
    endDate: z.string().date().optional(),
    probationPeriodMonths: z.number().int().nonnegative().optional(),
    noticePeriodDays: z.number().int().nonnegative().optional(),
    workingHoursPerWeek: z.number().positive().max(168).optional(),
    annualLeaveEntitlement: z.number().int().nonnegative().optional(),
    contractDocumentUrl: z.string().url().optional(),
    signedDate: z.string().date().optional(),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Contract start date cannot be after end date",
        path: ["startDate"],
      });
    }
  });

export const insertBenefitPlanSchema = z.object({
  id: BenefitPlanIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  planCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  benefitType: z.enum(["health", "dental", "vision", "life", "disability", "retirement", "other"]),
  isActive: z.boolean().default(true),
});

export const insertEmployeeBenefitSchema = z
  .object({
    id: EmployeeBenefitIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeId: EmployeeIdSchema,
    benefitPlanId: BenefitPlanIdSchema,
    benefitStatus: z.enum(["active", "pending", "suspended", "cancelled"]).default("active"),
    enrollmentDate: z.string().date(),
    effectiveDate: z.string().date(),
    endDate: z.string().date().optional(),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.enrollmentDate && data.effectiveDate && data.enrollmentDate > data.effectiveDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enrollment date cannot be after effective date",
        path: ["enrollmentDate"],
      });
    }
    if (data.effectiveDate && data.endDate && data.effectiveDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Effective date cannot be after end date",
        path: ["effectiveDate"],
      });
    }
  });
