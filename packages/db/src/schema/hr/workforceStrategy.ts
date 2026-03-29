// ============================================================================
// HR DOMAIN: STRATEGIC WORKFORCE MANAGEMENT MODULE (Phase 7)
// Implements: succession_plans, talent_pools, talent_pool_members, career_paths,
// career_path_steps, career_aspirations, compensation_cycles, compensation_budgets
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
  timestamp,
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
import { hrSchema } from "./_schema.js";
import {
  successionReadinessEnum,
  talentPoolStatusEnum,
  careerPathStatusEnum,
  compensationCycleStatusEnum,
} from "./_enums.js";
import { employees, departments, jobPositions } from "./people.js";
import {
  SuccessionPlanIdSchema,
  TalentPoolIdSchema,
  TalentPoolMemberIdSchema,
  CareerPathIdSchema,
  CareerPathStepIdSchema,
  CareerAspirationIdSchema,
  CompensationCycleIdSchema,
  CompensationBudgetIdSchema,
  currencyAmountSchema,
  refineDateRange,
  refineAmountRange,
} from "./_zodShared.js";

// ============================================================================
// TABLE: succession_plans
// Leadership replacement plans
// ============================================================================
export const successionPlans = hrSchema.table(
  "succession_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    planCode: text("plan_code").notNull(),
    criticalPositionId: uuid("critical_position_id").notNull(),
    successorEmployeeId: uuid("successor_employee_id").notNull(),
    readiness: successionReadinessEnum("readiness").notNull(),
    developmentPlan: text("development_plan"),
    targetDate: date("target_date", { mode: "string" }),
    riskLevel: text("risk_level").notNull(), // low, medium, high, critical
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.criticalPositionId],
      foreignColumns: [jobPositions.tenantId, jobPositions.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.successorEmployeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("succession_plans_tenant_code_unique")
      .on(table.tenantId, table.planCode)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "succession_plans_risk_level_valid",
      sql`${table.riskLevel} IN ('low', 'medium', 'high', 'critical')`
    ),
    index("succession_plans_tenant_idx").on(table.tenantId),
    index("succession_plans_position_idx").on(table.tenantId, table.criticalPositionId),
    index("succession_plans_successor_idx").on(table.tenantId, table.successorEmployeeId),
    index("succession_plans_readiness_idx").on(table.tenantId, table.readiness),
    ...tenantIsolationPolicies("succession_plans"),
    serviceBypassPolicy("succession_plans"),
  ]
);

// ============================================================================
// TABLE: talent_pools
// Talent pool definitions
// ============================================================================
export const talentPools = hrSchema.table(
  "talent_pools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    poolCode: text("pool_code").notNull(),
    ...nameColumn,
    description: text("description"),
    poolType: text("pool_type").notNull(), // leadership, technical, high_potential, critical_skills
    status: talentPoolStatusEnum("status").notNull().default("active"),
    criteria: text("criteria"), // JSON
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("talent_pools_tenant_code_unique")
      .on(table.tenantId, table.poolCode)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "talent_pools_type_valid",
      sql`${table.poolType} IN ('leadership', 'technical', 'high_potential', 'critical_skills')`
    ),
    index("talent_pools_tenant_idx").on(table.tenantId),
    index("talent_pools_status_idx").on(table.tenantId, table.status),
    index("talent_pools_type_idx").on(table.tenantId, table.poolType),
    ...tenantIsolationPolicies("talent_pools"),
    serviceBypassPolicy("talent_pools"),
  ]
);

// ============================================================================
// TABLE: talent_pool_members
// Pool membership with readiness tracking
// ============================================================================
export const talentPoolMembers = hrSchema.table(
  "talent_pool_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    poolId: uuid("pool_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    joinedDate: date("joined_date", { mode: "string" }).notNull(),
    readiness: successionReadinessEnum("readiness").notNull(),
    performanceRating: text("performance_rating"),
    potentialRating: text("potential_rating"), // low, medium, high
    developmentPlan: text("development_plan"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.poolId],
      foreignColumns: [talentPools.tenantId, talentPools.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("talent_pool_members_pool_employee_unique").on(
      table.tenantId,
      table.poolId,
      table.employeeId
    ),
    check(
      "talent_pool_members_potential_valid",
      sql`${table.potentialRating} IS NULL OR ${table.potentialRating} IN ('low', 'medium', 'high')`
    ),
    index("talent_pool_members_tenant_idx").on(table.tenantId),
    index("talent_pool_members_pool_idx").on(table.tenantId, table.poolId),
    index("talent_pool_members_employee_idx").on(table.tenantId, table.employeeId),
    index("talent_pool_members_readiness_idx").on(table.tenantId, table.readiness),
    ...tenantIsolationPolicies("talent_pool_members"),
    serviceBypassPolicy("talent_pool_members"),
  ]
);

// ============================================================================
// TABLE: career_paths
// Career progression tracks
// ============================================================================
export const careerPaths = hrSchema.table(
  "career_paths",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    pathCode: text("path_code").notNull(),
    ...nameColumn,
    description: text("description"),
    departmentId: uuid("department_id"),
    status: careerPathStatusEnum("status").notNull().default("active"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.departmentId],
      foreignColumns: [departments.tenantId, departments.id],
    }),
    uniqueIndex("career_paths_tenant_code_unique")
      .on(table.tenantId, table.pathCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("career_paths_tenant_idx").on(table.tenantId),
    index("career_paths_department_idx").on(table.tenantId, table.departmentId),
    index("career_paths_status_idx").on(table.tenantId, table.status),
    ...tenantIsolationPolicies("career_paths"),
    serviceBypassPolicy("career_paths"),
  ]
);

// ============================================================================
// TABLE: career_path_steps
// Steps in career paths with order and prerequisites
// ============================================================================
export const careerPathSteps = hrSchema.table(
  "career_path_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    pathId: uuid("path_id").notNull(),
    positionId: uuid("position_id").notNull(),
    stepOrder: integer("step_order").notNull(),
    prerequisiteStepId: uuid("prerequisite_step_id"), // Self-reference
    minYearsExperience: integer("min_years_experience"),
    requiredSkills: text("required_skills"), // JSON
    description: text("description"),
    ...timestampColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.pathId],
      foreignColumns: [careerPaths.tenantId, careerPaths.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.positionId],
      foreignColumns: [jobPositions.tenantId, jobPositions.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.prerequisiteStepId],
      foreignColumns: [table.tenantId, table.id],
    }),
    uniqueIndex("career_path_steps_path_order_unique").on(
      table.tenantId,
      table.pathId,
      table.stepOrder
    ),
    check("career_path_steps_order_positive", sql`${table.stepOrder} > 0`),
    check(
      "career_path_steps_experience_positive",
      sql`${table.minYearsExperience} IS NULL OR ${table.minYearsExperience} >= 0`
    ),
    index("career_path_steps_tenant_idx").on(table.tenantId),
    index("career_path_steps_path_idx").on(table.tenantId, table.pathId),
    index("career_path_steps_position_idx").on(table.tenantId, table.positionId),
    ...tenantIsolationPolicies("career_path_steps"),
    serviceBypassPolicy("career_path_steps"),
  ]
);

// ============================================================================
// TABLE: career_aspirations
// Employee career goals
// ============================================================================
export const careerAspirations = hrSchema.table(
  "career_aspirations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    targetPositionId: uuid("target_position_id"),
    targetPathId: uuid("target_path_id"),
    aspirationDate: date("aspiration_date", { mode: "string" }).notNull(),
    targetDate: date("target_date", { mode: "string" }),
    currentSkillGaps: text("current_skill_gaps"), // JSON
    developmentActions: text("development_actions"), // JSON
    managerNotes: text("manager_notes"),
    status: text("status").notNull().default("active"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.employeeId],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.targetPositionId],
      foreignColumns: [jobPositions.tenantId, jobPositions.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.targetPathId],
      foreignColumns: [careerPaths.tenantId, careerPaths.id],
    }),
    check(
      "career_aspirations_status_valid",
      sql`${table.status} IN ('active', 'achieved', 'abandoned', 'on_hold')`
    ),
    check(
      "career_aspirations_target_date_valid",
      sql`${table.targetDate} IS NULL OR ${table.targetDate} >= ${table.aspirationDate}`
    ),
    index("career_aspirations_tenant_idx").on(table.tenantId),
    index("career_aspirations_employee_idx").on(table.tenantId, table.employeeId),
    index("career_aspirations_position_idx").on(table.tenantId, table.targetPositionId),
    index("career_aspirations_status_idx").on(table.tenantId, table.status),
    ...tenantIsolationPolicies("career_aspirations"),
    serviceBypassPolicy("career_aspirations"),
  ]
);

// ============================================================================
// TABLE: compensation_cycles
// Annual compensation planning cycles
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
    guidelines: text("guidelines"), // JSON
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("compensation_cycles_tenant_code_unique")
      .on(table.tenantId, table.cycleCode)
      .where(sql`${table.deletedAt} IS NULL`),
    check("compensation_cycles_date_range", sql`${table.endDate} >= ${table.startDate}`),
    check("compensation_cycles_budget_positive", sql`${table.budgetAmount} > 0`),
    check("compensation_cycles_fiscal_year_valid", sql`${table.fiscalYear} >= 2000`),
    index("compensation_cycles_tenant_idx").on(table.tenantId),
    index("compensation_cycles_fiscal_year_idx").on(table.tenantId, table.fiscalYear),
    index("compensation_cycles_status_idx").on(table.tenantId, table.status),
    ...tenantIsolationPolicies("compensation_cycles"),
    serviceBypassPolicy("compensation_cycles"),
  ]
);

// ============================================================================
// TABLE: compensation_budgets
// Department/position budgets
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
    ...timestampColumns,
    ...auditColumns,
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
    index("compensation_budgets_tenant_idx").on(table.tenantId),
    index("compensation_budgets_cycle_idx").on(table.tenantId, table.cycleId),
    index("compensation_budgets_department_idx").on(table.tenantId, table.departmentId),
    index("compensation_budgets_position_idx").on(table.tenantId, table.positionId),
    ...tenantIsolationPolicies("compensation_budgets"),
    serviceBypassPolicy("compensation_budgets"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertSuccessionPlanSchema = z.object({
  id: SuccessionPlanIdSchema.optional(),
  tenantId: z.number().int().positive(),
  planCode: z.string().min(3).max(50),
  criticalPositionId: z.string().uuid(),
  successorEmployeeId: z.string().uuid(),
  readiness: z.enum(["ready_now", "ready_1_year", "ready_2_years", "not_ready"]),
  developmentPlan: z.string().max(2000).optional(),
  targetDate: z.string().date().optional(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  notes: z.string().max(1000).optional(),
});

export const insertTalentPoolSchema = z.object({
  id: TalentPoolIdSchema.optional(),
  tenantId: z.number().int().positive(),
  poolCode: z.string().min(3).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  poolType: z.enum(["leadership", "technical", "high_potential", "critical_skills"]),
  status: z.enum(["active", "inactive"]).default("active"),
  criteria: z.string().optional(), // JSON string
});

export const insertTalentPoolMemberSchema = z.object({
  id: TalentPoolMemberIdSchema.optional(),
  tenantId: z.number().int().positive(),
  poolId: z.string().uuid(),
  employeeId: z.string().uuid(),
  joinedDate: z.string().date(),
  readiness: z.enum(["ready_now", "ready_1_year", "ready_2_years", "not_ready"]),
  performanceRating: z.string().max(50).optional(),
  potentialRating: z.enum(["low", "medium", "high"]).optional(),
  developmentPlan: z.string().max(2000).optional(),
  notes: z.string().max(1000).optional(),
});

export const insertCareerPathSchema = z.object({
  id: CareerPathIdSchema.optional(),
  tenantId: z.number().int().positive(),
  pathCode: z.string().min(3).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  departmentId: z.string().uuid().optional(),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
});

export const insertCareerPathStepSchema = z.object({
  id: CareerPathStepIdSchema.optional(),
  tenantId: z.number().int().positive(),
  pathId: z.string().uuid(),
  positionId: z.string().uuid(),
  stepOrder: z.number().int().positive(),
  prerequisiteStepId: z.string().uuid().optional(),
  minYearsExperience: z.number().int().nonnegative().optional(),
  requiredSkills: z.string().optional(), // JSON string
  description: z.string().max(1000).optional(),
});

export const insertCareerAspirationSchema = z
  .object({
    id: CareerAspirationIdSchema.optional(),
    tenantId: z.number().int().positive(),
    employeeId: z.string().uuid(),
    targetPositionId: z.string().uuid().optional(),
    targetPathId: z.string().uuid().optional(),
    aspirationDate: z.string().date(),
    targetDate: z.string().date().optional(),
    currentSkillGaps: z.string().optional(), // JSON string
    developmentActions: z.string().optional(), // JSON string
    managerNotes: z.string().max(1000).optional(),
    status: z.enum(["active", "achieved", "abandoned", "on_hold"]).default("active"),
  })
  .superRefine(refineDateRange("aspirationDate", "targetDate"));

export const insertCompensationCycleSchema = z
  .object({
    id: CompensationCycleIdSchema.optional(),
    tenantId: z.number().int().positive(),
    cycleCode: z.string().min(3).max(50),
    name: z.string().min(2).max(100),
    fiscalYear: z.number().int().min(2000).max(2100),
    startDate: z.string().date(),
    endDate: z.string().date(),
    budgetAmount: currencyAmountSchema(2),
    currency: z.string().length(3).default("USD"),
    status: z.enum(["planning", "budgeting", "review", "approved", "closed"]).default("planning"),
    guidelines: z.string().optional(), // JSON string
  })
  .superRefine(refineDateRange("startDate", "endDate"));

export const insertCompensationBudgetSchema = z
  .object({
    id: CompensationBudgetIdSchema.optional(),
    tenantId: z.number().int().positive(),
    cycleId: z.string().uuid(),
    departmentId: z.string().uuid().optional(),
    positionId: z.string().uuid().optional(),
    budgetAmount: currencyAmountSchema(2),
    allocatedAmount: currencyAmountSchema(2).default("0"),
    remainingAmount: currencyAmountSchema(2),
    currency: z.string().length(3).default("USD"),
    notes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    const budget = parseFloat(data.budgetAmount);
    const allocated = parseFloat(data.allocatedAmount);
    if (allocated > budget) {
      ctx.addIssue({
        code: "custom",
        message: "Allocated amount cannot exceed budget amount",
        path: ["allocatedAmount"],
      });
    }
  });
