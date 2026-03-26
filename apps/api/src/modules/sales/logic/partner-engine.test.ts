/**
 * Partner Engine Logic Tests
 * ===========================
 *
 * Test coverage for partner management logic:
 * - Credit limit validation
 * - Address resolution (invoice, delivery)
 * - Credit utilization calculations
 */

import { describe, expect, it } from "vitest";
import {
  checkCreditLimit,
  getInvoiceAddress,
  getDeliveryAddress,
  canDeletePartner,
  calculateCreditUtilization,
  shouldIncreaseCreditLimit,
  NoAddressFoundError,
  type PartnerContext,
  type AddressContext,
} from "./partner-engine.js";

// ============================================================================
// Credit Limit Validation Tests
// ============================================================================

describe("checkCreditLimit", () => {
  it("approves order when credit limit is zero (unlimited)", () => {
    const context: PartnerContext = {
      partner: {
        id: "partner-123",
        creditLimit: "0.00",
        totalDue: "5000.00",
      },
    };

    const result = checkCreditLimit(context, "10000.00");

    expect(result.approved).toBe(true);
    expect(result.creditLimit).toBeNull();
    expect(result.availableCredit).toBeNull();
    expect(result.message).toContain("Unlimited credit");
  });

  it("approves order when credit limit is string zero (unlimited)", () => {
    const context: PartnerContext = {
      partner: {
        id: "partner-123",
        creditLimit: "0",
        totalDue: "5000.00",
      },
    };

    const result = checkCreditLimit(context, "10000.00");

    expect(result.approved).toBe(true);
    expect(result.creditLimit).toBeNull();
    expect(result.availableCredit).toBeNull();
  });

  it("approves order within available credit", () => {
    const context: PartnerContext = {
      partner: {
        id: "partner-123",
        creditLimit: "10000.00",
        totalDue: "7000.00",
      },
    };

    const result = checkCreditLimit(context, "2500.00");

    expect(result.approved).toBe(true);
    expect(result.creditLimit?.toString()).toBe("10000");
    expect(result.totalDue.toString()).toBe("7000");
    expect(result.orderTotal.toString()).toBe("2500");
    expect(result.availableCredit?.toString()).toBe("3000");
    expect(result.message).toContain("approved");
  });

  it("rejects order exceeding available credit", () => {
    const context: PartnerContext = {
      partner: {
        id: "partner-123",
        creditLimit: "10000.00",
        totalDue: "7500.00",
      },
    };

    const result = checkCreditLimit(context, "3000.00");

    expect(result.approved).toBe(false);
    expect(result.availableCredit?.toString()).toBe("2500");
    expect(result.orderTotal.toString()).toBe("3000");
    expect(result.message).toContain("exceeds available credit");
    expect(result.message).toContain("2500");
  });

  it("approves order exactly at credit limit", () => {
    const context: PartnerContext = {
      partner: {
        id: "partner-123",
        creditLimit: "10000.00",
        totalDue: "7000.00",
      },
    };

    const result = checkCreditLimit(context, "3000.00");

    expect(result.approved).toBe(true);
    expect(result.availableCredit?.toString()).toBe("3000");
  });

  it("handles zero total due", () => {
    const context: PartnerContext = {
      partner: {
        id: "partner-123",
        creditLimit: "10000.00",
        totalDue: "0",
      },
    };

    const result = checkCreditLimit(context, "5000.00");

    expect(result.approved).toBe(true);
    expect(result.totalDue.toString()).toBe("0");
    expect(result.availableCredit?.toString()).toBe("10000");
  });

  it("handles decimal amounts with precision", () => {
    const context: PartnerContext = {
      partner: {
        id: "partner-123",
        creditLimit: "1000.50",
        totalDue: "500.25",
      },
    };

    const result = checkCreditLimit(context, "499.99");

    expect(result.approved).toBe(true);
    expect(result.availableCredit?.toString()).toBe("500.25");
  });
});

// ============================================================================
// Invoice Address Resolution Tests
// ============================================================================

describe("getInvoiceAddress", () => {
  it("returns default invoice address when available", () => {
    const context: AddressContext = {
      partnerId: "partner-123",
      addresses: [
        {
          id: "addr-1",
          type: "invoice",
          isDefault: false,
          street: "123 Main St",
          city: "NYC",
          zip: "10001",
        },
        {
          id: "addr-2",
          type: "invoice",
          isDefault: true,
          street: "456 Wall St",
          city: "NYC",
          zip: "10005",
        },
        {
          id: "addr-3",
          type: "delivery",
          isDefault: true,
          street: "789 Park Ave",
          city: "NYC",
          zip: "10021",
        },
      ],
    };

    const result = getInvoiceAddress(context);

    expect(result.id).toBe("addr-2");
    expect(result.type).toBe("invoice");
    expect(result.isDefault).toBe(true);
    expect(result.street).toBe("456 Wall St");
  });

  it("returns first invoice address when no default", () => {
    const context: AddressContext = {
      partnerId: "partner-123",
      addresses: [
        {
          id: "addr-1",
          type: "invoice",
          isDefault: false,
          street: "123 Main St",
          city: "NYC",
          zip: "10001",
        },
        {
          id: "addr-2",
          type: "invoice",
          isDefault: false,
          street: "456 Wall St",
          city: "NYC",
          zip: "10005",
        },
        {
          id: "addr-3",
          type: "delivery",
          isDefault: true,
          street: "789 Park Ave",
          city: "NYC",
          zip: "10021",
        },
      ],
    };

    const result = getInvoiceAddress(context);

    expect(result.id).toBe("addr-1");
    expect(result.type).toBe("invoice");
  });

  it("throws error when no invoice address exists", () => {
    const context: AddressContext = {
      partnerId: "partner-123",
      addresses: [
        {
          id: "addr-1",
          type: "delivery",
          isDefault: true,
          street: "789 Park Ave",
          city: "NYC",
          zip: "10021",
        },
        {
          id: "addr-2",
          type: "contact",
          isDefault: false,
          street: "321 5th Ave",
          city: "NYC",
          zip: "10016",
        },
      ],
    };

    expect(() => getInvoiceAddress(context)).toThrow(NoAddressFoundError);
    expect(() => getInvoiceAddress(context)).toThrow("No invoice address found");
  });

  it("throws error when addresses array is empty", () => {
    const context: AddressContext = {
      partnerId: "partner-123",
      addresses: [],
    };

    expect(() => getInvoiceAddress(context)).toThrow(NoAddressFoundError);
  });
});

// ============================================================================
// Delivery Address Resolution Tests
// ============================================================================

describe("getDeliveryAddress", () => {
  it("returns default delivery address when available", () => {
    const context: AddressContext = {
      partnerId: "partner-123",
      addresses: [
        {
          id: "addr-1",
          type: "invoice",
          isDefault: true,
          street: "123 Main St",
          city: "NYC",
          zip: "10001",
        },
        {
          id: "addr-2",
          type: "delivery",
          isDefault: false,
          street: "456 Wall St",
          city: "NYC",
          zip: "10005",
        },
        {
          id: "addr-3",
          type: "delivery",
          isDefault: true,
          street: "789 Park Ave",
          city: "NYC",
          zip: "10021",
        },
      ],
    };

    const result = getDeliveryAddress(context);

    expect(result.id).toBe("addr-3");
    expect(result.type).toBe("delivery");
    expect(result.isDefault).toBe(true);
  });

  it("returns first delivery address when no default", () => {
    const context: AddressContext = {
      partnerId: "partner-123",
      addresses: [
        {
          id: "addr-1",
          type: "invoice",
          isDefault: true,
          street: "123 Main St",
          city: "NYC",
          zip: "10001",
        },
        {
          id: "addr-2",
          type: "delivery",
          isDefault: false,
          street: "456 Wall St",
          city: "NYC",
          zip: "10005",
        },
        {
          id: "addr-3",
          type: "delivery",
          isDefault: false,
          street: "789 Park Ave",
          city: "NYC",
          zip: "10021",
        },
      ],
    };

    const result = getDeliveryAddress(context);

    expect(result.id).toBe("addr-2");
    expect(result.type).toBe("delivery");
  });

  it("falls back to invoice address when no delivery address", () => {
    const context: AddressContext = {
      partnerId: "partner-123",
      addresses: [
        {
          id: "addr-1",
          type: "invoice",
          isDefault: false,
          street: "123 Main St",
          city: "NYC",
          zip: "10001",
        },
        {
          id: "addr-2",
          type: "invoice",
          isDefault: true,
          street: "456 Wall St",
          city: "NYC",
          zip: "10005",
        },
      ],
    };

    const result = getDeliveryAddress(context);

    expect(result.id).toBe("addr-2");
    expect(result.type).toBe("invoice");
    expect(result.isDefault).toBe(true);
  });

  it("falls back to first invoice address when no delivery and no default invoice", () => {
    const context: AddressContext = {
      partnerId: "partner-123",
      addresses: [
        {
          id: "addr-1",
          type: "invoice",
          isDefault: false,
          street: "123 Main St",
          city: "NYC",
          zip: "10001",
        },
        {
          id: "addr-2",
          type: "invoice",
          isDefault: false,
          street: "456 Wall St",
          city: "NYC",
          zip: "10005",
        },
      ],
    };

    const result = getDeliveryAddress(context);

    expect(result.id).toBe("addr-1");
    expect(result.type).toBe("invoice");
  });

  it("falls back to contact address when no invoice or delivery", () => {
    const context: AddressContext = {
      partnerId: "partner-123",
      addresses: [
        {
          id: "addr-1",
          type: "contact",
          isDefault: false,
          street: "321 5th Ave",
          city: "NYC",
          zip: "10016",
        },
        {
          id: "addr-2",
          type: "contact",
          isDefault: true,
          street: "654 Broadway",
          city: "NYC",
          zip: "10012",
        },
      ],
    };

    const result = getDeliveryAddress(context);

    expect(result.id).toBe("addr-2");
    expect(result.type).toBe("contact");
  });

  it("throws error when no addresses exist", () => {
    const context: AddressContext = {
      partnerId: "partner-123",
      addresses: [],
    };

    expect(() => getDeliveryAddress(context)).toThrow(NoAddressFoundError);
    expect(() => getDeliveryAddress(context)).toThrow("No delivery address found");
  });
});

// ============================================================================
// Helper Functions Tests
// ============================================================================

describe("canDeletePartner", () => {
  it("allows deletion when total due is zero", () => {
    const result = canDeletePartner({ totalDue: "0" });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("prevents deletion when partner has outstanding balance", () => {
    const result = canDeletePartner({ totalDue: "1500.50" });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("outstanding balance");
    expect(result.reason).toContain("1500.50");
  });
});

describe("calculateCreditUtilization", () => {
  it("returns null for unlimited credit (zero limit)", () => {
    const result = calculateCreditUtilization({
      creditLimit: "0",
      totalDue: "5000.00",
    });

    expect(result).toBeNull();
  });

  it("returns null for unlimited credit (zero limit)", () => {
    const result = calculateCreditUtilization({
      creditLimit: "0",
      totalDue: "5000.00",
    });

    expect(result).toBeNull();
  });

  it("calculates utilization percentage correctly", () => {
    const result = calculateCreditUtilization({
      creditLimit: "10000.00",
      totalDue: "7500.00",
    });

    expect(result?.toString()).toBe("75");
  });

  it("returns 0% utilization when no debt", () => {
    const result = calculateCreditUtilization({
      creditLimit: "10000.00",
      totalDue: "0",
    });

    expect(result?.toString()).toBe("0");
  });

  it("returns 100% utilization when fully utilized", () => {
    const result = calculateCreditUtilization({
      creditLimit: "10000.00",
      totalDue: "10000.00",
    });

    expect(result?.toString()).toBe("100");
  });

  it("handles decimal precision in utilization", () => {
    const result = calculateCreditUtilization({
      creditLimit: "1000.00",
      totalDue: "333.33",
    });

    expect(result?.toFixed(2)).toBe("33.33");
  });
});

describe("shouldIncreaseCreditLimit", () => {
  it("returns false for unlimited credit", () => {
    const result = shouldIncreaseCreditLimit({
      creditLimit: "0",
      totalDue: "50000.00",
    });

    expect(result).toBe(false);
  });

  it("returns true when utilization is 80% or more", () => {
    const result = shouldIncreaseCreditLimit({
      creditLimit: "10000.00",
      totalDue: "8000.00",
    });

    expect(result).toBe(true);
  });

  it("returns true when utilization exceeds 80%", () => {
    const result = shouldIncreaseCreditLimit({
      creditLimit: "10000.00",
      totalDue: "9500.00",
    });

    expect(result).toBe(true);
  });

  it("returns false when utilization is below 80%", () => {
    const result = shouldIncreaseCreditLimit({
      creditLimit: "10000.00",
      totalDue: "7000.00",
    });

    expect(result).toBe(false);
  });

  it("returns false when utilization is 0%", () => {
    const result = shouldIncreaseCreditLimit({
      creditLimit: "10000.00",
      totalDue: "0",
    });

    expect(result).toBe(false);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Partner Engine Integration", () => {
  it("credit check + address resolution workflow", () => {
    // Credit check
    const creditContext: PartnerContext = {
      partner: {
        id: "partner-123",
        creditLimit: "50000.00",
        totalDue: "35000.00",
      },
    };

    const creditResult = checkCreditLimit(creditContext, "10000.00");
    expect(creditResult.approved).toBe(true);

    // Address resolution
    const addressContext: AddressContext = {
      partnerId: "partner-123",
      addresses: [
        {
          id: "addr-1",
          type: "invoice",
          isDefault: true,
          street: "123 Main St",
          city: "NYC",
          zip: "10001",
        },
        {
          id: "addr-2",
          type: "delivery",
          isDefault: true,
          street: "456 Warehouse Rd",
          city: "Newark",
          zip: "07102",
        },
      ],
    };

    const invoiceAddr = getInvoiceAddress(addressContext);
    const deliveryAddr = getDeliveryAddress(addressContext);

    expect(invoiceAddr.id).toBe("addr-1");
    expect(deliveryAddr.id).toBe("addr-2");
  });

  it("handles partner with high credit utilization", () => {
    const partner = {
      id: "partner-456",
      creditLimit: "100000.00",
      totalDue: "85000.00",
    };

    const utilization = calculateCreditUtilization(partner);
    expect(utilization?.toString()).toBe("85");

    const shouldIncrease = shouldIncreaseCreditLimit(partner);
    expect(shouldIncrease).toBe(true);

    const creditResult = checkCreditLimit({ partner }, "20000.00");
    expect(creditResult.approved).toBe(false); // 85k + 20k > 100k limit
  });
});
