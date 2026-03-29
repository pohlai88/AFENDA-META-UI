// ============================================================================
// HR DOMAIN: TAX EXEMPTIONS & DECLARATIONS (Upgrade Module)
// Tracks exemption categories, employee declarations, and supporting proof documents.
// Tables: tax_exemption_categories, tax_exemption_subcategories, employee_tax_declarations
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
import { taxExemptionCategoryTypeEnum, taxDeclarationStatusEnum, countryEnum } from "./_enums.js";
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
    ...auditColumns,
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
    ...auditColumns,
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
    fiscalYear: text("fiscal_year").notNull(), // e.g., "2024-2025"
    declarationDate: date("declaration_date", { mode: "string" }).notNull(),
    totalDeclared: numeric("total_declared", { precision: 15, scale: 2 }).notNull().default("0"),
    totalApproved: numeric("total_approved", { precision: 15, scale: 2 }).notNull().default("0"),
    status: taxDeclarationStatusEnum("status").notNull().default("draft"),
    verifiedBy: uuid("verified_by"),
    verifiedDate: timestamp("verified_date"),
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
      columns: [table.tenantId, table.verifiedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    uniqueIndex("employee_tax_declarations_tenant_number_unique")
      .on(table.tenantId, table.declarationNumber)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("employee_tax_declarations_employee_year_unique")
      .on(table.tenantId, table.employeeId, table.fiscalYear)
      .where(sql`${table.deletedAt} IS NULL`),
    index("employee_tax_declarations_tenant_idx").on(table.tenantId),
    index("employee_tax_declarations_employee_idx").on(table.tenantId, table.employeeId),
    index("employee_tax_declarations_fiscal_year_idx").on(table.tenantId, table.fiscalYear),
    index("employee_tax_declarations_status_idx").on(table.tenantId, table.status),
    sql`CONSTRAINT employee_tax_declarations_total_declared_non_negative CHECK (total_declared >= 0)`,
    sql`CONSTRAINT employee_tax_declarations_total_approved_non_negative CHECK (total_approved >= 0)`,
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
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.declarationId],
      foreignColumns: [employeeTaxDeclarations.tenantId, employeeTaxDeclarations.id],
    }),
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
    documentType: text("document_type").notNull(), // e.g., 'receipt', 'certificate', 'invoice'
    documentNumber: text("document_number"),
    documentUrl: text("document_url").notNull(),
    uploadDate: timestamp("upload_date").notNull().defaultNow(),
    verificationStatus: text("verification_status").notNull().default("pending"), // 'pending' | 'verified' | 'rejected'
    verifiedBy: uuid("verified_by"),
    verifiedDate: timestamp("verified_date"),
    verificationNotes: text("verification_notes"),
    ...timestampColumns,
    ...auditColumns,
    ...softDeleteColumns,
  },
  (table) => [
    foreignKey({ columns: [table.tenantId], foreignColumns: [tenants.tenantId] }),
    foreignKey({
      columns: [table.tenantId, table.declarationItemId],
      foreignColumns: [taxDeclarationItems.tenantId, taxDeclarationItems.id],
    }),
    foreignKey({
      columns: [table.tenantId, table.verifiedBy],
      foreignColumns: [employees.tenantId, employees.id],
    }),
    index("tax_exemption_proofs_tenant_idx").on(table.tenantId),
    index("tax_exemption_proofs_item_idx").on(table.tenantId, table.declarationItemId),
    index("tax_exemption_proofs_status_idx").on(table.tenantId, table.verificationStatus),
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
  categoryType: z.enum([
    "housing",
    "education",
    "medical",
    "insurance",
    "investment",
    "donation",
    "other",
  ]),
  maxExemption: currencyAmountSchema(2).optional(),
  countryCode: z
    .enum([
      "US",
      "SG",
      "MY",
      "ID",
      "GB",
      "AU",
      "CA",
      "IN",
      "PH",
      "TH",
      "VN",
      "HK",
      "TW",
      "JP",
      "KR",
      "NZ",
    ])
    .optional(),
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

export const insertEmployeeTaxDeclarationSchema = z.object({
  id: EmployeeTaxDeclarationIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  declarationNumber: z.string().min(1).max(50),
  employeeId: EmployeeIdSchema,
  fiscalYear: z.string().regex(/^\d{4}-\d{4}$/, "Fiscal year must be in format YYYY-YYYY"),
  declarationDate: z.string().date(),
  totalDeclared: currencyAmountSchema(2).default("0"),
  totalApproved: currencyAmountSchema(2).default("0"),
  status: z.enum(["draft", "submitted", "verified", "approved", "rejected"]).default("draft"),
  verifiedBy: EmployeeIdSchema.optional(),
  verifiedDate: z.date().optional(),
  notes: z.string().max(2000).optional(),
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

export const insertTaxExemptionProofSchema = z.object({
  id: TaxExemptionProofIdSchema.optional(),
  tenantId: hrTenantIdSchema,
  declarationItemId: TaxDeclarationItemIdSchema,
  documentType: z.string().min(2).max(50),
  documentNumber: z.string().max(100).optional(),
  documentUrl: z.string().url(),
  uploadDate: z.date().optional(),
  verificationStatus: z.enum(["pending", "verified", "rejected"]).default("pending"),
  verifiedBy: EmployeeIdSchema.optional(),
  verifiedDate: z.date().optional(),
  verificationNotes: z.string().max(1000).optional(),
});
