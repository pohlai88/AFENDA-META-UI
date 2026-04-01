// ============================================================================
// HR DOMAIN: TAX EXEMPTIONS & DECLARATIONS (Upgrade Module)
// Tracks exemption categories, employee declarations, and supporting proof documents.
// Tables: tax_exemption_categories, tax_exemption_sub_categories, employee_tax_declarations,
//         tax_declaration_items, tax_exemption_proofs
//
// Fiscal period uses integer start/end (range queries, aligned with staffing plans).
// Proof `verification_status` is paired with `verified_by` / `verified_date` at DB + Zod.
// Items and proofs cascade when a declaration or item is removed.
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
import { hrSchema } from "./_schema.js";
import {
  taxExemptionCategoryTypeEnum,
  taxDeclarationStatusEnum,
  countryEnum,
  taxProofVerificationStatusEnum,
  taxExemptionProofDocumentTypeEnum,
  TaxExemptionCategoryTypeSchema,
  TaxDeclarationStatusSchema,
  CountrySchema,
  TaxProofVerificationStatusSchema,
  TaxExemptionProofDocumentTypeSchema,
} from "./_enums.js";
import { employees } from "./people.js";
import { z } from "zod/v4";
import {
  TaxExemptionCategoryIdSchema,
  TaxExemptionSubCategoryIdSchema,
  EmployeeTaxDeclarationIdSchema,
  TaxDeclarationItemIdSchema,
  TaxExemptionProofIdSchema,
  EmployeeIdSchema,
  currencyAmountSchema,
  hrTenantIdSchema,
} from "./_zodShared.js";

// ============================================================================
// TAX EXEMPTION CATEGORIES - Define tax exemption categories
// ============================================================================

export const taxExemptionCategories = hrSchema.table(
  "tax_exemption_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    categoryCode: text("category_code").notNull(),
    ...nameColumn,
    description: text("description"),
    categoryType: taxExemptionCategoryTypeEnum("category_type").notNull(),
    maxExemption: numeric("max_exemption", { precision: 15, scale: 2 }), // Annual limit
    countryCode: countryEnum("country_code"), // Country-specific
    requiresProof: boolean("requires_proof").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    uniqueIndex("tax_exemption_categories_tenant_code_unique")
      .on(table.tenantId, table.categoryCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("tax_exemption_categories_tenant_idx").on(table.tenantId),
    index("tax_exemption_categories_type_idx").on(table.tenantId, table.categoryType),
    index("tax_exemption_categories_country_idx").on(table.tenantId, table.countryCode),
    check(
      "tax_exemption_categories_name_max_len",
      sql`char_length(${table.name}) <= 100`
    ),
    check(
      "tax_exemption_categories_description_max_len",
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 500`
    ),
    ...tenantIsolationPolicies("tax_exemption_categories"),
    serviceBypassPolicy("tax_exemption_categories"),
  ]
);

// ============================================================================
// TAX EXEMPTION SUB-CATEGORIES - Detailed exemption types
// ============================================================================

export const taxExemptionSubCategories = hrSchema.table(
  "tax_exemption_sub_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    categoryId: uuid("category_id").notNull(),
    subCategoryCode: text("sub_category_code").notNull(),
    ...nameColumn,
    description: text("description"),
    maxExemption: numeric("max_exemption", { precision: 15, scale: 2 }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.categoryId],
      foreignColumns: [taxExemptionCategories.tenantId, taxExemptionCategories.id],
    }),
    uniqueIndex("tax_exemption_sub_categories_tenant_code_unique")
      .on(table.tenantId, table.categoryId, table.subCategoryCode)
      .where(sql`${table.deletedAt} IS NULL`),
    index("tax_exemption_sub_categories_tenant_idx").on(table.tenantId),
    index("tax_exemption_sub_categories_category_idx").on(table.tenantId, table.categoryId),
    check(
      "tax_exemption_sub_categories_name_max_len",
      sql`char_length(${table.name}) <= 100`
    ),
    check(
      "tax_exemption_sub_categories_description_max_len",
      sql`${table.description} IS NULL OR char_length(${table.description}) <= 500`
    ),
    ...tenantIsolationPolicies("tax_exemption_sub_categories"),
    serviceBypassPolicy("tax_exemption_sub_categories"),
  ]
);

// ============================================================================
// EMPLOYEE TAX DECLARATIONS - Annual tax declarations
// ============================================================================

export const employeeTaxDeclarations = hrSchema.table(
  "employee_tax_declarations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    declarationNumber: text("declaration_number").notNull(),
    employeeId: uuid("employee_id").notNull(),
    /** Inclusive fiscal period for filtering (e.g. 2024, 2025 for FY2024–25). */
    fiscalYearStart: integer("fiscal_year_start").notNull(),
    fiscalYearEnd: integer("fiscal_year_end").notNull(),
    /** Jurisdiction for reporting (optional; categories may also be country-scoped). */
    countryCode: countryEnum("country_code"),
    declarationDate: date("declaration_date", { mode: "string" }).notNull(),
    totalDeclared: numeric("total_declared", { precision: 15, scale: 2 }).notNull().default("0"),
    totalApproved: numeric("total_approved", { precision: 15, scale: 2 }).notNull().default("0"),
    status: taxDeclarationStatusEnum("status").notNull().default("draft"),
    submittedDate: timestamp("submitted_date", { withTimezone: true }),
    approvedDate: timestamp("approved_date", { withTimezone: true }),
    declarationVersion: integer("declaration_version").notNull().default(1),
    verifiedBy: uuid("verified_by"),
    verifiedDate: timestamp("verified_date", { withTimezone: true }),
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
      columns: [table.tenantId, table.verifiedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("employee_tax_declarations_tenant_number_unique")
      .on(table.tenantId, table.declarationNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("employee_tax_declarations_employee_fiscal_unique")
      .on(table.tenantId, table.employeeId, table.fiscalYearStart, table.fiscalYearEnd)
      .where(sql`${table.deletedAt} IS NULL`),
    index("employee_tax_declarations_tenant_idx").on(table.tenantId),
    index("employee_tax_declarations_employee_idx").on(table.tenantId, table.employeeId),
    index("employee_tax_declarations_fiscal_range_idx").on(
      table.tenantId,
      table.fiscalYearStart,
      table.fiscalYearEnd
    ),
    index("employee_tax_declarations_country_idx").on(table.tenantId, table.countryCode),
    index("employee_tax_declarations_status_idx").on(table.tenantId, table.status),
    sql`CONSTRAINT employee_tax_declarations_total_declared_non_negative CHECK (total_declared >= 0)`,
    sql`CONSTRAINT employee_tax_declarations_total_approved_non_negative CHECK (total_approved >= 0)`,
    check(
      "employee_tax_declarations_fiscal_range_valid",
      sql`${table.fiscalYearEnd} >= ${table.fiscalYearStart}`
    ),
    check(
      "employee_tax_declarations_notes_max_len",
      sql`${table.notes} IS NULL OR char_length(${table.notes}) <= 2000`
    ),
    check(
      "employee_tax_declarations_submitted_when_not_draft",
      sql`${table.status} = 'draft'::hr.tax_declaration_status OR ${table.submittedDate} IS NOT NULL`
    ),
    check(
      "employee_tax_declarations_approved_date_only_when_approved",
      sql`${table.approvedDate} IS NULL OR ${table.status} = 'approved'::hr.tax_declaration_status`
    ),
    check(
      "employee_tax_declarations_approved_status_requires_date",
      sql`${table.status} <> 'approved'::hr.tax_declaration_status OR ${table.approvedDate} IS NOT NULL`
    ),
    check(
      "employee_tax_declarations_verifier_matches_status",
      sql`(
        (
          ${table.status} IN ('verified'::hr.tax_declaration_status, 'approved'::hr.tax_declaration_status)
          AND ${table.verifiedBy} IS NOT NULL
          AND ${table.verifiedDate} IS NOT NULL
        )
        OR
        (
          ${table.status} NOT IN ('verified'::hr.tax_declaration_status, 'approved'::hr.tax_declaration_status)
          AND ${table.verifiedBy} IS NULL
          AND ${table.verifiedDate} IS NULL
        )
      )`
    ),
    ...tenantIsolationPolicies("employee_tax_declarations"),
    serviceBypassPolicy("employee_tax_declarations"),
  ]
);

// ============================================================================
// TAX DECLARATION ITEMS - Individual exemption items
// ============================================================================

export const taxDeclarationItems = hrSchema.table(
  "tax_declaration_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    declarationId: uuid("declaration_id").notNull(),
    subCategoryId: uuid("sub_category_id").notNull(),
    declaredAmount: numeric("declared_amount", { precision: 15, scale: 2 }).notNull(),
    approvedAmount: numeric("approved_amount", { precision: 15, scale: 2 }).default("0"),
    proofDocumentUrl: text("proof_document_url"),
    verificationNotes: text("verification_notes"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.declarationId],
      foreignColumns: [employeeTaxDeclarations.tenantId, employeeTaxDeclarations.id],
      name: "tax_declaration_items_declaration_fk",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.subCategoryId],
      foreignColumns: [taxExemptionSubCategories.tenantId, taxExemptionSubCategories.id],
    }),
    uniqueIndex("tax_declaration_items_declaration_subcategory_unique")
      .on(table.tenantId, table.declarationId, table.subCategoryId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("tax_declaration_items_tenant_idx").on(table.tenantId),
    index("tax_declaration_items_declaration_idx").on(table.tenantId, table.declarationId),
    index("tax_declaration_items_subcategory_idx").on(table.tenantId, table.subCategoryId),
    sql`CONSTRAINT tax_declaration_items_declared_positive CHECK (declared_amount > 0)`,
    sql`CONSTRAINT tax_declaration_items_approved_non_negative CHECK (approved_amount >= 0)`,
    check(
      "tax_declaration_items_verification_notes_max_len",
      sql`${table.verificationNotes} IS NULL OR char_length(${table.verificationNotes}) <= 1000`
    ),
    ...tenantIsolationPolicies("tax_declaration_items"),
    serviceBypassPolicy("tax_declaration_items"),
  ]
);

// ============================================================================
// TAX EXEMPTION PROOFS - Supporting documents
// ============================================================================

export const taxExemptionProofs = hrSchema.table(
  "tax_exemption_proofs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    declarationItemId: uuid("declaration_item_id").notNull(),
    documentType: taxExemptionProofDocumentTypeEnum("document_type").notNull(),
    documentNumber: text("document_number"),
    documentUrl: text("document_url").notNull(),
    uploadDate: timestamp("upload_date", { withTimezone: true }).notNull().defaultNow(),
    verificationStatus: taxProofVerificationStatusEnum("verification_status")
      .notNull()
      .default("pending"),
    verifiedBy: uuid("verified_by"),
    verifiedDate: timestamp("verified_date", { withTimezone: true }),
    verificationNotes: text("verification_notes"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.declarationItemId],
      foreignColumns: [taxDeclarationItems.tenantId, taxDeclarationItems.id],
      name: "tax_exemption_proofs_declaration_item_fk",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.verifiedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    index("tax_exemption_proofs_tenant_idx").on(table.tenantId),
    index("tax_exemption_proofs_item_idx").on(table.tenantId, table.declarationItemId),
    index("tax_exemption_proofs_status_idx").on(table.tenantId, table.verificationStatus),
    check(
      "tax_exemption_proofs_verification_fields_match_status",
      sql`(
        (
          ${table.verificationStatus} = 'verified'::hr.tax_proof_verification_status
          AND ${table.verifiedBy} IS NOT NULL
          AND ${table.verifiedDate} IS NOT NULL
        )
        OR
        (
          ${table.verificationStatus} IN (
            'pending'::hr.tax_proof_verification_status,
            'rejected'::hr.tax_proof_verification_status
          )
          AND ${table.verifiedBy} IS NULL
          AND ${table.verifiedDate} IS NULL
        )
      )`
    ),
    check(
      "tax_exemption_proofs_verification_notes_max_len",
      sql`${table.verificationNotes} IS NULL OR char_length(${table.verificationNotes}) <= 1000`
    ),
    ...tenantIsolationPolicies("tax_exemption_proofs"),
    serviceBypassPolicy("tax_exemption_proofs"),
  ]
);

// ============================================================================
// ZOD INSERT SCHEMAS
// ============================================================================

export const insertTaxExemptionCategorySchema = z.object({
  id: TaxExemptionCategoryIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  categoryCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  categoryType: TaxExemptionCategoryTypeSchema,
  maxExemption: currencyAmountSchema(2).optional(),
  countryCode: CountrySchema.optional(),
  requiresProof: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const insertTaxExemptionSubCategorySchema = z.object({
  id: TaxExemptionSubCategoryIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  categoryId: TaxExemptionCategoryIdSchema,
  subCategoryCode: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  maxExemption: currencyAmountSchema(2).optional(),
  isActive: z.boolean().default(true),
});

export const insertEmployeeTaxDeclarationSchema = z
  .object({
    id: EmployeeTaxDeclarationIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    declarationNumber: z.string().min(1).max(50),
    employeeId: EmployeeIdSchema,
    fiscalYearStart: z.number().int().min(1900).max(2100),
    fiscalYearEnd: z.number().int().min(1900).max(2100),
    countryCode: CountrySchema.optional(),
    declarationDate: z.iso.date(),
    totalDeclared: currencyAmountSchema(2).default("0"),
    totalApproved: currencyAmountSchema(2).default("0"),
    status: TaxDeclarationStatusSchema.default("draft"),
    submittedDate: z.iso.datetime().optional(),
    approvedDate: z.iso.datetime().optional(),
    declarationVersion: z.number().int().min(1).default(1),
    verifiedBy: EmployeeIdSchema.optional(),
    verifiedDate: z.iso.datetime().optional(),
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
    if (data.status !== "draft" && data.submittedDate == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "submittedDate is required when status is not draft",
        path: ["submittedDate"],
      });
    }
    if (data.status === "draft" && data.submittedDate != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "submittedDate must be omitted when status is draft",
        path: ["submittedDate"],
      });
    }
    if (data.approvedDate != null && data.status !== "approved") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "approvedDate is only allowed when status is approved",
        path: ["approvedDate"],
      });
    }
    if (data.status === "approved" && data.approvedDate == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "approvedDate is required when status is approved",
        path: ["approvedDate"],
      });
    }
    if (data.status === "verified" || data.status === "approved") {
      if (data.verifiedBy == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "verifiedBy is required when status is verified or approved",
          path: ["verifiedBy"],
        });
      }
      if (data.verifiedDate == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "verifiedDate is required when status is verified or approved",
          path: ["verifiedDate"],
        });
      }
    } else {
      if (data.verifiedBy != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "verifiedBy must be omitted unless status is verified or approved",
          path: ["verifiedBy"],
        });
      }
      if (data.verifiedDate != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "verifiedDate must be omitted unless status is verified or approved",
          path: ["verifiedDate"],
        });
      }
    }
  });

export const insertTaxDeclarationItemSchema = z.object({
  id: TaxDeclarationItemIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  declarationId: EmployeeTaxDeclarationIdSchema,
  subCategoryId: TaxExemptionSubCategoryIdSchema,
  declaredAmount: currencyAmountSchema(2).refine(
    (val) => parseFloat(val) > 0,
    "Declared amount must be positive"
  ),
  approvedAmount: currencyAmountSchema(2).default("0"),
  proofDocumentUrl: z.string().url().optional(),
  verificationNotes: z.string().max(1000).optional(),
});

export const insertTaxExemptionProofSchema = z
  .object({
    id: TaxExemptionProofIdSchema.optional(),
    tenantId: hrTenantIdSchema,
    declarationItemId: TaxDeclarationItemIdSchema,
    documentType: TaxExemptionProofDocumentTypeSchema,
    documentNumber: z.string().max(100).optional(),
    documentUrl: z.string().url(),
    uploadDate: z.iso.datetime().optional(),
    verificationStatus: TaxProofVerificationStatusSchema.default("pending"),
    verifiedBy: EmployeeIdSchema.optional(),
    verifiedDate: z.iso.datetime().optional(),
    verificationNotes: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.verificationStatus === "verified") {
      if (data.verifiedBy == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "verifiedBy is required when verificationStatus is verified",
          path: ["verifiedBy"],
        });
      }
      if (data.verifiedDate == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "verifiedDate is required when verificationStatus is verified",
          path: ["verifiedDate"],
        });
      }
    } else {
      if (data.verifiedBy != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "verifiedBy must be omitted unless verificationStatus is verified",
          path: ["verifiedBy"],
        });
      }
      if (data.verifiedDate != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "verifiedDate must be omitted unless verificationStatus is verified",
          path: ["verifiedDate"],
        });
      }
    }
  });
