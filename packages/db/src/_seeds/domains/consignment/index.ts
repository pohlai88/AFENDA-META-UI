import { eq } from "drizzle-orm";

import {
  consignmentAgreementLines,
  consignmentAgreements,
  consignmentStockReportLines,
  consignmentStockReports,
} from "../../../schema/index.js";
import { money } from "../../money.js";
import { SEED_IDS } from "../../seed-ids.js";
import { type SeedAuditScope, type Tx } from "../../seed-types.js";

export async function seedConsignmentPhase7(
  tx: Tx,
  seedAuditScope: SeedAuditScope
): Promise<void> {
  await tx
    .insert(consignmentAgreements)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.consignmentAgreementOne,
        name: "Consignment - Accent Corp",
        partnerId: SEED_IDS.partnerAccentCorp,
        startDate: new Date("2024-03-01T00:00:00Z"),
        endDate: new Date("2024-12-31T23:59:59Z"),
        status: "active",
        paymentTermId: SEED_IDS.paymentTermNet30,
        reviewPeriodDays: 30,
        notes: "Monthly reporting with invoice generated from sold units.",
      },
    ])
    .execute();

  await tx
    .insert(consignmentAgreementLines)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.consignmentAgreementLineOne,
        agreementId: SEED_IDS.consignmentAgreementOne,
        productId: SEED_IDS.productMonitor,
        maxQuantity: "50",
        unitPrice: "589.99",
        minReportPeriod: "monthly",
        isActive: true,
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.consignmentAgreementLineTwo,
        agreementId: SEED_IDS.consignmentAgreementOne,
        productId: SEED_IDS.productMouse,
        maxQuantity: "200",
        unitPrice: "27.50",
        minReportPeriod: "monthly",
        isActive: true,
      },
    ])
    .execute();

  await tx
    .insert(consignmentStockReports)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.consignmentStockReportOne,
        agreementId: SEED_IDS.consignmentAgreementOne,
        reportDate: new Date("2024-03-31T00:00:00Z"),
        status: "confirmed",
        submittedAt: new Date("2024-04-01T08:00:00Z"),
        confirmedAt: new Date("2024-04-02T09:30:00Z"),
        notes: "Month-end confirmed sales report.",
      },
    ])
    .execute();

  await tx
    .insert(consignmentStockReportLines)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.consignmentStockReportLineOne,
        reportId: SEED_IDS.consignmentStockReportOne,
        productId: SEED_IDS.productMonitor,
        openingQty: "10",
        receivedQty: "5",
        soldQty: "8",
        returnedQty: "1",
        closingQty: "6",
        unitPrice: "589.99",
        lineTotal: money(8 * 589.99),
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.consignmentStockReportLineTwo,
        reportId: SEED_IDS.consignmentStockReportOne,
        productId: SEED_IDS.productMouse,
        openingQty: "40",
        receivedQty: "20",
        soldQty: "35",
        returnedQty: "2",
        closingQty: "23",
        unitPrice: "27.50",
        lineTotal: money(35 * 27.5),
      },
    ])
    .execute();

  console.log("✓ Seeded Phase 7 consignment entities");
}

export async function validateConsignmentPhase7Invariants(tx: Tx): Promise<void> {
  const rows = await tx
    .select({
      reportId: consignmentStockReportLines.reportId,
      openingQty: consignmentStockReportLines.openingQty,
      receivedQty: consignmentStockReportLines.receivedQty,
      soldQty: consignmentStockReportLines.soldQty,
      returnedQty: consignmentStockReportLines.returnedQty,
      closingQty: consignmentStockReportLines.closingQty,
    })
    .from(consignmentStockReportLines)
    .where(eq(consignmentStockReportLines.reportId, SEED_IDS.consignmentStockReportOne));

  if (rows.length < 2) {
    throw new Error(
      `Consignment report coverage mismatch: expected at least 2 lines, got ${rows.length}`
    );
  }

  for (const row of rows) {
    const opening = Number(row.openingQty);
    const received = Number(row.receivedQty);
    const sold = Number(row.soldQty);
    const returned = Number(row.returnedQty);
    const closing = Number(row.closingQty);
    const expected = opening + received - sold - returned;
    if (Math.abs(expected - closing) > 0.0001) {
      throw new Error(
        `Consignment stock mismatch for report ${row.reportId}: expected ${expected.toFixed(4)}, got ${closing.toFixed(4)}`
      );
    }
  }

  console.log("✓ Verified Phase 7 consignment invariants");
}
