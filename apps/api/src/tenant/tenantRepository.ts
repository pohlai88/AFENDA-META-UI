/**
 * Tenant Repository — DB-backed persistence layer
 * ================================================
 * Provides async CRUD over the tenant_definitions, metadata_overrides,
 * and industry_templates tables from @afenda/db.
 *
 * Used by the tenant module to persist config to PostgreSQL.
 * Reads stay fast via in-memory cache; writes flow through to DB.
 */

import { eq, and, asc } from "drizzle-orm";
import { db } from "../db/index.js";
import { tenantDefinitions, metadataOverrides, industryTemplates } from "../db/schema/index.js";
import type { TenantDefinition, MetadataOverride } from "@afenda/meta-types";

// ── Tenant Definitions ─────────────────────────────────────────────────────

export async function dbGetTenant(id: string): Promise<TenantDefinition | null> {
  const rows = await db
    .select()
    .from(tenantDefinitions)
    .where(eq(tenantDefinitions.id, id))
    .limit(1);
  return rows.length ? rowToTenant(rows[0]) : null;
}

export async function dbListTenants(enabledOnly = false): Promise<TenantDefinition[]> {
  const query = enabledOnly
    ? db.select().from(tenantDefinitions).where(eq(tenantDefinitions.enabled, true))
    : db.select().from(tenantDefinitions);
  const rows = await query;
  return rows.map(rowToTenant);
}

export async function dbUpsertTenant(tenant: TenantDefinition): Promise<void> {
  const existing = await db
    .select({ id: tenantDefinitions.id })
    .from(tenantDefinitions)
    .where(eq(tenantDefinitions.id, tenant.id))
    .limit(1);

  if (existing.length) {
    await db
      .update(tenantDefinitions)
      .set({
        name: tenant.name,
        industry: tenant.industry ?? null,
        isolationStrategy: tenant.isolationStrategy,
        enabled: tenant.enabled,
        branding: tenant.branding ?? null,
        features: tenant.features ?? {},
        locale: tenant.locale ?? null,
        updatedAt: new Date(),
      })
      .where(eq(tenantDefinitions.id, tenant.id));
  } else {
    await db.insert(tenantDefinitions).values({
      id: tenant.id,
      name: tenant.name,
      industry: tenant.industry ?? null,
      isolationStrategy: tenant.isolationStrategy,
      enabled: tenant.enabled,
      branding: tenant.branding ?? null,
      features: tenant.features ?? {},
      locale: tenant.locale ?? null,
    });
  }
}

export async function dbRemoveTenant(id: string): Promise<boolean> {
  const result = await db.delete(tenantDefinitions).where(eq(tenantDefinitions.id, id));
  return (result as { rowCount?: number }).rowCount !== 0;
}

// ── Metadata Overrides ─────────────────────────────────────────────────────

export async function dbUpsertOverride(override: MetadataOverride): Promise<void> {
  const existing = await db
    .select({ id: metadataOverrides.id })
    .from(metadataOverrides)
    .where(eq(metadataOverrides.id, override.id))
    .limit(1);

  if (existing.length) {
    await db
      .update(metadataOverrides)
      .set({
        scope: override.scope,
        tenantId: override.tenantId ?? null,
        departmentId: override.departmentId ?? null,
        userId: override.userId ?? null,
        model: override.model,
        patch: override.patch,
        enabled: override.enabled,
        updatedAt: new Date(),
      })
      .where(eq(metadataOverrides.id, override.id));
  } else {
    await db.insert(metadataOverrides).values({
      id: override.id,
      scope: override.scope,
      tenantId: override.tenantId ?? null,
      departmentId: override.departmentId ?? null,
      userId: override.userId ?? null,
      model: override.model,
      patch: override.patch,
      enabled: override.enabled,
    });
  }
}

export async function dbRemoveOverride(id: string): Promise<boolean> {
  const result = await db.delete(metadataOverrides).where(eq(metadataOverrides.id, id));
  return (result as { rowCount?: number }).rowCount !== 0;
}

export async function dbGetOverridesForModel(model: string): Promise<MetadataOverride[]> {
  const rows = await db
    .select()
    .from(metadataOverrides)
    .where(and(eq(metadataOverrides.model, model), eq(metadataOverrides.enabled, true)))
    .orderBy(asc(metadataOverrides.scope));
  return rows.map(rowToOverride);
}

export async function dbGetOverridesForTenant(tenantId: string): Promise<MetadataOverride[]> {
  const rows = await db
    .select()
    .from(metadataOverrides)
    .where(eq(metadataOverrides.tenantId, tenantId));
  return rows.map(rowToOverride);
}

// ── Industry Templates ─────────────────────────────────────────────────────

export async function dbGetIndustryTemplate(
  industry: string
): Promise<Record<string, unknown> | null> {
  const rows = await db
    .select()
    .from(industryTemplates)
    .where(eq(industryTemplates.industry, industry))
    .limit(1);
  return rows.length ? (rows[0].template as Record<string, unknown>) : null;
}

export async function dbUpsertIndustryTemplate(
  industry: string,
  template: Record<string, unknown>
): Promise<void> {
  const existing = await db
    .select({ industry: industryTemplates.industry })
    .from(industryTemplates)
    .where(eq(industryTemplates.industry, industry))
    .limit(1);

  if (existing.length) {
    await db
      .update(industryTemplates)
      .set({ template, updatedAt: new Date() })
      .where(eq(industryTemplates.industry, industry));
  } else {
    await db.insert(industryTemplates).values({ industry, template });
  }
}

// ── Bulk Load (startup cache warm) ─────────────────────────────────────────

export async function dbLoadAllTenants(): Promise<TenantDefinition[]> {
  const rows = await db.select().from(tenantDefinitions);
  return rows.map(rowToTenant);
}

export async function dbLoadAllOverrides(): Promise<MetadataOverride[]> {
  const rows = await db.select().from(metadataOverrides);
  return rows.map(rowToOverride);
}

export async function dbLoadAllIndustryTemplates(): Promise<
  Array<{ industry: string; template: Record<string, unknown> }>
> {
  const rows = await db.select().from(industryTemplates);
  return rows.map((r) => ({
    industry: r.industry,
    template: r.template as Record<string, unknown>,
  }));
}

// ── Row Mappers ────────────────────────────────────────────────────────────

function rowToTenant(row: typeof tenantDefinitions.$inferSelect): TenantDefinition {
  return {
    id: row.id,
    name: row.name,
    industry: row.industry ?? undefined,
    isolationStrategy: row.isolationStrategy as TenantDefinition["isolationStrategy"],
    enabled: row.enabled,
    branding: row.branding as TenantDefinition["branding"],
    features: (row.features ?? {}) as Record<string, boolean>,
    locale: row.locale as TenantDefinition["locale"],
  };
}

function rowToOverride(row: typeof metadataOverrides.$inferSelect): MetadataOverride {
  return {
    id: row.id,
    scope: row.scope as MetadataOverride["scope"],
    tenantId: row.tenantId,
    departmentId: row.departmentId,
    userId: row.userId,
    model: row.model,
    patch: row.patch as Record<string, unknown>,
    enabled: row.enabled,
  };
}
