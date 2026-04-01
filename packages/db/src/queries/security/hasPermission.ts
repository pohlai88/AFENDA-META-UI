// ============================================================================
// Resolve whether a tenant user has a permission (DB-backed precedence).
// Pair with {@link evaluatePermissionAccess} / {@link resolvePermissionAccess} for pure tests.
// ============================================================================
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";

import type { Database } from "../../drizzle/db.js";
import type { PermissionGrantType } from "../../schema/security/_enums.js";
import {
  permissions,
  rolePermissions,
  userPermissions,
} from "../../schema/security/permissions.js";
import { roles } from "../../schema/security/roles.js";
import { userRoles } from "../../schema/security/userRoles.js";
import { evaluatePermissionAccess } from "../../schema/security/permission-precedence.js";

type DbLike = Pick<Database, "select">;

export type HasPermissionInput = {
  tenantId: number;
  userId: number;
  permissionKeyOrId: string | number;
  /** Used for `user_roles.expires_at` vs role grants (defaults to now). */
  at?: Date;
};

/**
 * Loads permission row (by id or case-insensitive `key`), user override, and active role grants,
 * then applies {@link resolvePermissionAccess}. Prefer calling inside `withTenantContext` when
 * RLS is enabled for `app_user`.
 */
export async function hasPermission(db: DbLike, input: HasPermissionInput): Promise<boolean> {
  const at = input.at ?? new Date();
  const { tenantId, userId, permissionKeyOrId } = input;

  const permRow =
    typeof permissionKeyOrId === "number"
      ? (
          await db
            .select({
              permissionId: permissions.permissionId,
              deletedAt: permissions.deletedAt,
            })
            .from(permissions)
            .where(
              and(
                eq(permissions.tenantId, tenantId),
                eq(permissions.permissionId, permissionKeyOrId)
              )
            )
            .limit(1)
        )[0]
      : (
          await db
            .select({
              permissionId: permissions.permissionId,
              deletedAt: permissions.deletedAt,
            })
            .from(permissions)
            .where(
              and(
                eq(permissions.tenantId, tenantId),
                sql`lower(${permissions.key}) = lower(${permissionKeyOrId})`
              )
            )
            .orderBy(desc(sql`(${permissions.deletedAt} IS NULL)`))
            .limit(1)
        )[0];

  if (!permRow) return false;

  const permissionActive = permRow.deletedAt == null;
  const permissionId = permRow.permissionId;

  const overrideRow = (
    await db
      .select({ grantType: userPermissions.grantType })
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.tenantId, tenantId),
          eq(userPermissions.userId, userId),
          eq(userPermissions.permissionId, permissionId)
        )
      )
      .limit(1)
  )[0];

  const userOverride: PermissionGrantType | null = overrideRow
    ? (overrideRow.grantType as PermissionGrantType)
    : null;

  const roleHit = (
    await db
      .select({ one: userRoles.userId })
      .from(userRoles)
      .innerJoin(
        rolePermissions,
        and(
          eq(rolePermissions.tenantId, userRoles.tenantId),
          eq(rolePermissions.roleId, userRoles.roleId)
        )
      )
      .innerJoin(
        roles,
        and(eq(roles.tenantId, userRoles.tenantId), eq(roles.roleId, userRoles.roleId))
      )
      .where(
        and(
          eq(userRoles.tenantId, tenantId),
          eq(userRoles.userId, userId),
          eq(rolePermissions.permissionId, permissionId),
          isNull(roles.deletedAt),
          or(isNull(userRoles.expiresAt), gt(userRoles.expiresAt, at))
        )
      )
      .limit(1)
  )[0];

  const hasRoleGrant = roleHit != null;

  return evaluatePermissionAccess({
    permissionActive,
    userOverride,
    hasRoleGrant,
  }).allowed;
}
