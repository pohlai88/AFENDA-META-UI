import { jsonb, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import type { MetaFieldPermission, MetaPermissions, ModelMeta } from "@afenda/meta-types";

export const schemaRegistry = pgTable(
  "schema_registry",
  {
    model: text("model").notNull(),
    module: text("module").notNull().default("core"),
    version: integer("version").notNull().default(1),
    meta: jsonb("meta").$type<ModelMeta>().notNull(),
    permissions: jsonb("permissions").$type<MetaPermissions>().notNull().default({}),
    fieldPermissions: jsonb("field_permissions").$type<MetaFieldPermission[]>().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.model] }),
  })
);
