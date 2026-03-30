// ============================================================================
// HR DOMAIN: SKILLS TAXONOMY & RESUME LINES (Upgrade Module)
// Tables: skill_types, skill_levels, skills, employee_skills, job_position_skills,
//         resume_line_types, employee_resume_lines,
//         employee_resume_line_achievements, employee_resume_line_skill_entries
//
// `skills` references `skill_types` / `skill_levels`. When `skill_type_id` is set, redundant
// `category` text must be null (CHECK + Zod). Structured resume bullets live in child tables;
// legacy `achievements` / `skills` text on the line remains for bulk import compatibility.
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
import {
  skillTypeCategoryEnum,
  skillLevelEnum,
  resumeLineTypeEnum,
  employeeResumeLineStatusEnum,
  SkillLevelSchema,
  SkillTypeCategorySchema,
  ResumeLineTypeSchema,
  EmployeeResumeLineStatusSchema,
} from "./_enums.js";
import { employees } from "./people.js";
import { jobPositions } from "./people.js";
import { z } from "zod/v4";
import {
  SkillTypeIdSchema,
  SkillLevelIdSchema,
  JobPositionSkillIdSchema,
  ResumeLineTypeIdSchema,
  EmployeeResumeLineIdSchema,
  EmployeeResumeLineAchievementIdSchema,
  EmployeeResumeLineSkillEntryIdSchema,
  SkillIdSchema,
  EmployeeSkillIdSchema,
  JobPositionIdSchema,
  EmployeeIdSchema,
  hrTenantIdSchema,
} from "./_zodShared.js";

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
    /** UI ordering within lists and pickers. */
    displayOrder: integer("display_order").notNull().default(0),
    /** Optional bucket for grouped navigation (e.g. engineering, leadership). */
    groupingKey: text("grouping_key"),
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
    index("skill_types_display_order_idx").on(table.tenantId, table.displayOrder),
    check(
      "skill_types_display_order_non_negative",
      sql`${table.displayOrder} >= 0`
    ),
    check(
      "skill_types_name_max_len",
      sql`char_length(${table.name}) <= 100`
    ),
    check(
      "skill_types_description_max_len",
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 500`
    ),
    check(
      "skill_types_icon_max_len",
      sql`${table.icon} IS NULL OR char_length(${table.icon}) <= 50`
    ),
    check(
      "skill_types_color_max_len",
      sql`${table.color} IS NULL OR char_length(${table.color}) <= 16`
    ),
    check(
      "skill_types_grouping_key_max_len",
      sql`${table.groupingKey} IS NULL OR char_length(${table.groupingKey}) <= 100`
    ),
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
    check(
      "skill_levels_progress_percentage_range",
      sql`${table.progressPercentage} >= 0 AND ${table.progressPercentage} <= 100`
    ),
    check(
      "skill_levels_sort_order_non_negative",
      sql`${table.sortOrder} >= 0`
    ),
    check(
      "skill_levels_name_max_len",
      sql`char_length(${table.name}) <= 100`
    ),
    check(
      "skill_levels_description_max_len",
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 500`
    ),
    ...tenantIsolationPolicies("skill_levels"),
    serviceBypassPolicy("skill_levels"),
  ]
);

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
    /** Legacy free-text bucket; omit when `skill_type_id` is set (CHECK + Zod). */
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
    foreignKey({
      columns: [table.tenantId, table.skillTypeId],
      foreignColumns: [skillTypes.tenantId, skillTypes.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.defaultLevelId],
      foreignColumns: [hrSkillLevels.tenantId, hrSkillLevels.id],
    }),
    uniqueIndex("skills_tenant_code_unique")
      .on(table.tenantId, table.skillCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("skills_tenant_idx").on(table.tenantId),
    index("skills_type_idx").on(table.tenantId, table.skillTypeId),
    check(
      "skills_category_only_without_skill_type",
      sql`${table.skillTypeId} IS NULL OR ${table.category} IS NULL`
    ),
    check(
      "skills_skill_code_max_len",
      sql`char_length(${table.skillCode}) <= 80`
    ),
    check(
      "skills_name_max_len",
      sql`char_length(${table.name}) <= 100`
    ),
    check(
      "skills_description_max_len",
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 2000`
    ),
    check(
      "skills_category_max_len",
      sql`${table.category} IS NULL OR char_length(${table.category}) <= 80`
    ),
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
    check(
      "employee_skills_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 1000`
    ),
    ...tenantIsolationPolicies("employee_skills"),
    serviceBypassPolicy("employee_skills"),
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
    check(
      "job_position_skills_importance_range",
      sql`${table.importance} >= 1 AND ${table.importance} <= 10`
    ),
    check(
      "job_position_skills_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 1000`
    ),
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
    category: resumeLineTypeEnum("category").notNull(),
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
    check(
      "resume_line_types_sort_order_non_negative",
      sql`${table.sortOrder} >= 0`
    ),
    check(
      "resume_line_types_name_max_len",
      sql`char_length(${table.name}) <= 100`
    ),
    check(
      "resume_line_types_description_max_len",
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 500`
    ),
    check(
      "resume_line_types_icon_max_len",
      sql`${table.icon} IS NULL OR char_length(${table.icon}) <= 50`
    ),
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
    lineStatus: employeeResumeLineStatusEnum("line_status").notNull().default("draft"),
    description: text("description"),
    /** Legacy bulk text; prefer `employee_resume_line_achievements` for structured rows. */
    achievements: text("achievements"),
    /** Legacy bulk text; prefer `employee_resume_line_skill_entries` for structured rows. */
    skills: text("skills"),
    documentUrl: text("document_url"),
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
    index("employee_resume_lines_status_idx").on(table.tenantId, table.lineStatus),
    check(
      "employee_resume_lines_sort_order_non_negative",
      sql`${table.sortOrder} >= 0`
    ),
    check(
      "employee_resume_lines_dates_ordered",
      sql`${table.startDate} IS NULL OR ${table.endDate} IS NULL OR ${table.endDate} >= ${table.startDate}`
    ),
    check(
      "employee_resume_lines_current_no_end",
      sql`NOT (${table.isCurrent} = true AND ${table.endDate} IS NOT NULL)`
    ),
    check(
      "employee_resume_lines_title_max_len",
      sql`char_length(${table.title}) <= 200`
    ),
    check(
      "employee_resume_lines_org_max_len",
      sql`${table.organization} IS NULL OR char_length(${table.organization}) <= 200`
    ),
    check(
      "employee_resume_lines_location_max_len",
      sql`${table.location} IS NULL OR char_length(${table.location}) <= 200`
    ),
    check(
      "employee_resume_lines_description_max_len",
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 2000`
    ),
    check(
      "employee_resume_lines_achievements_max_len",
      sql`${table.achievements} IS NULL OR char_length(${table.achievements}) <= 2000`
    ),
    check(
      "employee_resume_lines_skills_max_len",
      sql`${table.skills} IS NULL OR char_length(${table.skills}) <= 1000`
    ),
    ...tenantIsolationPolicies("employee_resume_lines"),
    serviceBypassPolicy("employee_resume_lines"),
  ]
);

// ============================================================================
// EMPLOYEE RESUME LINE ACHIEVEMENTS - Normalized bullet list per line
// ============================================================================

export const employeeResumeLineAchievements = hrSchema.table(
  "employee_resume_line_achievements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    resumeLineId: uuid("resume_line_id").notNull(),
    achievementText: text("achievement_text").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.resumeLineId],
      foreignColumns: [employeeResumeLines.tenantId, employeeResumeLines.id],
      name: "employee_resume_line_achievements_line_fk",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    index("employee_resume_line_achievements_tenant_idx").on(table.tenantId),
    index("employee_resume_line_achievements_line_idx").on(table.tenantId, table.resumeLineId),
    check(
      "employee_resume_line_achievements_text_max_len",
      sql`char_length(${table.achievementText}) <= 2000`
    ),
    check(
      "employee_resume_line_achievements_sort_non_negative",
      sql`${table.sortOrder} >= 0`
    ),
    ...tenantIsolationPolicies("employee_resume_line_achievements"),
    serviceBypassPolicy("employee_resume_line_achievements"),
  ]
);

// ============================================================================
// EMPLOYEE RESUME LINE SKILL ENTRIES - Catalog link and/or parsed label per line
// ============================================================================

export const employeeResumeLineSkillEntries = hrSchema.table(
  "employee_resume_line_skill_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    resumeLineId: uuid("resume_line_id").notNull(),
    /** When resolved to the tenant skill catalog. */
    skillId: uuid("skill_id"),
    /** Raw label from resume parsing when not (yet) mapped to `skill_id`. */
    skillLabel: text("skill_label"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.resumeLineId],
      foreignColumns: [employeeResumeLines.tenantId, employeeResumeLines.id],
      name: "employee_resume_line_skill_entries_line_fk",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.skillId],
      foreignColumns: [skills.tenantId, skills.id],
    }),
    index("employee_resume_line_skill_entries_tenant_idx").on(table.tenantId),
    index("employee_resume_line_skill_entries_line_idx").on(table.tenantId, table.resumeLineId),
    index("employee_resume_line_skill_entries_skill_idx").on(table.tenantId, table.skillId),
    check(
      "employee_resume_line_skill_entries_skill_ref_present",
      sql`(${table.skillId} IS NOT NULL) OR (${table.skillLabel} IS NOT NULL AND char_length(${table.skillLabel}) >= 1)`
    ),
    check(
      "employee_resume_line_skill_entries_label_max_len",
      sql`${table.skillLabel} IS NULL OR char_length(${table.skillLabel}) <= 200`
    ),
    check(
      "employee_resume_line_skill_entries_sort_non_negative",
      sql`${table.sortOrder} >= 0`
    ),
    ...tenantIsolationPolicies("employee_resume_line_skill_entries"),
    serviceBypassPolicy("employee_resume_line_skill_entries"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertSkillSchema = z
  .object({
    id: SkillIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    skillCode: z.string().min(1).max(80),
    name: z.string().min(1).max(100),
    description: z.string().max(2000).optional(),
    category: z.string().max(80).optional(),
    skillTypeId: SkillTypeIdSchema.optional(),
    defaultLevelId: SkillLevelIdSchema.optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.skillTypeId != null && data.category != null && data.category.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "category must be omitted when skillTypeId is set (use skill type category)",
        path: ["category"],
      });
    }
  });

export const insertEmployeeSkillSchema = z.object({
  id: EmployeeSkillIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  employeeId: EmployeeIdSchema,
  skillId: SkillIdSchema,
  skillLevel: SkillLevelSchema,
  acquiredDate: z.iso.date().optional(),
  verifiedDate: z.iso.date().optional(),
  verifiedBy: EmployeeIdSchema.optional(),
  notes: z.string().max(1000).optional(),
});

export const insertSkillTypeSchema = z.object({
  id: SkillTypeIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  typeCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  category: SkillTypeCategorySchema,
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be valid hex color")
    .optional(),
  icon: z.string().max(50).optional(),
  displayOrder: z.number().int().min(0).default(0),
  groupingKey: z.string().max(100).optional(),
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
  sortOrder: z.number().int().min(0).default(0),
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
  category: ResumeLineTypeSchema,
  icon: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).default(0),
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
    startDate: z.iso.date().optional(),
    endDate: z.iso.date().optional(),
    isCurrent: z.boolean().default(false),
    lineStatus: EmployeeResumeLineStatusSchema.optional().default("draft"),
    description: z.string().max(2000).optional(),
    achievements: z.string().max(2000).optional(),
    skills: z.string().max(1000).optional(),
    documentUrl: z.string().url().optional(),
    sortOrder: z.number().int().min(0).default(0),
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

export const insertEmployeeResumeLineAchievementSchema = z.object({
  id: EmployeeResumeLineAchievementIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  resumeLineId: EmployeeResumeLineIdSchema,
  achievementText: z.string().min(1).max(2000),
  sortOrder: z.number().int().min(0).default(0),
});

export const insertEmployeeResumeLineSkillEntrySchema = z
  .object({
    id: EmployeeResumeLineSkillEntryIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    resumeLineId: EmployeeResumeLineIdSchema,
    skillId: SkillIdSchema.optional(),
    skillLabel: z.string().min(1).max(200).optional(),
    sortOrder: z.number().int().min(0).default(0),
  })
  .superRefine((data, ctx) => {
    if (data.skillId == null && (data.skillLabel == null || data.skillLabel.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either skillId or skillLabel is required",
        path: ["skillId"],
      });
    }
  });
