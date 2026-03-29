/**
 * @module platform/tenant
 * @description Multi-tenant override contracts for isolation, resolution context, and governance.
 * @layer truth-contract
 * @consumers api, web, db
 */

export type TenantIsolationStrategy = "logical" | "schema" | "physical";

export interface TenantDefinition {
  id: string;
  name: string;
  industry?: string;
  isolationStrategy: TenantIsolationStrategy;
  enabled: boolean;
  branding?: TenantBranding;
  features?: Record<string, boolean>;
  locale?: {
    timezone: string;
    language: string;
    currency: string;
    dateFormat: string;
  };
}

export interface TenantBranding {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  appName?: string;
}

export type OverrideScope = "global" | "industry" | "tenant" | "department" | "user";

export interface MetadataOverride {
  id: string;
  scope: OverrideScope;
  tenantId?: string | null;
  departmentId?: string | null;
  userId?: string | null;
  model: string;
  patch: Record<string, unknown>;
  enabled: boolean;
}

export interface ResolutionContext {
  tenantId: string;
  departmentId?: string;
  userId?: string;
  industry?: string;
}

export type GovernanceViolationSeverity = "error" | "warning";

export interface GovernanceViolation {
  overrideId: string;
  rule: string;
  message: string;
  severity: GovernanceViolationSeverity;
}
