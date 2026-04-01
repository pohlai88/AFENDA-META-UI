import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  timestamp,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls-policies/index.js";
import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../column-kit/index.js";
import { dateOnlyWire, instantWire } from "../../wire/temporal.js";
import { tenants } from "../core/tenants.js";
import { users } from "../security/index.js";
import {
  ConsignmentReportPeriodSchema,
  consignmentReportPeriodEnum,
  ConsignmentReportStatusSchema,
  consignmentReportStatusEnum,
  ConsignmentStatusSchema,
  consignmentStatusEnum,
} from "./_enums.js";
import {
  ConsignmentAgreementIdSchema,
  ConsignmentAgreementLineIdSchema,
  ConsignmentStockReportIdSchema,
  ConsignmentStockReportLineIdSchema,
  PartnerIdSchema,
  PaymentTermIdSchema,
  positiveMoneyStringSchema,
  ProductIdSchema,
  quantityStringSchema,
} from "./_zodShared.js";
import { salesSchema } from "./_schema.js";

import { partners } from "./partner.js";
import { products } from "./product.js";
import { paymentTerms } from "./pricing.js";


export const consignmentAgreements = salesSchema.table(
  "consignment_agreements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    ...nameColumn,
    partnerId: uuid("partner_id").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    status: consignmentStatusEnum("status").notNull().default("draft"),
    paymentTermId: uuid("payment_term_id"),
    reviewPeriodDays: integer("review_period_days").notNull().default(30),
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_consignment_agreements_tenant").on(table.tenantId),
    index("idx_sales_consignment_agreements_partner").on(
      table.tenantId,
      table.partnerId,
      table.status
    ),
    index("idx_sales_consignment_agreements_dates").on(
      table.tenantId,
      table.startDate,
      table.endDate
    ),
    index("idx_sales_consignment_agreements_payment_term").on(table.tenantId, table.paymentTermId),
    index("idx_sales_consignment_agreements_status_end").on(
      table.tenantId,
      table.status,
      table.endDate
    ),
    uniqueIndex("uq_sales_consignment_agreements_name")
      .on(table.tenantId, sql`lower(${table.name})`)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("uq_sales_consignment_agreements_one_active_per_partner")
      .on(table.tenantId, table.partnerId)
      .where(sql`${table.status} = 'active' AND ${table.deletedAt} IS NULL`),
    check(
      "chk_sales_consignment_agreements_end_after_start",
      sql`${table.endDate} IS NULL OR ${table.endDate} >= ${table.startDate}`
    ),
    check(
      "chk_sales_consignment_agreements_review_period_positive",
      sql`${table.reviewPeriodDays} > 0`
    ),
    check(
      "chk_sales_consignment_agreements_expired_requires_end_date",
      sql`${table.status} <> 'expired' OR ${table.endDate} IS NOT NULL`
    ),
    check(
      "chk_sales_consignment_agreements_active_end_not_in_past",
      sql`${table.status}::text <> 'active' OR ${table.endDate} IS NULL OR (${table.endDate} AT TIME ZONE 'UTC')::date >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_consignment_agreements_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.partnerId],
      foreignColumns: [partners.id],
      name: "fk_sales_consignment_agreements_partner",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.paymentTermId],
      foreignColumns: [paymentTerms.id],
      name: "fk_sales_consignment_agreements_payment_term",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_consignment_agreements"),
    serviceBypassPolicy("sales_consignment_agreements"),
  ]
);

export const consignmentAgreementLines = salesSchema.table(
  "consignment_agreement_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    agreementId: uuid("agreement_id").notNull(),
    productId: uuid("product_id").notNull(),
    maxQuantity: numeric("max_quantity", { precision: 12, scale: 4 }).notNull().default("0"),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull().default("0"),
    minReportPeriod: consignmentReportPeriodEnum("min_report_period").notNull().default("monthly"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_consignment_agreement_lines_tenant").on(table.tenantId),
    index("idx_sales_consignment_agreement_lines_agreement").on(table.tenantId, table.agreementId),
    index("idx_sales_consignment_agreement_lines_product").on(table.tenantId, table.productId),
    uniqueIndex("uq_sales_consignment_agreement_lines_unique")
      .on(table.tenantId, table.agreementId, table.productId)
      .where(sql`${table.deletedAt} IS NULL`),
    check(
      "chk_sales_consignment_agreement_lines_max_qty_non_negative",
      sql`${table.maxQuantity} >= 0`
    ),
    check(
      "chk_sales_consignment_agreement_lines_unit_price_non_negative",
      sql`${table.unitPrice} >= 0`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_consignment_agreement_lines_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.agreementId],
      foreignColumns: [consignmentAgreements.id],
      name: "fk_sales_consignment_agreement_lines_agreement",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "fk_sales_consignment_agreement_lines_product",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_consignment_agreement_lines"),
    serviceBypassPolicy("sales_consignment_agreement_lines"),
  ]
);

export const consignmentStockReports = salesSchema.table(
  "consignment_stock_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    agreementId: uuid("agreement_id").notNull(),
    reportDate: timestamp("report_date", { withTimezone: true }).notNull(),
    status: consignmentReportStatusEnum("status").notNull().default("draft"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    invoicedAt: timestamp("invoiced_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_consignment_stock_reports_tenant").on(table.tenantId),
    index("idx_sales_consignment_stock_reports_agreement").on(
      table.tenantId,
      table.agreementId,
      table.reportDate
    ),
    index("idx_sales_consignment_stock_reports_status").on(
      table.tenantId,
      table.status,
      table.reportDate
    ),
    uniqueIndex("uq_sales_consignment_stock_reports_date")
      .on(table.tenantId, table.agreementId, table.reportDate)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_consignment_stock_reports_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.agreementId],
      foreignColumns: [consignmentAgreements.id],
      name: "fk_sales_consignment_stock_reports_agreement",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_consignment_stock_reports"),
    serviceBypassPolicy("sales_consignment_stock_reports"),
  ]
);

export const consignmentStockReportLines = salesSchema.table(
  "consignment_stock_report_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: integer("tenant_id").notNull(),
    reportId: uuid("report_id").notNull(),
    productId: uuid("product_id").notNull(),
    openingQty: numeric("opening_qty", { precision: 12, scale: 4 }).notNull().default("0"),
    receivedQty: numeric("received_qty", { precision: 12, scale: 4 }).notNull().default("0"),
    soldQty: numeric("sold_qty", { precision: 12, scale: 4 }).notNull().default("0"),
    returnedQty: numeric("returned_qty", { precision: 12, scale: 4 }).notNull().default("0"),
    closingQty: numeric("closing_qty", { precision: 12, scale: 4 }).notNull().default("0"),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull().default("0"),
    lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull().default("0"),
    ...timestampColumns,
    ...auditColumns(() => users.userId),
  },
  (table) => [
    index("idx_sales_consignment_stock_report_lines_tenant").on(table.tenantId),
    index("idx_sales_consignment_stock_report_lines_report").on(table.tenantId, table.reportId),
    index("idx_sales_consignment_stock_report_lines_product").on(table.tenantId, table.productId),
    uniqueIndex("uq_sales_consignment_stock_report_lines_unique").on(
      table.tenantId,
      table.reportId,
      table.productId
    ),
    check(
      "chk_sales_consignment_stock_report_lines_opening_non_negative",
      sql`${table.openingQty} >= 0`
    ),
    check(
      "chk_sales_consignment_stock_report_lines_received_non_negative",
      sql`${table.receivedQty} >= 0`
    ),
    check("chk_sales_consignment_stock_report_lines_sold_non_negative", sql`${table.soldQty} >= 0`),
    check(
      "chk_sales_consignment_stock_report_lines_returned_non_negative",
      sql`${table.returnedQty} >= 0`
    ),
    check(
      "chk_sales_consignment_stock_report_lines_closing_non_negative",
      sql`${table.closingQty} >= 0`
    ),
    check(
      "chk_sales_consignment_stock_report_lines_unit_price_non_negative",
      sql`${table.unitPrice} >= 0`
    ),
    check(
      "chk_sales_consignment_stock_report_lines_total_non_negative",
      sql`${table.lineTotal} >= 0`
    ),
    check(
      "chk_sales_consignment_stock_report_lines_stock_balance",
      sql`${table.openingQty} + ${table.receivedQty} - ${table.soldQty} - ${table.returnedQty} = ${table.closingQty}`
    ),
    check(
      "chk_sales_consignment_stock_report_lines_line_total_matches_sold",
      sql`round(${table.soldQty} * ${table.unitPrice}, 2) = round(${table.lineTotal}, 2)`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_sales_consignment_stock_report_lines_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.reportId],
      foreignColumns: [consignmentStockReports.id],
      name: "fk_sales_consignment_stock_report_lines_report",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.productId],
      foreignColumns: [products.id],
      name: "fk_sales_consignment_stock_report_lines_product",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("sales_consignment_stock_report_lines"),
    serviceBypassPolicy("sales_consignment_stock_report_lines"),
  ]
);

export const consignmentAgreementSelectSchema = createSelectSchema(consignmentAgreements);
export const consignmentAgreementLineSelectSchema = createSelectSchema(consignmentAgreementLines);
export const consignmentStockReportSelectSchema = createSelectSchema(consignmentStockReports);
export const consignmentStockReportLineSelectSchema = createSelectSchema(
  consignmentStockReportLines
);

export const consignmentAgreementInsertSchema = createInsertSchema(consignmentAgreements, {
  id: ConsignmentAgreementIdSchema.optional(),
  tenantId: z.number().int().positive(),
  name: z.string().min(1).max(200),
  partnerId: PartnerIdSchema,
  startDate: dateOnlyWire,
  endDate: dateOnlyWire.optional().nullable(),
  status: ConsignmentStatusSchema.optional().default("draft"),
  paymentTermId: PaymentTermIdSchema.optional().nullable(),
  reviewPeriodDays: z.number().int().positive().optional(),
  notes: z.string().max(4000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const consignmentAgreementLineInsertSchema = createInsertSchema(consignmentAgreementLines, {
  id: ConsignmentAgreementLineIdSchema.optional(),
  tenantId: z.number().int().positive(),
  agreementId: ConsignmentAgreementIdSchema,
  productId: ProductIdSchema,
  maxQuantity: quantityStringSchema.optional(),
  unitPrice: positiveMoneyStringSchema.optional(),
  minReportPeriod: ConsignmentReportPeriodSchema.optional().default("monthly"),
  isActive: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const consignmentStockReportInsertSchema = createInsertSchema(consignmentStockReports, {
  id: ConsignmentStockReportIdSchema.optional(),
  tenantId: z.number().int().positive(),
  agreementId: ConsignmentAgreementIdSchema,
  reportDate: dateOnlyWire,
  status: ConsignmentReportStatusSchema.optional().default("draft"),
  submittedAt: instantWire.optional().nullable(),
  confirmedAt: instantWire.optional().nullable(),
  invoicedAt: instantWire.optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const consignmentStockReportLineInsertSchema = createInsertSchema(
  consignmentStockReportLines,
  {
    id: ConsignmentStockReportLineIdSchema.optional(),
    tenantId: z.number().int().positive(),
    reportId: ConsignmentStockReportIdSchema,
    productId: ProductIdSchema,
    openingQty: quantityStringSchema.optional(),
    receivedQty: quantityStringSchema.optional(),
    soldQty: quantityStringSchema.optional(),
    returnedQty: quantityStringSchema.optional(),
    closingQty: quantityStringSchema.optional(),
    unitPrice: positiveMoneyStringSchema.optional(),
    lineTotal: positiveMoneyStringSchema.optional(),
    createdBy: z.number().int().positive(),
    updatedBy: z.number().int().positive(),
  }
);

export const consignmentAgreementUpdateSchema = createUpdateSchema(consignmentAgreements);
export const consignmentAgreementLineUpdateSchema = createUpdateSchema(consignmentAgreementLines);
export const consignmentStockReportUpdateSchema = createUpdateSchema(consignmentStockReports);
export const consignmentStockReportLineUpdateSchema = createUpdateSchema(
  consignmentStockReportLines
);

export type ConsignmentAgreement = typeof consignmentAgreements.$inferSelect;
export type NewConsignmentAgreement = typeof consignmentAgreements.$inferInsert;
export type ConsignmentAgreementLine = typeof consignmentAgreementLines.$inferSelect;
export type NewConsignmentAgreementLine = typeof consignmentAgreementLines.$inferInsert;
export type ConsignmentStockReport = typeof consignmentStockReports.$inferSelect;
export type NewConsignmentStockReport = typeof consignmentStockReports.$inferInsert;
export type ConsignmentStockReportLine = typeof consignmentStockReportLines.$inferSelect;
export type NewConsignmentStockReportLine = typeof consignmentStockReportLines.$inferInsert;

/** Client payload: tenant and audit columns are applied server-side. */
export type ConsignmentAgreementCreateDto = Omit<
  z.output<typeof consignmentAgreementInsertSchema>,
  "tenantId" | "createdBy" | "updatedBy"
>;
export type ConsignmentAgreementLineCreateDto = Omit<
  z.output<typeof consignmentAgreementLineInsertSchema>,
  "tenantId" | "createdBy" | "updatedBy"
>;
export type ConsignmentStockReportCreateDto = Omit<
  z.output<typeof consignmentStockReportInsertSchema>,
  "tenantId" | "createdBy" | "updatedBy"
>;
export type ConsignmentStockReportLineCreateDto = Omit<
  z.output<typeof consignmentStockReportLineInsertSchema>,
  "tenantId" | "createdBy" | "updatedBy"
>;
