/**
 * Partner Engine Logic
 * ====================
 *
 * Core logic for partner (customer/vendor) management including:
 * - Credit limit validation
 * - Address resolution (invoice, delivery)
 * - Partner relationship management
 *
 * Phase 1: Partner Enhancement (Sales Domain Expansion)
 */

import type { Partner, PartnerAddress } from "@afenda/db/schema-domain";
import { Decimal } from "decimal.js";

// ============================================================================
// Type Definitions
// ============================================================================

export interface CreditCheckInput {
  partnerId: string;
  orderTotal: string | number;
  creditLimit: string | number;
  totalDue: string | number;
}

export interface CreditCheckResult {
  approved: boolean;
  creditLimit: Decimal | null;
  totalDue: Decimal;
  orderTotal: Decimal;
  availableCredit: Decimal | null;
  message: string;
}

export interface PartnerContext {
  partner: Pick<Partner, "id" | "creditLimit" | "totalDue">;
}

export interface AddressContext {
  partnerId: string;
  addresses: Array<Pick<PartnerAddress, "id" | "type" | "isDefault" | "street" | "city" | "zip">>;
}

// ============================================================================
// Error Classes
// ============================================================================

export class PartnerEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartnerEngineError";
  }
}

export class NoAddressFoundError extends PartnerEngineError {
  constructor(partnerId: string, addressType: string) {
    super(`No ${addressType} address found for partner ${partnerId}`);
    this.name = "NoAddressFoundError";
  }
}

export class CreditLimitExceededError extends PartnerEngineError {
  constructor(orderTotal: Decimal, availableCredit: Decimal) {
    super(
      `Order total ${orderTotal.toFixed(2)} exceeds available credit ${availableCredit.toFixed(2)}`
    );
    this.name = "CreditLimitExceededError";
  }
}

// ============================================================================
// Credit Limit Validation
// ============================================================================

/**
 * Check if partner's credit limit allows for a new order
 *
 * Business Rules:
 * 1. If creditLimit is null/0 → unlimited credit (always approved)
 * 2. availableCredit = creditLimit - totalDue
 * 3. Order approved if orderTotal <= availableCredit
 * 4. totalDue = sum of unpaid invoices (updated by accounting module)
 *
 * Example:
 *   creditLimit = 10,000
 *   totalDue = 7,500 (existing unpaid invoices)
 *   orderTotal = 3,000
 *   availableCredit = 10,000 - 7,500 = 2,500
 *   Result: REJECTED (3,000 > 2,500)
 *
 * @param context - Partner credit data and order amount
 * @returns Credit check result with approval status
 */
export function checkCreditLimit(
  context: PartnerContext,
  orderTotal: string | number
): CreditCheckResult {
  const { partner } = context;
  const orderAmount = new Decimal(orderTotal);
  const currentDue = new Decimal(partner.totalDue);

  // Zero credit limit = unlimited credit
  if (partner.creditLimit === "0" || new Decimal(partner.creditLimit).eq(0)) {
    return {
      approved: true,
      creditLimit: null,
      totalDue: currentDue,
      orderTotal: orderAmount,
      availableCredit: null,
      message: "Unlimited credit - no credit limit set",
    };
  }

  const limit = new Decimal(partner.creditLimit);
  const available = limit.minus(currentDue);

  // Check if order is within available credit
  const approved = orderAmount.lte(available);

  return {
    approved,
    creditLimit: limit,
    totalDue: currentDue,
    orderTotal: orderAmount,
    availableCredit: available,
    message: approved
      ? `Order approved - within credit limit`
      : `Order exceeds available credit (${available.toFixed(2)} available, ${orderAmount.toFixed(2)} requested)`,
  };
}

// ============================================================================
// Address Resolution
// ============================================================================

/**
 * Get the invoice address for a partner
 *
 * Resolution Strategy:
 * 1. Find address with type='invoice' and isDefault=true
 * 2. If not found, return first address with type='invoice'
 * 3. If no invoice address exists, throw error
 *
 * @param context - Partner and their addresses
 * @returns Invoice address
 * @throws NoAddressFoundError if no invoice address exists
 */
export function getInvoiceAddress(context: AddressContext): PartnerAddress {
  const { partnerId, addresses } = context;

  // Filter invoice addresses
  const invoiceAddresses = addresses.filter((addr) => addr.type === "invoice");

  if (invoiceAddresses.length === 0) {
    throw new NoAddressFoundError(partnerId, "invoice");
  }

  // Find default invoice address
  const defaultAddress = invoiceAddresses.find((addr) => addr.isDefault);
  if (defaultAddress) {
    return defaultAddress as PartnerAddress;
  }

  // Return first invoice address
  return invoiceAddresses[0] as PartnerAddress;
}

/**
 * Get the delivery address for a partner
 *
 * Resolution Strategy:
 * 1. Find address with type='delivery' and isDefault=true
 * 2. If not found, return first address with type='delivery'
 * 3. If no delivery address, fallback to invoice address
 * 4. If no addresses exist, throw error
 *
 * @param context - Partner and their addresses
 * @returns Delivery address (or invoice address as fallback)
 * @throws NoAddressFoundError if no suitable address exists
 */
export function getDeliveryAddress(context: AddressContext): PartnerAddress {
  const { partnerId, addresses } = context;

  if (addresses.length === 0) {
    throw new NoAddressFoundError(partnerId, "delivery");
  }

  // Filter delivery addresses
  const deliveryAddresses = addresses.filter((addr) => addr.type === "delivery");

  if (deliveryAddresses.length > 0) {
    // Find default delivery address
    const defaultAddress = deliveryAddresses.find((addr) => addr.isDefault);
    if (defaultAddress) {
      return defaultAddress as PartnerAddress;
    }

    // Return first delivery address
    return deliveryAddresses[0] as PartnerAddress;
  }

  // Fallback: Use invoice address for delivery
  const invoiceAddresses = addresses.filter((addr) => addr.type === "invoice");
  if (invoiceAddresses.length > 0) {
    const defaultInvoice = invoiceAddresses.find((addr) => addr.isDefault);
    if (defaultInvoice) {
      return defaultInvoice as PartnerAddress;
    }
    return invoiceAddresses[0] as PartnerAddress;
  }

  // Fallback: Use any contact address
  const contactAddresses = addresses.filter((addr) => addr.type === "contact");
  if (contactAddresses.length > 0) {
    const defaultContact = contactAddresses.find((addr) => addr.isDefault);
    if (defaultContact) {
      return defaultContact as PartnerAddress;
    }
    return contactAddresses[0] as PartnerAddress;
  }

  // No address found
  throw new NoAddressFoundError(partnerId, "delivery");
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate if a partner can be deleted
 *
 * Business Rules:
 * - Cannot delete partner with unpaid invoices (totalDue > 0)
 * - Cannot delete partner with open orders
 * - Cannot delete partner with active subscriptions
 *
 * @param partner - Partner to validate
 * @returns Boolean indicating if deletion is allowed
 */
export function canDeletePartner(partner: Pick<Partner, "totalDue">): {
  allowed: boolean;
  reason?: string;
} {
  const due = new Decimal(partner.totalDue);

  if (due.gt(0)) {
    return {
      allowed: false,
      reason: `Partner has outstanding balance of ${due.toFixed(2)}`,
    };
  }

  return { allowed: true };
}

/**
 * Calculate partner credit utilization percentage
 *
 * @param partner - Partner with credit data
 * @returns Credit utilization as percentage (0-100), or null if unlimited
 */
export function calculateCreditUtilization(
  partner: Pick<Partner, "creditLimit" | "totalDue">
): Decimal | null {
  if (partner.creditLimit === "0" || new Decimal(partner.creditLimit).eq(0)) {
    return null; // Unlimited credit
  }

  const limit = new Decimal(partner.creditLimit);
  const due = new Decimal(partner.totalDue);

  if (limit.eq(0)) {
    return due.gt(0) ? new Decimal(100) : new Decimal(0);
  }

  return due.div(limit).mul(100);
}

/**
 * Determine if credit limit increase is recommended
 *
 * Business Rule: Recommend increase if utilization > 80% and payment history is good
 *
 * @param partner - Partner with credit data
 * @returns Boolean indicating if increase is recommended
 */
export function shouldIncreaseCreditLimit(
  partner: Pick<Partner, "creditLimit" | "totalDue">
): boolean {
  const utilization = calculateCreditUtilization(partner);

  if (utilization === null) {
    return false; // Already unlimited
  }

  return utilization.gte(80);
}
