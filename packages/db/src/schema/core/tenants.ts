import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { index, integer, jsonb, pgSchema, text, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

import { nameColumn, softDeleteColumns, timestampColumns } from "../../infra-utils/columns/index.js";

export const coreSchema = pgSchema("core");

export const tenantStatuses = ["ACTIVE", "SUSPENDED", "CLOSED"] as const;

export const tenantStatusEnum = coreSchema.enum("tenant_status", [...tenantStatuses]);

export const tenantStatusZodEnum = createSelectSchema(tenantStatusEnum);

export interface TenantSettings {
  theme?: string;
  locale?: string;
  timezone?: string;
  features?: Record<string, boolean>;
}

export const tenants = coreSchema.table(
  "tenants",
  {
    tenantId: integer("tenant_id").primaryKey().generatedAlwaysAsIdentity(),
    tenantCode: text().notNull(),
    ...nameColumn,
    status: tenantStatusEnum().notNull().default("ACTIVE"),
    settings: jsonb().$type<TenantSettings>(),
    ...timestampColumns,
    ...softDeleteColumns,
  },
  (table) => [
    uniqueIndex("uq_tenants_code")
      .on(sql`lower(${table.tenantCode})`)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_tenants_status").on(table.status),
    index("idx_tenants_code").on(table.tenantCode),
  ]
);

export const tenantSettingsSchema = z
  .object({
    theme: z.string().optional(),
    locale: z.string().min(2).max(10).optional(),
    timezone: z.string().optional(),
    features: z.record(z.string(), z.boolean()).optional(),
  })
  .strict();

export const TenantIdSchema = z.number().int().brand<"TenantId">();
export type TenantId = z.infer<typeof TenantIdSchema>;

export const tenantSelectSchema = createSelectSchema(tenants);

export const tenantInsertSchema = createInsertSchema(tenants, {
  tenantCode: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[A-Z0-9_-]+$/i, "Only alphanumeric, underscore, and hyphen allowed"),
  name: z.string().min(1).max(200),
  settings: tenantSettingsSchema.optional(),
});

export const tenantUpdateSchema = createUpdateSchema(tenants);

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
