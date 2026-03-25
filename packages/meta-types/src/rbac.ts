// Session context passed through request pipeline
export interface SessionContext {
  uid: string;
  roles: string[];
  lang: string;
  timezone?: string;
}

// RBAC evaluation result for a model
export interface RbacResult {
  allowedOps: import("./schema.js").CrudPermissions;
  visibleFields: string[];
  writableFields: string[];
}
