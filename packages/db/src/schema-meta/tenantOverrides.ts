/**
 * Tenant Persistence Tables — Phase 4: Admin Control Plane
 *
 * Replaces the in-memory Map stores in apps/api/src/tenant/index.ts
 * with DB-backed persistence for:
 *   - Tenant definitions (identity, branding, features, locale)
 *   - Metadata overrides (scope-aware patches)
 *   - Industry templates (vertical defaults)
 */

import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { TenantBranding, TenantIsolationStrategy, OverrideScope } from "@afenda/meta-types";

// ── Enums ──────────────────────────────────────────────────────────────────

export const isolationStrategyEnum = pgEnum("isolation_strategy", [
  "logical",
  "schema",
  "physical",
]);

export const overrideScopeEnum = pgEnum("override_scope", [
  "global",
  "industry",
  "tenant",
  "department",
  "user",
]);

// ── Tenant Definitions ─────────────────────────────────────────────────────

export const tenantDefinitions = pgTable("tenant_definitions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry"),
  isolationStrategy: isolationStrategyEnum("isolation_strategy").notNull().default("logical"),
  enabled: boolean("enabled").notNull().default(true),
  branding: jsonb("branding").$type<TenantBranding>(),
  features: jsonb("features").$type<Record<string, boolean>>().default({}),
  locale: jsonb("locale").$type<{
    timezone: string;
    language: string;
    currency: string;
    dateFormat: string;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Metadata Overrides ─────────────────────────────────────────────────────

export const metadataOverrides = pgTable(
  "metadata_overrides",
  {
    id: text("id").primaryKey(),
    scope: overrideScopeEnum("scope").notNull(),
    tenantId: text("tenant_id").references(() => tenantDefinitions.id, {
      onDelete: "cascade",
    }),
    departmentId: text("department_id"),
    userId: text("user_id"),
    model: text("model").notNull(),
    patch: jsonb("patch").$type<Record<string, unknown>>().notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    modelIdx: index("overrides_model_idx").on(t.model),
    tenantIdx: index("overrides_tenant_idx").on(t.tenantId),
    scopeIdx: index("overrides_scope_idx").on(t.scope),
  })
);

// ── Industry Templates ─────────────────────────────────────────────────────

export const industryTemplates = pgTable("industry_templates", {
  industry: text("industry").primaryKey(),
  template: jsonb("template").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
