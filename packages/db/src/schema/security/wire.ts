// ============================================================================
// SECURITY DOMAIN — Wire (Zod serialization bundle)
// ============================================================================
// Namespaced Drizzle-Zod schemas for JSON/API boundaries. Prefer `.parse()` on select
// schemas when emitting DB rows; use insert/update schemas on inbound payloads.
// Does not replace table exports — import `users`, `roles`, etc. when you need DDL types.
// Wire ↔ table mapping and intentional omissions: README.md § "Wire contract (`securityWire`)".
// Full domain file index: security-docs/README.md.
// ============================================================================
import {
  permissionInsertSchema,
  permissionSelectSchema,
  permissionUpdateSchema,
  rolePermissionInsertSchema,
  rolePermissionSelectSchema,
  userPermissionInsertSchema,
  userPermissionSelectSchema,
  userPermissionUpdateSchema,
} from "./permissions.js";
import { roleInsertSchema, roleSelectSchema, roleUpdateSchema } from "./roles.js";
import {
  userRoleAssignmentInsertSchema,
  userRoleSelectSchema,
  userRoleUpdateSchema,
} from "./userRoles.js";
import { userInsertSchema, userSelectSchema, userUpdateSchema } from "./users.js";

/** Grouped Zod wire schemas for the `security.*` domain (read/write validation). */
export const securityWire = {
  users: {
    select: userSelectSchema,
    insert: userInsertSchema,
    update: userUpdateSchema,
  },
  roles: {
    select: roleSelectSchema,
    insert: roleInsertSchema,
    update: roleUpdateSchema,
  },
  userRoles: {
    select: userRoleSelectSchema,
    assignmentInsert: userRoleAssignmentInsertSchema,
    update: userRoleUpdateSchema,
  },
  permissions: {
    row: {
      select: permissionSelectSchema,
      insert: permissionInsertSchema,
      update: permissionUpdateSchema,
    },
    rolePermission: {
      select: rolePermissionSelectSchema,
      insert: rolePermissionInsertSchema,
    },
    userPermission: {
      select: userPermissionSelectSchema,
      insert: userPermissionInsertSchema,
      update: userPermissionUpdateSchema,
    },
  },
} as const;

export type SecurityWire = typeof securityWire;
