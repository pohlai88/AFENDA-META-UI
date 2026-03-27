import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { boolean, foreignKey, index, integer, text, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { auditColumns, softDeleteColumns, timestampColumns } from "../../_shared/index.js";
import { coreSchema, tenants } from "./tenants.js";

export const appModules = coreSchema.table(
  "app_modules",
  {
    appModuleId: integer().primaryKey().generatedAlwaysAsIdentity(),
    tenantId: integer("tenant_id").notNull(),
    code: text().notNull(),
    name: text().notNull(),
    description: text(),
    icon: text(),
    color: text(),
    basePath: text().notNull(),
    sortOrder: integer().notNull().default(0),
    isEnabled: boolean().notNull().default(true),
    ...timestampColumns,
    ...softDeleteColumns,
    ...auditColumns,
  },
  (table) => [
    index("idx_app_modules_tenant").on(table.tenantId),
    index("idx_app_modules_enabled").on(table.tenantId, table.isEnabled, table.sortOrder),
    uniqueIndex("uq_app_modules_code")
      .on(table.tenantId, sql`lower(${table.code})`)
      .where(sql`${table.deletedAt} IS NULL`),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenants.tenantId],
      name: "fk_app_modules_tenant",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ]
);

export const AppModuleIdSchema = z.number().int().positive().brand<"AppModuleId">();
export type AppModuleId = z.infer<typeof AppModuleIdSchema>;

export const AppModuleCodeSchema = z.enum([
  "core",
  "security",
  "audit",
  "hr",
  "payroll",
  "benefits",
  "talent",
  "learning",
  "recruitment",
]);
export type AppModuleCode = z.infer<typeof AppModuleCodeSchema>;

export const appModuleSelectSchema = createSelectSchema(appModules);

export const appModuleInsertSchema = createInsertSchema(appModules, {
  tenantId: z.number().int().positive(),
  code: AppModuleCodeSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  basePath: z.string().regex(/^\/[a-z-]+$/, "Format: /hr, /payroll"),
  sortOrder: z.number().int().min(0).optional(),
  isEnabled: z.boolean().optional(),
  createdBy: z.number().int().positive(),
  updatedBy: z.number().int().positive(),
});

export const appModuleUpdateSchema = createUpdateSchema(appModules, {
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  basePath: z
    .string()
    .regex(/^\/[a-z-]+$/)
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
  isEnabled: z.boolean().optional(),
});

export type AppModule = typeof appModules.$inferSelect;
export type NewAppModule = typeof appModules.$inferInsert;
