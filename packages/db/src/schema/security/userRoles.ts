// ============================================================================
// SECURITY DOMAIN — User roles (`user_roles`)
// Assigns roles to users within a tenant. Composite PK (userId, roleId).
//
// FK behavior:
// - User removed → assignments CASCADE delete (`fk_user_roles_user_tenant`).
// - Role removed → RESTRICT while assignments exist (`fk_user_roles_role_tenant`); prefer soft-delete on `roles`.
//
// Expiry:
// - DB check: `expires_at IS NULL OR expires_at > assigned_at` (strictly after assignment time).
// - Runtime permission checks use `expires_at > reference` (exclusive); `expires_at === now` is expired
//   — same boundary as {@link isRoleAssignmentEffective} in permission-precedence.ts.
//
// `assignedBy` is FK-scoped to the tenant; who may grant roles is enforced in application policy, not here.
// ============================================================================
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { timestampColumns } from "../../column-kit/index.js";
import { tenantIsolationPolicies, serviceBypassPolicy } from "../../rls-policies/index.js";
import { tenants } from "../core/tenants.js";
import { securitySchema, securityTenantSqlColumn } from "./_schema.js";
import { refineOptionalFutureDate } from "./_zodShared.js";
import { roles } from "./roles.js";
import { users } from "./users.js";

export const userRoles = securitySchema.table(
  "user_roles",
  {
    userId: integer().notNull(),
    roleId: integer().notNull(),
    tenantId: integer(securityTenantSqlColumn).notNull(),
    assignedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    assignedBy: integer().notNull(),
    expiresAt: timestamp({ withTimezone: true }),
    ...timestampColumns,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId], name: "pk_user_roles" }),
    index("user_roles_tenant_idx").on(table.tenantId),
    index("user_roles_tenant_user_idx").on(table.tenantId, table.userId),
    index("user_roles_tenant_expires_idx").on(table.tenantId, table.expiresAt),
    uniqueIndex("uq_user_roles_assignment").on(table.tenantId, table.userId, table.roleId),
    check(
      "user_roles_expires_after_assigned",
      sql`${table.expiresAt} IS NULL OR ${table.expiresAt} > ${table.assignedAt}`
    ),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_user_roles_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.userId],
      foreignColumns: [users.tenantId, users.userId],
      name: "fk_user_roles_user_tenant",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.roleId],
      foreignColumns: [roles.tenantId, roles.roleId],
      name: "fk_user_roles_role_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.tenantId, table.assignedBy],
      foreignColumns: [users.tenantId, users.userId],
      name: "fk_user_roles_assigned_by_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    ...tenantIsolationPolicies("user_roles", securityTenantSqlColumn),
    serviceBypassPolicy("user_roles"),
  ]
);

export const userRoleSelectSchema = createSelectSchema(userRoles);
export const userRoleInsertSchema = createInsertSchema(userRoles);

export const userRoleAssignmentInsertSchema = createInsertSchema(userRoles, {
  userId: z.number().int().positive(),
  roleId: z.number().int().positive(),
  tenantId: z.number().int().positive(),
  assignedBy: z.number().int().positive({
    message: "assignedBy must reference the user who granted this role",
  }),
  assignedAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional().nullable(),
}).superRefine((data, ctx) => {
  refineOptionalFutureDate(data, ctx);
  if (data.expiresAt != null && data.assignedAt != null) {
    if (data.expiresAt.getTime() <= data.assignedAt.getTime()) {
      ctx.addIssue({
        code: "custom",
        message: "expiresAt must be after assignedAt",
        path: ["expiresAt"],
      });
    }
  }
});

export const userRoleUpdateSchema = createUpdateSchema(userRoles, {
  expiresAt: z.coerce.date().optional().nullable(),
}).superRefine((data, ctx) => refineOptionalFutureDate(data, ctx));

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;
