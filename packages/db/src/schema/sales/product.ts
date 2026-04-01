import { sql } from "drizzle-orm";
import {
boolean,
check,
foreignKey,
index,
integer,
numeric,
text,
uniqueIndex,
uuid
} from "drizzle-orm/pg-core";
import { createInsertSchema,createSelectSchema,createUpdateSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";

import {
auditColumns,
nameColumn,
softDeleteColumns,
timestampColumns,
} from "../../column-kit/index.js";
import { serviceBypassPolicy,tenantIsolationPolicies } from "../../rls-policies/index.js";
import { tenants } from "../core/tenants.js";
import { unitsOfMeasure } from "../reference/index.js";
import { users } from "../security/index.js";
import {
AttributeDisplayTypeSchema,
CreateVariantPolicySchema,
InvoicePolicySchema,
ProductTrackingSchema,
ProductTypeSchema,
attributeDisplayTypeEnum,
createVariantPolicyEnum,
invoicePolicyEnum,
productTrackingEnum,
productTypeEnum
} from "./_enums.js";
import { salesSchema } from "./_schema.js";
import {
ProductAttributeIdSchema,
ProductAttributeValueIdSchema,
ProductCategoryIdSchema,
ProductIdSchema,
ProductPackagingIdSchema,
ProductTemplateAttributeLineIdSchema,
ProductTemplateAttributeValueIdSchema,
ProductTemplateIdSchema,
ProductVariantIdSchema,
positiveMoneyStringSchema
} from "./_zodShared.js";


export const productCategories = salesSchema.table(
  "product_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    parentId: uuid("parent_id"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_product_categories_tenant").on(table.tenantId),
    index("idx_sales_product_categories_parent").on(table.tenantId, table.parentId),
    uniqueIndex("uq_sales_product_categories_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_product_categories_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "fk_sales_product_categories_parent",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_product_categories"),
    serviceBypassPolicy("sales_product_categories"),
  ]
);

export const products = salesSchema.table(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    sku: text("sku"),
    categoryId: uuid("category_id"),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_products_tenant").on(table.tenantId),
    index("idx_sales_products_category").on(table.tenantId, table.categoryId),
    index("idx_sales_products_active").on(table.tenantId, table.isActive),
    uniqueIndex("uq_sales_products_sku")
      .on(table.tenantId, sql`lower(${table.sku})`)
      .where(sql`${table.deletedAt} IS NULL AND ${table.sku} IS NOT NULL`),
    check("chk_sales_products_unit_price_non_negative", sql`${table.unitPrice} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_products_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [productCategories.id],
      name: "fk_sales_products_category",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_products"),
    serviceBypassPolicy("sales_products"),
  ]
);

// ── Phase 5: Product Configuration ────────────────────────────────────────────

export const productTemplates = salesSchema.table(
  "product_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    internalReference: text("internal_reference"),
    barcode: text("barcode"),
    categoryId: uuid("category_id"),
    uomId: integer("uom_id"),
    uomPoId: integer("uom_po_id"),
    type: productTypeEnum("type").notNull().default("consumable"),
    tracking: productTrackingEnum("tracking").notNull().default("none"),
    invoicePolicy: invoicePolicyEnum("invoice_policy").notNull().default("ordered"),
    canBeSold: boolean("can_be_sold").notNull().default(true),
    canBePurchased: boolean("can_be_purchased").notNull().default(true),
    listPrice: numeric("list_price", { precision: 12, scale: 2 }).notNull().default("0"),
    standardPrice: numeric("standard_price", { precision: 12, scale: 2 }).notNull().default("0"),
    weight: numeric("weight", { precision: 10, scale: 4 }),
    volume: numeric("volume", { precision: 10, scale: 4 }),
    description: text("description"),
    salesDescription: text("sales_description"),
    purchaseDescription: text("purchase_description"),
    sequence: integer("sequence").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_product_templates_tenant").on(table.tenantId),
    index("idx_sales_product_templates_category").on(table.tenantId, table.categoryId),
    index("idx_sales_product_templates_active").on(table.tenantId, table.isActive),
    uniqueIndex("uq_sales_product_templates_barcode")
      .on(table.tenantId, sql`lower(${table.barcode})`)
      .where(sql`${table.deletedAt} IS NULL AND ${table.barcode} IS NOT NULL`),
    check("chk_sales_product_templates_list_price", sql`${table.listPrice} >= 0`),
    check("chk_sales_product_templates_std_price", sql`${table.standardPrice} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_product_templates_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [productCategories.id],
      name: "fk_sales_product_templates_category",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.uomId],
      foreignColumns: [unitsOfMeasure.uomId],
      name: "fk_sales_product_templates_uom",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.uomPoId],
      foreignColumns: [unitsOfMeasure.uomId],
      name: "fk_sales_product_templates_uom_po",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_product_templates"),
    serviceBypassPolicy("sales_product_templates"),
  ]
);

export const productAttributes = salesSchema.table(
  "product_attributes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    displayType: attributeDisplayTypeEnum("display_type").notNull().default("radio"),
    createVariantPolicy: createVariantPolicyEnum("create_variant_policy")
      .notNull()
      .default("always"),
    sequence: integer("sequence").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_product_attributes_tenant").on(table.tenantId),
    uniqueIndex("uq_sales_product_attributes_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_product_attributes_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_product_attributes"),
    serviceBypassPolicy("sales_product_attributes"),
  ]
);

export const productAttributeValues = salesSchema.table(
  "product_attribute_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    attributeId: uuid("attribute_id").notNull(),
    ...nameColumn,
    htmlColor: text("html_color"),
    sequence: integer("sequence").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_product_attribute_values_tenant").on(table.tenantId),
    index("idx_sales_product_attribute_values_attribute").on(table.tenantId, table.attributeId),
    uniqueIndex("uq_sales_product_attribute_values_name")
      .on(table.tenantId, table.attributeId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_product_attribute_values_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.attributeId],
      foreignColumns: [productAttributes.id],
      name: "fk_sales_product_attribute_values_attribute",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_product_attribute_values"),
    serviceBypassPolicy("sales_product_attribute_values"),
  ]
);

export const productTemplateAttributeLines = salesSchema.table(
  "product_template_attribute_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    templateId: uuid("template_id").notNull(),
    attributeId: uuid("attribute_id").notNull(),
    sequence: integer("sequence").notNull().default(1),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_ptmpl_attr_lines_tenant").on(table.tenantId),
    index("idx_sales_ptmpl_attr_lines_template").on(table.tenantId, table.templateId),
    uniqueIndex("uq_sales_ptmpl_attr_lines_tmpl_attr").on(
      table.tenantId,
      table.templateId,
      table.attributeId
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_ptmpl_attr_lines_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.templateId],
      foreignColumns: [productTemplates.id],
      name: "fk_sales_ptmpl_attr_lines_template",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.attributeId],
      foreignColumns: [productAttributes.id],
      name: "fk_sales_ptmpl_attr_lines_attribute",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_product_template_attribute_lines"),
    serviceBypassPolicy("sales_product_template_attribute_lines"),
  ]
);

export const productTemplateAttributeValues = salesSchema.table(
  "product_template_attribute_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    templateAttributeLineId: uuid("template_attribute_line_id").notNull(),
    attributeValueId: uuid("attribute_value_id").notNull(),
    priceExtra: numeric("price_extra", { precision: 12, scale: 2 }).notNull().default("0"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_ptmpl_attr_vals_tenant").on(table.tenantId),
    index("idx_sales_ptmpl_attr_vals_line").on(table.tenantId, table.templateAttributeLineId),
    uniqueIndex("uq_sales_ptmpl_attr_vals_line_val").on(
      table.tenantId,
      table.templateAttributeLineId,
      table.attributeValueId
    ),
    check("chk_sales_ptmpl_attr_vals_price_extra", sql`${table.priceExtra} >= 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_ptmpl_attr_vals_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.templateAttributeLineId],
      foreignColumns: [productTemplateAttributeLines.id],
      name: "fk_sales_ptmpl_attr_vals_line",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.attributeValueId],
      foreignColumns: [productAttributeValues.id],
      name: "fk_sales_ptmpl_attr_vals_attr_val",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_product_template_attribute_values"),
    serviceBypassPolicy("sales_product_template_attribute_values"),
  ]
);

export const productVariants = salesSchema.table(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    templateId: uuid("template_id").notNull(),
    combinationIndices: text("combination_indices").notNull().default(""),
    internalReference: text("internal_reference"),
    barcode: text("barcode"),
    lstPrice: numeric("lst_price", { precision: 12, scale: 2 }),
    standardPrice: numeric("standard_price", { precision: 12, scale: 2 }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_product_variants_tenant").on(table.tenantId),
    index("idx_sales_product_variants_template").on(table.tenantId, table.templateId),
    index("idx_sales_product_variants_active").on(table.tenantId, table.isActive),
    uniqueIndex("uq_sales_product_variants_barcode")
      .on(table.tenantId, sql`lower(${table.barcode})`)
      .where(sql`${table.deletedAt} IS NULL AND ${table.barcode} IS NOT NULL`),
    uniqueIndex("uq_sales_product_variants_combination")
      .on(table.tenantId, table.templateId, table.combinationIndices)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_product_variants_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.templateId],
      foreignColumns: [productTemplates.id],
      name: "fk_sales_product_variants_template",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_product_variants"),
    serviceBypassPolicy("sales_product_variants"),
  ]
);

export const productPackaging = salesSchema.table(
  "product_packaging",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    variantId: uuid("variant_id").notNull(),
    ...nameColumn,
    qty: numeric("qty", { precision: 12, scale: 4 }).notNull().default("0"),
    barcode: text("barcode"),
    sequence: integer("sequence").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_product_packaging_tenant").on(table.tenantId),
    index("idx_sales_product_packaging_variant").on(table.tenantId, table.variantId),
    check("chk_sales_product_packaging_qty_positive", sql`${table.qty} > 0`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_product_packaging_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.variantId],
      foreignColumns: [productVariants.id],
      name: "fk_sales_product_packaging_variant",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_product_packaging"),
    serviceBypassPolicy("sales_product_packaging"),
  ]
);



export const productCategorySelectSchema = createSelectSchema(productCategories);
export const productSelectSchema = createSelectSchema(products);
export const productTemplateSelectSchema = createSelectSchema(productTemplates);
export const productAttributeSelectSchema = createSelectSchema(productAttributes);
export const productAttributeValueSelectSchema = createSelectSchema(productAttributeValues);
export const productTemplateAttributeLineSelectSchema = createSelectSchema(
  productTemplateAttributeLines
);
export const productTemplateAttributeValueSelectSchema = createSelectSchema(
  productTemplateAttributeValues
);
export const productVariantSelectSchema = createSelectSchema(productVariants);
export const productPackagingSelectSchema = createSelectSchema(productPackaging);

export const productCategoryInsertSchema = createInsertSchema(productCategories, {
  id: ProductCategoryIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  parentId: ProductCategoryIdSchema.optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const productInsertSchema = createInsertSchema(products, {
  id: ProductIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  sku: z.string().max(120).optional().nullable(),
  categoryId: ProductCategoryIdSchema.optional().nullable(),
  unitPrice: positiveMoneyStringSchema,
  description: z.string().max(2000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const productTemplateInsertSchema = createInsertSchema(productTemplates, {
  id: ProductTemplateIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  internalReference: z.string().max(120).optional().nullable(),
  barcode: z.string().max(120).optional().nullable(),
  categoryId: ProductCategoryIdSchema.optional().nullable(),
  uomId: z.number().int().positive().optional().nullable(),
  uomPoId: z.number().int().positive().optional().nullable(),
  type: ProductTypeSchema.optional(),
  tracking: ProductTrackingSchema.optional(),
  invoicePolicy: InvoicePolicySchema.optional(),
  canBeSold: z.boolean().optional(),
  canBePurchased: z.boolean().optional(),
  listPrice: positiveMoneyStringSchema.optional(),
  standardPrice: positiveMoneyStringSchema.optional(),
  weight: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Must be valid decimal")
    .optional()
    .nullable(),
  volume: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, "Must be valid decimal")
    .optional()
    .nullable(),
  description: z.string().max(4000).optional().nullable(),
  salesDescription: z.string().max(4000).optional().nullable(),
  purchaseDescription: z.string().max(4000).optional().nullable(),
  sequence: z.number().int().min(1).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const productAttributeInsertSchema = createInsertSchema(productAttributes, {
  id: ProductAttributeIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  displayType: AttributeDisplayTypeSchema.optional(),
  createVariantPolicy: CreateVariantPolicySchema.optional(),
  sequence: z.number().int().min(1).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const productAttributeValueInsertSchema = createInsertSchema(productAttributeValues, {
  id: ProductAttributeValueIdSchema.optional(),
  tenantId: z.number().int().positive(),
  attributeId: ProductAttributeIdSchema,
  name: z.string().min(1).max(200),
  htmlColor: z.string().max(80).optional().nullable(),
  sequence: z.number().int().min(1).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const productTemplateAttributeLineInsertSchema = createInsertSchema(
  productTemplateAttributeLines,
  {
    id: ProductTemplateAttributeLineIdSchema.optional(),
    tenantId: z.number().int().positive(),
    templateId: ProductTemplateIdSchema,
    attributeId: ProductAttributeIdSchema,
    sequence: z.number().int().min(1).optional(),
    createdBy: z.number().int().positive(),
    updatedBy: z.number().int().positive(),
  }
);

export const productTemplateAttributeValueInsertSchema = createInsertSchema(
  productTemplateAttributeValues,
  {
    id: ProductTemplateAttributeValueIdSchema.optional(),
    tenantId: z.number().int().positive(),
    templateAttributeLineId: ProductTemplateAttributeLineIdSchema,
    attributeValueId: ProductAttributeValueIdSchema,
    priceExtra: positiveMoneyStringSchema.optional(),
    createdBy: z.number().int().positive(),
    updatedBy: z.number().int().positive(),
  }
);

export const productVariantInsertSchema = createInsertSchema(productVariants, {
  id: ProductVariantIdSchema.optional(),
  tenantId: z.number().int().positive(),
  templateId: ProductTemplateIdSchema,
  combinationIndices: z.string().max(2000).optional(),
  internalReference: z.string().max(120).optional().nullable(),
  barcode: z.string().max(120).optional().nullable(),
  lstPrice: positiveMoneyStringSchema.optional().nullable(),
  standardPrice: positiveMoneyStringSchema.optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const productPackagingInsertSchema = createInsertSchema(productPackaging, {
  id: ProductPackagingIdSchema.optional(),
  tenantId: z.number().int().positive(),
  variantId: ProductVariantIdSchema,
  name: z.string().min(1).max(200),
  qty: z.string().regex(/^\d+(\.\d{1,4})?$/, "Must be valid positive decimal"),
  barcode: z.string().max(120).optional().nullable(),
  sequence: z.number().int().min(1).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const productCategoryUpdateSchema = createUpdateSchema(productCategories);
export const productUpdateSchema = createUpdateSchema(products);
export const productTemplateUpdateSchema = createUpdateSchema(productTemplates);
export const productAttributeUpdateSchema = createUpdateSchema(productAttributes);
export const productAttributeValueUpdateSchema = createUpdateSchema(productAttributeValues);
export const productTemplateAttributeLineUpdateSchema = createUpdateSchema(
  productTemplateAttributeLines
);
export const productTemplateAttributeValueUpdateSchema = createUpdateSchema(
  productTemplateAttributeValues
);
export const productVariantUpdateSchema = createUpdateSchema(productVariants);
export const productPackagingUpdateSchema = createUpdateSchema(productPackaging);

export type ProductCategory = typeof productCategories.$inferSelect;
export type NewProductCategory = typeof productCategories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductTemplate = typeof productTemplates.$inferSelect;
export type NewProductTemplate = typeof productTemplates.$inferInsert;
export type ProductAttribute = typeof productAttributes.$inferSelect;
export type NewProductAttribute = typeof productAttributes.$inferInsert;
export type ProductAttributeValue = typeof productAttributeValues.$inferSelect;
export type NewProductAttributeValue = typeof productAttributeValues.$inferInsert;
export type ProductTemplateAttributeLine = typeof productTemplateAttributeLines.$inferSelect;
export type NewProductTemplateAttributeLine = typeof productTemplateAttributeLines.$inferInsert;
export type ProductTemplateAttributeValue = typeof productTemplateAttributeValues.$inferSelect;
export type NewProductTemplateAttributeValue = typeof productTemplateAttributeValues.$inferInsert;
export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
export type ProductPackaging = typeof productPackaging.$inferSelect;
export type NewProductPackaging = typeof productPackaging.$inferInsert;
