/**
 * @module organization
 * @description Platform organization contracts used by API command routes.
 * @layer truth-contract
 * @consumers api, web
 */

export interface OrganizationDefinition {
  /** Unique organization identifier */
  id: string;
  /** Parent tenant identifier */
  tenantId: string;
  /** Human-readable organization name */
  name: string;
  /** Whether the organization is active */
  enabled: boolean;
  /** Optional short code or slug for routing/display */
  slug?: string;
  /** Optional free-form settings */
  settings?: Record<string, unknown>;
}
