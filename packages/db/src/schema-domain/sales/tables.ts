/**
 * Sales Module — example ERP domain schema
 * Ported from apps/api/src/db/schema/sales.ts into the shared DB package.
 *
 * Every table here auto-generates GraphQL types via drizzle-graphql,
 * which then feeds the metadata introspection pipeline.
 */

import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────────────────────────

export const orderStatusEnum = pgEnum("order_status", [
  "draft",
  "confirmed",
  "shipped",
  "done",
  "cancelled",
]);

export const partnerTypeEnum = pgEnum("partner_type", [
  "customer",
  "vendor",
  "both",
]);

// ── Partners (customers / vendors) ─────────────────────────────────────────

export const partners = pgTable("partners", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  type: partnerTypeEnum("type").notNull().default("customer"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Product Categories ─────────────────────────────────────────────────────

export const productCategories = pgTable("product_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  parentId: uuid("parent_id"),
});

// ── Products ───────────────────────────────────────────────────────────────

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  sku: text("sku").unique(),
  categoryId: uuid("category_id").references(() => productCategories.id),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Sales Orders ───────────────────────────────────────────────────────────

export const salesOrders = pgTable("sales_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  partnerId: uuid("partner_id")
    .notNull()
    .references(() => partners.id),
  status: orderStatusEnum("status").notNull().default("draft"),
  orderDate: timestamp("order_date").defaultNow().notNull(),
  deliveryDate: timestamp("delivery_date"),
  assignedToId: text("assigned_to_id"),
  notes: text("notes"),
  amountUntaxed: numeric("amount_untaxed", { precision: 14, scale: 2 }).default("0"),
  amountTax: numeric("amount_tax", { precision: 14, scale: 2 }).default("0"),
  amountTotal: numeric("amount_total", { precision: 14, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Sales Order Lines ──────────────────────────────────────────────────────

export const salesOrderLines = pgTable("sales_order_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => salesOrders.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  description: text("description"),
  quantity: numeric("quantity", { precision: 12, scale: 4 }).notNull().default("1"),
  priceUnit: numeric("price_unit", { precision: 12, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 5, scale: 2 }).default("0"),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
  sequence: integer("sequence").notNull().default(10),
});
