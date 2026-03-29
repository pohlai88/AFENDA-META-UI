// ============================================================================
// HR DOMAIN: WORKFORCE PLANNING (Upgrade Module)
// Tracks staffing plans, headcount budgets, and departmental workforce forecasts.
// Tables: staffing_plans, staffing_plan_details
// ============================================================================
import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  text,
  date,
  uuid,
  uniqueIndex,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../columns/index.js";
import { tenants } from "../core/tenants.js";
import { hrSchema } from "./_schema.js";
import { leaveStatusEnum } from "./_enums.js";
import { departments, employees, jobPositions } from "./people.js";
import { z } from "zod/v4";
import {
  StaffingPlanIdSchema,
  StaffingPlanDetailIdSchema,
  DepartmentIdSchema,
  JobPositionIdSchema,
  EmployeeIdSchema,
  currencyAmountSchema,
  hrTenantIdSchema,
} from "./_zodShared.js";

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
    fiscalYear: text("fiscal_year").notNull(), // e.g., "2024-2025"
    departmentId: uuid("department_id"), // Optional - plan for specific dept
    status: leaveStatusEnum("status").notNull().default("draft"),
    approvedBy: uuid("approved_by"),
    approvedDate: timestamp("approved_date"),
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
    uniqueIndex("staffing_plans_tenant_code_unique")
      .on(table.tenantId, table.planCode)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("staffing_plans_tenant_dept_year_unique")
      .on(table.tenantId, table.departmentId, table.fiscalYear)
      .where(sql`${table.deletedAt} IS NULL AND ${table.departmentId} IS NOT NULL`),
    index("staffing_plans_tenant_idx").on(table.tenantId),
    index("staffing_plans_department_idx").on(table.tenantId, table.departmentId),
    index("staffing_plans_fiscal_year_idx").on(table.tenantId, table.fiscalYear),
    index("staffing_plans_status_idx").on(table.tenantId, table.status),
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
    currentHeadcount: integer("current_headcount").notNull().default(0),
    plannedHeadcount: integer("planned_headcount").notNull(),
    vacancies: integer("vacancies").notNull().default(0), // Calculated: planned - current
    estimatedCostPerHead: numeric("estimated_cost_per_head", { precision: 15, scale: 2 }),
    totalBudget: numeric("total_budget", { precision: 15, scale: 2 }),
    justification: text("justification"),
    priority: integer("priority").notNull().default(5), // 1-10 scale
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
    uniqueIndex("staffing_plan_details_plan_position_unique")
      .on(table.tenantId, table.staffingPlanId, table.jobPositionId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("staffing_plan_details_tenant_idx").on(table.tenantId),
    index("staffing_plan_details_plan_idx").on(table.tenantId, table.staffingPlanId),
    index("staffing_plan_details_position_idx").on(table.tenantId, table.jobPositionId),
    sql`CONSTRAINT staffing_plan_details_current_non_negative CHECK (current_headcount >= 0)`,
    sql`CONSTRAINT staffing_plan_details_planned_positive CHECK (planned_headcount > 0)`,
    sql`CONSTRAINT staffing_plan_details_vacancies_non_negative CHECK (vacancies >= 0)`,
    ...tenantIsolationPolicies("staffing_plan_details"),
    serviceBypassPolicy("staffing_plan_details"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertStaffingPlanSchema = z.object({
  id: StaffingPlanIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  planCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  fiscalYear: z.string().regex(/^\d{4}-\d{4}$/, "Fiscal year must be in format YYYY-YYYY"),
  departmentId: DepartmentIdSchema.optional(),
  status: z.enum(["draft", "submitted", "approved", "rejected", "cancelled"]).default("draft"),
  approvedBy: EmployeeIdSchema.optional(),
  approvedDate: z.date().optional(),
  notes: z.string().max(2000).optional(),
});

export const insertStaffingPlanDetailSchema = z
  .object({
    id: StaffingPlanDetailIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    staffingPlanId: StaffingPlanIdSchema,
    jobPositionId: JobPositionIdSchema,
    currentHeadcount: z.number().int().min(0).default(0),
    plannedHeadcount: z.number().int().positive(),
    vacancies: z.number().int().min(0).default(0),
    estimatedCostPerHead: currencyAmountSchema(2).optional(),
    totalBudget: currencyAmountSchema(2).optional(),
    justification: z.string().max(2000).optional(),
    priority: z.number().int().min(1).max(10).default(5),
  })
  .superRefine((data, ctx) => {
    const calculatedVacancies = data.plannedHeadcount - data.currentHeadcount;
    if (data.vacancies !== calculatedVacancies) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Vacancies must equal planned minus current (${calculatedVacancies})`,
        path: ["vacancies"],
      });
    }
  });
