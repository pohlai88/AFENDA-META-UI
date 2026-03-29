// ============================================================================
// HR DOMAIN: APPRAISAL TEMPLATES & KRAs (Upgrade Module)
// Defines reusable performance review templates and key result areas.
// Tables: appraisal_templates, appraisal_template_kras, employee_kras
// ============================================================================
import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  text,
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
import { employees, departments, jobPositions } from "./people.js";
import { performanceReviews } from "./talent.js";
import { z } from "zod/v4";
import {
  AppraisalTemplateIdSchema,
  AppraisalTemplateKraIdSchema,
  EmployeeKraIdSchema,
  EmployeeIdSchema,
  PerformanceReviewIdSchema,
  hrTenantIdSchema,
} from "./_zodShared.js";

// ============================================================================
// APPRAISAL TEMPLATES - Reusable performance review templates
// ============================================================================

export const appraisalTemplates = hrSchema.table(
  "appraisal_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    templateCode: text("template_code").notNull(),
    ...nameColumn,
    description: text("description"),
    applicableTo: text("applicable_to").notNull(), // 'all' | 'department' | 'position'
    applicableIds: text("applicable_ids"), // JSON array of IDs
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("appraisal_templates_tenant_code_unique")
      .on(table.tenantId, table.templateCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("appraisal_templates_tenant_idx").on(table.tenantId),
    index("appraisal_templates_applicable_idx").on(table.tenantId, table.applicableTo),
    ...tenantIsolationPolicies("appraisal_templates"),
    serviceBypassPolicy("appraisal_templates"),
  ]
);

// ============================================================================
// APPRAISAL TEMPLATE KRAs - Key Result Areas per template
// ============================================================================

export const appraisalTemplateKras = hrSchema.table(
  "appraisal_template_kras",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    templateId: uuid("template_id").notNull(),
    kraCode: text("kra_code").notNull(),
    ...nameColumn,
    description: text("description"),
    weightage: numeric("weightage", { precision: 5, scale: 2 }).notNull(), // Percentage (0-100)
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.templateId],
      foreignColumns: [appraisalTemplates.tenantId, appraisalTemplates.id],
    }),
    uniqueIndex("appraisal_template_kras_template_code_unique")
      .on(table.tenantId, table.templateId, table.kraCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("appraisal_template_kras_tenant_idx").on(table.tenantId),
    index("appraisal_template_kras_template_idx").on(table.tenantId, table.templateId),
    sql`CONSTRAINT appraisal_template_kras_weightage_valid CHECK (weightage >= 0 AND weightage <= 100)`,
    ...tenantIsolationPolicies("appraisal_template_kras"),
    serviceBypassPolicy("appraisal_template_kras"),
  ]
);

// ============================================================================
// EMPLOYEE KRAs - Employee-specific KRA targets and achievements
// ============================================================================

export const employeeKras = hrSchema.table(
  "employee_kras",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    employeeId: uuid("employee_id").notNull(),
    reviewId: uuid("review_id").notNull(),
    kraId: uuid("kra_id").notNull(), // FK to appraisal_template_kras
    targetValue: text("target_value").notNull(), // Can be numeric or text
    achievedValue: text("achieved_value"),
    score: numeric("score", { precision: 5, scale: 2 }), // 0-100
    comments: text("comments"),
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
      columns: [table.tenantId, table.reviewId],
      foreignColumns: [performanceReviews.tenantId, performanceReviews.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.kraId],
      foreignColumns: [appraisalTemplateKras.tenantId, appraisalTemplateKras.id],
    }),
    uniqueIndex("employee_kras_review_kra_unique")
      .on(table.tenantId, table.reviewId, table.kraId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("employee_kras_tenant_idx").on(table.tenantId),
    index("employee_kras_employee_idx").on(table.tenantId, table.employeeId),
    index("employee_kras_review_idx").on(table.tenantId, table.reviewId),
    index("employee_kras_kra_idx").on(table.tenantId, table.kraId),
    sql`CONSTRAINT employee_kras_score_valid CHECK (score IS NULL OR (score >= 0 AND score <= 100))`,
    ...tenantIsolationPolicies("employee_kras"),
    serviceBypassPolicy("employee_kras"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertAppraisalTemplateSchema = z.object({
  id: AppraisalTemplateIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  templateCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  applicableTo: z.enum(["all", "department", "position"]),
  applicableIds: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const insertAppraisalTemplateKraSchema = z.object({
  id: AppraisalTemplateKraIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  templateId: AppraisalTemplateIdSchema,
  kraCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  weightage: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .refine((val) => {
      const num = parseFloat(val);
      return num >= 0 && num <= 100;
    }, "Weightage must be between 0 and 100"),
  sortOrder: z.number().int().default(0),
});

export const insertEmployeeKraSchema = z.object({
  id: EmployeeKraIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  employeeId: EmployeeIdSchema,
  reviewId: PerformanceReviewIdSchema,
  kraId: AppraisalTemplateKraIdSchema,
  targetValue: z.string().min(1).max(500),
  achievedValue: z.string().max(500).optional(),
  score: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .refine((val) => {
      const num = parseFloat(val);
      return num >= 0 && num <= 100;
    }, "Score must be between 0 and 100")
    .optional(),
  comments: z.string().max(2000).optional(),
});
