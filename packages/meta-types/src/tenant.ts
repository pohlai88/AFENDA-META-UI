/**
 * Multi-Tenant Customization Layer Types
 * ========================================
 * One platform, infinite enterprise variations.
 *
 * Override stack: Global → Industry → Tenant → Department → User
 * Lowest (most specific) layer wins for each key.
 */

// ---------------------------------------------------------------------------
// Tenant Definition
// ---------------------------------------------------------------------------

export type TenantIsolationStrategy =
  | "logical" // Shared infra, tenant IDs on all rows
  | "schema" // Separate DB schemas per tenant
  | "physical"; // Dedicated infrastructure

export interface TenantDefinition {
  /** Unique tenant identifier */
  id: string;
  /** Human-readable tenant name */
  name: string;
  /** Industry vertical (drives template selection) */
  industry?: string;
  /** Isolation strategy */
  isolationStrategy: TenantIsolationStrategy;
  /** Whether the tenant is active */
  enabled: boolean;
  /** Custom branding */
  branding?: TenantBranding;
  /** Feature flags specific to this tenant */
  features?: Record<string, boolean>;
  /** Locale / timezone settings */
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

// ---------------------------------------------------------------------------
// Override — a patch applied at a specific layer
// ---------------------------------------------------------------------------

export type OverrideScope = "global" | "industry" | "tenant" | "department" | "user";

export interface MetadataOverride {
  /** Unique override ID */
  id: string;
  /** Which stack layer this override lives at */
  scope: OverrideScope;
  /** Tenant ID (null → applies to all tenants or global layer) */
  tenantId?: string | null;
  /** Department ID (for "department" scope) */
  departmentId?: string | null;
  /** User ID (for "user" scope) */
  userId?: string | null;
  /** Model this override targets */
  model: string;
  /**
   * Partial metadata patch.
   * Gets deep-merged into the global metadata for this model.
   */
  patch: Record<string, unknown>;
  /** Whether override is enabled */
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Resolution Context — what gets merged at runtime
// ---------------------------------------------------------------------------

export interface ResolutionContext {
  tenantId: string;
  departmentId?: string;
  userId?: string;
  /** Industry key for template lookup */
  industry?: string;
}

// ---------------------------------------------------------------------------
// Governance Validation
// ---------------------------------------------------------------------------

export type GovernanceViolationSeverity = "error" | "warning";

export interface GovernanceViolation {
  overrideId: string;
  rule: string;
  message: string;
  severity: GovernanceViolationSeverity;
}
