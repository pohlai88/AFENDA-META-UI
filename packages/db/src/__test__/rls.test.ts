import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "../db.js";
import { clearSessionContext, setSessionContext } from "../session/index.js";
import {
  appUserRole,
  serviceRole,
  tenantIsolationCheck,
  tenantIsolationPolicies,
} from "../rls/index.js";

describe("RLS tenant isolation helpers", () => {
  it("creates a reusable SQL tenant isolation check", () => {
    const check = tenantIsolationCheck();

    expect(check).toBeDefined();
    expect(check.queryChunks).toBeDefined();
  });

  it("creates all four CRUD policies", () => {
    const policies = tenantIsolationPolicies("users");

    expect(policies).toHaveLength(4);
  });

  it("defines expected roles", () => {
    expect(appUserRole).toBeDefined();
    expect(serviceRole).toBeDefined();
  });

  it.skipIf(!process.env.DATABASE_URL)(
    "sets and clears session context inside a transaction",
    async () => {
      await db.transaction(async (tx) => {
        await setSessionContext(tx, { tenantId: 42, userId: 7 });

        const setResult = await tx.execute(sql`
        SELECT
          current_setting('afenda.tenant_id', true) as tenant_id,
          current_setting('afenda.user_id', true) as user_id
      `);

        expect((setResult.rows[0] as { tenant_id: string }).tenant_id).toBe("42");
        expect((setResult.rows[0] as { user_id: string }).user_id).toBe("7");

        await clearSessionContext(tx);

        const clearedResult = await tx.execute(
          sql`SELECT current_setting('afenda.tenant_id', true) as tenant_id`
        );

        expect((clearedResult.rows[0] as { tenant_id: string }).tenant_id).toBe("");
      });
    }
  );
});
