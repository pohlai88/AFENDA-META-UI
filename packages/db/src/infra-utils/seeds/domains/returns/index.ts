import { eq } from "drizzle-orm";

import { returnOrderLines, returnOrders, returnReasonCodes } from "../../../../schema/index.js";
import { money } from "../../money.js";
import { SEED_IDS } from "../../seed-ids.js";
import { type SeedAuditScope, type Tx } from "../../seed-types.js";

export async function seedReturnsPhase8(tx: Tx, seedAuditScope: SeedAuditScope): Promise<void> {
  // ── Return Reason Codes ──────────────────────────────────────────────────
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
      {
        ...seedAuditScope,
        id: SEED_IDS.returnReasonDefective,
        code: "DEFECTIVE",
        name: "Defective product",
        requiresInspection: true,
        restockPolicy: "return_to_vendor",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.returnReasonWrongItem,
        code: "WRONG_ITEM",
        name: "Wrong item shipped",
        requiresInspection: true,
        restockPolicy: "restock",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.returnReasonUnwanted,
        code: "UNWANTED",
        name: "Customer changed mind",
        requiresInspection: false,
        restockPolicy: "restock",
        isActive: true,
      },
    ])
    .execute();

  // ── Return Orders (6 lifecycle variants) ────────────────────────────────
  const baseDate = new Date("2024-04-10T09:00:00Z");

  // 1. Draft return (pending approval)
  await tx
    .insert(returnOrders)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.returnOrderDraft,
        name: "RMA-2024-0001",
        sourceOrderId: SEED_IDS.orderOne,
        partnerId: SEED_IDS.partnerAccentCorp,
        status: "draft",
        reasonCodeId: SEED_IDS.returnReasonDamaged,
        approvedBy: null,
        approvedDate: null,
        notes: "Draft return awaiting manager approval.",
      },
    ])
    .execute();

  await tx
    .insert(returnOrderLines)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.returnOrderLineDraft1,
        returnOrderId: SEED_IDS.returnOrderDraft,
        sourceLineId: SEED_IDS.lineOne,
        productId: SEED_IDS.productMonitor,
        quantity: "1.0000",
        condition: "used",
        unitPrice: "589.99",
        creditAmount: money(1 * 589.99),
        notes: "Reported damaged during unboxing.",
      },
    ])
    .execute();

  // 2. Approved return (awaiting physical receipt)
  await tx
    .insert(returnOrders)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.returnOrderApproved,
        name: "RMA-2024-0002",
        sourceOrderId: SEED_IDS.orderTwo,
        partnerId: SEED_IDS.partnerBetaTech,
        status: "approved",
        reasonCodeId: SEED_IDS.returnReasonDefective,
        approvedBy: seedAuditScope.createdBy,
        approvedDate: new Date(baseDate.getTime() + 1 * 60 * 60 * 1000), // +1 hour
        notes: "Approved - RMA label sent to customer.",
      },
    ])
    .execute();

  await tx
    .insert(returnOrderLines)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.returnOrderLineApproved1,
        returnOrderId: SEED_IDS.returnOrderApproved,
        sourceLineId: SEED_IDS.lineTwo,
        productId: SEED_IDS.productMouse,
        quantity: "2.0000",
        condition: "used",
        unitPrice: "79.99",
        creditAmount: money(2 * 79.99),
        notes: "Left/right click not working on both units.",
      },
    ])
    .execute();

  // 3. Received return (physical items received, awaiting QA inspection)
  await tx
    .insert(returnOrders)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.returnOrderReceived,
        name: "RMA-2024-0003",
        sourceOrderId: SEED_IDS.orderThree,
        partnerId: SEED_IDS.partnerGammaServices,
        status: "received",
        reasonCodeId: SEED_IDS.returnReasonWrongItem,
        approvedBy: seedAuditScope.createdBy,
        approvedDate: new Date(baseDate.getTime() + 2 * 60 * 60 * 1000), // +2 hours
        notes: "Items received at warehouse, pending QA inspection.",
      },
    ])
    .execute();

  await tx
    .insert(returnOrderLines)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.returnOrderLineReceived1,
        returnOrderId: SEED_IDS.returnOrderReceived,
        sourceLineId: SEED_IDS.lineThree,
        productId: SEED_IDS.productKeyboard,
        quantity: "1.0000",
        condition: "used",
        unitPrice: "129.99",
        creditAmount: money(1 * 129.99),
        notes: "Customer ordered QWERTY, received AZERTY by mistake.",
      },
    ])
    .execute();

  // 4. Inspected return (QA complete, ready for credit note)
  await tx
    .insert(returnOrders)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.returnOrderInspected,
        name: "RMA-2024-0004",
        sourceOrderId: SEED_IDS.orderOne,
        partnerId: SEED_IDS.partnerAccentCorp,
        status: "inspected",
        reasonCodeId: SEED_IDS.returnReasonUnwanted,
        approvedBy: seedAuditScope.createdBy,
        approvedDate: new Date(baseDate.getTime() + 3 * 60 * 60 * 1000), // +3 hours
        notes: "QA inspection complete - item condition updated.",
      },
    ])
    .execute();

  await tx
    .insert(returnOrderLines)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.returnOrderLineInspected1,
        returnOrderId: SEED_IDS.returnOrderInspected,
        sourceLineId: SEED_IDS.lineOne,
        productId: SEED_IDS.productMonitor,
        quantity: "1.0000",
        condition: "new", // Updated after inspection
        unitPrice: "589.99",
        creditAmount: money(1 * 589.99),
        notes: "Unopened package - full refund eligible.",
      },
    ])
    .execute();

  // 5. Credited return (credit note issued, lifecycle complete)
  await tx
    .insert(returnOrders)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.returnOrderCredited,
        name: "RMA-2024-0005",
        sourceOrderId: SEED_IDS.orderTwo,
        partnerId: SEED_IDS.partnerBetaTech,
        status: "credited",
        reasonCodeId: SEED_IDS.returnReasonDamaged,
        approvedBy: seedAuditScope.createdBy,
        approvedDate: new Date(baseDate.getTime() + 4 * 60 * 60 * 1000), // +4 hours
        notes: "Credit note CN-2024-0001 issued. Return complete.",
      },
    ])
    .execute();

  await tx
    .insert(returnOrderLines)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.returnOrderLineCredited1,
        returnOrderId: SEED_IDS.returnOrderCredited,
        sourceLineId: SEED_IDS.lineTwo,
        productId: SEED_IDS.productMouse,
        quantity: "1.0000",
        condition: "damaged",
        unitPrice: "79.99",
        creditAmount: money(1 * 79.99),
        notes: "Cracked casing - credited and scrapped.",
      },
    ])
    .execute();

  // 6. Cancelled return (customer withdrew request)
  await tx
    .insert(returnOrders)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.returnOrderCancelled,
        name: "RMA-2024-0006",
        sourceOrderId: SEED_IDS.orderThree,
        partnerId: SEED_IDS.partnerGammaServices,
        status: "cancelled",
        reasonCodeId: SEED_IDS.returnReasonUnwanted,
        approvedBy: null,
        approvedDate: null,
        notes: "Customer cancelled - found alternative solution.",
      },
    ])
    .execute();

  await tx
    .insert(returnOrderLines)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.returnOrderLineCancelled1,
        returnOrderId: SEED_IDS.returnOrderCancelled,
        sourceLineId: SEED_IDS.lineThree,
        productId: SEED_IDS.productKeyboard,
        quantity: "1.0000",
        condition: "used",
        unitPrice: "129.99",
        creditAmount: "0.00", // No credit for cancelled return
        notes: "Return cancelled before shipment.",
      },
    ])
    .execute();

  console.log("✓ Seeded Phase 8 return/RMA entities (6 lifecycle variants)");
}

export async function validateReturnsPhase8Invariants(tx: Tx): Promise<void> {
  // Validate approved return has approver
  const [approvedReturn] = await tx
    .select({
      id: returnOrders.id,
      status: returnOrders.status,
      approvedBy: returnOrders.approvedBy,
    })
    .from(returnOrders)
    .where(eq(returnOrders.id, SEED_IDS.returnOrderApproved));

  if (!approvedReturn) {
    throw new Error("Return order coverage mismatch: expected seeded approved return");
  }

  if (approvedReturn.status !== "approved" || !approvedReturn.approvedBy) {
    throw new Error(
      "Return order approval invariant: approved returns must have approvedBy set"
    );
  }

  // Validate draft return has no approver
  const [draftReturn] = await tx
    .select({
      id: returnOrders.id,
      status: returnOrders.status,
      approvedBy: returnOrders.approvedBy,
    })
    .from(returnOrders)
    .where(eq(returnOrders.id, SEED_IDS.returnOrderDraft));

  if (draftReturn && draftReturn.approvedBy !== null) {
    throw new Error(
      "Return order approval invariant: draft returns must not have approvedBy set"
    );
  }

  // Validate return line quantities and credit amounts
  const allReturnLines = await tx
    .select({
      quantity: returnOrderLines.quantity,
      creditAmount: returnOrderLines.creditAmount,
      returnOrderId: returnOrderLines.returnOrderId,
    })
    .from(returnOrderLines);

  if (allReturnLines.length < 6) {
    throw new Error(
      `Return line coverage mismatch: expected at least 6 lines, got ${allReturnLines.length}`
    );
  }

  for (const line of allReturnLines) {
    if (Number(line.quantity) <= 0) {
      throw new Error(
        `Return line quantity invariant: quantity must be positive (returnOrderId: ${line.returnOrderId})`
      );
    }

    if (Number(line.creditAmount) < 0) {
      throw new Error(
        `Return line credit invariant: creditAmount must be non-negative (returnOrderId: ${line.returnOrderId})`
      );
    }
  }

  // Validate credited return has positive credit
  const [creditedLine] = await tx
    .select({ creditAmount: returnOrderLines.creditAmount })
    .from(returnOrderLines)
    .where(eq(returnOrderLines.returnOrderId, SEED_IDS.returnOrderCredited));

  if (creditedLine && Number(creditedLine.creditAmount) <= 0) {
    throw new Error(
      "Return credit invariant: credited returns must have positive creditAmount"
    );
  }

  console.log("✓ Validated Phase 8 returns invariants (6 lifecycle states)");
}
