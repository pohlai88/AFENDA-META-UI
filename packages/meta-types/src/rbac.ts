/**
 * @module rbac
 * @description Session and RBAC evaluation contracts used by metadata authorization flows.
 * @layer truth-contract
 * @consumers api, web, db
 */

import type { CrudPermissions } from "./schema.js";

// Session context passed through request pipeline
export interface SessionContext {
  uid: string;
  userId?: string;
  roles: string[];
  lang: string;
  timezone?: string;
  tenantId?: string;
  departmentId?: string;
  industry?: string;
}

// RBAC evaluation result for a model
export interface RbacResult {
  allowedOps: CrudPermissions;
  visibleFields: string[];
  writableFields: string[];
}
