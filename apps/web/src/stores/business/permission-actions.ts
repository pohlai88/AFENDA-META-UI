/**
 * Permission action constants
 *
 * Keep action strings centralized to prevent drift across components/tests.
 */
export const PERMISSION_ACTIONS = {
  READ: "read",
  WRITE: "write",
  DELETE: "delete",
} as const;

export type PermissionAction =
  (typeof PERMISSION_ACTIONS)[keyof typeof PERMISSION_ACTIONS];
