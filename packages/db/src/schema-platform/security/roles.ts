import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { boolean, foreignKey, index, integer, jsonb, text, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import {
  auditColumns,
  nameColumn,
  softDeleteColumns,
  timestampColumns,
} from "../../_shared/index.js";
import { tenants } from "../core/tenants.js";
import { securitySchema } from "./users.js";

export interface RolePermissions {
  [resource: string]: boolean | string[] | Record<string, boolean>;
}

export const roles = securitySchema.table(
  "roles",
  {
    roleId: integer().primaryKey().generatedAlwaysAsIdentity(),
    tenantId: integer("tenant_id").notNull(),
    roleCode: text().notNull(),
    ...nameColumn,
    description: text(),
    permissions: jsonb().$type<RolePermissions>(),
    isSystemRole: boolean().notNull().default(false),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_roles_tenant").on(table.tenantId),
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
  ]
);

export const rolePermissionEntrySchema = z.union([
  z.boolean(),
  z.array(z.string()),
  z.record(z.string(), z.boolean()),
]);

export const rolePermissionsRecordSchema = z.record(z.string(), rolePermissionEntrySchema);
export const rolePermissionsSchema = rolePermissionsRecordSchema.optional();

export const RoleCodeSchema = z
  .string()
  .min(2)
  .max(50)
  .regex(/^[A-Z0-9_-]+$/i, "Only alphanumeric, underscore, and hyphen allowed");

export const RoleIdSchema = z.number().int().positive().brand<"RoleId">();
export type RoleId = z.infer<typeof RoleIdSchema>;

export const roleSelectSchema = createSelectSchema(roles);

export const roleInsertSchema = createInsertSchema(roles, {
  tenantId: z.number().int().positive(),
  roleCode: RoleCodeSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  permissions: rolePermissionsSchema,
  isSystemRole: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const roleUpdateSchema = createUpdateSchema(roles, {
  roleCode: RoleCodeSchema.optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  permissions: rolePermissionsRecordSchema.optional().nullable(),
  isSystemRole: z.boolean().optional(),
});

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
