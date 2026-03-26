import { eq } from "drizzle-orm";

import { returnOrderLines, returnOrders, returnReasonCodes } from "../../../schema/index.js";
import { money } from "../../money.js";
import { SEED_IDS } from "../../seed-ids.js";
import { type SeedAuditScope, type Tx } from "../../seed-types.js";

export async function seedReturnsPhase8(tx: Tx, seedAuditScope: SeedAuditScope): Promise<void> {
  const monitorUnitPrice = "589.99";
  const returnQty = "1.0000";
  const creditAmount = money(Number(returnQty) * Number(monitorUnitPrice));

  await tx
    .insert(returnReasonCodes)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.returnReasonDamaged,
        code: "DAMAGED",
        name: "Damaged on delivery",
        requiresInspection: true,
        restockPolicy: "scrap",
        isActive: true,
      },
    ])
    .execute();

  await tx
    .insert(returnOrders)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.returnOrderOne,
        name: "RMA-2024-0001",
        sourceOrderId: SEED_IDS.orderOne,
        partnerId: SEED_IDS.partnerAccentCorp,
        status: "approved",
        reasonCodeId: SEED_IDS.returnReasonDamaged,
        approvedBy: seedAuditScope.createdBy,
        approvedDate: new Date("2024-04-10T09:30:00Z"),
        notes: "Customer reported one damaged monitor in shipment.",
      },
    ])
    .execute();

  await tx
    .insert(returnOrderLines)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.returnOrderLineOne,
        returnOrderId: SEED_IDS.returnOrderOne,
        sourceLineId: SEED_IDS.lineOne,
        productId: SEED_IDS.productMonitor,
        quantity: returnQty,
        condition: "damaged",
        unitPrice: monitorUnitPrice,
        creditAmount,
        notes: "Damage confirmed by QA.",
      },
    ])
    .execute();

  console.log("✓ Seeded Phase 8 return/RMA entities");
}

export async function validateReturnsPhase8Invariants(tx: Tx): Promise<void> {
  const [returnOrder] = await tx
    .select({
      id: returnOrders.id,
      status: returnOrders.status,
      approvedBy: returnOrders.approvedBy,
    })
    .from(returnOrders)
    .where(eq(returnOrders.id, SEED_IDS.returnOrderOne));

  if (!returnOrder) {
    throw new Error("Return order coverage mismatch: expected seeded return order");
  }

  if (returnOrder.status !== "approved" || !returnOrder.approvedBy) {
    throw new Error(
      "Return order approval invariant mismatch: approved return must include approver"
    );
  }

  const returnLines = await tx
    .select({ quantity: returnOrderLines.quantity, creditAmount: returnOrderLines.creditAmount })
    .from(returnOrderLines)
    .where(eq(returnOrderLines.returnOrderId, SEED_IDS.returnOrderOne));

  if (returnLines.length !== 1) {
    throw new Error(`Return line coverage mismatch: expected 1 line, got ${returnLines.length}`);
  }

  for (const line of returnLines) {
    if (Number(line.quantity) <= 0 || Number(line.creditAmount) < 0) {
      throw new Error(
        "Return line invariant mismatch: quantity must be positive and credit non-negative"
      );
    }
  }

  console.log("✓ Verified Phase 8 return/RMA invariants");
}
