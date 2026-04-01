// ============================================================================
// Request-scoped permission resolver: batch-load tenant permissions, user
// overrides, and role grants once; then answer many `has()` checks in memory.
//
// **When to use:** middleware / API handlers that evaluate several permission
// keys per request — avoids N× round-trips vs repeated {@link hasPermission}.
//
// **Invalidation:** This object is not cached across requests. For a distributed
// short-lived cache, key by `(tenantId, userId, revision)` where `revision` is a
// monotonic value your app updates when roles or `user_permissions` change
// (e.g. max `updated_at`, hash, or version column — not provided here).
// ============================================================================
import { and, eq, gt, isNull, or } from "drizzle-orm";

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

export type CreatePermissionResolverInput = {
  tenantId: number;
  userId: number;
  /** Used for `user_roles.expires_at` vs role grants (defaults to now). */
  at?: Date;
};

export type PermissionResolver = {
  /** Same semantics as {@link hasPermission} using preloaded maps. */
  has(permissionKeyOrId: string | number): boolean;
  /** Count of permission rows loaded for this tenant (all soft-delete states). */
  readonly loadedPermissionRowCount: number;
};

/** Build key → canonical `permissionId` map (active rows win; matches single-key SQL ordering). */
function buildKeyLowerToPermissionId(
  rows: ReadonlyArray<{ permissionId: number; key: string; deletedAt: Date | null }>
): Map<string, number> {
  const groups = new Map<string, Array<{ permissionId: number; deletedAt: Date | null }>>();
  for (const r of rows) {
    const lk = r.key.toLowerCase();
    const list = groups.get(lk);
    if (list) list.push(r);
    else groups.set(lk, [r]);
  }
  const out = new Map<string, number>();
  for (const [lk, arr] of groups) {
    arr.sort((a, b) => {
      const aAct = a.deletedAt == null ? 1 : 0;
      const bAct = b.deletedAt == null ? 1 : 0;
      return bAct - aAct;
    });
    out.set(lk, arr[0]!.permissionId);
  }
  return out;
}

/**
 * Runs **three** DB reads for `(tenantId, userId)`, then serves `has()` from memory.
 * Prefer inside `withTenantContext` when RLS applies to `app_user`.
 */
export async function createPermissionResolver(
  db: DbLike,
  input: CreatePermissionResolverInput
): Promise<PermissionResolver> {
  const at = input.at ?? new Date();
  const { tenantId, userId } = input;

  const [permRows, overrideRows, roleGrantRows] = await Promise.all([
    db
      .select({
        permissionId: permissions.permissionId,
        key: permissions.key,
        deletedAt: permissions.deletedAt,
      })
      .from(permissions)
      .where(eq(permissions.tenantId, tenantId)),
    db
      .select({
        permissionId: userPermissions.permissionId,
        grantType: userPermissions.grantType,
      })
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.tenantId, tenantId),
          eq(userPermissions.userId, userId)
        )
      ),
    db
      .select({ permissionId: rolePermissions.permissionId })
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
          isNull(roles.deletedAt),
          or(isNull(userRoles.expiresAt), gt(userRoles.expiresAt, at))
        )
      ),
  ]);

  const byId = new Map<number, { active: boolean }>();
  for (const r of permRows) {
    byId.set(r.permissionId, { active: r.deletedAt == null });
  }

  const keyLowerToId = buildKeyLowerToPermissionId(permRows);

  const overrides = new Map<number, PermissionGrantType>();
  for (const o of overrideRows) {
    overrides.set(o.permissionId, o.grantType as PermissionGrantType);
  }

  const roleGrantIds = new Set<number>();
  for (const row of roleGrantRows) {
    roleGrantIds.add(row.permissionId);
  }

  return {
    loadedPermissionRowCount: permRows.length,
    has(permissionKeyOrId: string | number): boolean {
      let permissionId: number | undefined;
      if (typeof permissionKeyOrId === "number") {
        permissionId = permissionKeyOrId;
      } else {
        permissionId = keyLowerToId.get(permissionKeyOrId.toLowerCase());
      }
      if (permissionId === undefined) return false;
      const meta = byId.get(permissionId);
      if (!meta) return false;

      return evaluatePermissionAccess({
        permissionActive: meta.active,
        userOverride: overrides.get(permissionId) ?? null,
        hasRoleGrant: roleGrantIds.has(permissionId),
      }).allowed;
    },
  };
}
