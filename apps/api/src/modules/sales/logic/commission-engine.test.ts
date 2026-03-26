import { describe, expect, it } from "vitest";

import {
  CommissionEngineError,
  approveCommissionEntry,
  buildCommissionEntryDraft,
  calculateCommission,
  markCommissionEntryPaid,
  summarizeCommissionEntries,
} from "./commission-engine.js";

const activePlan = {
  id: "plan-standard",
  tenantId: 7,
  type: "percentage",
  base: "revenue",
  isActive: true,
} as const;

const baseTier = {
  id: "tier-standard",
  planId: activePlan.id,
  minAmount: "0.00",
  maxAmount: "10000.00",
  rate: "7.5000",
  sequence: 10,
} as const;

describe("sales commission engine", () => {
  it("calculates percentage commission from the matching tier", () => {
    const result = calculateCommission({
      plan: activePlan,
      tiers: [baseTier],
      metrics: { revenue: "2000.00" },
    });

    expect(result.base).toBe("revenue");
    expect(result.baseAmount).toBe("2000.00");
    expect(result.commissionAmount).toBe("150.00");
    expect(result.effectiveRate).toBe("7.5000");
    expect(result.matchedTierIds).toEqual([baseTier.id]);
  });

  it("calculates tiered commission progressively across tiers", () => {
    const result = calculateCommission({
      plan: {
        ...activePlan,
        type: "tiered",
      },
      tiers: [
        {
          id: "tier-1",
          planId: activePlan.id,
          minAmount: "0.00",
          maxAmount: "1000.00",
          rate: "5.0000",
          sequence: 10,
        },
        {
          id: "tier-2",
          planId: activePlan.id,
          minAmount: "1000.00",
          maxAmount: "5000.00",
          rate: "10.0000",
          sequence: 20,
        },
      ],
      metrics: { revenue: "3500.00" },
    });

    expect(result.commissionAmount).toBe("300.00");
    expect(result.effectiveRate).toBe("8.5714");
    expect(result.breakdown).toEqual([
      {
        tierId: "tier-1",
        minAmount: "0.00",
        maxAmount: "1000.00",
        rate: "5.0000",
        matchedBaseAmount: "1000.00",
        commissionAmount: "50.00",
      },
      {
        tierId: "tier-2",
        minAmount: "1000.00",
        maxAmount: "5000.00",
        rate: "10.0000",
        matchedBaseAmount: "2500.00",
        commissionAmount: "250.00",
      },
    ]);
  });

  it("treats flat commissions as fixed payouts from the matched tier", () => {
    const result = calculateCommission({
      plan: {
        ...activePlan,
        type: "flat",
      },
      tiers: [
        {
          ...baseTier,
          rate: "125.00",
        },
      ],
      metrics: { revenue: "5000.00" },
    });

    expect(result.commissionAmount).toBe("125.00");
    expect(result.effectiveRate).toBe("2.5000");
  });

  it("builds a draft commission entry from the calculation result", () => {
    const draft = buildCommissionEntryDraft({
      tenantId: 7,
      orderId: "order-1",
      salespersonId: 42,
      periodStart: new Date("2025-01-01T00:00:00.000Z"),
      periodEnd: new Date("2025-01-31T23:59:59.000Z"),
      plan: activePlan,
      tiers: [baseTier],
      metrics: { revenue: "1200.00" },
      notes: "January run",
    });

    expect(draft).toMatchObject({
      tenantId: 7,
      orderId: "order-1",
      salespersonId: 42,
      createdBy: 42,
      updatedBy: 42,
      planId: activePlan.id,
      baseAmount: "1200.00",
      commissionAmount: "90.00",
      status: "draft",
      paidDate: null,
      notes: "January run",
    });
  });

  it("approves entries and marks them as paid", () => {
    const approved = approveCommissionEntry({
      status: "draft",
      paidDate: null,
      reference: "draft-1",
    });
    const paidAt = new Date("2025-02-10T10:00:00.000Z");
    const paid = markCommissionEntryPaid(approved, paidAt);

    expect(approved).toEqual({
      status: "approved",
      paidDate: null,
      reference: "draft-1",
    });
    expect(paid).toEqual({
      status: "paid",
      paidDate: paidAt,
      reference: "draft-1",
    });
  });

  it("summarizes commission entries by status", () => {
    const summary = summarizeCommissionEntries([
      { status: "draft", baseAmount: "1000.00", commissionAmount: "75.00" },
      { status: "approved", baseAmount: "1500.00", commissionAmount: "112.50" },
      { status: "paid", baseAmount: "2000.00", commissionAmount: "150.00" },
      { status: "paid", baseAmount: "500.00", commissionAmount: "37.50" },
    ]);

    expect(summary).toEqual({
      count: 4,
      baseAmountTotal: "5000.00",
      commissionAmountTotal: "375.00",
      byStatus: {
        draft: { count: 1, commissionAmountTotal: "75.00" },
        approved: { count: 1, commissionAmountTotal: "112.50" },
        paid: { count: 2, commissionAmountTotal: "187.50" },
      },
    });
  });

  it("rejects inactive plans and missing metrics", () => {
    expect(() =>
      calculateCommission({
        plan: {
          ...activePlan,
          isActive: false,
        },
        tiers: [baseTier],
        metrics: { revenue: "1000.00" },
      })
    ).toThrow("Commission plan is inactive.");

    expect(() =>
      calculateCommission({
        plan: {
          ...activePlan,
          base: "profit",
        },
        tiers: [baseTier],
        metrics: { revenue: "1000.00" },
      })
    ).toThrow("Missing profit metric for commission calculation.");
  });

  it("guards invalid commission entry transitions", () => {
    expect(() =>
      markCommissionEntryPaid({
        status: "draft",
        paidDate: null,
      })
    ).toThrow(CommissionEngineError);

    expect(() =>
      approveCommissionEntry({
        status: "paid",
        paidDate: new Date("2025-02-10T10:00:00.000Z"),
      })
    ).toThrow("Paid commission entries cannot be moved back to approved.");
  });
});
