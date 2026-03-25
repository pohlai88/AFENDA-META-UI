import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import {
  boolean,
  foreignKey,
  index,
  integer,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { tenantIsolationPolicies, serviceBypassPolicy } from "../../_rls/index.js";
import { auditColumns, softDeleteColumns, timestampColumns } from "../../_shared/index.js";
import { tenants } from "../core/tenants.js";

export const securitySchema = pgSchema("security");

export const userStatuses = ["ACTIVE", "INACTIVE", "LOCKED", "PENDING_VERIFICATION"] as const;

export const userStatusEnum = securitySchema.enum("user_status", [...userStatuses]);

export const UserStatusSchema = z.enum(userStatuses);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const users = securitySchema.table(
  "users",
  {
    userId: integer().primaryKey().generatedAlwaysAsIdentity(),
    tenantId: integer().notNull(),
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
    ...auditColumns,
  },
  (table) => [
    index("idx_users_tenant").on(table.tenantId),
    index("idx_users_email").on(table.tenantId, table.email),
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
    ...tenantIsolationPolicies("users"),
    serviceBypassPolicy("users"),
  ]
);

export const UserIdSchema = z.number().int().positive().brand<"UserId">();
export type UserId = z.infer<typeof UserIdSchema>;

export const userSelectSchema = createSelectSchema(users);

export const userInsertSchema = createInsertSchema(users, {
  tenantId: z.number().int().positive(),
  email: z.email(),
  displayName: z.string().min(1).max(200),
  status: UserStatusSchema.optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const userUpdateSchema = createUpdateSchema(users, {
  email: z.email().optional(),
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
