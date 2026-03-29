// ============================================================================
// HR DOMAIN: SUCCESSION & CAREER PLANNING (Phase 7)
// Covers succession plans, talent pools, and career path progression.
// Tables: succession_plans, talent_pools, talent_pool_members, career_paths, career_path_steps, career_aspirations
// ============================================================================
import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
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
import { hrSchema } from "./_schema.js";
import { successionReadinessEnum, talentPoolStatusEnum, careerPathStatusEnum } from "./_enums.js";
import { employees, departments, jobPositions } from "./people.js";
import {
  SuccessionPlanIdSchema,
  TalentPoolIdSchema,
  TalentPoolMemberIdSchema,
  CareerPathIdSchema,
  CareerPathStepIdSchema,
  CareerAspirationIdSchema,
  JobPositionIdSchema,
  EmployeeIdSchema,
  DepartmentIdSchema,
  refineDateRange,
  hrTenantIdSchema,
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
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertSuccessionPlanSchema = z.object({
  id: SuccessionPlanIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  planCode: z.string().min(3).max(50),
  criticalPositionId: JobPositionIdSchema,
  successorEmployeeId: EmployeeIdSchema,
  readiness: z.enum(["ready_now", "ready_1_year", "ready_2_years", "not_ready"]),
  developmentPlan: z.string().max(2000).optional(),
  targetDate: z.string().date().optional(),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  notes: z.string().max(1000).optional(),
});

export const insertTalentPoolSchema = z.object({
  id: TalentPoolIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  poolCode: z.string().min(3).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  poolType: z.enum(["leadership", "technical", "high_potential", "critical_skills"]),
  status: z.enum(["active", "inactive"]).default("active"),
  criteria: z.string().optional(), // JSON string
});

export const insertTalentPoolMemberSchema = z.object({
  id: TalentPoolMemberIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  poolId: TalentPoolIdSchema,
  employeeId: EmployeeIdSchema,
  joinedDate: z.string().date(),
  readiness: z.enum(["ready_now", "ready_1_year", "ready_2_years", "not_ready"]),
  performanceRating: z.string().max(50).optional(),
  potentialRating: z.enum(["low", "medium", "high"]).optional(),
  developmentPlan: z.string().max(2000).optional(),
  notes: z.string().max(1000).optional(),
});

export const insertCareerPathSchema = z.object({
  id: CareerPathIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  pathCode: z.string().min(3).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  departmentId: DepartmentIdSchema.optional(),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
});

export const insertCareerPathStepSchema = z.object({
  id: CareerPathStepIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  pathId: CareerPathIdSchema,
  positionId: JobPositionIdSchema,
  stepOrder: z.number().int().positive(),
  prerequisiteStepId: CareerPathStepIdSchema.optional(),
  minYearsExperience: z.number().int().nonnegative().optional(),
  requiredSkills: z.string().optional(), // JSON string
  description: z.string().max(1000).optional(),
});

export const insertCareerAspirationSchema = z
  .object({
    id: CareerAspirationIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeId: EmployeeIdSchema,
    targetPositionId: JobPositionIdSchema.optional(),
    targetPathId: CareerPathIdSchema.optional(),
    aspirationDate: z.string().date(),
    targetDate: z.string().date().optional(),
    currentSkillGaps: z.string().optional(), // JSON string
    developmentActions: z.string().optional(), // JSON string
    managerNotes: z.string().max(1000).optional(),
    status: z.enum(["active", "achieved", "abandoned", "on_hold"]).default("active"),
  })
  .superRefine(refineDateRange("aspirationDate", "targetDate"));
