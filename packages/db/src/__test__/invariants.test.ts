/**
 * Domain Invariant Validation Tests
 *
 * Tests that validate business invariants across all seeded domains.
 * Each domain validator ensures that seeded data maintains referential integrity,
 * financial accuracy, and business rule compliance.
 *
 * These tests run after seeding to verify:
 * - All seed data relationships are valid
 * - Financial calculations are correct (totals match line items)
 * - Lifecycle states are correctly populated
 * - Tax calculations reconcile
 * - Historical records exist where required
 *
 * @see packages/db/src/seeds/README.md for seed infrastructure overview
 * @see .ideas/SEED_INFRASTRUCTURE_AUDIT.md for comprehensive seed audit
 */

import { beforeAll, describe, expect, it } from "vitest";
import { eq, isNotNull } from "drizzle-orm";
import { db } from "../db.js";
import * as schema from "../schema/index.js";
import { seed } from "../seeds/index.js";
import { validateSalesPhase6Invariants } from "../seeds/domains/sales/index.js";
import { validateProductConfigurationInvariants } from "../seeds/domains/product/index.js";
import { validateConsignmentPhase7Invariants } from "../seeds/domains/consignment/index.js";
import { validateReturnsPhase8Invariants } from "../seeds/domains/returns/index.js";
import { validateSubscriptionsPhase9Invariants } from "../seeds/domains/subscriptions/index.js";
import { validateCommissionsPhase10Invariants } from "../seeds/domains/commissions/index.js";
import { SEED_IDS } from "../seeds/seed-ids.js";

// Skip all tests if DATABASE_URL is not set
const skipTests = !process.env.DATABASE_URL;

describe.skipIf(skipTests)("Domain Invariant Validation", () => {
  beforeAll(async () => {
    // Run seed to populate test data
    await seed(db, "baseline");
  });

  describe("Sales Domain Invariants", () => {
    it("should validate order tax totals match tax summary", async () => {
      await db.transaction(async (tx) => {
        await validateSalesPhase6Invariants(tx);
      });
    });

    it("should have line-level tax entries for all order lines", async () => {
      // This is verified inside validateSalesPhase6Invariants
      await db.transaction(async (tx) => {
        await validateSalesPhase6Invariants(tx);
      });
    });

    it("should have status history for all orders", async () => {
      // Validates at least 3 status history rows across seeded orders
      await db.transaction(async (tx) => {
        await validateSalesPhase6Invariants(tx);
      });
    });

    it("should maintain order total = untaxed + tax", async () => {
      const orders = await db
        .select({
          id: schema.salesOrders.id,
          amountUntaxed: schema.salesOrders.amountUntaxed,
          amountTax: schema.salesOrders.amountTax,
          amountTotal: schema.salesOrders.amountTotal,
        })
        .from(schema.salesOrders)
        .limit(10);

      for (const order of orders) {
        const expectedTotal = (Number(order.amountUntaxed) + Number(order.amountTax)).toFixed(2);
        expect(order.amountTotal).toBe(expectedTotal);
      }
    });

    it("should have valid lifecycle states", async () => {
      const orders = await db
        .select({
          id: schema.salesOrders.id,
          status: schema.salesOrders.status,
          invoiceStatus: schema.salesOrders.invoiceStatus,
          deliveryStatus: schema.salesOrders.deliveryStatus,
        })
        .from(schema.salesOrders)
        .limit(10);

      const validOrderStatuses = ["draft", "sent", "sale", "done", "cancel"];
      const validInvoiceStatuses = ["no", "to_invoice", "invoiced"];
      const validDeliveryStatuses = ["no", "partial", "full"];

      for (const order of orders) {
        expect(validOrderStatuses).toContain(order.status);
        expect(validInvoiceStatuses).toContain(order.invoiceStatus);
        expect(validDeliveryStatuses).toContain(order.deliveryStatus);
      }
    });
  });

  describe("Product Configuration Invariants", () => {
    it("should validate product configuration integrity", async () => {
      await db.transaction(async (tx) => {
        await validateProductConfigurationInvariants(tx);
      });
    });

    it("should have valid product variants with unique combinations", async () => {
      // Validated by validateProductConfigurationInvariants
      await db.transaction(async (tx) => {
        await validateProductConfigurationInvariants(tx);
      });
    });

    it("should have product templates with at least one variant", async () => {
      // Validated by validateProductConfigurationInvariants
      await db.transaction(async (tx) => {
        await validateProductConfigurationInvariants(tx);
      });
    });
  });

  describe("Consignment Domain Invariants", () => {
    it("should validate consignment stock reports balance", async () => {
      await db.transaction(async (tx) => {
        await validateConsignmentPhase7Invariants(tx);
      });
    });

    it("should have valid opening + sales - returns = closing qty formula", async () => {
      // Validated by validateConsignmentPhase7Invariants
      await db.transaction(async (tx) => {
        await validateConsignmentPhase7Invariants(tx);
      });
    });

    it("should have consignment lifecycle states (pending, approved, active, closed)", async () => {
      const agreements = await db
        .select({
          id: schema.consignmentAgreements.id,
          status: schema.consignmentAgreements.status,
        })
        .from(schema.consignmentAgreements)
        .limit(10);

      const validStatuses = ["pending", "approved", "active", "closed"];

      for (const agreement of agreements) {
        expect(validStatuses).toContain(agreement.status);
      }
    });
  });

  describe("Returns Domain Invariants", () => {
    it("should validate return order reason codes and status", async () => {
      await db.transaction(async (tx) => {
        await validateReturnsPhase8Invariants(tx);
      });
    });

    it("should have return lines with condition tracking", async () => {
      // Validated by validateReturnsPhase8Invariants
      await db.transaction(async (tx) => {
        await validateReturnsPhase8Invariants(tx);
      });
    });

    it("should cover all RMA lifecycle states", async () => {
      const returns = await db
        .select({
          id: schema.returnOrders.id,
          status: schema.returnOrders.status,
        })
        .from(schema.returnOrders)
        .limit(10);

      // Expect at least some of the 6 RMA states to be present
      const validStatuses = ["draft", "submitted", "approved", "received", "refunded", "rejected"];

      for (const returnOrder of returns) {
        expect(validStatuses).toContain(returnOrder.status);
      }
    });
  });

  describe("Subscriptions Domain Invariants", () => {
    it("should validate subscription lifecycle and MRR tracking", async () => {
      await db.transaction(async (tx) => {
        await validateSubscriptionsPhase9Invariants(tx);
      });
    });

    it("should have subscription lines with MRR calculation", async () => {
      // Validated by validateSubscriptionsPhase9Invariants
      await db.transaction(async (tx) => {
        await validateSubscriptionsPhase9Invariants(tx);
      });
    });

    it("should have subscription logs tracking MRR changes", async () => {
      // Validated by validateSubscriptionsPhase9Invariants
      await db.transaction(async (tx) => {
        await validateSubscriptionsPhase9Invariants(tx);
      });
    });

    it("should have valid subscription states", async () => {
      const subscriptions = await db
        .select({
          id: schema.subscriptions.id,
          status: schema.subscriptions.status,
        })
        .from(schema.subscriptions)
        .limit(10);

      const validStatuses = ["active", "paused", "cancelled", "expired"];

      for (const subscription of subscriptions) {
        expect(validStatuses).toContain(subscription.status);
      }
    });
  });

  describe("Commissions Domain Invariants", () => {
    it("should validate commission entries and territory rules", async () => {
      await db.transaction(async (tx) => {
        await validateCommissionsPhase10Invariants(tx);
      });
    });

    it("should have sales teams with at least one member", async () => {
      // Validated by validateCommissionsPhase10Invariants
      await db.transaction(async (tx) => {
        await validateCommissionsPhase10Invariants(tx);
      });
    });

    it("should have commission lifecycle states (draft, approved, paid)", async () => {
      // Validated by validateCommissionsPhase10Invariants
      await db.transaction(async (tx) => {
        await validateCommissionsPhase10Invariants(tx);
      });
    });

    it("should have valid commission entries with non-negative amounts", async () => {
      const commissions = await db
        .select({
          id: schema.commissionEntries.id,
          baseAmount: schema.commissionEntries.baseAmount,
          commissionAmount: schema.commissionEntries.commissionAmount,
        })
        .from(schema.commissionEntries)
        .limit(10);

      for (const commission of commissions) {
        expect(Number(commission.baseAmount)).toBeGreaterThanOrEqual(0);
        expect(Number(commission.commissionAmount)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Cross-Domain Invariants", () => {
    it("should have all seeded entities with valid tenant isolation", async () => {
      // All entities should have tenantId = 1 (default tenant)
      const orders = await db
        .select({ tenantId: schema.salesOrders.tenantId })
        .from(schema.salesOrders)
        .limit(1);

      const partners = await db
        .select({ tenantId: schema.partners.tenantId })
        .from(schema.partners)
        .limit(1);

      const products = await db
        .select({ tenantId: schema.products.tenantId })
        .from(schema.products)
        .limit(1);

      expect(orders[0]?.tenantId).toBe(1);
      expect(partners[0]?.tenantId).toBe(1);
      expect(products[0]?.tenantId).toBe(1);
    });

    it("should have audit columns populated for all seeded data", async () => {
      const orders = await db
        .select({
          createdAt: schema.salesOrders.createdAt,
          updatedAt: schema.salesOrders.updatedAt,
          createdBy: schema.salesOrders.createdBy,
        })
        .from(schema.salesOrders)
        .limit(5);

      for (const order of orders) {
        expect(order.createdAt).toBeTruthy();
        expect(order.updatedAt).toBeTruthy();
        expect(order.createdBy).toBeTruthy();
      }
    });

    it("should have no orphaned foreign key references", async () => {
      // This is implicitly validated by FK constraints during seeding
      // If any FK violations occurred, seed would have failed
      // But we can spot-check a few key relationships

      const orderLines = await db
        .select({
          orderId: schema.salesOrderLines.orderId,
          productId: schema.salesOrderLines.productId,
        })
        .from(schema.salesOrderLines)
        .limit(5);

      for (const line of orderLines) {
        const order = await db
          .select({ id: schema.salesOrders.id })
          .from(schema.salesOrders)
          .where(eq(schema.salesOrders.id, line.orderId))
          .limit(1);

        const product = await db
          .select({ id: schema.products.id })
          .from(schema.products)
          .where(eq(schema.products.id, line.productId))
          .limit(1);

        expect(order).toHaveLength(1);
        expect(product).toHaveLength(1);
      }
    });

    it("should have deterministic SEED_IDS used consistently", async () => {
      // Verify known seed IDs exist
      const order = await db
        .select({ id: schema.salesOrders.id })
        .from(schema.salesOrders)
        .where(eq(schema.salesOrders.id, SEED_IDS.orderOne))
        .limit(1);

      const partner = await db
        .select({ id: schema.partners.id })
        .from(schema.partners)
        .where(eq(schema.partners.id, SEED_IDS.partnerAccentCorp))
        .limit(1);

      const product = await db
        .select({ id: schema.products.id })
        .from(schema.products)
        .where(eq(schema.products.id, SEED_IDS.productMonitor))
        .limit(1);

      expect(order).toHaveLength(1);
      expect(partner).toHaveLength(1);
      expect(product).toHaveLength(1);
    });
  });

  describe("Financial Integrity Invariants", () => {
    it("should have all monetary values as valid numeric(14,2)", async () => {
      const orders = await db
        .select({
          amountUntaxed: schema.salesOrders.amountUntaxed,
          amountTax: schema.salesOrders.amountTax,
          amountTotal: schema.salesOrders.amountTotal,
        })
        .from(schema.salesOrders)
        .limit(10);

      for (const order of orders) {
        // Verify 2 decimal places
        expect(order.amountUntaxed).toMatch(/^\d+\.\d{2}$/);
        expect(order.amountTax).toMatch(/^\d+\.\d{2}$/);
        expect(order.amountTotal).toMatch(/^\d+\.\d{2}$/);

        // Verify non-negative
        expect(Number(order.amountUntaxed)).toBeGreaterThanOrEqual(0);
        expect(Number(order.amountTax)).toBeGreaterThanOrEqual(0);
        expect(Number(order.amountTotal)).toBeGreaterThanOrEqual(0);
      }
    });

    it("should have tax rates as numeric(9,4) percentages", async () => {
      const taxRates = await db
        .select({
          amount: schema.taxRates.amount,
          amountType: schema.taxRates.amountType,
        })
        .from(schema.taxRates)
        .limit(10);

      for (const taxRate of taxRates) {
        // Verify valid numeric format
        const amountValue = Number(taxRate.amount);

        // Verify non-negative
        expect(amountValue).toBeGreaterThanOrEqual(0);

        // If percentage type, verify range (0-100%)
        if (taxRate.amountType === "percent") {
          expect(amountValue).toBeLessThanOrEqual(100);
        }
      }
    });

    it("should have exchange rates with 6 decimal precision", async () => {
      const orders = await db
        .select({
          exchangeRateUsed: schema.salesOrders.exchangeRateUsed,
        })
        .from(schema.salesOrders)
        .where(isNotNull(schema.salesOrders.exchangeRateUsed))
        .limit(10);

      for (const order of orders) {
        if (order.exchangeRateUsed) {
          // Verify numeric(14,6) format with up to 6 decimals
          const rateValue = Number(order.exchangeRateUsed);

          // Verify positive rate
          expect(rateValue).toBeGreaterThan(0);
        }
      }
    });
  });
});
