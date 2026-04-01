import { describe, expect, it } from "vitest";

import {
  calculateCommission,
  CommissionEngineError,
  projectCommissionLiabilitiesFromPaymentTerm,
} from "../engine.js";

const planBase = {
  id: "00000000-0000-4000-8000-000000000001",
  tenantId: 1,
  type: "tiered" as const,
  base: "revenue" as const,
  isActive: true,
};

const tiers = [
  {
    id: "00000000-0000-4000-8000-000000000011",
    planId: planBase.id,
    minAmount: "0.00",
    maxAmount: "1000.00",
    rate: "5.0000",
    sequence: 10,
  },
  {
    id: "00000000-0000-4000-8000-000000000012",
    planId: planBase.id,
    minAmount: "1000.00",
    maxAmount: null,
    rate: "10.0000",
    sequence: 20,
  },
];

describe("calculateCommission tiered modes", () => {
  it("tiered_cumulative applies marginal brackets", () => {
    const r = calculateCommission({
      plan: { ...planBase, calculationMode: "tiered_cumulative" },
      tiers,
      metrics: { revenue: "1500.00" },
    });
    expect(r.commissionAmount).toBe("100.00");
    expect(r.breakdown).toHaveLength(2);
  });

  it("tiered_step applies one bracket rate to full base", () => {
    const r = calculateCommission({
      plan: { ...planBase, calculationMode: "tiered_step" },
      tiers,
      metrics: { revenue: "1500.00" },
    });
    expect(r.commissionAmount).toBe("150.00");
    expect(r.matchedTierIds).toEqual([tiers[1]!.id]);
  });

  it("percentage plan ignores calculationMode", () => {
    const r = calculateCommission({
      plan: {
        ...planBase,
        type: "percentage",
        calculationMode: "tiered_step",
      },
      tiers: [tiers[0]!],
      metrics: { revenue: "500.00" },
    });
    expect(r.commissionAmount).toBe("25.00");
  });
});

describe("projectCommissionLiabilitiesFromPaymentTerm", () => {
  it("splits percent and balance lines", () => {
    const rows = projectCommissionLiabilitiesFromPaymentTerm({
      commissionAmount: "1000.00",
      recognitionIsoDate: "2026-03-31",
      lines: [
        { sequence: 10, valueType: "percent", value: "30", days: 0 },
        { sequence: 20, valueType: "balance", value: "0", days: 30 },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]!.amount).toBe("300.00");
    expect(rows[0]!.dueDate).toBe("2026-03-31");
    expect(rows[1]!.amount).toBe("700.00");
    expect(rows[1]!.dueDate).toBe("2026-04-30");
  });

  it("throws on negative commission", () => {
    expect(() =>
      projectCommissionLiabilitiesFromPaymentTerm({
        commissionAmount: "-1.00",
        recognitionIsoDate: "2026-03-31",
        lines: [],
      })
    ).toThrow(CommissionEngineError);
  });
});
