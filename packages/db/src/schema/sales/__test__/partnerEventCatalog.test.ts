import { describe, expect, it } from "vitest";

import {
  parsePartnerEventMetadata,
  validatePartnerEventInvariants,
} from "../partnerEventCatalog.js";

const baseRow = {
  eventSchemaVersion: 1,
  truthBindingId: null as string | null,
  refId: null as string | null,
  amount: null as string | null,
  currencyId: null as number | null,
  metadata: {} as Record<string, unknown> | null,
};

describe("parsePartnerEventMetadata", () => {
  it("accepts empty metadata for partner_created", () => {
    const r = parsePartnerEventMetadata("partner_created", {});
    expect(r.ok).toBe(true);
  });

  it("rejects unknown keys for partner_created", () => {
    const r = parsePartnerEventMetadata("partner_created", { extra: 1 });
    expect(r.ok).toBe(false);
  });
});

describe("validatePartnerEventInvariants", () => {
  it("requires truthBindingId for invoice_posted", () => {
    const r = validatePartnerEventInvariants({
      ...baseRow,
      eventType: "invoice_posted",
      accountingImpact: "increase_receivable",
      refId: "550e8400-e29b-41d4-a716-446655440000",
      amount: "100.00",
      currencyId: 1,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues.some((i) => i.code === "truth_binding_required")).toBe(true);
    }
  });

  it("passes invoice_posted with truth, ref, and money", () => {
    const r = validatePartnerEventInvariants({
      ...baseRow,
      eventType: "invoice_posted",
      accountingImpact: "increase_receivable",
      truthBindingId: "550e8400-e29b-41d4-a716-446655440001",
      refId: "550e8400-e29b-41d4-a716-446655440000",
      amount: "100.00",
      currencyId: 1,
      metadata: {},
    });
    expect(r.ok).toBe(true);
  });

  it("allows flexible accountingImpact for reconciliation_adjustment", () => {
    const r = validatePartnerEventInvariants({
      ...baseRow,
      eventType: "reconciliation_adjustment",
      accountingImpact: "decrease_receivable",
      refId: "550e8400-e29b-41d4-a716-446655440002",
      amount: "10.00",
      currencyId: 1,
      metadata: { reason: "farm ledger tie-out" },
    });
    expect(r.ok).toBe(true);
  });
});
