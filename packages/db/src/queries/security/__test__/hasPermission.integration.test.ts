/**
 * DB-backed `hasPermission` scenarios (precedence, soft-delete, expiry, key casing).
 *
 * Opt-in: `DATABASE_URL` + `DB_SECURITY_PERMISSION_TESTS=1`. Runs `seed(baseline)` once.
 * Requires applied migrations including `security.user_permissions.grant_type`.
 */
import { randomBytes } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db } from "../../../drizzle/db.js";
import { setSessionContext } from "../../../pg-session/index.js";
import {
  permissions,
  rolePermissions,
  userPermissions,
} from "../../../schema/security/permissions.js";
import { roles } from "../../../schema/security/roles.js";
import { userRoles } from "../../../schema/security/userRoles.js";
import { users } from "../../../schema/security/users.js";
import { ensureSystemUser } from "../../../seeds/domains/foundation/index.js";
import { seed } from "../../../seeds/index.js";
import type { Tx } from "../../../seeds/seed-types.js";
import { DEFAULT_TENANT_ID } from "../../../seeds/seed-types.js";
import { hasPermission } from "../hasPermission.js";

const runSuite =
  Boolean(process.env.DATABASE_URL) && process.env.DB_SECURITY_PERMISSION_TESTS === "1";

const ROLLBACK = Symbol("hasPermissionIntegrationRollback");

async function inRlsTenantTx(tenantId: number, fn: (tx: Tx, actorId: number) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      const actorId = await ensureSystemUser(tx, tenantId);
      await setSessionContext(tx, { tenantId, userId: actorId });
      await fn(tx, actorId);
      throw ROLLBACK;
    });
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  }
}

describe.skipIf(!runSuite)("hasPermission (integration)", () => {
  beforeAll(async () => {
    await seed(db, "baseline");
  }, 180_000);

  it("returns true when user_permissions.grant_type = GRANT and no role grants", async () => {
    await inRlsTenantTx(DEFAULT_TENANT_ID, async (tx, actorId) => {
      const suffix = randomBytes(4).toString("hex");
      const resource = `g${suffix}`;
      const action = `a${suffix}`;
      const key = `${resource}.${action}`;

      const [perm] = await tx
        .insert(permissions)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          resource,
          action,
          key,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ permissionId: permissions.permissionId });

      const [subject] = await tx
        .insert(users)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          email: `grant_${suffix}@perm.test`,
          displayName: "Grant subject",
          status: "ACTIVE",
          emailVerified: true,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ userId: users.userId });

      await tx.insert(userPermissions).values({
        tenantId: DEFAULT_TENANT_ID,
        userId: subject.userId,
        permissionId: perm.permissionId,
        grantType: "GRANT",
        createdBy: actorId,
        updatedBy: actorId,
      });

      expect(
        await hasPermission(tx, {
          tenantId: DEFAULT_TENANT_ID,
          userId: subject.userId,
          permissionKeyOrId: key,
        })
      ).toBe(true);
    });
  });

  it("returns false when user_permissions.grant_type = DENY even if role grants", async () => {
    await inRlsTenantTx(DEFAULT_TENANT_ID, async (tx, actorId) => {
      const suffix = randomBytes(4).toString("hex");
      const resource = `d${suffix}`;
      const action = `b${suffix}`;
      const key = `${resource}.${action}`;

      const [perm] = await tx
        .insert(permissions)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          resource,
          action,
          key,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ permissionId: permissions.permissionId });

      const [subject] = await tx
        .insert(users)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          email: `deny_${suffix}@perm.test`,
          displayName: "Deny subject",
          status: "ACTIVE",
          emailVerified: true,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ userId: users.userId });

      const [role] = await tx
        .insert(roles)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          roleCode: `DENY_${suffix}`,
          name: "Deny scenario role",
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ roleId: roles.roleId });

      await tx.insert(rolePermissions).values({
        tenantId: DEFAULT_TENANT_ID,
        roleId: role.roleId,
        permissionId: perm.permissionId,
        createdBy: actorId,
        updatedBy: actorId,
      });

      await tx.insert(userRoles).values({
        tenantId: DEFAULT_TENANT_ID,
        userId: subject.userId,
        roleId: role.roleId,
        assignedBy: actorId,
      });

      await tx.insert(userPermissions).values({
        tenantId: DEFAULT_TENANT_ID,
        userId: subject.userId,
        permissionId: perm.permissionId,
        grantType: "DENY",
        createdBy: actorId,
        updatedBy: actorId,
      });

      expect(
        await hasPermission(tx, {
          tenantId: DEFAULT_TENANT_ID,
          userId: subject.userId,
          permissionKeyOrId: key,
        })
      ).toBe(false);
    });
  });

  it("returns true when role grants and no user_permissions row", async () => {
    await inRlsTenantTx(DEFAULT_TENANT_ID, async (tx, actorId) => {
      const suffix = randomBytes(4).toString("hex");
      const resource = `r${suffix}`;
      const action = `c${suffix}`;
      const key = `${resource}.${action}`;

      const [perm] = await tx
        .insert(permissions)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          resource,
          action,
          key,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ permissionId: permissions.permissionId });

      const [subject] = await tx
        .insert(users)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          email: `role_${suffix}@perm.test`,
          displayName: "Role subject",
          status: "ACTIVE",
          emailVerified: true,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ userId: users.userId });

      const [role] = await tx
        .insert(roles)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          roleCode: `ROLE_${suffix}`,
          name: "Grant via role",
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ roleId: roles.roleId });

      await tx.insert(rolePermissions).values({
        tenantId: DEFAULT_TENANT_ID,
        roleId: role.roleId,
        permissionId: perm.permissionId,
        createdBy: actorId,
        updatedBy: actorId,
      });

      await tx.insert(userRoles).values({
        tenantId: DEFAULT_TENANT_ID,
        userId: subject.userId,
        roleId: role.roleId,
        assignedBy: actorId,
      });

      expect(
        await hasPermission(tx, {
          tenantId: DEFAULT_TENANT_ID,
          userId: subject.userId,
          permissionKeyOrId: key,
        })
      ).toBe(true);
    });
  });

  it("returns false when no override and no role grant", async () => {
    await inRlsTenantTx(DEFAULT_TENANT_ID, async (tx, actorId) => {
      const suffix = randomBytes(4).toString("hex");
      const resource = `n${suffix}`;
      const action = `x${suffix}`;
      const key = `${resource}.${action}`;

      await tx.insert(permissions).values({
        tenantId: DEFAULT_TENANT_ID,
        resource,
        action,
        key,
        createdBy: actorId,
        updatedBy: actorId,
      });

      const [subject] = await tx
        .insert(users)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          email: `none_${suffix}@perm.test`,
          displayName: "No grant subject",
          status: "ACTIVE",
          emailVerified: true,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ userId: users.userId });

      expect(
        await hasPermission(tx, {
          tenantId: DEFAULT_TENANT_ID,
          userId: subject.userId,
          permissionKeyOrId: key,
        })
      ).toBe(false);
    });
  });

  it("returns false when permission is soft-deleted even with user GRANT", async () => {
    await inRlsTenantTx(DEFAULT_TENANT_ID, async (tx, actorId) => {
      const suffix = randomBytes(4).toString("hex");
      const resource = `s${suffix}`;
      const action = `y${suffix}`;
      const key = `${resource}.${action}`;

      const [perm] = await tx
        .insert(permissions)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          resource,
          action,
          key,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ permissionId: permissions.permissionId });

      const [subject] = await tx
        .insert(users)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          email: `soft_${suffix}@perm.test`,
          displayName: "Soft-delete subject",
          status: "ACTIVE",
          emailVerified: true,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ userId: users.userId });

      await tx.insert(userPermissions).values({
        tenantId: DEFAULT_TENANT_ID,
        userId: subject.userId,
        permissionId: perm.permissionId,
        grantType: "GRANT",
        createdBy: actorId,
        updatedBy: actorId,
      });

      await tx
        .update(permissions)
        .set({ deletedAt: new Date("2026-01-01T00:00:00.000Z") })
        .where(eq(permissions.permissionId, perm.permissionId));

      expect(
        await hasPermission(tx, {
          tenantId: DEFAULT_TENANT_ID,
          userId: subject.userId,
          permissionKeyOrId: key,
        })
      ).toBe(false);
    });
  });

  it("returns false when user_roles assignment is expired (at reference instant)", async () => {
    await inRlsTenantTx(DEFAULT_TENANT_ID, async (tx, actorId) => {
      const suffix = randomBytes(4).toString("hex");
      const resource = `e${suffix}`;
      const action = `z${suffix}`;
      const key = `${resource}.${action}`;

      const [perm] = await tx
        .insert(permissions)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          resource,
          action,
          key,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ permissionId: permissions.permissionId });

      const [subject] = await tx
        .insert(users)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          email: `exp_${suffix}@perm.test`,
          displayName: "Expired role subject",
          status: "ACTIVE",
          emailVerified: true,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ userId: users.userId });

      const [role] = await tx
        .insert(roles)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          roleCode: `EXP_${suffix}`,
          name: "Expired assignment role",
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ roleId: roles.roleId });

      await tx.insert(rolePermissions).values({
        tenantId: DEFAULT_TENANT_ID,
        roleId: role.roleId,
        permissionId: perm.permissionId,
        createdBy: actorId,
        updatedBy: actorId,
      });

      const assignedAt = new Date("2026-01-01T00:00:00.000Z");
      const expiresAt = new Date("2026-05-01T00:00:00.000Z");
      const at = new Date("2026-06-01T00:00:00.000Z");

      await tx.insert(userRoles).values({
        tenantId: DEFAULT_TENANT_ID,
        userId: subject.userId,
        roleId: role.roleId,
        assignedBy: actorId,
        assignedAt,
        expiresAt,
      });

      expect(
        await hasPermission(tx, {
          tenantId: DEFAULT_TENANT_ID,
          userId: subject.userId,
          permissionKeyOrId: key,
          at,
        })
      ).toBe(false);
    });
  });

  it("resolves permission key case-insensitively", async () => {
    await inRlsTenantTx(DEFAULT_TENANT_ID, async (tx, actorId) => {
      const suffix = randomBytes(4).toString("hex");
      const resource = `Ord${suffix}`;
      const action = `Vw${suffix}`;
      const key = `${resource}.${action}`;

      const [perm] = await tx
        .insert(permissions)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          resource,
          action,
          key,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ permissionId: permissions.permissionId });

      const [subject] = await tx
        .insert(users)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          email: `case_${suffix}@perm.test`,
          displayName: "Case subject",
          status: "ACTIVE",
          emailVerified: true,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ userId: users.userId });

      const [role] = await tx
        .insert(roles)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          roleCode: `CASE_${suffix}`,
          name: "Case role",
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ roleId: roles.roleId });

      await tx.insert(rolePermissions).values({
        tenantId: DEFAULT_TENANT_ID,
        roleId: role.roleId,
        permissionId: perm.permissionId,
        createdBy: actorId,
        updatedBy: actorId,
      });

      await tx.insert(userRoles).values({
        tenantId: DEFAULT_TENANT_ID,
        userId: subject.userId,
        roleId: role.roleId,
        assignedBy: actorId,
      });

      const lowerQueryKey = `${resource.toLowerCase()}.${action.toLowerCase()}`;

      expect(
        await hasPermission(tx, {
          tenantId: DEFAULT_TENANT_ID,
          userId: subject.userId,
          permissionKeyOrId: lowerQueryKey,
        })
      ).toBe(true);
    });
  });

  it("returns true when resolving by permissionId", async () => {
    await inRlsTenantTx(DEFAULT_TENANT_ID, async (tx, actorId) => {
      const suffix = randomBytes(4).toString("hex");
      const resource = `i${suffix}`;
      const action = `q${suffix}`;
      const key = `${resource}.${action}`;

      const [perm] = await tx
        .insert(permissions)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          resource,
          action,
          key,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ permissionId: permissions.permissionId });

      const [subject] = await tx
        .insert(users)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          email: `id_${suffix}@perm.test`,
          displayName: "Id lookup subject",
          status: "ACTIVE",
          emailVerified: true,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ userId: users.userId });

      const [role] = await tx
        .insert(roles)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          roleCode: `ID_${suffix}`,
          name: "Id lookup role",
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ roleId: roles.roleId });

      await tx.insert(rolePermissions).values({
        tenantId: DEFAULT_TENANT_ID,
        roleId: role.roleId,
        permissionId: perm.permissionId,
        createdBy: actorId,
        updatedBy: actorId,
      });

      await tx.insert(userRoles).values({
        tenantId: DEFAULT_TENANT_ID,
        userId: subject.userId,
        roleId: role.roleId,
        assignedBy: actorId,
      });

      expect(
        await hasPermission(tx, {
          tenantId: DEFAULT_TENANT_ID,
          userId: subject.userId,
          permissionKeyOrId: perm.permissionId,
        })
      ).toBe(true);
    });
  });

  it("rejects two active roles with the same roleCode (case-insensitive) in one tenant", async () => {
    await inRlsTenantTx(DEFAULT_TENANT_ID, async (tx, actorId) => {
      const suffix = randomBytes(4).toString("hex");
      const code = `DUP_${suffix}`;
      await tx.insert(roles).values({
        tenantId: DEFAULT_TENANT_ID,
        roleCode: code,
        name: "First duplicate slot",
        createdBy: actorId,
        updatedBy: actorId,
      });
      await expect(
        tx.insert(roles).values({
          tenantId: DEFAULT_TENANT_ID,
          roleCode: code.toLowerCase(),
          name: "Second collides on lower(code)",
          createdBy: actorId,
          updatedBy: actorId,
        })
      ).rejects.toThrow(/unique|duplicate|23505/i);
    });
  });

  it("allows inserting the same roleCode after the previous role is soft-deleted", async () => {
    await inRlsTenantTx(DEFAULT_TENANT_ID, async (tx, actorId) => {
      const suffix = randomBytes(4).toString("hex");
      const code = `REUSE_${suffix}`;
      const [first] = await tx
        .insert(roles)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          roleCode: code,
          name: "Superseded role",
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ roleId: roles.roleId });

      await tx
        .update(roles)
        .set({ deletedAt: new Date("2026-01-01T00:00:00.000Z") })
        .where(eq(roles.roleId, first.roleId));

      const [second] = await tx
        .insert(roles)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          roleCode: code,
          name: "Replacement role",
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ roleId: roles.roleId });

      expect(second.roleId).not.toBe(first.roleId);
    });
  });

  it("removes user_roles when the user is deleted (cascade)", async () => {
    await inRlsTenantTx(DEFAULT_TENANT_ID, async (tx, actorId) => {
      const suffix = randomBytes(4).toString("hex");
      const resource = `c${suffix}`;
      const action = `u${suffix}`;
      const key = `${resource}.${action}`;

      const [perm] = await tx
        .insert(permissions)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          resource,
          action,
          key,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ permissionId: permissions.permissionId });

      const [role] = await tx
        .insert(roles)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          roleCode: `CASCADE_U_${suffix}`,
          name: "Cascade user role",
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ roleId: roles.roleId });

      await tx.insert(rolePermissions).values({
        tenantId: DEFAULT_TENANT_ID,
        roleId: role.roleId,
        permissionId: perm.permissionId,
        createdBy: actorId,
        updatedBy: actorId,
      });

      const [subject] = await tx
        .insert(users)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          email: `cascade_${suffix}@perm.test`,
          displayName: "Cascade delete user",
          status: "ACTIVE",
          emailVerified: true,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ userId: users.userId });

      await tx.insert(userRoles).values({
        tenantId: DEFAULT_TENANT_ID,
        userId: subject.userId,
        roleId: role.roleId,
        assignedBy: actorId,
      });

      await tx.delete(users).where(eq(users.userId, subject.userId));

      const remaining = await tx
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(eq(userRoles.userId, subject.userId));

      expect(remaining).toHaveLength(0);
    });
  });

  it("blocks hard-deleting a role while user_roles rows reference it (restrict)", async () => {
    await inRlsTenantTx(DEFAULT_TENANT_ID, async (tx, actorId) => {
      const suffix = randomBytes(4).toString("hex");
      const [role] = await tx
        .insert(roles)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          roleCode: `RESTRICT_${suffix}`,
          name: "Restrict delete role",
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ roleId: roles.roleId });

      const [subject] = await tx
        .insert(users)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          email: `restrict_${suffix}@perm.test`,
          displayName: "Restrict subject",
          status: "ACTIVE",
          emailVerified: true,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ userId: users.userId });

      await tx.insert(userRoles).values({
        tenantId: DEFAULT_TENANT_ID,
        userId: subject.userId,
        roleId: role.roleId,
        assignedBy: actorId,
      });

      await expect(tx.delete(roles).where(eq(roles.roleId, role.roleId))).rejects.toThrow(
        /foreign key|restrict|23503/i
      );
    });
  });

  it("rejects assignedBy that is not a user in the tenant (FK)", async () => {
    await inRlsTenantTx(DEFAULT_TENANT_ID, async (tx, actorId) => {
      const suffix = randomBytes(4).toString("hex");
      const [role] = await tx
        .insert(roles)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          roleCode: `ASG_${suffix}`,
          name: "AssignedBy FK role",
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ roleId: roles.roleId });

      const [subject] = await tx
        .insert(users)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          email: `asg_${suffix}@perm.test`,
          displayName: "AssignedBy subject",
          status: "ACTIVE",
          emailVerified: true,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ userId: users.userId });

      const bogusAssigner = 2_147_483_647;

      await expect(
        tx.insert(userRoles).values({
          tenantId: DEFAULT_TENANT_ID,
          userId: subject.userId,
          roleId: role.roleId,
          assignedBy: bogusAssigner,
        })
      ).rejects.toThrow(/foreign key|23503/i);
    });
  });

  it("rejects expiresAt not strictly after assignedAt at the database (check constraint)", async () => {
    await inRlsTenantTx(DEFAULT_TENANT_ID, async (tx, actorId) => {
      const suffix = randomBytes(4).toString("hex");
      const [role] = await tx
        .insert(roles)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          roleCode: `CHK_${suffix}`,
          name: "Check constraint role",
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ roleId: roles.roleId });

      const [subject] = await tx
        .insert(users)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          email: `chk_${suffix}@perm.test`,
          displayName: "Check subject",
          status: "ACTIVE",
          emailVerified: true,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ userId: users.userId });

      const assignedAt = new Date("2031-08-01T00:00:00.000Z");
      const expiresAt = new Date("2031-07-01T00:00:00.000Z");

      await expect(
        tx.insert(userRoles).values({
          tenantId: DEFAULT_TENANT_ID,
          userId: subject.userId,
          roleId: role.roleId,
          assignedBy: actorId,
          assignedAt,
          expiresAt,
        })
      ).rejects.toThrow(/check|user_roles_expires|23514/i);
    });
  });

  it("rejects two active users with the same email (case-insensitive) in one tenant", async () => {
    await inRlsTenantTx(DEFAULT_TENANT_ID, async (tx, actorId) => {
      const suffix = randomBytes(4).toString("hex");
      const local = `dup_${suffix}`;
      await tx.insert(users).values({
        tenantId: DEFAULT_TENANT_ID,
        email: `${local}@users.test`,
        displayName: "First",
        status: "ACTIVE",
        emailVerified: true,
        createdBy: actorId,
        updatedBy: actorId,
      });
      await expect(
        tx.insert(users).values({
          tenantId: DEFAULT_TENANT_ID,
          email: `${local.toUpperCase()}@USERS.TEST`,
          displayName: "Second",
          status: "ACTIVE",
          emailVerified: true,
          createdBy: actorId,
          updatedBy: actorId,
        })
      ).rejects.toThrow(/unique|duplicate|23505/i);
    });
  });

  it("allows inserting the same email after the previous user is soft-deleted", async () => {
    await inRlsTenantTx(DEFAULT_TENANT_ID, async (tx, actorId) => {
      const suffix = randomBytes(4).toString("hex");
      const email = `reuse_${suffix}@users.test`;
      const [first] = await tx
        .insert(users)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          email,
          displayName: "First holder",
          status: "ACTIVE",
          emailVerified: true,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ userId: users.userId });

      await tx
        .update(users)
        .set({ deletedAt: new Date("2026-01-01T00:00:00.000Z") })
        .where(eq(users.userId, first.userId));

      const [second] = await tx
        .insert(users)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          email,
          displayName: "Replacement holder",
          status: "ACTIVE",
          emailVerified: true,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ userId: users.userId });

      expect(second.userId).not.toBe(first.userId);
    });
  });

  it("rejects createdBy that is not a user in the tenant (FK)", async () => {
    await inRlsTenantTx(DEFAULT_TENANT_ID, async (tx) => {
      const suffix = randomBytes(4).toString("hex");
      const bogusActor = 2_147_483_647;
      await expect(
        tx.insert(users).values({
          tenantId: DEFAULT_TENANT_ID,
          email: `fk_${suffix}@users.test`,
          displayName: "Bad audit FK",
          status: "ACTIVE",
          emailVerified: true,
          createdBy: bogusActor,
          updatedBy: bogusActor,
        })
      ).rejects.toThrow(/foreign key|23503/i);
    });
  });
});
