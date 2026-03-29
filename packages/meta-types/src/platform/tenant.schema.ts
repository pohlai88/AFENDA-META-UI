/**
 * @module platform/tenant.schema
 * @description Zod schemas for multi-tenant definitions, organizations, and overrides.
 * @layer truth-contract
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Tenant
// ---------------------------------------------------------------------------

export const TenantIsolationStrategySchema = z.enum(["logical", "schema", "physical"]);

export const TenantBrandingSchema = z.object({
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  appName: z.string().optional(),
});

export const TenantLocaleSchema = z.object({
  timezone: z.string(),
  language: z.string(),
  currency: z.string(),
  dateFormat: z.string(),
});

export const TenantDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  industry: z.string().optional(),
  isolationStrategy: TenantIsolationStrategySchema,
  enabled: z.boolean(),
  branding: TenantBrandingSchema.optional(),
  features: z.record(z.string(), z.boolean()).optional(),
  locale: TenantLocaleSchema.optional(),
});

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

export const OrganizationDefinitionSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  slug: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Overrides & Governance
// ---------------------------------------------------------------------------

export const OverrideScopeSchema = z.enum(["global", "industry", "tenant", "department", "user"]);

export const MetadataOverrideSchema = z.object({
  id: z.string(),
  scope: OverrideScopeSchema,
  tenantId: z.string().nullish(),
  departmentId: z.string().nullish(),
  userId: z.string().nullish(),
  model: z.string(),
  patch: z.record(z.string(), z.unknown()),
  enabled: z.boolean(),
});
