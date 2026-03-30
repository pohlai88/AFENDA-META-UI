// ============================================================================
// HR DOMAIN: SUCCESSION & CAREER PLANNING (Phase 7)
// Covers succession plans, talent pools, career paths, aspirations, and normalized skill links.
//
// Skill catalog + employee proficiency: `skills.ts` (`skills`, `employee_skills`).
// Career path / aspiration skill data: `career_path_step_skills`, `career_aspiration_skill_gaps` (this file).
//
// Zod 4 (`zod/v4`): ISO dates use `z.iso.date()`; instants use `z.iso.datetime()` — not deprecated
// `z.string().date()` / `.datetime()` (see `v4/classic/schemas.d.ts`).
// ============================================================================
import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  text,
  date,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

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
  successionReadinessEnum,
  successionRiskLevelEnum,
  successionPlanStatusEnum,
  talentPoolStatusEnum,
  talentPoolTypeEnum,
  careerAspirationStatusEnum,
  careerPathStatusEnum,
  stepSkillImportanceEnum,
  careerAspirationSkillGapLevelEnum,
  successionPotentialRatingEnum,
  performanceRatingEnum,
  SuccessionReadinessSchema,
  SuccessionRiskLevelSchema,
  SuccessionPlanStatusSchema,
  TalentPoolStatusSchema,
  TalentPoolTypeSchema,
  CareerAspirationStatusSchema,
  CareerPathStatusSchema,
  StepSkillImportanceSchema,
  CareerAspirationSkillGapLevelSchema,
  SuccessionPotentialRatingSchema,
  PerformanceRatingSchema,
} from "./_enums.js";
import { employees, departments, jobPositions } from "./people.js";
import { skills } from "./skills.js";
import {
  SuccessionPlanIdSchema,
  TalentPoolIdSchema,
  TalentPoolMemberIdSchema,
  CareerPathIdSchema,
  CareerPathStepIdSchema,
  CareerPathStepSkillIdSchema,
  CareerAspirationIdSchema,
  CareerAspirationSkillGapIdSchema,
  JobPositionIdSchema,
  EmployeeIdSchema,
  DepartmentIdSchema,
  SkillIdSchema,
  refineDateRange,
  hrTenantIdSchema,
  jsonObjectNullishSchema,
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
    riskLevel: successionRiskLevelEnum("risk_level").notNull(),
    status: successionPlanStatusEnum("status").notNull().default("active"),
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
    index("succession_plans_tenant_idx").on(table.tenantId),
    index("succession_plans_position_idx").on(table.tenantId, table.criticalPositionId),
    index("succession_plans_successor_idx").on(table.tenantId, table.successorEmployeeId),
    index("succession_plans_readiness_idx").on(table.tenantId, table.readiness),
    index("succession_plans_tenant_readiness_risk_idx").on(
      table.tenantId,
      table.readiness,
      table.riskLevel
    ),
    index("succession_plans_status_idx").on(table.tenantId, table.status),
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
    poolType: talentPoolTypeEnum("pool_type").notNull(),
    status: talentPoolStatusEnum("status").notNull().default("active"),
    criteria: jsonb("criteria").$type<Record<string, unknown>>(),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("talent_pools_tenant_code_unique")
      .on(table.tenantId, table.poolCode)
      .where(sql`${table.deletedAt} IS NULL`),
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
    performanceRating: performanceRatingEnum("performance_rating"),
    potentialRating: successionPotentialRatingEnum("potential_rating"),
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
    index("talent_pool_members_tenant_idx").on(table.tenantId),
    index("talent_pool_members_pool_idx").on(table.tenantId, table.poolId),
    index("talent_pool_members_employee_idx").on(table.tenantId, table.employeeId),
    index("talent_pool_members_readiness_idx").on(table.tenantId, table.readiness),
    index("talent_pool_members_employee_readiness_idx").on(
      table.tenantId,
      table.employeeId,
      table.readiness
    ),
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
    description: text("description"),
    ...timestampColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.pathId],
      foreignColumns: [careerPaths.tenantId, careerPaths.id],
      name: "career_path_steps_path_fk",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
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
      "career_path_steps_prerequisite_not_self",
      sql`${table.prerequisiteStepId} IS NULL OR ${table.prerequisiteStepId} <> ${table.id}`
    ),
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
// TABLE: career_path_step_skills
// Required/preferred skills per career path step (normalized; replaces JSON on steps).
// ============================================================================
export const careerPathStepSkills = hrSchema.table(
  "career_path_step_skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    stepId: uuid("step_id").notNull(),
    skillId: uuid("skill_id").notNull(),
    importance: stepSkillImportanceEnum("importance").notNull().default("mandatory"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.stepId],
      foreignColumns: [careerPathSteps.tenantId, careerPathSteps.id],
      name: "career_path_step_skills_step_fk",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.skillId],
      foreignColumns: [skills.tenantId, skills.id],
    }),
    uniqueIndex("career_path_step_skills_step_skill_unique").on(
      table.tenantId,
      table.stepId,
      table.skillId
    ),
    index("career_path_step_skills_tenant_idx").on(table.tenantId),
    index("career_path_step_skills_step_idx").on(table.tenantId, table.stepId),
    index("career_path_step_skills_skill_idx").on(table.tenantId, table.skillId),
    ...tenantIsolationPolicies("career_path_step_skills"),
    serviceBypassPolicy("career_path_step_skills"),
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
    managerNotes: text("manager_notes"),
    status: careerAspirationStatusEnum("status").notNull().default("active"),
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
// TABLE: career_aspiration_skill_gaps
// Per-skill gaps for an aspiration (normalized; replaces JSON on aspirations).
// ============================================================================
export const careerAspirationSkillGaps = hrSchema.table(
  "career_aspiration_skill_gaps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    aspirationId: uuid("aspiration_id").notNull(),
    skillId: uuid("skill_id").notNull(),
    gapLevel: careerAspirationSkillGapLevelEnum("gap_level").notNull(),
    developmentAction: text("development_action"),
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.aspirationId],
      foreignColumns: [careerAspirations.tenantId, careerAspirations.id],
      name: "career_aspiration_skill_gaps_aspiration_fk",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.skillId],
      foreignColumns: [skills.tenantId, skills.id],
    }),
    uniqueIndex("career_aspiration_skill_gaps_aspiration_skill_unique").on(
      table.tenantId,
      table.aspirationId,
      table.skillId
    ),
    index("career_aspiration_skill_gaps_tenant_idx").on(table.tenantId),
    index("career_aspiration_skill_gaps_aspiration_idx").on(table.tenantId, table.aspirationId),
    index("career_aspiration_skill_gaps_skill_idx").on(table.tenantId, table.skillId),
    ...tenantIsolationPolicies("career_aspiration_skill_gaps"),
    serviceBypassPolicy("career_aspiration_skill_gaps"),
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
  readiness: SuccessionReadinessSchema,
  developmentPlan: z.string().max(2000).nullish(),
  targetDate: z.iso.date().optional(),
  riskLevel: SuccessionRiskLevelSchema,
  status: SuccessionPlanStatusSchema.default("active"),
  notes: z.string().max(2000).optional(),
});

export const insertTalentPoolSchema = z.object({
  id: TalentPoolIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  poolCode: z.string().min(3).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  poolType: TalentPoolTypeSchema,
  status: TalentPoolStatusSchema.default("active"),
  criteria: jsonObjectNullishSchema,
});

export const insertTalentPoolMemberSchema = z.object({
  id: TalentPoolMemberIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  poolId: TalentPoolIdSchema,
  employeeId: EmployeeIdSchema,
  joinedDate: z.iso.date(),
  readiness: SuccessionReadinessSchema,
  performanceRating: PerformanceRatingSchema.optional(),
  potentialRating: SuccessionPotentialRatingSchema.optional(),
  developmentPlan: z.string().max(2000).nullish(),
  notes: z.string().max(2000).optional(),
});

export const insertCareerPathSchema = z.object({
  id: CareerPathIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  pathCode: z.string().min(3).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(2000).optional(),
  departmentId: DepartmentIdSchema.optional(),
  status: CareerPathStatusSchema.default("active"),
});

export const insertCareerPathStepSchema = z
  .object({
    id: CareerPathStepIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    pathId: CareerPathIdSchema,
    positionId: JobPositionIdSchema,
    stepOrder: z.number().int().positive(),
    prerequisiteStepId: CareerPathStepIdSchema.optional(),
    minYearsExperience: z.number().int().nonnegative().optional(),
    description: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.id != null &&
      data.prerequisiteStepId != null &&
      data.id === data.prerequisiteStepId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "prerequisiteStepId cannot equal step id",
        path: ["prerequisiteStepId"],
      });
    }
  });

export const insertCareerPathStepSkillSchema = z.object({
  id: CareerPathStepSkillIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  stepId: CareerPathStepIdSchema,
  skillId: SkillIdSchema,
  importance: StepSkillImportanceSchema.default("mandatory"),
  notes: z.string().max(2000).optional(),
});

export const insertCareerAspirationSchema = z
  .object({
    id: CareerAspirationIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeId: EmployeeIdSchema,
    targetPositionId: JobPositionIdSchema.optional(),
    targetPathId: CareerPathIdSchema.optional(),
    aspirationDate: z.iso.date(),
    targetDate: z.iso.date().optional(),
    managerNotes: z.string().max(2000).optional(),
    status: CareerAspirationStatusSchema.default("active"),
  })
  .superRefine(refineDateRange("aspirationDate", "targetDate"));

export const insertCareerAspirationSkillGapSchema = z.object({
  id: CareerAspirationSkillGapIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  aspirationId: CareerAspirationIdSchema,
  skillId: SkillIdSchema,
  gapLevel: CareerAspirationSkillGapLevelSchema,
  developmentAction: z.string().max(2000).nullish(),
  notes: z.string().max(2000).optional(),
});
