// ============================================================================
// SECURITY DOMAIN — Permission precedence (pure)
// Combines flags from queries; no DB I/O. SQL callers must filter soft-deletes + tenant scope.
// See permissions.ts for table-level precedence notes.
// ============================================================================
import type { PermissionGrantType } from "./_enums.js";

export type ResolvePermissionAccessInput = {
  /**
   * When false (e.g. permission row soft-deleted), access is denied regardless of
   * overrides or roles — avoids treating orphaned user_permissions as valid.
   */
  permissionActive: boolean;
  /** Value from user_permissions.grant_type when a row exists; otherwise null. */
  userOverride: PermissionGrantType | null;
  /**
   * True when at least one active role assignment grants this permission (caller
   * must exclude expired user_roles and inactive/deleted roles as appropriate).
   */
  hasRoleGrant: boolean;
};

/** Why {@link evaluatePermissionAccess} allowed or denied (auditing / UX). */
export type PermissionAccessReason =
  | "PERMISSION_INACTIVE"
  | "USER_DENY"
  | "USER_GRANT"
  | "ROLE_GRANT"
  | "NO_MATCH";

export type PermissionAccessResult = {
  allowed: boolean;
  reason: PermissionAccessReason;
};

/**
 * Pure precedence: inactive permission → deny; user DENY → deny; user GRANT → allow;
 * else role union → allow; else deny. Prefer this when you need `reason` for logs or audits.
 */
export function evaluatePermissionAccess(
  input: ResolvePermissionAccessInput
): PermissionAccessResult {
  if (!input.permissionActive) {
    return { allowed: false, reason: "PERMISSION_INACTIVE" };
  }

  switch (input.userOverride) {
    case "DENY":
      return { allowed: false, reason: "USER_DENY" };
    case "GRANT":
      return { allowed: true, reason: "USER_GRANT" };
    case null:
      return input.hasRoleGrant
        ? { allowed: true, reason: "ROLE_GRANT" }
        : { allowed: false, reason: "NO_MATCH" };
    default: {
      const _exhaustive: never = input.userOverride;
      return _exhaustive;
    }
  }
}

/** Boolean convenience over {@link evaluatePermissionAccess} (stable API for call sites). */
export function resolvePermissionAccess(input: ResolvePermissionAccessInput): boolean {
  return evaluatePermissionAccess(input).allowed;
}

/**
 * Assignment is effective only when `expiresAt` is **strictly after** `at`.
 * If `expiresAt.getTime() === at.getTime()`, the assignment is treated as expired (exclusive end).
 * Matches SQL role checks that use `expires_at > reference`.
 */
export function isRoleAssignmentEffective(
  expiresAt: Date | null | undefined,
  at: Date = new Date()
): boolean {
  if (expiresAt == null) return true;
  return expiresAt.getTime() > at.getTime();
}
