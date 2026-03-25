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
  allowedOps: import("./schema.js").CrudPermissions;
  visibleFields: string[];
  writableFields: string[];
}
