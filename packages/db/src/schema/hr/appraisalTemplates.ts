// ============================================================================
// HR DOMAIN: APPRAISAL TEMPLATES & KRAs (Upgrade Module)
// Defines reusable performance review templates and key result areas.
// Tables: appraisal_templates, appraisal_template_kras, employee_kras
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
  appraisalTemplateApplicableToEnum,
  appraisalReviewFrequencyEnum,
  appraisalKraCategoryEnum,
  employeeKraStatusEnum,
  AppraisalTemplateApplicableToSchema,
  AppraisalReviewFrequencySchema,
  AppraisalKraCategorySchema,
  EmployeeKraStatusSchema,
} from "./_enums.js";
import { employees } from "./people.js";
import { performanceReviews } from "./talent.js";
import { z } from "zod/v4";
import {
  AppraisalTemplateIdSchema,
  AppraisalTemplateKraIdSchema,
  EmployeeKraIdSchema,
  EmployeeIdSchema,
  PerformanceReviewIdSchema,
  hrTenantIdSchema,
  addIssueIfSerializedJsonExceeds,
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
    applicableTo: appraisalTemplateApplicableToEnum("applicable_to").notNull(),
    applicableIds: jsonb("applicable_ids").$type<string[]>(),
    reviewFrequency: appraisalReviewFrequencyEnum("review_frequency").notNull().default("annual"),
    effectiveFrom: date("effective_from", { mode: "string" }),
    effectiveTo: date("effective_to", { mode: "string" }),
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
    index("appraisal_templates_applicable_ids_gin").using("gin", table.applicableIds),
    check(
      "appraisal_templates_name_max_len",
      sql`char_length(${table.name}) <= 100`
    ),
    check(
      "appraisal_templates_description_max_len",
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 500`
    ),
    check(
      "appraisal_templates_effective_range",
      sql`${table.effectiveFrom} IS NULL OR ${table.effectiveTo} IS NULL OR ${table.effectiveTo} >= ${table.effectiveFrom}`
    ),
    index("appraisal_templates_review_frequency_idx").on(table.tenantId, table.reviewFrequency),
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
    category: appraisalKraCategoryEnum("category").notNull().default("operational"),
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
    index("appraisal_template_kras_category_idx").on(table.tenantId, table.templateId, table.category),
    sql`CONSTRAINT appraisal_template_kras_weightage_valid CHECK (weightage >= 0 AND weightage <= 100)`,
    check(
      "appraisal_template_kras_name_max_len",
      sql`char_length(${table.name}) <= 100`
    ),
    check(
      "appraisal_template_kras_description_max_len",
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 500`
    ),
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
    targetDetails: jsonb("target_details").$type<unknown>(),
    achievedValue: text("achieved_value"),
    achievedDetails: jsonb("achieved_details").$type<unknown>(),
    score: numeric("score", { precision: 5, scale: 2 }), // 0-100
    normalizedScore: numeric("normalized_score", { precision: 5, scale: 2 }),
    status: employeeKraStatusEnum("status").notNull().default("pending"),
    evaluatedBy: uuid("evaluated_by"),
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
    foreignKey({
      columns: [table.tenantId, table.evaluatedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("employee_kras_review_kra_unique")
      .on(table.tenantId, table.reviewId, table.kraId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("employee_kras_tenant_idx").on(table.tenantId),
    index("employee_kras_employee_idx").on(table.tenantId, table.employeeId),
    index("employee_kras_review_idx").on(table.tenantId, table.reviewId),
    index("employee_kras_kra_idx").on(table.tenantId, table.kraId),
    index("employee_kras_status_idx").on(table.tenantId, table.status),
    index("employee_kras_evaluated_by_idx").on(table.tenantId, table.evaluatedBy),
    index("employee_kras_target_details_gin")
      .using("gin", table.targetDetails)
      .where(sql`${table.targetDetails} IS NOT NULL`),
    index("employee_kras_achieved_details_gin")
      .using("gin", table.achievedDetails)
      .where(sql`${table.achievedDetails} IS NOT NULL`),
    sql`CONSTRAINT employee_kras_score_valid CHECK (score IS NULL OR (score >= 0 AND score <= 100))`,
    check(
      "employee_kras_normalized_score_valid",
      sql`${table.normalizedScore} IS NULL OR (${table.normalizedScore} >= 0 AND ${table.normalizedScore} <= 100)`
    ),
    check(
      "employee_kras_score_requires_achievement",
      sql`${table.score} IS NULL OR (${table.achievedValue} IS NOT NULL AND btrim(${table.achievedValue}) <> '')`
    ),
    check(
      "employee_kras_target_value_max_len",
      sql`char_length(${table.targetValue}) <= 500`
    ),
    check(
      "employee_kras_achieved_value_max_len",
      sql`${table.achievedValue} IS NULL OR char_length(${table.achievedValue}) <= 500`
    ),
    check(
      "employee_kras_comments_max_len",
      sql`${table.comments} IS NULL OR char_length(${table.comments}) <= 2000`
    ),
    ...tenantIsolationPolicies("employee_kras"),
    serviceBypassPolicy("employee_kras"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

const employeeKraStructuredPayloadSchema = z
  .json()
  .optional()
  .superRefine((val, ctx) => {
    addIssueIfSerializedJsonExceeds(val, ctx, 65_536);
  });

export const insertAppraisalTemplateSchema = z
  .object({
    id: AppraisalTemplateIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    templateCode: z.string().min(2).max(50),
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    applicableTo: AppraisalTemplateApplicableToSchema,
    applicableIds: z.array(z.string().uuid()).optional(),
    reviewFrequency: AppraisalReviewFrequencySchema.default("annual"),
    effectiveFrom: z.iso.date().optional(),
    effectiveTo: z.iso.date().optional(),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.effectiveFrom && data.effectiveTo && data.effectiveFrom > data.effectiveTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "effectiveTo must be on or after effectiveFrom",
        path: ["effectiveTo"],
      });
    }
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
  category: AppraisalKraCategorySchema.default("operational"),
  sortOrder: z.number().int().default(0),
});

export const insertEmployeeKraSchema = z
  .object({
    id: EmployeeKraIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    employeeId: EmployeeIdSchema,
    reviewId: PerformanceReviewIdSchema,
    kraId: AppraisalTemplateKraIdSchema,
    targetValue: z.string().min(1).max(500),
    targetDetails: employeeKraStructuredPayloadSchema,
    achievedValue: z.string().max(500).optional(),
    achievedDetails: employeeKraStructuredPayloadSchema,
    score: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .refine((val) => {
        const num = parseFloat(val);
        return num >= 0 && num <= 100;
      }, "Score must be between 0 and 100")
      .optional(),
    normalizedScore: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/)
      .refine((val) => {
        const n = parseFloat(val);
        return n >= 0 && n <= 100;
      }, "normalizedScore must be between 0 and 100")
      .optional(),
    status: EmployeeKraStatusSchema.default("pending"),
    evaluatedBy: EmployeeIdSchema.optional(),
    comments: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.score !== undefined && (!data.achievedValue || data.achievedValue.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "achievedValue is required when score is set",
        path: ["achievedValue"],
      });
    }
  });

/**
 * Template KRA weightages must sum to 100 (±tolerance) — enforce in app/transaction when saving
 * all rows for a template; PostgreSQL row CHECKs cannot aggregate sibling rows.
 */
export function appraisalTemplateKraWeightagesSumTo100(
  weightages: ReadonlyArray<string>,
  tolerance = 0.01
): boolean {
  const sum = weightages.reduce((acc, w) => acc + parseFloat(w), 0);
  return Math.abs(sum - 100) <= tolerance;
}
