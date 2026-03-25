// ─────────────────────────────────────────────────────────────────────────────
// Schema Registry — stores ModelMeta for every registered model.
// This IS the metadata platform's backbone.
// ─────────────────────────────────────────────────────────────────────────────

import {
  pgTable,
  text,
  integer,
  jsonb,
  timestamp,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import type { ModelMeta, MetaPermissions, MetaFieldPermission } from "@afenda/meta-types";

export const schemaRegistry = pgTable(
  "schema_registry",
  {
    model: text("model").notNull(),
    module: text("module").notNull().default("core"),
    version: integer("version").notNull().default(1),
    meta: jsonb("meta").$type<ModelMeta>().notNull(),
    permissions: jsonb("permissions").$type<MetaPermissions>().notNull().default({}),
    fieldPermissions: jsonb("field_permissions")
      .$type<MetaFieldPermission[]>()
      .default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.model] }),
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// Roles & Users
// ─────────────────────────────────────────────────────────────────────────────

export const roles = pgTable("roles", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userRoles = pgTable(
  "user_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.roleId] }) })
);
