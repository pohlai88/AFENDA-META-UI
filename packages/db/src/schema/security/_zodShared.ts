// ============================================================================
// SECURITY DOMAIN — Shared Zod
// Branded IDs and cross-table refinements (HR-style `_zodShared` parity).
//
// Permission segment/key max lengths (64 / 131) must stay aligned with
// `permissions.resource`, `permissions.action`, and `permissions.key` in Drizzle + migrations.
// ============================================================================
import { z } from "zod/v4";

export const UserIdSchema = z.number().int().positive().brand<"UserId">();
export type UserId = z.infer<typeof UserIdSchema>;

export const RoleIdSchema = z.number().int().positive().brand<"RoleId">();
export type RoleId = z.infer<typeof RoleIdSchema>;

export const PermissionIdSchema = z.number().int().positive().brand<"PermissionId">();
export type PermissionId = z.infer<typeof PermissionIdSchema>;

export const UserRoleIdSchema = z
  .object({
    userId: z.number().int().positive(),
    roleId: z.number().int().positive(),
  })
  .brand<"UserRoleId">();
export type UserRoleId = z.infer<typeof UserRoleIdSchema>;

// ============================================================================
// Shared business validators
// ============================================================================

export const RoleCodeSchema = z
  .string()
  .min(2)
  .max(50)
  .regex(/^[A-Z0-9_-]+$/i, "Only alphanumeric, underscore, and hyphen allowed");
export type RoleCode = z.infer<typeof RoleCodeSchema>;

/**
 * One entry under `roles.permissions` JSONB (coarse hints; authoritative grants live in
 * `role_permissions`). Semantics for consumers:
 * - `boolean` — blanket allow/deny for that resource key.
 * - `string[]` — allow only the listed action names for that resource.
 * - `Record<string, boolean>` — per-action flags for that resource.
 */
export const RolePermissionEntrySchema = z.union([
  z.boolean(),
  z.array(z.string()),
  z.record(z.string(), z.boolean()),
]);
export const RolePermissionsRecordSchema = z.record(z.string(), RolePermissionEntrySchema);
export const RolePermissionsSchema = RolePermissionsRecordSchema.optional();
export type RolePermissionEntry = z.infer<typeof RolePermissionEntrySchema>;
export type RolePermissionsRecord = z.infer<typeof RolePermissionsRecordSchema>;

function trimLower(val: unknown): unknown {
  return typeof val === "string" ? val.trim().toLowerCase() : val;
}

/** Single segment of a dotted permission key; normalized to lowercase before validation. */
const permissionKeySegmentBodySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_]*$/, "Start with a letter; then lowercase letters, digits, or underscores");

export const PermissionResourceSegmentSchema = z.preprocess(trimLower, permissionKeySegmentBodySchema);
export const PermissionActionSegmentSchema = PermissionResourceSegmentSchema;

/**
 * Canonical key `resource.action` (dotted). Colon form is rejected. Input is trimmed and lowercased
 * so stored values match `lower(key)` uniqueness and segment columns.
 */
export const PermissionKeySchema = z.preprocess(
  trimLower,
  z
    .string()
    .min(3)
    .max(131)
    .regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/, "Format: resource.action (e.g., leave.approve)")
);
export type PermissionKey = z.infer<typeof PermissionKeySchema>;

function previewForMessage(value: string, max = 64): string {
  const t = value.trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/** Ensures `key` equals `resource.action` case-insensitively (stable with the unique index on lower(key)). */
export function refinePermissionKeyMatchesSegments(
  data: { resource: string; action: string; key: string },
  ctx: z.RefinementCtx
): void {
  const composite = `${data.resource}.${data.action}`.toLowerCase();
  const keyNorm = data.key.toLowerCase();
  if (keyNorm !== composite) {
    ctx.addIssue({
      code: "custom",
      message: `key must match resource.action (case-insensitive); key=${previewForMessage(data.key)}, expected composite=${previewForMessage(composite)}`,
      path: ["key"],
    });
  }
}

const hasValidDate = (value: Date): boolean => !Number.isNaN(value.getTime());
const isFutureDate = (value: Date): boolean => value.getTime() > Date.now();

/** Shared refinement for optional role-expiry fields on assignment/update payloads. */
export function refineOptionalFutureDate(
  data: { expiresAt?: Date | null },
  ctx: z.RefinementCtx,
  path: string = "expiresAt"
): void {
  if (data.expiresAt == null) return;
  if (!hasValidDate(data.expiresAt)) {
    ctx.addIssue({
      code: "custom",
      message: `expiresAt must be a valid date (got ${String(data.expiresAt)})`,
      path: [path],
    });
    return;
  }
  if (!isFutureDate(data.expiresAt)) {
    ctx.addIssue({
      code: "custom",
      message: `expiresAt must be in the future when set (got ${data.expiresAt.toISOString()})`,
      path: [path],
    });
  }
}
