// ============================================================================
// SECURITY DOMAIN — Users
// Tenant-scoped identity; audit actors reference this table (created_by / updated_by).
//
// Email:
// - Uniqueness is case-insensitive per tenant for non-deleted rows (`uq_users_email`).
// - Partial index `users_tenant_email_active_idx` supports active-only lookups by exact `email`;
//   equality on `lower(email)` for active users can also use `uq_users_email` as a lookup path.
// - Insert/update Zod paths preprocess `email` (trim + lowercase) before format validation so inputs
//   align with `lower(email)` uniqueness checks.
//
// Bootstrap: first user in a tenant still needs a valid (tenantId, createdBy) pair — use a seeded
// system user or service-level insert; see seeds/domains/foundation `ensureSystemUser`.
//
// Status: default `PENDING_VERIFICATION`; transitions to ACTIVE / LOCKED / etc. are app/workflow policy.
// Optional text fields: prefer `null` for unset; avoid empty strings unless you normalize them in mutations.
// ============================================================================
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import {
  boolean,
  foreignKey,
  index,
  integer,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { softDeleteColumns, timestampColumns } from "../../column-kit/index.js";
import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls-policies/index.js";
import { tenants } from "../core/tenants.js";
import { userStatusEnum, UserStatusSchema } from "./_enums.js";
import { securitySchema, securityTenantSqlColumn } from "./_schema.js";

export const users = securitySchema.table(
  "users",
  {
    userId: integer().primaryKey().generatedAlwaysAsIdentity(),
    tenantId: integer(securityTenantSqlColumn).notNull(),
    email: text().notNull(),
    displayName: text().notNull(),
    status: userStatusEnum().notNull().default("PENDING_VERIFICATION"),
    emailVerified: boolean().notNull().default(false),
    avatarUrl: text(),
    lastLoginAt: timestamp({ withTimezone: true }),
    locale: text(),
    timezone: text(),
    ...timestampColumns,
    ...softDeleteColumns,
    createdBy: integer("created_by").notNull(),
    updatedBy: integer("updated_by").notNull(),
  },
  (table) => [
    index("users_tenant_idx").on(table.tenantId),
    index("users_tenant_email_idx").on(table.tenantId, table.email),
    index("users_tenant_email_active_idx")
      .on(table.tenantId, table.email)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("users_tenant_user_id_unique").on(table.tenantId, table.userId),
    uniqueIndex("uq_users_email")
      .on(table.tenantId, sql`lower(${table.email})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_users_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.createdBy],
      foreignColumns: [table.tenantId, table.userId],
      name: "fk_users_created_by_user_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.updatedBy],
      foreignColumns: [table.tenantId, table.userId],
      name: "fk_users_updated_by_user_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("users", securityTenantSqlColumn),
    serviceBypassPolicy("users"),
  ]
);

export const userSelectSchema = createSelectSchema(users);

export const userInsertSchema = createInsertSchema(users, {
  tenantId: z.number().int().positive(),
  email: z.preprocess(
    (val) => (typeof val === "string" ? val.trim().toLowerCase() : val),
    z.email()
  ),
  displayName: z.string().min(1).max(200),
  status: UserStatusSchema.optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const userUpdateSchema = createUpdateSchema(users, {
  email: z.preprocess(
    (val) => (typeof val === "string" ? val.trim().toLowerCase() : val),
    z.email().optional()
  ),
  displayName: z.string().min(1).max(200).optional(),
  status: UserStatusSchema.optional(),
  emailVerified: z.boolean().optional(),
  avatarUrl: z.url().optional().nullable(),
  lastLoginAt: z.coerce.date().optional().nullable(),
  locale: z.string().max(10).optional().nullable(),
  timezone: z.string().max(50).optional().nullable(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
