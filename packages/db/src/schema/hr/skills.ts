// ============================================================================
// HR DOMAIN: SKILLS TAXONOMY & RESUME LINES (Upgrade Module)
// Supports skill type definitions, skill assignments, resume parsing, and job-position skill requirements.
// Tables: skills, employee_skills, skill_types, skill_levels, job_position_skills, resume_line_types, employee_resume_lines
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
import { skillTypeCategoryEnum, skillLevelEnum } from "./_enums.js";
import { employees } from "./people.js";
import { jobPositions } from "./people.js";
import { z } from "zod/v4";
import {
  SkillTypeIdSchema,
  SkillLevelIdSchema,
  JobPositionSkillIdSchema,
  ResumeLineTypeIdSchema,
  EmployeeResumeLineIdSchema,
  SkillIdSchema,
  JobPositionIdSchema,
  EmployeeIdSchema,
  hrTenantIdSchema,
} from "./_zodShared.js";

// ============================================================================
// SKILLS - Canonical skill catalog
// ============================================================================

export const skills = hrSchema.table(
  "skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    skillCode: text("skill_code").notNull(),
    ...nameColumn,
    description: text("description"),
    category: text("category"),
    skillTypeId: uuid("skill_type_id"),
    defaultLevelId: uuid("default_level_id"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("skills_tenant_code_unique")
      .on(table.tenantId, table.skillCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("skills_tenant_idx").on(table.tenantId),
    ...tenantIsolationPolicies("skills"),
    serviceBypassPolicy("skills"),
  ]
);

// ============================================================================
// EMPLOYEE SKILLS - Employee skill proficiency records
// ============================================================================

export const employeeSkills = hrSchema.table(
  "employee_skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    skillId: uuid("skill_id").notNull(),
    skillLevel: skillLevelEnum("skill_level").notNull(),
    acquiredDate: date("acquired_date", { mode: "string" }),
    verifiedDate: date("verified_date", { mode: "string" }),
    verifiedBy: uuid("verified_by"),
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
      columns: [table.tenantId, table.skillId],
      foreignColumns: [skills.tenantId, skills.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.verifiedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("employee_skills_employee_skill_unique")
      .on(table.tenantId, table.employeeId, table.skillId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("employee_skills_tenant_idx").on(table.tenantId),
    index("employee_skills_employee_idx").on(table.tenantId, table.employeeId),
    ...tenantIsolationPolicies("employee_skills"),
    serviceBypassPolicy("employee_skills"),
  ]
);

// ============================================================================
// SKILL TYPES - Categorize skills into types
// ============================================================================

export const skillTypes = hrSchema.table(
  "skill_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    typeCode: text("type_code").notNull(),
    ...nameColumn,
    description: text("description"),
    category: skillTypeCategoryEnum("category").notNull(),
    color: text("color"), // For UI display (hex color)
    icon: text("icon"), // Icon identifier for UI
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("skill_types_tenant_code_unique")
      .on(table.tenantId, table.typeCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("skill_types_tenant_idx").on(table.tenantId),
    index("skill_types_category_idx").on(table.tenantId, table.category),
    ...tenantIsolationPolicies("skill_types"),
    serviceBypassPolicy("skill_types"),
  ]
);

// ============================================================================
// SKILL LEVELS - Define proficiency levels for skills
// ============================================================================

export const hrSkillLevels = hrSchema.table(
  "skill_levels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    skillTypeId: uuid("skill_type_id").notNull(),
    levelCode: text("level_code").notNull(),
    ...nameColumn,
    description: text("description"),
    progressPercentage: integer("progress_percentage").notNull(), // 0-100
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.skillTypeId],
      foreignColumns: [skillTypes.tenantId, skillTypes.id],
    }),
    uniqueIndex("skill_levels_tenant_type_code_unique")
      .on(table.tenantId, table.skillTypeId, table.levelCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("skill_levels_tenant_idx").on(table.tenantId),
    index("skill_levels_type_idx").on(table.tenantId, table.skillTypeId),
    ...tenantIsolationPolicies("skill_levels"),
    serviceBypassPolicy("skill_levels"),
  ]
);

// ============================================================================
// JOB POSITION SKILLS - Required skills per job position
// ============================================================================

export const jobPositionSkills = hrSchema.table(
  "job_position_skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    jobPositionId: uuid("job_position_id").notNull(),
    skillId: uuid("skill_id").notNull(),
    requiredLevelId: uuid("required_level_id"), // FK to skill_levels
    isRequired: boolean("is_required").notNull().default(true), // vs preferred
    importance: integer("importance").notNull().default(5), // 1-10 scale
    notes: text("notes"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.jobPositionId],
      foreignColumns: [jobPositions.tenantId, jobPositions.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.skillId],
      foreignColumns: [skills.tenantId, skills.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.requiredLevelId],
      foreignColumns: [hrSkillLevels.tenantId, hrSkillLevels.id],
    }),
    uniqueIndex("job_position_skills_position_skill_unique")
      .on(table.tenantId, table.jobPositionId, table.skillId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("job_position_skills_tenant_idx").on(table.tenantId),
    index("job_position_skills_position_idx").on(table.tenantId, table.jobPositionId),
    index("job_position_skills_skill_idx").on(table.tenantId, table.skillId),
    ...tenantIsolationPolicies("job_position_skills"),
    serviceBypassPolicy("job_position_skills"),
  ]
);

// ============================================================================
// RESUME LINE TYPES - Categories for resume entries
// ============================================================================

export const hrResumeLineTypes = hrSchema.table(
  "resume_line_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    typeCode: text("type_code").notNull(),
    ...nameColumn,
    description: text("description"),
    category: text("category").notNull(), // 'experience' | 'education' | 'certification' | 'project'
    icon: text("icon"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("resume_line_types_tenant_code_unique")
      .on(table.tenantId, table.typeCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("resume_line_types_tenant_idx").on(table.tenantId),
    index("resume_line_types_category_idx").on(table.tenantId, table.category),
    ...tenantIsolationPolicies("resume_line_types"),
    serviceBypassPolicy("resume_line_types"),
  ]
);

// ============================================================================
// EMPLOYEE RESUME LINES - Work history and experience
// ============================================================================

export const employeeResumeLines = hrSchema.table(
  "employee_resume_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    resumeLineTypeId: uuid("resume_line_type_id").notNull(),
    title: text("title").notNull(),
    organization: text("organization"),
    location: text("location"),
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),
    isCurrent: boolean("is_current").notNull().default(false),
    description: text("description"),
    achievements: text("achievements"), // JSON array or text
    skills: text("skills"), // JSON array of skill names/IDs
    documentUrl: text("document_url"), // Certificate, transcript, etc.
    sortOrder: integer("sort_order").notNull().default(0),
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
      columns: [table.tenantId, table.resumeLineTypeId],
      foreignColumns: [hrResumeLineTypes.tenantId, hrResumeLineTypes.id],
    }),
    index("employee_resume_lines_tenant_idx").on(table.tenantId),
    index("employee_resume_lines_employee_idx").on(table.tenantId, table.employeeId),
    index("employee_resume_lines_type_idx").on(table.tenantId, table.resumeLineTypeId),
    ...tenantIsolationPolicies("employee_resume_lines"),
    serviceBypassPolicy("employee_resume_lines"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertSkillTypeSchema = z.object({
  id: SkillTypeIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  typeCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  category: z.enum([
    "technical",
    "soft_skills",
    "languages",
    "certifications",
    "domain_knowledge",
    "tools",
    "other",
  ]),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be valid hex color")
    .optional(),
  icon: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
});

export const insertSkillLevelSchema = z.object({
  id: SkillLevelIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  skillTypeId: SkillTypeIdSchema,
  levelCode: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  progressPercentage: z.number().int().min(0).max(100),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const insertJobPositionSkillSchema = z.object({
  id: JobPositionSkillIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  jobPositionId: JobPositionIdSchema,
  skillId: SkillIdSchema,
  requiredLevelId: SkillLevelIdSchema.optional(),
  isRequired: z.boolean().default(true),
  importance: z.number().int().min(1).max(10).default(5),
  notes: z.string().max(1000).optional(),
});

export const insertResumeLineTypeSchema = z.object({
  id: ResumeLineTypeIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  typeCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  category: z.enum([
    "experience",
    "education",
    "certification",
    "project",
    "publication",
    "award",
    "volunteer",
    "other",
  ]),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const insertEmployeeResumeLineSchema = z
  .object({
    id: EmployeeResumeLineIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeId: EmployeeIdSchema,
    resumeLineTypeId: ResumeLineTypeIdSchema,
    title: z.string().min(1).max(200),
    organization: z.string().max(200).optional(),
    location: z.string().max(200).optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    isCurrent: z.boolean().default(false),
    description: z.string().max(2000).optional(),
    achievements: z.string().max(2000).optional(),
    skills: z.string().max(1000).optional(),
    documentUrl: z.string().url().optional(),
    sortOrder: z.number().int().default(0),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start date cannot be after end date",
        path: ["startDate"],
      });
    }
    if (data.isCurrent && data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Current positions should not have an end date",
        path: ["endDate"],
      });
    }
  });
