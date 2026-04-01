// ============================================================================
// SECURITY DOMAIN — Roles
// Tenant-defined roles; optional JSONB `permissions` for coarse hints (UI, exports, legacy).
// Authoritative grants use `role_permissions` + `permissions` — avoid filtering security on JSONB alone.
//
// Query notes:
// - `uq_roles_code` is a partial unique index on (tenant_id, lower(role_code)) WHERE deleted_at IS NULL;
//   it doubles as the lookup index for active roles by code (no extra btree needed for that path).
// - Permission checks and listings should filter `deleted_at IS NULL` (see hasPermission joins).
//
// Rows with isSystemRole should be treated as immutable in the mutation layer (no code/name churn,
// no hard delete); DB does not enforce that — service code must.
// ============================================================================
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { boolean, foreignKey, index, integer, jsonb, text, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { nameColumn, softDeleteColumns, timestampColumns } from "../../column-kit/index.js";
import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls-policies/index.js";
import { tenants } from "../core/tenants.js";
import { securitySchema, securityTenantSqlColumn } from "./_schema.js";
import {
  RoleCodeSchema,
  RolePermissionsRecordSchema,
  RolePermissionsSchema,
  type RolePermissionsRecord,
} from "./_zodShared.js";
import { users } from "./users.js";

export const roles = securitySchema.table(
  "roles",
  {
    roleId: integer().primaryKey().generatedAlwaysAsIdentity(),
    tenantId: integer(securityTenantSqlColumn).notNull(),
    roleCode: text().notNull(),
    ...nameColumn,
    description: text(),
    permissions: jsonb().$type<RolePermissionsRecord>(),
    isSystemRole: boolean().notNull().default(false),
    ...timestampColumns,
    ...softDeleteColumns,
    createdBy: integer("created_by").notNull(),
    updatedBy: integer("updated_by").notNull(),
  },
  (table) => [
    index("roles_tenant_idx").on(table.tenantId),
    uniqueIndex("roles_tenant_role_id_unique").on(table.tenantId, table.roleId),
    uniqueIndex("uq_roles_code")
      .on(table.tenantId, sql`lower(${table.roleCode})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_roles_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.createdBy],
      foreignColumns: [users.tenantId, users.userId],
      name: "fk_roles_created_by_user_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.updatedBy],
      foreignColumns: [users.tenantId, users.userId],
      name: "fk_roles_updated_by_user_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("roles", securityTenantSqlColumn),
    serviceBypassPolicy("roles"),
  ]
);

export const roleSelectSchema = createSelectSchema(roles);

export const roleInsertSchema = createInsertSchema(roles, {
  tenantId: z.number().int().positive(),
  roleCode: RoleCodeSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  permissions: RolePermissionsSchema,
  isSystemRole: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const roleUpdateSchema = createUpdateSchema(roles, {
  roleCode: RoleCodeSchema.optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  permissions: RolePermissionsRecordSchema.optional().nullable(),
  isSystemRole: z.boolean().optional(),
});

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
