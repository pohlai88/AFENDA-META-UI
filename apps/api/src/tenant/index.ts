/**
 * Multi-Tenant Customization Layer
 * ==================================
 * One platform, infinite enterprise variations.
 *
 * Override stack (lowest/most-specific layer wins):
 *   Global → Industry → Tenant → Department → User
 *
 * Governance validators prevent dangerous customizations
 * from reaching production.
 */

import type { TenantDefinition, MetadataOverride, OverrideScope, ResolutionContext, GovernanceViolation } from "@afenda/meta-types/platform";
import { logDecisionAudit } from "../audit/decisionAuditLogger.js";
import { randomUUID } from "crypto";
import * as tenantRepo from "./tenantRepository.js";

// ---------------------------------------------------------------------------
// Persistence flag — enabled explicitly after startup DB check passes
// ---------------------------------------------------------------------------

let dbPersistEnabled = false;

export function enableTenantPersistence(): void {
  dbPersistEnabled = true;
}

// ---------------------------------------------------------------------------
// Scope priority — higher number = higher specificity (wins on conflict)
// ---------------------------------------------------------------------------

const SCOPE_PRIORITY: Record<OverrideScope, number> = {
  global: 0,
  industry: 1,
  tenant: 2,
  department: 3,
  user: 4,
};

// ---------------------------------------------------------------------------
// In-Memory Stores
// ---------------------------------------------------------------------------

const tenantStore = new Map<string, TenantDefinition>();
const overrideStore = new Map<string, MetadataOverride>();
const industryTemplates = new Map<string, Record<string, unknown>>();

// ---------------------------------------------------------------------------
// Tenant Registry
// ---------------------------------------------------------------------------

/**
 * Register a new tenant.
 * Throws if a tenant with the same ID already exists.
 */
export function registerTenant(tenant: TenantDefinition): void {
  if (tenantStore.has(tenant.id)) {
    throw new Error(`Tenant "${tenant.id}" is already registered.`);
  }
  tenantStore.set(tenant.id, tenant);
  if (dbPersistEnabled) void tenantRepo.dbUpsertTenant(tenant);
}

/**
 * Update an existing tenant definition.
 */
export function updateTenant(tenant: TenantDefinition): void {
  tenantStore.set(tenant.id, tenant);
  if (dbPersistEnabled) void tenantRepo.dbUpsertTenant(tenant);
}

/**
 * Get a tenant by ID.
 */
export function getTenant(id: string): TenantDefinition | undefined {
  return tenantStore.get(id);
}

/**
 * List all tenants, optionally filtered to enabled only.
 */
export function listTenants(enabledOnly = false): TenantDefinition[] {
  const all = Array.from(tenantStore.values());
  return enabledOnly ? all.filter((t) => t.enabled) : all;
}

/**
 * Remove a tenant and all its overrides.
 */
export function removeTenant(id: string): boolean {
  if (!tenantStore.has(id)) return false;
  tenantStore.delete(id);
  for (const [key, override] of overrideStore) {
    if (override.tenantId === id) overrideStore.delete(key);
  }
  if (dbPersistEnabled) void tenantRepo.dbRemoveTenant(id);
  return true;
}

// ---------------------------------------------------------------------------
// Industry Templates
// ---------------------------------------------------------------------------

/**
 * Register a metadata template for an industry vertical.
 * Templates are merged between Global and Tenant levels.
 */
export function registerIndustryTemplate(
  industry: string,
  template: Record<string, unknown>
): void {
  industryTemplates.set(industry, template);
  if (dbPersistEnabled) void tenantRepo.dbUpsertIndustryTemplate(industry, template);
}

export function getIndustryTemplate(industry: string): Record<string, unknown> | undefined {
  return industryTemplates.get(industry);
}

// ---------------------------------------------------------------------------
// Override Registry
// ---------------------------------------------------------------------------

/**
 * Register a metadata override.
 */
export function registerOverride(override: MetadataOverride): void {
  overrideStore.set(override.id, override);
  if (dbPersistEnabled) void tenantRepo.dbUpsertOverride(override);
}

/**
 * Remove an override by ID.
 */
export function removeOverride(id: string): boolean {
  const deleted = overrideStore.delete(id);
  if (deleted && dbPersistEnabled) void tenantRepo.dbRemoveOverride(id);
  return deleted;
}

/**
 * Get all overrides for a given model, sorted from global → user (ascending specificity).
 */
export function getOverridesForModel(model: string): MetadataOverride[] {
  return Array.from(overrideStore.values())
    .filter((o) => o.model === model && o.enabled)
    .sort((a, b) => SCOPE_PRIORITY[a.scope] - SCOPE_PRIORITY[b.scope]);
}

// ---------------------------------------------------------------------------
// Resolution Engine
// ---------------------------------------------------------------------------

/**
 * Resolve the effective metadata for a model against a given context.
 *
 * Merge order (each layer deep-merges into the previous):
 *   1. globalMeta (base)
 *   2. Industry template (if tenant.industry is set)
 *   3. Tenant-scoped overrides
 *   4. Department-scoped overrides
 *   5. User-scoped overrides
 *
 * Returns the fully merged metadata object.
 */
export function resolveMetadata(
  model: string,
  globalMeta: Record<string, unknown>,
  ctx: ResolutionContext
): Record<string, unknown> {
  const startTime = Date.now();
  const appliedLayers: string[] = [];
  const resolutionId = randomUUID();

  try {
    const tenant = tenantStore.get(ctx.tenantId);

    // Start with global base
    let resolved = deepMerge({}, globalMeta);
    appliedLayers.push("global");

    // Layer 1: Industry template
    const industry = ctx.industry ?? tenant?.industry;
    if (industry) {
      const template = industryTemplates.get(industry);
      if (template) {
        resolved = deepMerge(resolved, template);
        appliedLayers.push(`industry:${industry}`);
      }
    }

    // Get all overrides for this model, sorted by scope priority
    const overrides = getOverridesForModel(model);

    for (const override of overrides) {
      // Check scope relevance
      if (!isOverrideRelevant(override, ctx)) continue;
      resolved = deepMerge(resolved, override.patch);
      appliedLayers.push(
        `${override.scope}:${override.tenantId || override.departmentId || override.userId || "global"}`
      );
    }

    // Log the resolution decision (Phase 4: Audit Fabric)
    const durationMs = Date.now() - startTime;
    logDecisionAudit({
      id: resolutionId,
      timestamp: new Date().toISOString(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      eventType: "metadata_resolved",
      scope: `${model}.metadata_resolved`,
      context: {
        model,
      },
      decision: {
        input: {
          model,
          context: {
            tenantId: ctx.tenantId,
            departmentId: ctx.departmentId,
            industry: ctx.industry,
            userId: ctx.userId,
          },
        },
        output: resolved,
        reasoning: `Resolved metadata for model '${model}' by applying tenant layers in priority order`,
        appliedLayers,
      },
      durationMs,
      status: "success",
    });

    return resolved;
  } catch (error) {
    // Log resolution error
    const durationMs = Date.now() - startTime;
    logDecisionAudit({
      id: resolutionId,
      timestamp: new Date().toISOString(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      eventType: "metadata_resolved",
      scope: `${model}.metadata_resolved`,
      context: {
        model,
      },
      decision: {
        input: {
          model,
          context: {
            tenantId: ctx.tenantId,
            departmentId: ctx.departmentId,
            industry: ctx.industry,
            userId: ctx.userId,
          },
        },
        output: {},
        appliedLayers,
      },
      durationMs,
      status: "error",
      error: {
        message: error instanceof Error ? error.message : String(error),
        code: "METADATA_RESOLUTION_ERROR",
        stack: error instanceof Error ? error.stack : undefined,
      },
    });

    // Re-throw so caller knows there was an error
    throw error;
  }
}

/**
 * Determine if an override applies to the given resolution context.
 */
function isOverrideRelevant(override: MetadataOverride, ctx: ResolutionContext): boolean {
  switch (override.scope) {
    case "global":
      return true;
    case "industry":
      return override.tenantId === null || override.tenantId === undefined;
    case "tenant":
      return override.tenantId === ctx.tenantId;
    case "department":
      return override.tenantId === ctx.tenantId && override.departmentId === ctx.departmentId;
    case "user":
      return override.tenantId === ctx.tenantId && override.userId === ctx.userId;
    default:
      return false;
  }
}

/**
 * Recursively deep-merge `source` into `target`.
 * Arrays are replaced (not concatenated).
 * Returns a new object — does not mutate inputs.
 */
export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Governance Validators
// ---------------------------------------------------------------------------

/**
 * Validate an override before it enters the registry.
 * Returns a (possibly empty) list of violations.
 */
export function validateOverride(override: MetadataOverride): GovernanceViolation[] {
  const violations: GovernanceViolation[] = [];

  // Rule 1: Tenant-scoped overrides must reference a known tenant
  if (
    (override.scope === "tenant" || override.scope === "department" || override.scope === "user") &&
    override.tenantId &&
    !tenantStore.has(override.tenantId)
  ) {
    violations.push({
      overrideId: override.id,
      rule: "tenant_must_exist",
      message: `Tenant "${override.tenantId}" does not exist.`,
      severity: "error",
    });
  }

  // Rule 2: Empty patches are rejected
  if (Object.keys(override.patch).length === 0) {
    violations.push({
      overrideId: override.id,
      rule: "patch_not_empty",
      message: "Override patch must contain at least one key.",
      severity: "error",
    });
  }

  // Rule 3: Warn when overriding critical structural keys
  const criticalKeys = ["id", "type", "version"];
  for (const key of criticalKeys) {
    if (key in override.patch) {
      violations.push({
        overrideId: override.id,
        rule: "no_structural_override",
        message: `Overriding structural key "${key}" is not recommended.`,
        severity: "warning",
      });
    }
  }

  // Rule 4: User-level overrides must specify a userId
  if (override.scope === "user" && !override.userId) {
    violations.push({
      overrideId: override.id,
      rule: "user_scope_requires_user_id",
      message: "User-scoped overrides must specify a userId.",
      severity: "error",
    });
  }

  // Rule 5: Department-level overrides must specify a departmentId
  if (override.scope === "department" && !override.departmentId) {
    violations.push({
      overrideId: override.id,
      rule: "dept_scope_requires_dept_id",
      message: "Department-scoped overrides must specify a departmentId.",
      severity: "error",
    });
  }

  return violations;
}

/**
 * Validate and register an override, throwing if any error-level violations exist.
 */
export function safeRegisterOverride(override: MetadataOverride): GovernanceViolation[] {
  const violations = validateOverride(override);
  const errors = violations.filter((v) => v.severity === "error");

  if (errors.length > 0) {
    throw new Error(
      `Override "${override.id}" failed governance: ${errors.map((e) => e.message).join("; ")}`
    );
  }

  registerOverride(override);
  return violations; // May still contain warnings
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function getTenantStats(): {
  tenants: number;
  overrides: number;
  industryTemplates: number;
} {
  return {
    tenants: tenantStore.size,
    overrides: overrideStore.size,
    industryTemplates: industryTemplates.size,
  };
}

export function clearTenants(): void {
  tenantStore.clear();
  overrideStore.clear();
  industryTemplates.clear();
}

// ---------------------------------------------------------------------------
// Startup Loader — hydrate in-memory cache from DB
// ---------------------------------------------------------------------------

/**
 * Load all tenants, overrides, and industry templates from PostgreSQL
 * into the in-memory Maps. Called once during server startup when
 * DATABASE_URL is configured.
 */
export async function initTenantStore(): Promise<{
  tenants: number;
  overrides: number;
  templates: number;
}> {
  if (!dbPersistEnabled) return { tenants: 0, overrides: 0, templates: 0 };

  const [allTenants, allOverrides, allTemplates] = await Promise.all([
    tenantRepo.dbLoadAllTenants(),
    tenantRepo.dbLoadAllOverrides(),
    tenantRepo.dbLoadAllIndustryTemplates(),
  ]);

  for (const t of allTenants) tenantStore.set(t.id, t);
  for (const o of allOverrides) overrideStore.set(o.id, o);
  for (const tpl of allTemplates) industryTemplates.set(tpl.industry, tpl.template);

  return {
    tenants: allTenants.length,
    overrides: allOverrides.length,
    templates: allTemplates.length,
  };
}

/**
 * Reverse-engineer a set of flat patch paths from a resolved metadata object.
 * Returns an array of `{ path, value }` entries representing every leaf value
 * in the resolved object, prefixed with the model name.
 * Useful for generating override templates or diffing resolved states.
 */
export function reverseResolution(
  resolved: Record<string, unknown>,
  model: string
): Array<{ path: string; value: unknown }> {
  const patches: Array<{ path: string; value: unknown }> = [];

  function extract(obj: Record<string, unknown>, prefix: string): void {
    for (const key of Object.keys(obj)) {
      const fullPath = `${prefix}.${key}`;
      const value = obj[key];
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        extract(value as Record<string, unknown>, fullPath);
      } else {
        patches.push({ path: fullPath, value });
      }
    }
  }

  extract(resolved, model);
  return patches;
}

export {
  CachedResolution,
  CachedResolutionService,
  getCachedResolutionService,
} from "./cachedResolution.js";
