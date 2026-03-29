/**
 * @module platform/organization
 * @description Platform organization contracts used by API command routes.
 * @layer truth-contract
 * @consumers api, web
 */

export interface OrganizationDefinition {
  id: string;
  tenantId: string;
  name: string;
  enabled: boolean;
  slug?: string;
  settings?: Record<string, unknown>;
}
