// ============================================================================
// HR DOMAIN: WORKFORCE PLANNING (Upgrade Module)
// Tracks staffing plans, headcount budgets, and departmental workforce forecasts.
// Tables: staffing_plans, staffing_plan_details
//
// Vacancies on details are a PostgreSQL STORED generated column (planned − current).
// Fiscal years use integer start/end for range queries; plan `scenario` + `plan_version`
// support forecasting and revision tracking. Optional `succession_plan_id` links a line
// to succession coverage (DB trigger: must match `succession_plans.critical_position_id`).
// `plan_type` distinguishes budget vs forecast vs actual; `supersedes_plan_id` chains revisions.
// ============================================================================
import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  text,
  uuid,
  uniqueIndex,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../infra-utils/rls/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../infra-utils/columns/index.js";
import { tenants } from "../core/tenants.js";
import { hrSchema } from "./_schema.js";
import {
  staffingPlanStatusEnum,
  staffingPlanScenarioEnum,
  staffingPlanTypeEnum,
  StaffingPlanStatusSchema,
  StaffingPlanScenarioSchema,
  StaffingPlanTypeSchema,
} from "./_enums.js";
import { departments, employees, jobPositions } from "./people.js";
import { successionPlans } from "./workforceStrategy.js";
import { z } from "zod/v4";
import {
  StaffingPlanIdSchema,
  StaffingPlanDetailIdSchema,
  DepartmentIdSchema,
  JobPositionIdSchema,
  EmployeeIdSchema,
  SuccessionPlanIdSchema,
  currencyAmountSchema,
  hrTenantIdSchema,
  refineApprovedRequiresActor,
  refineApprovalFieldsAbsentUnlessApproved,
} from "./_zodShared.js";

const nonNegativeCurrencyAmountSchema = (decimals: number) =>
  currencyAmountSchema(decimals).refine((s) => parseFloat(s) >= 0, "Must be non-negative");

// ============================================================================
// STAFFING PLANS - Workforce planning and headcount budgets
// ============================================================================

export const staffingPlans = hrSchema.table(
  "staffing_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    planCode: text("plan_code").notNull(),
    ...nameColumn,
    description: text("description"),
    /** Inclusive fiscal period for filtering (e.g. 2024, 2025). */
    fiscalYearStart: integer("fiscal_year_start").notNull(),
    fiscalYearEnd: integer("fiscal_year_end").notNull(),
    departmentId: uuid("department_id"),
    status: staffingPlanStatusEnum("status").notNull().default("draft"),
    scenario: staffingPlanScenarioEnum("scenario").notNull().default("baseline"),
    planType: staffingPlanTypeEnum("plan_type").notNull().default("forecast"),
    planVersion: integer("plan_version").notNull().default(1),
    supersedesPlanId: uuid("supersedes_plan_id"),
    approvedBy: uuid("approved_by"),
    approvedDate: timestamp("approved_date", { withTimezone: true }),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.departmentId],
      foreignColumns: [departments.tenantId, departments.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.approvedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.supersedesPlanId],
      foreignColumns: [table.tenantId, table.id],
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    uniqueIndex("staffing_plans_tenant_code_unique")
      .on(table.tenantId, table.planCode)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("staffing_plans_tenant_dept_fiscal_unique")
      .on(
        table.tenantId,
        table.departmentId,
        table.fiscalYearStart,
        table.fiscalYearEnd,
        table.scenario,
        table.planVersion
      )
      .where(sql`${table.deletedAt} IS NULL AND ${table.departmentId} IS NOT NULL`),
    check(
      "staffing_plans_fiscal_year_order",
      sql`${table.fiscalYearEnd} >= ${table.fiscalYearStart}`
    ),
    check(
      "staffing_plans_approval_fields_match_status",
      sql`(
        (${table.status} = 'approved'::hr.staffing_plan_status AND ${table.approvedBy} IS NOT NULL AND ${table.approvedDate} IS NOT NULL)
        OR
        (${table.status} <> 'approved'::hr.staffing_plan_status AND ${table.approvedBy} IS NULL AND ${table.approvedDate} IS NULL)
      )`
    ),
    check(
      "staffing_plans_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 2000`
    ),
    check(
      "staffing_plans_supersedes_not_self",
      sql`${table.supersedesPlanId} IS NULL OR ${table.supersedesPlanId} <> ${table.id}`
    ),
    index("staffing_plans_tenant_idx").on(table.tenantId),
    index("staffing_plans_department_idx").on(table.tenantId, table.departmentId),
    index("staffing_plans_fiscal_range_idx").on(
      table.tenantId,
      table.fiscalYearStart,
      table.fiscalYearEnd
    ),
    index("staffing_plans_status_idx").on(table.tenantId, table.status),
    index("staffing_plans_scenario_idx").on(table.tenantId, table.scenario),
    index("staffing_plans_tenant_status_scenario_idx").on(table.tenantId, table.status, table.scenario),
    index("staffing_plans_forecast_compare_idx").on(
      table.tenantId,
      table.fiscalYearStart,
      table.fiscalYearEnd,
      table.scenario,
      table.planVersion
    ),
    ...tenantIsolationPolicies("staffing_plans"),
    serviceBypassPolicy("staffing_plans"),
  ]
);

// ============================================================================
// STAFFING PLAN DETAILS - Headcount details per position
// ============================================================================

export const staffingPlanDetails = hrSchema.table(
  "staffing_plan_details",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    staffingPlanId: uuid("staffing_plan_id").notNull(),
    jobPositionId: uuid("job_position_id").notNull(),
    successionPlanId: uuid("succession_plan_id"),
    currentHeadcount: integer("current_headcount").notNull().default(0),
    plannedHeadcount: integer("planned_headcount").notNull(),
    vacancies: integer("vacancies")
      .generatedAlwaysAs(sql`(planned_headcount - current_headcount)`)
      .notNull(),
    estimatedCostPerHead: numeric("estimated_cost_per_head", { precision: 15, scale: 2 }),
    totalBudget: numeric("total_budget", { precision: 15, scale: 2 }),
    justification: text("justification"),
    priority: integer("priority").notNull().default(5),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.staffingPlanId],
      foreignColumns: [staffingPlans.tenantId, staffingPlans.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.jobPositionId],
      foreignColumns: [jobPositions.tenantId, jobPositions.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.successionPlanId],
      foreignColumns: [successionPlans.tenantId, successionPlans.id],
    }),
    uniqueIndex("staffing_plan_details_plan_position_unique")
      .on(table.tenantId, table.staffingPlanId, table.jobPositionId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("staffing_plan_details_tenant_idx").on(table.tenantId),
    index("staffing_plan_details_plan_idx").on(table.tenantId, table.staffingPlanId),
    index("staffing_plan_details_position_idx").on(table.tenantId, table.jobPositionId),
    index("staffing_plan_details_plan_position_composite_idx").on(
      table.tenantId,
      table.staffingPlanId,
      table.jobPositionId
    ),
    check(
      "staffing_plan_details_current_non_negative",
      sql`${table.currentHeadcount} >= 0`
    ),
    check(
      "staffing_plan_details_planned_positive",
      sql`${table.plannedHeadcount} > 0`
    ),
    check(
      "staffing_plan_details_headcount_cap",
      sql`${table.currentHeadcount} <= ${table.plannedHeadcount}`
    ),
    check(
      "staffing_plan_details_budget_matches_cost",
      sql`${table.estimatedCostPerHead} IS NULL OR ${table.totalBudget} IS NULL OR ${table.totalBudget} = (${table.estimatedCostPerHead} * ${table.plannedHeadcount}::numeric)`
    ),
    check(
      "staffing_plan_details_priority_range",
      sql`${table.priority} >= 1 AND ${table.priority} <= 10`
    ),
    check(
      "staffing_plan_details_justification_max_len",
      sql`${table.justification} IS NULL OR char_length(${table.justification}) <= 2000`
    ),
    ...tenantIsolationPolicies("staffing_plan_details"),
    serviceBypassPolicy("staffing_plan_details"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertStaffingPlanSchema = z
  .object({
    id: StaffingPlanIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    planCode: z.string().min(2).max(50),
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    fiscalYearStart: z.number().int().min(1900).max(2100),
    fiscalYearEnd: z.number().int().min(1900).max(2100),
    departmentId: DepartmentIdSchema.optional(),
    status: StaffingPlanStatusSchema.default("draft"),
    scenario: StaffingPlanScenarioSchema.default("baseline"),
    planType: StaffingPlanTypeSchema.default("forecast"),
    planVersion: z.number().int().min(1).default(1),
    supersedesPlanId: StaffingPlanIdSchema.optional(),
    approvedBy: EmployeeIdSchema.optional(),
    approvedDate: z.iso.datetime().optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.fiscalYearEnd < data.fiscalYearStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "fiscalYearEnd must be >= fiscalYearStart",
        path: ["fiscalYearEnd"],
      });
    }
    if (
      data.id != null &&
      data.supersedesPlanId != null &&
      data.id === data.supersedesPlanId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "supersedesPlanId cannot equal plan id",
        path: ["supersedesPlanId"],
      });
    }
  })
  .superRefine(
    refineApprovedRequiresActor({
      statusField: "status",
      approvedValue: "approved",
      actorField: "approvedBy",
      atField: "approvedDate",
    })
  )
  .superRefine(
    refineApprovalFieldsAbsentUnlessApproved({
      statusField: "status",
      approvedValue: "approved",
      actorField: "approvedBy",
      atField: "approvedDate",
    })
  );

export const insertStaffingPlanDetailSchema = z
  .object({
    id: StaffingPlanDetailIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    staffingPlanId: StaffingPlanIdSchema,
    jobPositionId: JobPositionIdSchema,
    successionPlanId: SuccessionPlanIdSchema.optional(),
    currentHeadcount: z.number().int().min(0).default(0),
    plannedHeadcount: z.number().int().positive(),
    estimatedCostPerHead: nonNegativeCurrencyAmountSchema(2).optional(),
    totalBudget: nonNegativeCurrencyAmountSchema(2).optional(),
    justification: z.string().max(2000).optional(),
    priority: z.number().int().min(1).max(10).default(5),
  })
  .superRefine((data, ctx) => {
    if (data.currentHeadcount > data.plannedHeadcount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "currentHeadcount cannot exceed plannedHeadcount",
        path: ["currentHeadcount"],
      });
    }
    const est = data.estimatedCostPerHead;
    const total = data.totalBudget;
    if (est != null && total != null) {
      const expected = parseFloat(est) * data.plannedHeadcount;
      const got = parseFloat(total);
      if (!Number.isFinite(expected) || !Number.isFinite(got) || Math.abs(expected - got) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `totalBudget must equal estimatedCostPerHead × plannedHeadcount (${expected.toFixed(2)})`,
          path: ["totalBudget"],
        });
      }
    }
  });
