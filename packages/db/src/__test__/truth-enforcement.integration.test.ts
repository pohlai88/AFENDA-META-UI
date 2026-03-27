import { beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";

import { db } from "../db.js";
import { seed } from "../_seeds/index.js";
import { salesOrders } from "../schema/index.js";
import { compileInvariants } from "../truth-compiler/invariant-compiler.js";
import { normalize } from "../truth-compiler/normalizer.js";
import { COMPILER_INPUT } from "../truth-compiler/truth-config.js";
import { compileTransitions } from "../truth-compiler/transition-compiler.js";

const skipTests = !process.env.DATABASE_URL;

describe.skipIf(skipTests)("Truth enforcement at DB layer", () => {
  beforeAll(async () => {
    await seed(db, "baseline");

    const normalized = normalize(COMPILER_INPUT);
    const segments = [...compileInvariants(normalized), ...compileTransitions(normalized)];

    for (const segment of segments) {
      if (segment.kind === "comment") continue;
      await db.execute(sql.raw(segment.sql));
    }
  });

  it("rejects invalid state transitions at database trigger level", async () => {
    const [order] = await db
      .select({ id: salesOrders.id })
      .from(salesOrders)
      .where(eq(salesOrders.status, "draft"))
      .limit(1);

    expect(order?.id).toBeDefined();

    await expect(
      db.execute(sql`
        UPDATE sales.sales_orders
        SET status = 'done'
        WHERE id = ${order?.id}
      `)
    ).rejects.toThrow(/invalid_transition \[sales_order\]/i);
  });

  it("rejects invariant violations at database constraint level", async () => {
    const [order] = await db
      .select({ id: salesOrders.id })
      .from(salesOrders)
      .where(eq(salesOrders.status, "draft"))
      .limit(1);

    expect(order?.id).toBeDefined();

    await expect(
      db.execute(sql`
        UPDATE sales.sales_orders
        SET status = 'sale', amount_total = 0
        WHERE id = ${order?.id}
      `)
    ).rejects.toThrow(/chk_inv_sales_sales_order_confirmed_amount_positive|check constraint/i);
  });
});
