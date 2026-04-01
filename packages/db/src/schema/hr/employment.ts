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
  contractTypeEnum,
  contractStatusEnum,
  benefitTypeEnum,
  benefitStatusEnum,
  BenefitStatusSchema,
  BenefitTypeSchema,
  ContractStatusSchema,
  ContractTypeSchema,
} from "./_enums.js";
import { employees } from "./people.js";
import { z } from "zod/v4";
import {
  EmploymentContractIdSchema,
  BenefitPlanIdSchema,
  EmployeeBenefitIdSchema,
  EmployeeIdSchema,
  hrTenantIdSchema,
  currencyAmountSchema,
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
    amendmentNumber: integer("amendment_number").notNull().default(1),
    /** Integrity fingerprint for uploaded contract file (e.g. SHA-256 hex). */
    documentHash: text("document_hash"),
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
    uniqueIndex("employment_contracts_tenant_number_unique")
      .on(table.tenantId, table.contractNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("employment_contracts_tenant_idx").on(table.tenantId),
    index("employment_contracts_employee_idx").on(table.tenantId, table.employeeId),
    sql`CONSTRAINT employment_contracts_date_range_ok CHECK (
      end_date IS NULL OR end_date >= start_date
    )`,
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
    effectiveFrom: date("effective_from", { mode: "string" }),
    effectiveTo: date("effective_to", { mode: "string" }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({ columns: [table.currencyId], foreignColumns: [currencies.currencyId] }),
    uniqueIndex("benefit_plans_tenant_code_unique")
      .on(table.tenantId, table.planCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("benefit_plans_tenant_idx").on(table.tenantId),
    sql`CONSTRAINT benefit_plans_effective_range_ok CHECK (
      effective_from IS NULL OR effective_to IS NULL OR effective_from <= effective_to
    )`,
    sql`CONSTRAINT benefit_plans_contributions_sum_monthly CHECK (
      monthly_cost IS NULL
      OR employee_contribution IS NULL
      OR employer_contribution IS NULL
      OR monthly_cost = employee_contribution + employer_contribution
    )`,
    sql`CONSTRAINT benefit_plans_currency_when_costs CHECK (
      (
        monthly_cost IS NULL
        AND employee_contribution IS NULL
        AND employer_contribution IS NULL
      )
      OR currency_id IS NOT NULL
    )`,
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
    endDate: date("end_date", { mode: "string" }),
    terminatedDate: date("terminated_date", { mode: "string" }),
    terminationReason: text("termination_reason"),
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
      columns: [table.tenantId, table.benefitPlanId],
      foreignColumns: [benefitPlans.tenantId, benefitPlans.id],
    }),
    index("employee_benefits_tenant_idx").on(table.tenantId),
    index("employee_benefits_employee_idx").on(table.tenantId, table.employeeId),
    sql`CONSTRAINT employee_benefits_enrollment_before_effective CHECK (
      enrollment_date <= effective_date
    )`,
    sql`CONSTRAINT employee_benefits_effective_before_end CHECK (
      end_date IS NULL OR end_date >= effective_date
    )`,
    sql`CONSTRAINT employee_benefits_termination_after_effective CHECK (
      terminated_date IS NULL OR terminated_date >= effective_date
    )`,
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
    contractType: ContractTypeSchema,
    contractStatus: ContractStatusSchema,
    startDate: z.iso.date(),
    endDate: z.iso.date().optional(),
    probationPeriodMonths: z.number().int().nonnegative().optional(),
    noticePeriodDays: z.number().int().nonnegative().optional(),
    workingHoursPerWeek: z.number().positive().max(168).optional(),
    annualLeaveEntitlement: z.number().int().nonnegative().optional(),
    contractDocumentUrl: z.string().url().optional(),
    signedDate: z.iso.date().optional(),
    notes: z.string().max(1000).optional(),
    amendmentNumber: z.number().int().positive().default(1),
    documentHash: z
      .string()
      .max(128)
      .regex(/^[A-Fa-f0-9]+$/, "documentHash must be hexadecimal")
      .optional(),
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

const benefitPlanMoney = currencyAmountSchema(2).optional();

export const insertBenefitPlanSchema = z
  .object({
    id: BenefitPlanIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    planCode: z.string().min(2).max(50),
    name: z.string().min(2).max(100),
    description: z.string().max(1000).optional(),
    benefitType: BenefitTypeSchema,
    provider: z.string().max(200).optional(),
    monthlyCost: benefitPlanMoney,
    employeeContribution: benefitPlanMoney,
    employerContribution: benefitPlanMoney,
    currencyId: z.number().int().positive().optional(),
    effectiveFrom: z.iso.date().optional(),
    effectiveTo: z.iso.date().optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    const hasMoney =
      data.monthlyCost != null || data.employeeContribution != null || data.employerContribution != null;
    if (hasMoney && data.currencyId == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "currencyId is required when any contribution or monthly cost is set",
        path: ["currencyId"],
      });
    }
    if (data.effectiveFrom && data.effectiveTo && data.effectiveFrom > data.effectiveTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "effectiveFrom must be on or before effectiveTo",
        path: ["effectiveTo"],
      });
    }
    if (
      data.monthlyCost != null &&
      data.employeeContribution != null &&
      data.employerContribution != null
    ) {
      const sum =
        parseFloat(data.employeeContribution) + parseFloat(data.employerContribution);
      const monthly = parseFloat(data.monthlyCost);
      if (Math.abs(sum - monthly) > 0.005) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "monthlyCost must equal employeeContribution + employerContribution",
          path: ["monthlyCost"],
        });
      }
    }
  });

export const insertEmployeeBenefitSchema = z
  .object({
    id: EmployeeBenefitIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeId: EmployeeIdSchema,
    benefitPlanId: BenefitPlanIdSchema,
    benefitStatus: BenefitStatusSchema.default("active"),
    enrollmentDate: z.iso.date(),
    effectiveDate: z.iso.date(),
    endDate: z.iso.date().optional(),
    terminatedDate: z.iso.date().optional(),
    terminationReason: z.string().max(500).optional(),
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
    if (data.terminatedDate && data.effectiveDate && data.terminatedDate < data.effectiveDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "terminatedDate cannot be before effective date",
        path: ["terminatedDate"],
      });
    }
  });
