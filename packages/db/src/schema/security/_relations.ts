// ============================================================================
// SECURITY DOMAIN — Relations catalog
//
// Registry of SECURITY→SECURITY edges that mirror Drizzle `foreignKey()` for docs,
// onboarding, and RELATIONS_DRIFT CI (same parser as HR/sales).
//
// **Scope:** Only edges where both tables live in `packages/db/src/schema/security/*.ts`.
// FKs to `core.tenants` are real in SQL but omitted here (HR pattern). Postgres enums
// (`user_status`, `permission_grant_type`) are not tables — no rows here.
//
// **Naming:** Keys use `{childTable}To{ParentTable}[Qualifier]` so the child→parent
// direction is obvious (`userRolesToUsers`, `rolePermissionsToUsersCreatedBy`).
//
// **Field names:** Drizzle / physical identifiers for `security.*` (e.g. `userId`, `created_by`).
//
// **Diagrams:** Use {@link expandSecurityRelationsForDiagram} to append logical parent→children
// `one-to-many` edges (same physical keys as `many-to-one`; deduped by the drift parser).
// ============================================================================
export type SecurityRelationDefinition = {
  from: string;
  to: string;
  kind: "one-to-many" | "many-to-one" | "self-reference";
  fromField: string;
  toField: string;
  /** Child-side `onDelete` for this FK (parity with Drizzle `foreignKey().onDelete`). */
  onDelete?: "restrict" | "cascade" | "set null" | "no action";
  /** Child-side `onUpdate` for this FK (parity with Drizzle `onUpdate`). */
  onUpdate?: "cascade" | "restrict" | "no action";
};

export const securityRelations = {
  usersToUsersCreatedBy: {
    from: "users",
    to: "users",
    kind: "self-reference",
    fromField: "created_by",
    toField: "userId",
    onDelete: "restrict",
    onUpdate: "cascade",
  },
  usersToUsersUpdatedBy: {
    from: "users",
    to: "users",
    kind: "self-reference",
    fromField: "updated_by",
    toField: "userId",
    onDelete: "restrict",
    onUpdate: "cascade",
  },
  rolesToUsersCreatedBy: {
    from: "roles",
    to: "users",
    kind: "many-to-one",
    fromField: "created_by",
    toField: "userId",
    onDelete: "restrict",
    onUpdate: "cascade",
  },
  rolesToUsersUpdatedBy: {
    from: "roles",
    to: "users",
    kind: "many-to-one",
    fromField: "updated_by",
    toField: "userId",
    onDelete: "restrict",
    onUpdate: "cascade",
  },
  permissionsToUsersCreatedBy: {
    from: "permissions",
    to: "users",
    kind: "many-to-one",
    fromField: "created_by",
    toField: "userId",
    onDelete: "restrict",
    onUpdate: "cascade",
  },
  permissionsToUsersUpdatedBy: {
    from: "permissions",
    to: "users",
    kind: "many-to-one",
    fromField: "updated_by",
    toField: "userId",
    onDelete: "restrict",
    onUpdate: "cascade",
  },
  rolePermissionsToRoles: {
    from: "role_permissions",
    to: "roles",
    kind: "many-to-one",
    fromField: "roleId",
    toField: "roleId",
    onDelete: "cascade",
    onUpdate: "cascade",
  },
  rolePermissionsToPermissions: {
    from: "role_permissions",
    to: "permissions",
    kind: "many-to-one",
    fromField: "permissionId",
    toField: "permissionId",
    onDelete: "cascade",
    onUpdate: "cascade",
  },
  rolePermissionsToUsersCreatedBy: {
    from: "role_permissions",
    to: "users",
    kind: "many-to-one",
    fromField: "created_by",
    toField: "userId",
    onDelete: "restrict",
    onUpdate: "cascade",
  },
  rolePermissionsToUsersUpdatedBy: {
    from: "role_permissions",
    to: "users",
    kind: "many-to-one",
    fromField: "updated_by",
    toField: "userId",
    onDelete: "restrict",
    onUpdate: "cascade",
  },
  userPermissionsToUsers: {
    from: "user_permissions",
    to: "users",
    kind: "many-to-one",
    fromField: "userId",
    toField: "userId",
    onDelete: "cascade",
    onUpdate: "cascade",
  },
  userPermissionsToPermissions: {
    from: "user_permissions",
    to: "permissions",
    kind: "many-to-one",
    fromField: "permissionId",
    toField: "permissionId",
    onDelete: "cascade",
    onUpdate: "cascade",
  },
  userPermissionsToUsersCreatedBy: {
    from: "user_permissions",
    to: "users",
    kind: "many-to-one",
    fromField: "created_by",
    toField: "userId",
    onDelete: "restrict",
    onUpdate: "cascade",
  },
  userPermissionsToUsersUpdatedBy: {
    from: "user_permissions",
    to: "users",
    kind: "many-to-one",
    fromField: "updated_by",
    toField: "userId",
    onDelete: "restrict",
    onUpdate: "cascade",
  },
  userRolesToUsers: {
    from: "user_roles",
    to: "users",
    kind: "many-to-one",
    fromField: "userId",
    toField: "userId",
    onDelete: "cascade",
    onUpdate: "cascade",
  },
  userRolesToRoles: {
    from: "user_roles",
    to: "roles",
    kind: "many-to-one",
    fromField: "roleId",
    toField: "roleId",
    onDelete: "restrict",
    onUpdate: "cascade",
  },
  userRolesToUsersAssignedBy: {
    from: "user_roles",
    to: "users",
    kind: "many-to-one",
    fromField: "assignedBy",
    toField: "userId",
    onDelete: "restrict",
    onUpdate: "cascade",
  },
} as const satisfies Record<string, SecurityRelationDefinition>;

/**
 * Forward catalog entries plus derived `one-to-many` inverses for ERD / diagram generators.
 * Physical FK keys match the `many-to-one` rows (RELATIONS_DRIFT dedupes by edge key).
 */
export function expandSecurityRelationsForDiagram(): SecurityRelationDefinition[] {
  const forward = Object.values(securityRelations) as SecurityRelationDefinition[];
  const inverse: SecurityRelationDefinition[] = [];

  for (const r of forward) {
    if (r.kind === "many-to-one") {
      inverse.push({
        from: r.to,
        to: r.from,
        kind: "one-to-many",
        fromField: r.toField,
        toField: r.fromField,
        onDelete: r.onDelete,
        onUpdate: r.onUpdate,
      });
    } else if (r.kind === "self-reference") {
      inverse.push({
        from: r.to,
        to: r.from,
        kind: "one-to-many",
        fromField: r.toField,
        toField: r.fromField,
        onDelete: r.onDelete,
        onUpdate: r.onUpdate,
      });
    }
  }

  return [...forward, ...inverse];
}
