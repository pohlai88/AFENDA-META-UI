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
  // ── Agreement 1: Active with Confirmed Report ───────────────────────────
  await tx
    .insert(consignmentAgreements)
    .values([
      {
        ...seedAuditScope,
        id: SEED_IDS.consignmentAgreementOne,
        name: "Consignment - Accent Corp",
        partnerId: SEED_IDS.partnerAccentCorp,
        startDate: new Date("2024-03-01T00:00:00Z"),
        // Future end date so chk_sales_consignment_agreements_active_end_not_in_past passes when seed runs.
        endDate: new Date("2027-12-31T23:59:59.999Z"),
        status: "active",
        paymentTermId: SEED_IDS.paymentTermNet30,
        reviewPeriodDays: 30,
        notes: "Monthly reporting with invoice generated from sold units.",
      },
      // ── Agreement 2: Draft (Not Yet Activated) ─────────────────────────
      {
        ...seedAuditScope,
        id: SEED_IDS.consignmentAgreementDraft,
        name: "Consignment - Beta Tech (Draft)",
        partnerId: SEED_IDS.partnerBetaTech,
        startDate: new Date("2024-05-01T00:00:00Z"),
        endDate: new Date("2024-12-31T23:59:59Z"),
        status: "draft",
        paymentTermId: SEED_IDS.paymentTermNet30,
        reviewPeriodDays: 30,
        notes: "Agreement under review, not yet active.",
      },
      // ── Agreement 3: Expired ───────────────────────────────────────────
      {
        ...seedAuditScope,
        id: SEED_IDS.consignmentAgreementExpired,
        name: "Consignment - Gamma Services (Expired)",
        partnerId: SEED_IDS.partnerGammaServices,
        startDate: new Date("2023-01-01T00:00:00Z"),
        endDate: new Date("2023-12-31T23:59:59Z"),
        status: "expired",
        paymentTermId: SEED_IDS.paymentTermNet30,
        reviewPeriodDays: 30,
        notes: "Agreement expired at end of 2023.",
      },
      // ── Agreement 4: Terminated ────────────────────────────────────────
      {
        ...seedAuditScope,
        id: SEED_IDS.consignmentAgreementTerminated,
        name: "Consignment - Delta Inc (Terminated)",
        partnerId: SEED_IDS.partnerDeltaInc,
        startDate: new Date("2024-01-01T00:00:00Z"),
        endDate: new Date("2024-12-31T23:59:59Z"),
        status: "terminated",
        paymentTermId: SEED_IDS.paymentTermNet30,
        reviewPeriodDays: 30,
        notes: "Agreement terminated early due to business change.",
      },
    ])
    .execute();

  await tx
    .insert(consignmentAgreementLines)
    .values([
      // ── Lines for Agreement 1 (Active) ─────────────────────────────────
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
      // ── Lines for Agreement 2 (Draft) ──────────────────────────────────
      {
        ...seedAuditScope,
        id: SEED_IDS.consignmentAgreementLineDraft1,
        agreementId: SEED_IDS.consignmentAgreementDraft,
        productId: SEED_IDS.productLaptop,
        maxQuantity: "20",
        unitPrice: "1299.00",
        minReportPeriod: "monthly",
        isActive: true,
      },
      // ── Lines for Agreement 3 (Expired) ────────────────────────────────
      {
        ...seedAuditScope,
        id: SEED_IDS.consignmentAgreementLineExpired1,
        agreementId: SEED_IDS.consignmentAgreementExpired,
        productId: SEED_IDS.productKeyboard,
        maxQuantity: "100",
        unitPrice: "79.99",
        minReportPeriod: "monthly",
        isActive: false,
      },
      // ── Lines for Agreement 4 (Terminated) ─────────────────────────────
      {
        ...seedAuditScope,
        id: SEED_IDS.consignmentAgreementLineTerminated1,
        agreementId: SEED_IDS.consignmentAgreementTerminated,
        productId: SEED_IDS.productDesktop,
        maxQuantity: "15",
        unitPrice: "1499.00",
        minReportPeriod: "monthly",
        isActive: false,
      },
    ])
    .execute();

  await tx
    .insert(consignmentStockReports)
    .values([
      // ── Report 1: Confirmed (for Agreement 1) ──────────────────────────
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
      // ── Report 2: Draft (for Agreement 1) ──────────────────────────────
      {
        ...seedAuditScope,
        id: SEED_IDS.consignmentStockReportDraft,
        agreementId: SEED_IDS.consignmentAgreementOne,
        reportDate: new Date("2024-04-30T00:00:00Z"),
        status: "draft",
        submittedAt: null,
        confirmedAt: null,
        notes: "Draft report pending final reconciliation.",
      },
      // ── Report 3: Invoiced (for Agreement 1) ───────────────────────────
      {
        ...seedAuditScope,
        id: SEED_IDS.consignmentStockReportInvoiced,
        agreementId: SEED_IDS.consignmentAgreementOne,
        reportDate: new Date("2024-02-29T00:00:00Z"),
        status: "invoiced",
        submittedAt: new Date("2024-03-01T08:00:00Z"),
        confirmedAt: new Date("2024-03-02T09:00:00Z"),
        invoicedAt: new Date("2024-03-03T14:00:00Z"),
        notes: "Fully processed and invoiced.",
      },
    ])
    .execute();

  await tx
    .insert(consignmentStockReportLines)
    .values([
      // ── Lines for Report 1 (Confirmed) ─────────────────────────────────
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
      // ── Lines for Report 2 (Draft) ─────────────────────────────────────
      {
        ...seedAuditScope,
        id: SEED_IDS.consignmentStockReportLineDraft1,
        reportId: SEED_IDS.consignmentStockReportDraft,
        productId: SEED_IDS.productMonitor,
        openingQty: "6",
        receivedQty: "10",
        soldQty: "7",
        returnedQty: "0",
        closingQty: "9",
        unitPrice: "589.99",
        lineTotal: money(7 * 589.99),
      },
      // ── Lines for Report 3 (Invoiced) ──────────────────────────────────
      {
        ...seedAuditScope,
        id: SEED_IDS.consignmentStockReportLineInvoiced1,
        reportId: SEED_IDS.consignmentStockReportInvoiced,
        productId: SEED_IDS.productMonitor,
        openingQty: "15",
        receivedQty: "0",
        soldQty: "5",
        returnedQty: "0",
        closingQty: "10",
        unitPrice: "589.99",
        lineTotal: money(5 * 589.99),
      },
      {
        ...seedAuditScope,
        id: SEED_IDS.consignmentStockReportLineInvoiced2,
        reportId: SEED_IDS.consignmentStockReportInvoiced,
        productId: SEED_IDS.productMouse,
        openingQty: "50",
        receivedQty: "10",
        soldQty: "20",
        returnedQty: "0",
        closingQty: "40",
        unitPrice: "27.50",
        lineTotal: money(20 * 27.5),
      },
    ])
    .execute();

  console.log("✓ Seeded Phase 7 consignment entities (6 lifecycle variants)");
}

export async function validateConsignmentPhase7Invariants(tx: Tx): Promise<void> {
  // Validate all stock report lines have correct balance equation
  const reportIds = [
    SEED_IDS.consignmentStockReportOne,
    SEED_IDS.consignmentStockReportDraft,
    SEED_IDS.consignmentStockReportInvoiced,
  ];

  for (const reportId of reportIds) {
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
      .where(eq(consignmentStockReportLines.reportId, reportId));

    if (rows.length === 0) {
      throw new Error(
        `Consignment report ${reportId} missing lines`
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
  }

  console.log("✓ Verified Phase 7 consignment invariants (4 agreements, 3 reports, 6 lines)");
}
