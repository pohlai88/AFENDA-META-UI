/**
 * Parity: {@link createPermissionResolver} vs {@link hasPermission} (same precedence).
 *
 * Opt-in: `DATABASE_URL` + `DB_SECURITY_PERMISSION_TESTS=1`.
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
import { createPermissionResolver } from "../permissionResolver.js";
import { hasPermission } from "../hasPermission.js";

const runSuite =
  Boolean(process.env.DATABASE_URL) && process.env.DB_SECURITY_PERMISSION_TESTS === "1";

const ROLLBACK = Symbol("permissionResolverIntegrationRollback");

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

describe.skipIf(!runSuite)("createPermissionResolver (integration)", () => {
  beforeAll(async () => {
    await seed(db, "baseline");
  }, 180_000);

  it("matches hasPermission for GRANT override, role grant, DENY, and unknown key", async () => {
    await inRlsTenantTx(DEFAULT_TENANT_ID, async (tx, actorId) => {
      const suffix = randomBytes(4).toString("hex");
      const keys = {
        grantOnly: `gr_${suffix}.a`,
        roleOnly: `rl_${suffix}.b`,
        denied: `dn_${suffix}.c`,
        missing: `xx_${suffix}.z`,
      };

      const [permGrant] = await tx
        .insert(permissions)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          resource: `gr_${suffix}`,
          action: "a",
          key: keys.grantOnly,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ permissionId: permissions.permissionId });

      const [permRole] = await tx
        .insert(permissions)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          resource: `rl_${suffix}`,
          action: "b",
          key: keys.roleOnly,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ permissionId: permissions.permissionId });

      const [permDeny] = await tx
        .insert(permissions)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          resource: `dn_${suffix}`,
          action: "c",
          key: keys.denied,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ permissionId: permissions.permissionId });

      const [subject] = await tx
        .insert(users)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          email: `resolver_${suffix}@perm.test`,
          displayName: "Resolver subject",
          status: "ACTIVE",
          emailVerified: true,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ userId: users.userId });

      await tx.insert(userPermissions).values({
        tenantId: DEFAULT_TENANT_ID,
        userId: subject.userId,
        permissionId: permGrant.permissionId,
        grantType: "GRANT",
        createdBy: actorId,
        updatedBy: actorId,
      });

      await tx.insert(userPermissions).values({
        tenantId: DEFAULT_TENANT_ID,
        userId: subject.userId,
        permissionId: permDeny.permissionId,
        grantType: "DENY",
        createdBy: actorId,
        updatedBy: actorId,
      });

      const [role] = await tx
        .insert(roles)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          roleCode: `r_${suffix}`,
          name: "Resolver role",
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ roleId: roles.roleId });

      await tx.insert(userRoles).values({
        tenantId: DEFAULT_TENANT_ID,
        userId: subject.userId,
        roleId: role.roleId,
        assignedBy: actorId,
      });

      await tx.insert(rolePermissions).values({
        tenantId: DEFAULT_TENANT_ID,
        roleId: role.roleId,
        permissionId: permRole.permissionId,
        createdBy: actorId,
        updatedBy: actorId,
      });

      await tx.insert(rolePermissions).values({
        tenantId: DEFAULT_TENANT_ID,
        roleId: role.roleId,
        permissionId: permDeny.permissionId,
        createdBy: actorId,
        updatedBy: actorId,
      });

      const resolver = await createPermissionResolver(tx, {
        tenantId: DEFAULT_TENANT_ID,
        userId: subject.userId,
      });

      expect(resolver.loadedPermissionRowCount).toBeGreaterThanOrEqual(3);

      const cases: Array<{ keyOrId: string | number; label: string }> = [
        { keyOrId: keys.grantOnly, label: "user GRANT" },
        { keyOrId: keys.grantOnly.toUpperCase(), label: "key case" },
        { keyOrId: permGrant.permissionId, label: "id grant" },
        { keyOrId: keys.roleOnly, label: "role only" },
        { keyOrId: permRole.permissionId, label: "id role" },
        { keyOrId: keys.denied, label: "DENY wins" },
        { keyOrId: permDeny.permissionId, label: "id deny" },
        { keyOrId: keys.missing, label: "unknown" },
      ];

      for (const { keyOrId, label } of cases) {
        const a = await hasPermission(tx, {
          tenantId: DEFAULT_TENANT_ID,
          userId: subject.userId,
          permissionKeyOrId: keyOrId,
        });
        const b = resolver.has(keyOrId);
        expect(b, label).toBe(a);
      }
    });
  });

  it("matches hasPermission for soft-deleted permission (inactive)", async () => {
    await inRlsTenantTx(DEFAULT_TENANT_ID, async (tx, actorId) => {
      const suffix = randomBytes(4).toString("hex");
      const key = `sd_${suffix}.x`;

      const [perm] = await tx
        .insert(permissions)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          resource: `sd_${suffix}`,
          action: "x",
          key,
          createdBy: actorId,
          updatedBy: actorId,
        })
        .returning({ permissionId: permissions.permissionId });

      const [subject] = await tx
        .insert(users)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          email: `sd_res_${suffix}@perm.test`,
          displayName: "SD subject",
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
        .set({ deletedAt: new Date(), updatedBy: actorId })
        .where(eq(permissions.permissionId, perm.permissionId));

      const resolver = await createPermissionResolver(tx, {
        tenantId: DEFAULT_TENANT_ID,
        userId: subject.userId,
      });

      expect(resolver.has(key)).toBe(false);
      expect(
        await hasPermission(tx, {
          tenantId: DEFAULT_TENANT_ID,
          userId: subject.userId,
          permissionKeyOrId: key,
        })
      ).toBe(false);
    });
  });
});
