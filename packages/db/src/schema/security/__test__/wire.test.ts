import { describe, expect, it } from "vitest";
import { z } from "zod/v4";

import {
  permissionInsertSchema,
  permissionSelectSchema,
  permissionUpdateSchema,
  rolePermissionInsertSchema,
  rolePermissionSelectSchema,
  userPermissionInsertSchema,
  userPermissionSelectSchema,
  userPermissionUpdateSchema,
} from "../permissions.js";
import { roleInsertSchema, roleSelectSchema, roleUpdateSchema } from "../roles.js";
import {
  userRoleAssignmentInsertSchema,
  userRoleSelectSchema,
  userRoleUpdateSchema,
} from "../userRoles.js";
import { userInsertSchema, userSelectSchema, userUpdateSchema } from "../users.js";
import { securityWire } from "../wire.js";

/** Count leaf Zod schemas under `securityWire` (nested plain objects only). */
function countWireZodLeaves(value: unknown): number {
  if (value === null || typeof value !== "object") return 0;
  if (value instanceof z.ZodType) return 1;
  return Object.values(value as Record<string, unknown>).reduce<number>(
    (acc, child) => acc + countWireZodLeaves(child),
    0
  );
}

describe("securityWire", () => {
  it("aliases the canonical table Zod schemas (same object references)", () => {
    expect(securityWire.users.select).toBe(userSelectSchema);
    expect(securityWire.users.insert).toBe(userInsertSchema);
    expect(securityWire.users.update).toBe(userUpdateSchema);

    expect(securityWire.roles.select).toBe(roleSelectSchema);
    expect(securityWire.roles.insert).toBe(roleInsertSchema);
    expect(securityWire.roles.update).toBe(roleUpdateSchema);

    expect(securityWire.userRoles.select).toBe(userRoleSelectSchema);
    expect(securityWire.userRoles.assignmentInsert).toBe(userRoleAssignmentInsertSchema);
    expect(securityWire.userRoles.update).toBe(userRoleUpdateSchema);

    expect(securityWire.permissions.row.select).toBe(permissionSelectSchema);
    expect(securityWire.permissions.row.insert).toBe(permissionInsertSchema);
    expect(securityWire.permissions.row.update).toBe(permissionUpdateSchema);

    expect(securityWire.permissions.rolePermission.select).toBe(rolePermissionSelectSchema);
    expect(securityWire.permissions.rolePermission.insert).toBe(rolePermissionInsertSchema);

    expect(securityWire.permissions.userPermission.select).toBe(userPermissionSelectSchema);
    expect(securityWire.permissions.userPermission.insert).toBe(userPermissionInsertSchema);
    expect(securityWire.permissions.userPermission.update).toBe(userPermissionUpdateSchema);
  });

  it("keeps a fixed number of wire leaves (update when adding tables or CRUD slots)", () => {
    // users 3 + roles 3 + user_roles 3 + permissions 3 + role_permissions 2 + user_permissions 3
    expect(countWireZodLeaves(securityWire)).toBe(17);
  });
});
