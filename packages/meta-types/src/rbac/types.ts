/**
 * @module rbac
 * @description Session and RBAC evaluation contracts used by metadata authorization flows.
 * @layer truth-contract
 * @consumers api, web, db
 */

import type { CrudPermissions } from "../schema/types.js";

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

export interface RbacResult {
  allowedOps: CrudPermissions;
  visibleFields: string[];
  writableFields: string[];
}
