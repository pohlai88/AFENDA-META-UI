import { eq, sql } from "drizzle-orm";

import {
  subscriptionCloseReasons,
  subscriptionLines,
  subscriptionLogs,
  subscriptions,
  subscriptionTemplates,
  unitsOfMeasure,
} from "../../../schema/index.js";
import { money } from "../../money.js";
import { SEED_IDS } from "../../seed-ids.js";
import { type SeedAuditScope, type Tx } from "../../seed-types.js";

export async function seedSubscriptionsPhase9(
  tx: Tx,
  seedAuditScope: SeedAuditScope
): Promise<void> {
  const unitUom = await tx
    .select({ uomId: unitsOfMeasure.uomId })
    .from(unitsOfMeasure)
    .where(eq(unitsOfMeasure.name, "Unit(s)"))
    .limit(1);

  if (!unitUom[0]?.uomId) {
    throw new Error("Unit(s) UoM not found; cannot seed subscription lines");
  }

  const lineOneSubtotal = money(Number("20.0000") * Number("99.00") * (1 - Number("10.00") / 100));
  const lineTwoSubtotal = money(Number("5.0000") * Number("250.00") * (1 - Number("0.00") / 100));
  const recurringTotal = money(Number(lineOneSubtotal) + Number(lineTwoSubtotal));
  const mrr = recurringTotal;
  const arr = money(Number(mrr) * 12);

  await tx
    .insert(subscriptionCloseReasons)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.subscriptionCloseReasonBudget,
        code: "BUDGET",
        name: "Budget Reduction",
        isChurn: true,
        isActive: true,
      },
    ])
    .execute();

  await tx
    .insert(subscriptionTemplates)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.subscriptionTemplateMonthlySupport,
        name: "Monthly Managed Support",
        billingPeriod: "monthly",
        billingDay: 5,
        autoRenew: true,
        renewalPeriod: 1,
        paymentTermId: SEED_IDS.paymentTermNet30,
        pricelistId: SEED_IDS.pricelistUsdVip,
        notes: "Standard managed support subscription template.",
        isActive: true,
      },
    ])
    .execute();

  await tx
    .insert(subscriptions)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.subscriptionOne,
        name: "SUB-2024-0001",
        partnerId: SEED_IDS.partnerBetaTech,
        templateId: SEED_IDS.subscriptionTemplateMonthlySupport,
        status: "active",
        dateStart: new Date("2024-01-01T00:00:00Z"),
        dateEnd: null,
        nextInvoiceDate: new Date("2024-05-05T00:00:00Z"),
        recurringTotal,
        mrr,
        arr,
        closeReasonId: null,
        lastInvoicedAt: new Date("2024-04-05T00:00:00Z"),
        notes: "Managed support and advanced analytics package.",
      },
    ])
    .execute();

  await tx
    .insert(subscriptionLines)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.subscriptionLineOne,
        subscriptionId: SEED_IDS.subscriptionOne,
        productId: SEED_IDS.productLicense,
        uomId: unitUom[0].uomId,
        quantity: "20.0000",
        priceUnit: "99.00",
        discount: "10.00",
        subtotal: lineOneSubtotal,
        sequence: 10,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.subscriptionLineTwo,
        subscriptionId: SEED_IDS.subscriptionOne,
        productId: SEED_IDS.productDesktop,
        uomId: unitUom[0].uomId,
        quantity: "5.0000",
        priceUnit: "250.00",
        discount: "0.00",
        subtotal: lineTwoSubtotal,
        sequence: 20,
      },
    ])
    .execute();

  await tx
    .insert(subscriptionLogs)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.subscriptionLogOne,
        subscriptionId: SEED_IDS.subscriptionOne,
        eventType: "created",
        oldMrr: "0.00",
        newMrr: mrr,
        changeReason: "Initial activation from signed contract.",
        eventAt: new Date("2024-01-01T00:00:00Z"),
        actorId: seedAuditScope.createdBy,
      },
    ])
    .execute();

  console.log("✓ Seeded Phase 9 subscription entities");
}

export async function validateSubscriptionsPhase9Invariants(tx: Tx): Promise<void> {
  const [subscriptionRow] = await tx
    .select({
      id: subscriptions.id,
      status: subscriptions.status,
      recurringTotal: subscriptions.recurringTotal,
      mrr: subscriptions.mrr,
      arr: subscriptions.arr,
    })
    .from(subscriptions)
    .where(eq(subscriptions.id, SEED_IDS.subscriptionOne));

  if (!subscriptionRow) {
    throw new Error("Subscription coverage mismatch: expected seeded subscription");
  }

  if (subscriptionRow.status !== "active") {
    throw new Error("Subscription invariant mismatch: seeded subscription must be active");
  }

  const [lineTotals] = await tx
    .select({
      subtotalSum: sql<string>`coalesce(sum(${subscriptionLines.subtotal}), 0)`,
      lineCount: sql<number>`count(*)`,
    })
    .from(subscriptionLines)
    .where(eq(subscriptionLines.subscriptionId, SEED_IDS.subscriptionOne));

  if (!lineTotals || Number(lineTotals.lineCount) < 2) {
    throw new Error("Subscription line coverage mismatch: expected at least 2 lines");
  }

  const expectedTotal = Number(lineTotals.subtotalSum);
  if (Math.abs(expectedTotal - Number(subscriptionRow.recurringTotal)) > 0.01) {
    throw new Error(
      `Subscription recurring total mismatch: expected ${expectedTotal.toFixed(2)}, got ${Number(subscriptionRow.recurringTotal).toFixed(2)}`
    );
  }

  const expectedArr = Number(subscriptionRow.mrr) * 12;
  if (Math.abs(expectedArr - Number(subscriptionRow.arr)) > 0.01) {
    throw new Error(
      `Subscription ARR mismatch: expected ${expectedArr.toFixed(2)}, got ${Number(subscriptionRow.arr).toFixed(2)}`
    );
  }

  const logs = await tx
    .select({ eventType: subscriptionLogs.eventType, newMrr: subscriptionLogs.newMrr })
    .from(subscriptionLogs)
    .where(eq(subscriptionLogs.subscriptionId, SEED_IDS.subscriptionOne));

  if (logs.length === 0) {
    throw new Error("Subscription log coverage mismatch: expected at least one log entry");
  }

  if (logs[0]?.eventType !== "created") {
    throw new Error("Subscription log invariant mismatch: first event should be created");
  }

  console.log("✓ Verified Phase 9 subscription invariants");
}
