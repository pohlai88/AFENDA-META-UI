import { describe, expect, it } from "vitest";

import {
  assertSalesOrderTruthCommitAllowed,
  resolveAccountingPostingTruth,
  resolveSalesOrderDocumentTruth,
  TruthPipelineBlockedError,
} from "../documentTruthDecision.js";

const okCredit = {
  checkPassed: true,
  checkedAtIso: null as string | null,
  limitAtCheck: null as string | null,
};

const okInventory = { reservationSucceeded: true };

describe("resolveSalesOrderDocumentTruth", () => {
  it("allows commit when pricing ok, no approval depth, no blocking invariants", () => {
    const d = resolveSalesOrderDocumentTruth({
      orderStatus: "draft",
      pricelistId: "00000000-0000-4000-8000-000000000001",
      currencyId: 1,
      exchangeRatePairValid: true,
      approvals: [],
      policy: { requiredApprovalDepth: 0 },
      blockingInvariantFailures: [],
      credit: okCredit,
      inventory: okInventory,
    });
    expect(d.canCommitFinancialTruth).toBe(true);
    expect(d.reasons).toHaveLength(0);
  });

  it("blocks when approval depth not satisfied", () => {
    const d = resolveSalesOrderDocumentTruth({
      orderStatus: "draft",
      pricelistId: "00000000-0000-4000-8000-000000000001",
      currencyId: 1,
      exchangeRatePairValid: true,
      approvals: [{ level: 1, status: "pending" }],
      policy: { requiredApprovalDepth: 2 },
      blockingInvariantFailures: [],
      credit: okCredit,
      inventory: okInventory,
    });
    expect(d.canCommitFinancialTruth).toBe(false);
    expect(d.reasons.some((r) => r.startsWith("approvals_pending"))).toBe(true);
  });

  it("blocks approval sequence violation (level 2 acted before level 1)", () => {
    const d = resolveSalesOrderDocumentTruth({
      orderStatus: "draft",
      pricelistId: "00000000-0000-4000-8000-000000000001",
      currencyId: 1,
      exchangeRatePairValid: true,
      approvals: [
        { level: 1, status: "pending" },
        { level: 2, status: "approved" },
      ],
      policy: { requiredApprovalDepth: 2 },
      blockingInvariantFailures: [],
      credit: okCredit,
      inventory: okInventory,
    });
    expect(d.canCommitFinancialTruth).toBe(false);
    expect(d.reasons).toContain("approval_sequence_violation");
  });

  it("blocks on blocking invariant failures", () => {
    const d = resolveSalesOrderDocumentTruth({
      orderStatus: "draft",
      pricelistId: "00000000-0000-4000-8000-000000000001",
      currencyId: 1,
      exchangeRatePairValid: true,
      approvals: [],
      policy: { requiredApprovalDepth: 0 },
      blockingInvariantFailures: [{ invariantCode: "X" }],
      credit: okCredit,
      inventory: okInventory,
    });
    expect(d.canCommitFinancialTruth).toBe(false);
    expect(d.reasons.some((r) => r.includes("blocking_invariants"))).toBe(true);
  });

  it("blocks when requireCreditCheck and credit not passed", () => {
    const d = resolveSalesOrderDocumentTruth({
      orderStatus: "draft",
      pricelistId: "00000000-0000-4000-8000-000000000001",
      currencyId: 1,
      exchangeRatePairValid: true,
      approvals: [],
      policy: { requiredApprovalDepth: 0, requireCreditCheck: true },
      blockingInvariantFailures: [],
      credit: { checkPassed: false, checkedAtIso: null, limitAtCheck: null },
      inventory: okInventory,
    });
    expect(d.canCommitFinancialTruth).toBe(false);
    expect(d.reasons).toContain("credit_check_failed");
  });

  it("blocks when requireInventoryReservation and reservation not satisfied", () => {
    const d = resolveSalesOrderDocumentTruth({
      orderStatus: "draft",
      pricelistId: "00000000-0000-4000-8000-000000000001",
      currencyId: 1,
      exchangeRatePairValid: true,
      approvals: [],
      policy: { requiredApprovalDepth: 0, requireInventoryReservation: true },
      blockingInvariantFailures: [],
      credit: okCredit,
      inventory: { reservationSucceeded: false },
    });
    expect(d.canCommitFinancialTruth).toBe(false);
    expect(d.reasons).toContain("inventory_reservation_not_satisfied");
  });
});

describe("resolveAccountingPostingTruth", () => {
  it("requires truth binding and double entry for posted", () => {
    expect(
      resolveAccountingPostingTruth({
        postingStatus: "posted",
        truthBindingId: null,
        debitAccountCode: "4000",
        creditAccountCode: "5000",
      }).allowed
    ).toBe(false);

    expect(
      resolveAccountingPostingTruth({
        postingStatus: "posted",
        truthBindingId: "00000000-0000-4000-8000-000000000099",
        debitAccountCode: "4000",
        creditAccountCode: null,
      }).allowed
    ).toBe(false);
  });
});

describe("assertSalesOrderTruthCommitAllowed", () => {
  it("throws TruthPipelineBlockedError when blocked", () => {
    expect(() =>
      assertSalesOrderTruthCommitAllowed(
        resolveSalesOrderDocumentTruth({
          orderStatus: "cancel",
          pricelistId: "00000000-0000-4000-8000-000000000001",
          currencyId: 1,
          exchangeRatePairValid: true,
          approvals: [],
          policy: { requiredApprovalDepth: 0 },
          blockingInvariantFailures: [],
          credit: okCredit,
          inventory: okInventory,
        })
      )
    ).toThrow(TruthPipelineBlockedError);
  });
});
