import { beforeAll, describe, expect, it } from "vitest";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "../drizzle/db.js";
import {
  checkSalesOrderTruthCompletion,
  runOrderConfirmationPipeline,
} from "../queries/sales/index.js";
import { salesOrderLines, salesOrders } from "../schema/index.js";
import { seed } from "../seeds/index.js";
import { SEED_IDS } from "../seeds/seed-ids.js";
import { DEFAULT_TENANT_ID, SYSTEM_ACTOR_ID } from "../seeds/seed-types.js";

const runIntegrationSuite =
  !!process.env.DATABASE_URL && process.env.DB_INTEGRATION_TESTS === "1";
const skipTests = !runIntegrationSuite;

describe.skipIf(skipTests)("Truth system invariants (DB integration)", () => {
  beforeAll(async () => {
    await seed(db, "baseline");
  }, 120_000);

  it("baseline sold order lacks truth rows; confirming order four satisfies invariants", async () => {
    const orderOneChecks = await checkSalesOrderTruthCompletion(
      db,
      DEFAULT_TENANT_ID,
      SEED_IDS.orderOne
    );
    const oneById = new Map(orderOneChecks.map((c) => [c.id, c]));
    expect(oneById.get("INV-SO-002")?.ok).toBe(false);
    expect(oneById.get("INV-SO-003")?.ok).toBe(false);

    const [ord] = await db
      .select()
      .from(salesOrders)
      .where(
        and(
          eq(salesOrders.tenantId, DEFAULT_TENANT_ID),
          eq(salesOrders.id, SEED_IDS.orderFour)
        )
      )
      .limit(1);

    expect(ord?.status).toBe("sent");
    const pricelistId = ord?.pricelistId;
    const currencyId = ord?.currencyId;
    if (pricelistId == null || currencyId == null) {
      throw new Error("seed order four missing pricelistId or currencyId");
    }

    const lines = await db
      .select()
      .from(salesOrderLines)
      .where(
        and(
          eq(salesOrderLines.tenantId, DEFAULT_TENANT_ID),
          eq(salesOrderLines.orderId, SEED_IDS.orderFour),
          isNull(salesOrderLines.deletedAt)
        )
      );

    const lineOutputs = lines
      .filter((l) => l.displayType === "product")
      .map((line) => {
        if (line.productUomId == null) {
          throw new Error(`seed line ${line.id} missing productUomId`);
        }
        return {
          lineId: line.id,
          inputSnapshot: {
            product_id: line.productId,
            quantity: String(line.quantity),
            uom_id: line.productUomId,
            pricelist_id: pricelistId,
            currency_id: currencyId,
            date: "2024-02-10",
            pricing_snapshot: { integration: "truthSystemInvariants.integration" },
          },
          appliedRuleIds: [] as string[],
          basePrice: String(line.priceSubtotal),
          finalPrice: String(line.priceSubtotal),
          currencyId,
        };
      });

    const pipelineResult = await runOrderConfirmationPipeline(db, {
      tenantId: DEFAULT_TENANT_ID,
      orderId: SEED_IDS.orderFour,
      actorUserId: SYSTEM_ACTOR_ID,
      pricing: { lineOutputs },
    });

    expect(pipelineResult.status).toBe("confirmed");

    const orderFourChecks = await checkSalesOrderTruthCompletion(
      db,
      DEFAULT_TENANT_ID,
      SEED_IDS.orderFour
    );
    expect(orderFourChecks.filter((c) => !c.ok)).toEqual([]);
  });
});
