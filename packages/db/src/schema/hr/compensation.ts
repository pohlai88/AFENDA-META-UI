// ============================================================================
// HR DOMAIN: COMPENSATION & EQUITY (Phase 7)
// Defines equity grants, vesting schedules, market benchmarks, and compensation planning cycles/budgets.
// Tables: vesting_schedules, equity_grants, market_benchmarks, compensation_cycles, compensation_budgets
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
  jsonb,
  timestamp,
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
  compensationCycleStatusEnum,
  equityVestingTypeEnum,
  equityGrantTypeEnum,
  equityGrantStatusEnum,
  EquityVestingTypeSchema,
  EquityGrantTypeSchema,
  EquityGrantStatusSchema,
  CompensationCycleStatusSchema,
} from "./_enums.js";
import { employees, departments, jobPositions } from "./people.js";
import { z } from "zod/v4";
import {
  CompensationBudgetIdSchema,
  CompensationCycleIdSchema,
  EquityGrantIdSchema,
  VestingScheduleIdSchema,
  MarketBenchmarkIdSchema,
  EmployeeIdSchema,
  JobPositionIdSchema,
  DepartmentIdSchema,
  currencyAmountSchema,
  refineDateRange,
  hrTenantIdSchema,
} from "./_zodShared.js";

// ============================================================================
// VESTING SCHEDULES - Define equity vesting schedules
// ============================================================================

export const vestingSchedules = hrSchema.table(
  "vesting_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    scheduleCode: text("schedule_code").notNull(),
    ...nameColumn,
    description: text("description"),
    vestingType: equityVestingTypeEnum("vesting_type").notNull(),
    cliffMonths: integer("cliff_months"), // Months before first vesting
    totalMonths: integer("total_months").notNull(), // Total vesting period
    vestingPercentages: jsonb("vesting_percentages").$type<
      { month: number; percentage: number }[]
    >(),
    effectiveFrom: date("effective_from", { mode: "string" }),
    effectiveTo: date("effective_to", { mode: "string" }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("vesting_schedules_tenant_code_unique")
      .on(table.tenantId, table.scheduleCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("vesting_schedules_tenant_idx").on(table.tenantId),
    index("vesting_schedules_type_idx").on(table.tenantId, table.vestingType),
    sql`CONSTRAINT vesting_schedules_total_months_positive CHECK (total_months > 0)`,
    sql`CONSTRAINT vesting_schedules_cliff_valid CHECK (cliff_months IS NULL OR (cliff_months >= 0 AND cliff_months < total_months))`,
    check(
      "vesting_schedules_effective_range",
      sql`(effective_from IS NULL OR effective_to IS NULL OR effective_from <= effective_to)`
    ),
    sql`CONSTRAINT vesting_schedules_percentages_sum_100 CHECK (
      vesting_percentages IS NULL
      OR (
        jsonb_typeof(vesting_percentages) = 'array'
        AND hr.vesting_percentages_total_pct(vesting_percentages) = 100::numeric
      )
    )`,
    ...tenantIsolationPolicies("vesting_schedules"),
    serviceBypassPolicy("vesting_schedules"),
  ]
);

// ============================================================================
// COMPENSATION CYCLES - Annual compensation planning cycles
// ============================================================================

export const compensationCycles = hrSchema.table(
  "compensation_cycles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    cycleCode: text("cycle_code").notNull(),
    ...nameColumn,
    fiscalYear: integer("fiscal_year").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    budgetAmount: numeric("budget_amount", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    status: compensationCycleStatusEnum("status").notNull().default("planning"),
    guidelines: text("guidelines"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("compensation_cycles_tenant_code_unique")
      .on(table.tenantId, table.cycleCode)
      .where(sql`${table.deletedAt} IS NULL`),
    check("compensation_cycles_date_range", sql`${table.endDate} >= ${table.startDate}`),
    check("compensation_cycles_budget_positive", sql`${table.budgetAmount} > 0`),
    check("compensation_cycles_fiscal_year_valid", sql`${table.fiscalYear} >= 2000`),
    check(
      "compensation_cycles_published_closed_order",
      sql`(${table.publishedAt} IS NULL OR ${table.closedAt} IS NULL OR ${table.closedAt} >= ${table.publishedAt})`
    ),
    index("compensation_cycles_tenant_idx").on(table.tenantId),
    index("compensation_cycles_fiscal_year_idx").on(table.tenantId, table.fiscalYear),
    index("compensation_cycles_status_idx").on(table.tenantId, table.status),
    ...tenantIsolationPolicies("compensation_cycles"),
    serviceBypassPolicy("compensation_cycles"),
  ]
);

// ============================================================================
// COMPENSATION BUDGETS - Department/position budgets
// ============================================================================

export const compensationBudgets = hrSchema.table(
  "compensation_budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    cycleId: uuid("cycle_id").notNull(),
    departmentId: uuid("department_id"),
    positionId: uuid("position_id"),
    budgetAmount: numeric("budget_amount", { precision: 15, scale: 2 }).notNull(),
    allocatedAmount: numeric("allocated_amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    remainingAmount: numeric("remaining_amount", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    notes: text("notes"),
    adjustmentReason: text("adjustment_reason"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.cycleId],
      foreignColumns: [compensationCycles.tenantId, compensationCycles.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.departmentId],
      foreignColumns: [departments.tenantId, departments.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.positionId],
      foreignColumns: [jobPositions.tenantId, jobPositions.id],
    }),
    check("compensation_budgets_budget_positive", sql`${table.budgetAmount} >= 0`),
    check("compensation_budgets_allocated_positive", sql`${table.allocatedAmount} >= 0`),
    check("compensation_budgets_remaining_valid", sql`${table.remainingAmount} >= 0`),
    check(
      "compensation_budgets_allocation_valid",
      sql`${table.allocatedAmount} <= ${table.budgetAmount}`
    ),
    check(
      "compensation_budgets_remaining_matches",
      sql`${table.remainingAmount} = ${table.budgetAmount} - ${table.allocatedAmount}`
    ),
    index("compensation_budgets_tenant_idx").on(table.tenantId),
    index("compensation_budgets_cycle_idx").on(table.tenantId, table.cycleId),
    index("compensation_budgets_department_idx").on(table.tenantId, table.departmentId),
    index("compensation_budgets_position_idx").on(table.tenantId, table.positionId),
    ...tenantIsolationPolicies("compensation_budgets"),
    serviceBypassPolicy("compensation_budgets"),
  ]
);

// ============================================================================
// EQUITY GRANTS - Employee equity grants (stock options, RSUs, ESPP)
// ============================================================================
// Lifecycle: see `equityGrantStatuses` in `_enums.ts` and `hr-docs/ADR-005-equity-grant-lifecycle.md`.
// Valid transitions are product-owned; document changes in `hr-docs/` ADRs before tightening CHECK constraints or app rules.
// `equity_grants_expired_requires_expiry`: migration `20260330180000_hr_compensation_hardening` normalizes legacy
// `expired` rows (null or future `expiry_date`) before adding this CHECK so deploys do not fail on old data.

export const equityGrants = hrSchema.table(
  "equity_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    grantNumber: text("grant_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    grantType: equityGrantTypeEnum("grant_type").notNull(),
    grantDate: date("grant_date", { mode: "string" }).notNull(),
    vestingScheduleId: uuid("vesting_schedule_id").notNull(),
    totalShares: numeric("total_shares", { precision: 15, scale: 4 }).notNull(),
    vestedShares: numeric("vested_shares", { precision: 15, scale: 4 }).notNull().default("0"),
    exercisedShares: numeric("exercised_shares", { precision: 15, scale: 4 })
      .notNull()
      .default("0"),
    grantPrice: numeric("grant_price", { precision: 15, scale: 4 }), // Strike price for options
    currentPrice: numeric("current_price", { precision: 15, scale: 4 }), // Current market price
    currencyId: integer("currency_id").notNull(),
    expiryDate: date("expiry_date", { mode: "string" }),
    status: equityGrantStatusEnum("status").notNull().default("active"),
    documentHash: text("document_hash"),
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
      columns: [table.tenantId, table.vestingScheduleId],
      foreignColumns: [vestingSchedules.tenantId, vestingSchedules.id],
    }),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
    }),
    uniqueIndex("equity_grants_tenant_number_unique")
      .on(table.tenantId, table.grantNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    index("equity_grants_tenant_idx").on(table.tenantId),
    index("equity_grants_employee_idx").on(table.tenantId, table.employeeId),
    index("equity_grants_type_idx").on(table.tenantId, table.grantType),
    index("equity_grants_status_idx").on(table.tenantId, table.status),
    index("equity_grants_grant_date_idx").on(table.tenantId, table.grantDate),
    sql`CONSTRAINT equity_grants_total_shares_positive CHECK (total_shares > 0)`,
    sql`CONSTRAINT equity_grants_vested_shares_valid CHECK (vested_shares >= 0 AND vested_shares <= total_shares)`,
    sql`CONSTRAINT equity_grants_exercised_shares_valid CHECK (exercised_shares >= 0 AND exercised_shares <= vested_shares)`,
    sql`CONSTRAINT equity_grants_prices_positive CHECK (
      (grant_price IS NULL OR grant_price >= 0) AND
      (current_price IS NULL OR current_price >= 0)
    )`,
    sql`CONSTRAINT equity_grants_expired_requires_expiry CHECK (
      status::text <> 'expired'
      OR (expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE)
    )`,
    ...tenantIsolationPolicies("equity_grants"),
    serviceBypassPolicy("equity_grants"),
  ]
);

// ============================================================================
// MARKET BENCHMARKS - Salary benchmarking data
// ============================================================================

export const marketBenchmarks = hrSchema.table(
  "market_benchmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    jobPositionId: uuid("job_position_id").notNull(),
    region: text("region").notNull(), // Country or region code
    industry: text("industry"), // Industry classification
    benchmarkDate: date("benchmark_date", { mode: "string" }).notNull(),
    source: text("source").notNull(), // Data source (e.g., "Mercer", "Radford", "Payscale")
    percentile25: numeric("percentile_25", { precision: 15, scale: 2 }).notNull(),
    percentile50: numeric("percentile_50", { precision: 15, scale: 2 }).notNull(), // Median
    percentile75: numeric("percentile_75", { precision: 15, scale: 2 }).notNull(),
    percentile90: numeric("percentile_90", { precision: 15, scale: 2 }), // Optional
    currencyId: integer("currency_id").notNull(),
    sampleSize: integer("sample_size"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.jobPositionId],
      foreignColumns: [jobPositions.tenantId, jobPositions.id],
    }),
    foreignKey({
      columns: [table.currencyId],
      foreignColumns: [currencies.currencyId],
    }),
    uniqueIndex("market_benchmarks_tenant_position_region_date_source_unique")
      .on(table.tenantId, table.jobPositionId, table.region, table.benchmarkDate, table.source)
      .where(sql`${table.deletedAt} IS NULL`),
    index("market_benchmarks_tenant_idx").on(table.tenantId),
    index("market_benchmarks_position_idx").on(table.tenantId, table.jobPositionId),
    index("market_benchmarks_region_idx").on(table.tenantId, table.region),
    index("market_benchmarks_date_idx").on(table.tenantId, table.benchmarkDate),
    sql`CONSTRAINT market_benchmarks_percentiles_ordered CHECK (
      percentile_25 <= percentile_50 AND
      percentile_50 <= percentile_75 AND
      (percentile_90 IS NULL OR percentile_75 <= percentile_90)
    )`,
    sql`CONSTRAINT market_benchmarks_percentiles_positive CHECK (
      percentile_25 > 0 AND
      percentile_50 > 0 AND
      percentile_75 > 0 AND
      (percentile_90 IS NULL OR percentile_90 > 0)
    )`,
    check(
      "market_benchmarks_sample_size_positive",
      sql`${table.sampleSize} IS NULL OR ${table.sampleSize} > 0`
    ),
    ...tenantIsolationPolicies("market_benchmarks"),
    serviceBypassPolicy("market_benchmarks"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertVestingScheduleSchema = z
  .object({
    id: VestingScheduleIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    scheduleCode: z.string().min(2).max(50),
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    vestingType: EquityVestingTypeSchema,
    cliffMonths: z.number().int().min(0).optional(),
    totalMonths: z.number().int().positive(),
    vestingPercentages: z
      .array(
        z.object({
          month: z.number().int().nonnegative(),
          percentage: z.number().min(0).max(100),
        })
      )
      .optional(),
    effectiveFrom: z.iso.date().optional(),
    effectiveTo: z.iso.date().optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.effectiveFrom && data.effectiveTo && data.effectiveFrom > data.effectiveTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "effectiveFrom must be on or before effectiveTo",
        path: ["effectiveTo"],
      });
    }

    if (data.vestingPercentages && data.vestingPercentages.length > 0) {
      const sumPct = data.vestingPercentages.reduce((s, row) => s + row.percentage, 0);
      if (Math.abs(sumPct - 100) > 1e-6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "vestingPercentages must sum to 100 when provided",
          path: ["vestingPercentages"],
        });
      }
      for (let i = 0; i < data.vestingPercentages.length; i++) {
        const m = data.vestingPercentages[i]!.month;
        if (m > data.totalMonths) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `month must not exceed totalMonths (${data.totalMonths})`,
            path: ["vestingPercentages", i, "month"],
          });
        }
      }
    }
  });

export const insertEquityGrantSchema = z
  .object({
    id: EquityGrantIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    grantNumber: z.string().min(1).max(50),
    employeeId: EmployeeIdSchema,
    grantType: EquityGrantTypeSchema,
    grantDate: z.iso.date(),
    vestingScheduleId: VestingScheduleIdSchema,
    totalShares: z
      .string()
      .regex(/^\d+(\.\d{1,4})?$/)
      .refine((val) => parseFloat(val) > 0, "Total shares must be positive"),
    vestedShares: z
      .string()
      .regex(/^\d+(\.\d{1,4})?$/)
      .default("0"),
    exercisedShares: z
      .string()
      .regex(/^\d+(\.\d{1,4})?$/)
      .default("0"),
    grantPrice: currencyAmountSchema(4).optional(),
    currentPrice: currencyAmountSchema(4).optional(),
    currencyId: z.number().int().positive(),
    expiryDate: z.iso.date().optional(),
    status: EquityGrantStatusSchema.default("active"),
    documentHash: z.string().max(128).optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    const totalShares = parseFloat(data.totalShares);
    const vestedShares = parseFloat(data.vestedShares);
    const exercisedShares = parseFloat(data.exercisedShares);

    if (data.status === "expired") {
      if (!data.expiryDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "expiryDate is required when status is expired",
          path: ["expiryDate"],
        });
      } else {
        const today = new Date().toISOString().slice(0, 10);
        if (data.expiryDate > today) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "expiryDate must be on or before today when status is expired",
            path: ["expiryDate"],
          });
        }
      }
    }

    if (vestedShares > totalShares) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vested shares cannot exceed total shares",
        path: ["vestedShares"],
      });
    }

    if (exercisedShares > vestedShares) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exercised shares cannot exceed vested shares",
        path: ["exercisedShares"],
      });
    }
  });

export const insertCompensationCycleSchema = z
  .object({
    id: CompensationCycleIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    cycleCode: z.string().min(3).max(50),
    name: z.string().min(2).max(100),
    fiscalYear: z.number().int().min(2000).max(2100),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    budgetAmount: currencyAmountSchema(2),
    currency: z.string().length(3).default("USD"),
    status: CompensationCycleStatusSchema.default("planning"),
    guidelines: z.string().optional(),
    publishedAt: z.iso.datetime().optional(),
    closedAt: z.iso.datetime().optional(),
  })
  .superRefine(refineDateRange("startDate", "endDate"))
  .superRefine((data, ctx) => {
    if (data.publishedAt && data.closedAt && data.closedAt < data.publishedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "closedAt must be on or after publishedAt",
        path: ["closedAt"],
      });
    }
  });

export const insertCompensationBudgetSchema = z
  .object({
    id: CompensationBudgetIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    cycleId: CompensationCycleIdSchema,
    departmentId: DepartmentIdSchema.optional(),
    positionId: JobPositionIdSchema.optional(),
    budgetAmount: currencyAmountSchema(2),
    allocatedAmount: currencyAmountSchema(2).default("0"),
    remainingAmount: currencyAmountSchema(2),
    currency: z.string().length(3).default("USD"),
    notes: z.string().max(1000).optional(),
    adjustmentReason: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    const budget = parseFloat(data.budgetAmount);
    const allocated = parseFloat(data.allocatedAmount);
    const remaining = parseFloat(data.remainingAmount);
    if (allocated > budget) {
      ctx.addIssue({
        code: "custom",
        message: "Allocated amount cannot exceed budget amount",
        path: ["allocatedAmount"],
      });
    }
    const expectedRemaining = budget - allocated;
    if (Math.abs(remaining - expectedRemaining) > 0.005) {
      ctx.addIssue({
        code: "custom",
        message: "remainingAmount must equal budgetAmount minus allocatedAmount",
        path: ["remainingAmount"],
      });
    }
  });

export const insertMarketBenchmarkSchema = z
  .object({
    id: MarketBenchmarkIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    jobPositionId: JobPositionIdSchema,
    region: z.string().min(2).max(10),
    industry: z.string().max(100).optional(),
    benchmarkDate: z.iso.date(),
    source: z.string().min(2).max(100),
    percentile25: currencyAmountSchema(2).refine(
      (val) => parseFloat(val) > 0,
      "Percentile 25 must be positive"
    ),
    percentile50: currencyAmountSchema(2).refine(
      (val) => parseFloat(val) > 0,
      "Percentile 50 must be positive"
    ),
    percentile75: currencyAmountSchema(2).refine(
      (val) => parseFloat(val) > 0,
      "Percentile 75 must be positive"
    ),
    percentile90: currencyAmountSchema(2)
      .refine((val) => parseFloat(val) > 0, "Percentile 90 must be positive")
      .optional(),
    currencyId: z.number().int().positive(),
    sampleSize: z.number().int().positive().optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    const p25 = parseFloat(data.percentile25);
    const p50 = parseFloat(data.percentile50);
    const p75 = parseFloat(data.percentile75);
    const p90 = data.percentile90 ? parseFloat(data.percentile90) : null;

    if (p25 > p50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percentile 25 must be less than or equal to percentile 50",
        path: ["percentile25"],
      });
    }

    if (p50 > p75) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percentile 50 must be less than or equal to percentile 75",
        path: ["percentile50"],
      });
    }

    if (p90 !== null && p75 > p90) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percentile 75 must be less than or equal to percentile 90",
        path: ["percentile75"],
      });
    }
  });
