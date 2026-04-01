// ============================================================================
// SECURITY DOMAIN — Permissions & junctions
// Tables: permissions, role_permissions, user_permissions. Policy: permission-precedence.ts.
// Zod bundle: `securityWire.permissions` (index).
//
// Resolution precedence (enforce in application / policy layer):
//   If a user_permissions row exists for (tenant, user, permission): DENY → false; GRANT → true.
//   Else if any role_permissions grants that permission for the user → true.
//   Else → false.
//
// Rows with isSystemPermission should be treated as immutable (no key/resource/action
// mutation, no hard delete) and only soft-deleted in the mutation layer; DB does not
// enforce that rule so service code must.
// ============================================================================
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { boolean, foreignKey, index, integer, text, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { softDeleteColumns, timestampColumns } from "../../column-kit/index.js";
import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls-policies/index.js";
import { tenants } from "../core/tenants.js";
import {
  PermissionGrantTypeSchema,
  permissionGrantTypeEnum,
} from "./_enums.js";
import { securitySchema, securityTenantSqlColumn } from "./_schema.js";
import {
  PermissionActionSegmentSchema,
  PermissionKeySchema,
  PermissionResourceSegmentSchema,
  refinePermissionKeyMatchesSegments,
} from "./_zodShared.js";
import { roles } from "./roles.js";
import { users } from "./users.js";

export const permissions = securitySchema.table(
  "permissions",
  {
    permissionId: integer().primaryKey().generatedAlwaysAsIdentity(),
    tenantId: integer(securityTenantSqlColumn).notNull(),
    resource: text().notNull(),
    action: text().notNull(),
    key: text().notNull(),
    description: text(),
    isSystemPermission: boolean().notNull().default(false),
    ...timestampColumns,
    ...softDeleteColumns,
    createdBy: integer("created_by").notNull(),
    updatedBy: integer("updated_by").notNull(),
  },
  (table) => [
    index("permissions_tenant_idx").on(table.tenantId),
    index("permissions_tenant_resource_idx").on(table.tenantId, table.resource),
    index("permissions_tenant_key_idx").on(table.tenantId, table.key),
    uniqueIndex("permissions_tenant_permission_id_unique").on(table.tenantId, table.permissionId),
    uniqueIndex("uq_permissions_key")
      .on(table.tenantId, sql`lower(${table.key})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_permissions_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.createdBy],
      foreignColumns: [users.tenantId, users.userId],
      name: "fk_permissions_created_by_user_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.updatedBy],
      foreignColumns: [users.tenantId, users.userId],
      name: "fk_permissions_updated_by_user_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("permissions", securityTenantSqlColumn),
    serviceBypassPolicy("permissions"),
  ]
);

export const permissionSelectSchema = createSelectSchema(permissions);

export const permissionInsertSchema = createInsertSchema(permissions, {
  tenantId: z.number().int().positive(),
  resource: PermissionResourceSegmentSchema,
  action: PermissionActionSegmentSchema,
  key: PermissionKeySchema,
  description: z.string().max(500).optional(),
  isSystemPermission: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
}).superRefine((data, ctx) => refinePermissionKeyMatchesSegments(data, ctx));

export const permissionUpdateSchema = createUpdateSchema(permissions, {
  resource: PermissionResourceSegmentSchema.optional(),
  action: PermissionActionSegmentSchema.optional(),
  key: PermissionKeySchema.optional(),
  description: z.string().max(500).optional().nullable(),
  isSystemPermission: z.boolean().optional(),
}).superRefine((data, ctx) => {
  const { resource, action, key } = data;
  if (resource != null && action != null && key != null) {
    refinePermissionKeyMatchesSegments({ resource, action, key }, ctx);
  }
});

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;

export const rolePermissions = securitySchema.table(
  "role_permissions",
  {
    rolePermissionId: integer().primaryKey().generatedAlwaysAsIdentity(),
    tenantId: integer(securityTenantSqlColumn).notNull(),
    roleId: integer().notNull(),
    permissionId: integer().notNull(),
    ...timestampColumns,
    createdBy: integer("created_by").notNull(),
    updatedBy: integer("updated_by").notNull(),
  },
  (table) => [
    index("role_permissions_tenant_idx").on(table.tenantId),
    index("role_permissions_tenant_role_idx").on(table.tenantId, table.roleId),
    index("role_permissions_tenant_permission_idx").on(table.tenantId, table.permissionId),
    uniqueIndex("uq_role_permissions").on(table.tenantId, table.roleId, table.permissionId),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_role_permissions_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.roleId],
      foreignColumns: [roles.tenantId, roles.roleId],
      name: "fk_role_permissions_role_tenant",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.permissionId],
      foreignColumns: [permissions.tenantId, permissions.permissionId],
      name: "fk_role_permissions_permission_tenant",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.createdBy],
      foreignColumns: [users.tenantId, users.userId],
      name: "fk_role_permissions_created_by_user_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.updatedBy],
      foreignColumns: [users.tenantId, users.userId],
      name: "fk_role_permissions_updated_by_user_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("role_permissions", securityTenantSqlColumn),
    serviceBypassPolicy("role_permissions"),
  ]
);

export const rolePermissionSelectSchema = createSelectSchema(rolePermissions);

export const rolePermissionInsertSchema = createInsertSchema(rolePermissions, {
  tenantId: z.number().int().positive(),
  roleId: z.number().int().positive(),
  permissionId: z.number().int().positive(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;

export const userPermissions = securitySchema.table(
  "user_permissions",
  {
    userPermissionId: integer().primaryKey().generatedAlwaysAsIdentity(),
    tenantId: integer(securityTenantSqlColumn).notNull(),
    userId: integer().notNull(),
    permissionId: integer().notNull(),
    grantType: permissionGrantTypeEnum("grant_type").notNull().default("GRANT"),
    reason: text(),
    ...timestampColumns,
    createdBy: integer("created_by").notNull(),
    updatedBy: integer("updated_by").notNull(),
  },
  (table) => [
    index("user_permissions_tenant_idx").on(table.tenantId),
    index("user_permissions_tenant_user_idx").on(table.tenantId, table.userId),
    index("user_permissions_tenant_permission_idx").on(table.tenantId, table.permissionId),
    uniqueIndex("uq_user_permissions").on(table.tenantId, table.userId, table.permissionId),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_user_permissions_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.userId],
      foreignColumns: [users.tenantId, users.userId],
      name: "fk_user_permissions_user_tenant",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.permissionId],
      foreignColumns: [permissions.tenantId, permissions.permissionId],
      name: "fk_user_permissions_permission_tenant",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.createdBy],
      foreignColumns: [users.tenantId, users.userId],
      name: "fk_user_permissions_created_by_user_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.updatedBy],
      foreignColumns: [users.tenantId, users.userId],
      name: "fk_user_permissions_updated_by_user_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("user_permissions", securityTenantSqlColumn),
    serviceBypassPolicy("user_permissions"),
  ]
);

export const userPermissionSelectSchema = createSelectSchema(userPermissions);

export const userPermissionInsertSchema = createInsertSchema(userPermissions, {
  tenantId: z.number().int().positive(),
  userId: z.number().int().positive(),
  permissionId: z.number().int().positive(),
  grantType: PermissionGrantTypeSchema.optional(),
  reason: z.string().max(500).optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const userPermissionUpdateSchema = createUpdateSchema(userPermissions, {
  grantType: PermissionGrantTypeSchema.optional(),
  reason: z.string().max(500).optional().nullable(),
});

export type UserPermission = typeof userPermissions.$inferSelect;
export type NewUserPermission = typeof userPermissions.$inferInsert;
