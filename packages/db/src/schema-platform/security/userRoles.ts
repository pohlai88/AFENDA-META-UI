import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import {
  foreignKey,
  index,
  integer,
  primaryKey,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { timestampColumns } from "../../_shared/index.js";
import { tenants } from "../core/tenants.js";
import { roles } from "./roles.js";
import { securitySchema, users } from "./users.js";

export const userRoles = securitySchema.table(
  "user_roles",
  {
    userId: integer().notNull(),
    roleId: integer().notNull(),
    tenantId: integer().notNull(),
    assignedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    assignedBy: integer().notNull(),
    expiresAt: timestamp({ withTimezone: true }),
    ...timestampColumns,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId], name: "pk_user_roles" }),
    index("idx_user_roles_tenant").on(table.tenantId),
    index("idx_user_roles_user").on(table.tenantId, table.userId),
    uniqueIndex("uq_user_roles_assignment").on(table.tenantId, table.userId, table.roleId),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_user_roles_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.userId],
      name: "fk_user_roles_user",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.roleId],
      name: "fk_user_roles_role",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.assignedBy],
      foreignColumns: [users.userId],
      name: "fk_user_roles_assigned_by",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
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
  expiresAt: z.coerce.date().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.expiresAt == null) return;
  const time = data.expiresAt.getTime();
  if (Number.isNaN(time)) {
    ctx.addIssue({
      code: "custom",
      message: "expiresAt must be a valid date",
      path: ["expiresAt"],
    });
    return;
  }
  if (time <= Date.now()) {
    ctx.addIssue({
      code: "custom",
      message: "expiresAt must be in the future when set",
      path: ["expiresAt"],
    });
  }
});

export const userRoleUpdateSchema = createUpdateSchema(userRoles, {
  expiresAt: z.coerce.date().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.expiresAt === undefined || data.expiresAt === null) return;
  const time = data.expiresAt.getTime();
  if (Number.isNaN(time)) {
    ctx.addIssue({
      code: "custom",
      message: "expiresAt must be a valid date",
      path: ["expiresAt"],
    });
    return;
  }
  if (time <= Date.now()) {
    ctx.addIssue({
      code: "custom",
      message: "expiresAt must be in the future when set",
      path: ["expiresAt"],
    });
  }
});

export const UserRoleIdSchema = z
  .object({
    userId: z.number().int().positive(),
    roleId: z.number().int().positive(),
  })
  .brand<"UserRoleId">();
export type UserRoleId = z.infer<typeof UserRoleIdSchema>;

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;
