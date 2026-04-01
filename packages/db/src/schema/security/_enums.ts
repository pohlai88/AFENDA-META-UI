// ============================================================================
// SECURITY DOMAIN — Enums
// Postgres `pgEnum` + Zod mirrors (HR-style centralization).
//
// Adding a new label to a Postgres enum:
// 1. Append the value to the `*Values` tuple below and to `UserStatusSchema` / `PermissionGrantTypeSchema` (via the tuple).
// 2. Ship a migration before any app code relies on the new value, e.g.:
//      ALTER TYPE security.user_status ADD VALUE 'SUSPENDED';
//    On PostgreSQL 15+, prefer `ADD VALUE IF NOT EXISTS` for rerunnable scripts; older versions need a
//    one-off migration or `DO $$ ... $$` guard. Use the same pattern for `permission_grant_type`.
// 3. Deploy migration, then deploy code that reads/writes the new value.
// ============================================================================
import { z } from "zod/v4";

import { securitySchema } from "./_schema.js";

/** Canonical `user_status` labels (Postgres enum + Zod). */
export const userStatusValues = [
  "ACTIVE",
  "INACTIVE",
  "LOCKED",
  "PENDING_VERIFICATION",
] as const;

export const userStatusEnum = securitySchema.enum("user_status", [...userStatusValues]);

export const UserStatusSchema = z.enum(userStatusValues);
export type UserStatus = z.infer<typeof UserStatusSchema>;

/** Canonical `permission_grant_type` labels (Postgres enum + Zod). */
export const permissionGrantTypeValues = ["GRANT", "DENY"] as const;

export const permissionGrantTypeEnum = securitySchema.enum("permission_grant_type", [
  ...permissionGrantTypeValues,
]);

export const PermissionGrantTypeSchema = z.enum(permissionGrantTypeValues);
export type PermissionGrantType = z.infer<typeof PermissionGrantTypeSchema>;
