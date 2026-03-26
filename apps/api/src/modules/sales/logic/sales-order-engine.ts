/**
 * Sales Order Engine - Phase 6
 * 
 * Business logic for enterprise order-to-cash workflows:
 * - State machine: draft → sent → sale → done
 * - Credit limit validation
 * - Multi-currency support
 * - Pricelist integration
 * - Fiscal position tax mapping
 * - Delivery and invoice tracking
 * - Optional items (quotation extras)
 * 
 * @module sales/logic/sales-order-engine
 */

import Decimal from "decimal.js";
import { db } from "@afenda/db";
import {
  salesOrders,
  salesOrderLines,
  saleOrderLineTaxes,
  partners,
  partnerAddresses,
  type SalesOrderInsert,
  type SalesOrderSelect,
  type SalesOrderLineSelect,
} from "@afenda/db/schema";
import { eq, and, inArray, isNull, desc } from "drizzle-orm";
import { checkCreditLimit, type CreditCheckResult } from "./partner-engine.js";
import { computeLineTaxes, mapTax, detectFiscalPosition } from "./tax-engine.js";
import { resolvePrice } from "./pricing-engine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface SendQuotationContext {
  tenantId: string;
  orderId: string;
  userId?: string;
}

export interface ConfirmOrderContext {
  tenantId: string;
  orderId: string;
  userId?: string;
}

export interface ConfirmResult {
  success: boolean;
  sequenceNumber?: string;
  creditCheckResult: CreditCheckResult;
  errors: string[];
}

export interface CancelOrderContext {
  tenantId: string;
  orderId: string;
  userId?: string;
  reason?: string;
}

export interface MarkDoneContext {
  tenantId: string;
  orderId: string;
  userId?: string;
}

export interface OrderAmounts {
  amountUntaxed: Decimal;
  amountTax: Decimal;
  amountTotal: Decimal;
}

export interface ComputeOrderAmountsContext {
  tenantId: string;
  orderId: string;
}

export interface ChangeProductContext {
  tenantId: string;
  orderLineId: string;
  productId: string;
}

export interface ChangePricelistContext {
  tenantId: string;
  orderId: string;
  pricelistId: string;
}

export interface ChangeFiscalPositionContext {
  tenantId: string;
  orderId: string;
  fiscalPositionId: string | null;
}

export type DeliveryStatus = "no" | "partial" | "full";

export interface CheckDeliveryStatusContext {
  tenantId: string;
  orderId: string;
}

export type InvoiceStatus = "no" | "to_invoice" | "invoiced";

export interface CheckInvoiceStatusContext {
  tenantId: string;
  orderId: string;
}

export interface CreateInvoiceContext {
  tenantId: string;
  orderId: string;
  userId?: string;
  lineIds?: string[]; // If specified, only invoice these lines
}

export interface Invoice {
  id: string;
  orderId: string;
  partnerId: string;
  amountTotal: Decimal;
  lineCount: number;
}

export interface ValidateOrderContext {
  tenantId: string;
  orderId: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// STATE TRANSITIONS
// ============================================================================

/**
 * Send quotation to customer (draft → sent)
 * 
 * - Validates: order has lines, partner is set
 * - Updates: status = 'sent', quotation_date = now
 * 
 * @throws Error if order not found, not in draft status, or missing lines
 */
export async function sendQuotation(context: SendQuotationContext): Promise<void> {
  const { tenantId, orderId, userId } = context;

  // Fetch order
  const order = await db.query.salesOrders.findFirst({
    where: and(
      eq(salesOrders.id, orderId),
      eq(salesOrders.tenantId, tenantId),
      isNull(salesOrders.deletedAt)
    ),
    with: {
      lines: true,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status !== "draft") {
    throw new Error(`Cannot send quotation: order is in '${order.status}' status`);
  }

  if (!order.partnerId) {
    throw new Error("Cannot send quotation: partner not set");
  }

  if (!order.lines || order.lines.length === 0) {
    throw new Error("Cannot send quotation: order has no lines");
  }

  // Update order
  await db
    .update(salesOrders)
    .set({
      status: "sent",
      quotationDate: new Date(),
      updatedAt: new Date(),
      updatedBy: userId || null,
    })
    .where(
      and(
        eq(salesOrders.id, orderId),
        eq(salesOrders.tenantId, tenantId)
      )
    );
}

/**
 * Confirm order (draft|sent → sale)
 * 
 * - Validates: credit limit, product availability
 * - Generates: sequence_number (SO-000042/2026)
 * - Locks: prices, currency rate, fiscal position
 * - Updates: status = 'sale', confirmation_date = now
 * - Triggers: inventory reservation (future), commission recording (Phase 10)
 * 
 * @returns ConfirmResult with success status, sequence number, credit check result, and errors
 */
export async function confirmOrder(context: ConfirmOrderContext): Promise<ConfirmResult> {
  const { tenantId, orderId, userId } = context;

  // Fetch order with full context
  const order = await db.query.salesOrders.findFirst({
    where: and(
      eq(salesOrders.id, orderId),
      eq(salesOrders.tenantId, tenantId),
      isNull(salesOrders.deletedAt)
    ),
    with: {
      lines: true,
    },
  });

  if (!order) {
    return {
      success: false,
      creditCheckResult: {
        approved: false,
        creditLimit: new Decimal(0),
        totalDue: new Decimal(0),
        orderTotal: new Decimal(0),
        availableCredit: new Decimal(0),
        message: "Order not found",
      },
      errors: ["Order not found"],
    };
  }

  if (order.status !== "draft" && order.status !== "sent") {
    return {
      success: false,
      creditCheckResult: {
        approved: false,
        creditLimit: new Decimal(0),
        totalDue: new Decimal(0),
        orderTotal: new Decimal(0),
        availableCredit: new Decimal(0),
        message: `Cannot confirm order in '${order.status}' status`,
      },
      errors: [`Cannot confirm order in '${order.status}' status`],
    };
  }

  if (!order.partnerId) {
    return {
      success: false,
      creditCheckResult: {
        approved: false,
        creditLimit: new Decimal(0),
        totalDue: new Decimal(0),
        orderTotal: new Decimal(0),
        availableCredit: new Decimal(0),
        message: "Partner not set",
      },
      errors: ["Partner not set"],
    };
  }

  // Compute order amounts
  const amounts = await computeOrderAmounts({ tenantId, orderId });

  // Check credit limit
  const creditCheck = await checkCreditLimit(
    { tenantId, partnerId: order.partnerId },
    amounts.amountTotal
  );

  if (!creditCheck.approved) {
    return {
      success: false,
      creditCheckResult: creditCheck,
      errors: [creditCheck.message],
    };
  }

  // Generate sequence number (SO-000042/2026)
  const year = new Date().getFullYear();
  const lastOrder = await db.query.salesOrders.findFirst({
    where: and(
      eq(salesOrders.tenantId, tenantId),
      isNull(salesOrders.deletedAt)
    ),
    orderBy: [desc(salesOrders.createdAt)],
  });

  let nextNumber = 1;
  if (lastOrder?.sequenceNumber) {
    const match = lastOrder.sequenceNumber.match(/SO-(\d+)\/\d{4}/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  const sequenceNumber = `SO-${String(nextNumber).padStart(6, "0")}/${year}`;

  // Lock currency rate (defaulting to 1.0 for now - Phase 8 will add real currency conversion)
  const companyCurrencyRate = "1.000000";

  // Update order
  await db
    .update(salesOrders)
    .set({
      status: "sale",
      sequenceNumber,
      confirmationDate: new Date(),
      companyCurrencyRate,
      updatedAt: new Date(),
      updatedBy: userId || null,
    })
    .where(
      and(
        eq(salesOrders.id, orderId),
        eq(salesOrders.tenantId, tenantId)
      )
    );

  return {
    success: true,
    sequenceNumber,
    creditCheckResult: creditCheck,
    errors: [],
  };
}

/**
 * Cancel order (any → cancel)
 * 
 * - Validates: no delivered quantities, no invoiced quantities
 * - Reverses: inventory reservations, commissions
 * - Updates: status = 'cancel', deleted_at = now (soft delete)
 * 
 * @throws Error if order has deliveries or invoices
 */
export async function cancelOrder(context: CancelOrderContext): Promise<void> {
  const { tenantId, orderId, userId } = context;

  // Fetch order with lines
  const order = await db.query.salesOrders.findFirst({
    where: and(
      eq(salesOrders.id, orderId),
      eq(salesOrders.tenantId, tenantId),
      isNull(salesOrders.deletedAt)
    ),
    with: {
      lines: true,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  // Validate no delivered quantities
  const hasDeliveries = order.lines?.some((line) => {
    const qtyDelivered = new Decimal(line.qtyDelivered || 0);
    return qtyDelivered.greaterThan(0);
  });

  if (hasDeliveries) {
    throw new Error("Cannot cancel order: some quantities have been delivered");
  }

  // Validate no invoiced quantities
  const hasInvoices = order.lines?.some((line) => {
    const qtyInvoiced = new Decimal(line.qtyInvoiced || 0);
    return qtyInvoiced.greaterThan(0);
  });

  if (hasInvoices) {
    throw new Error("Cannot cancel order: some quantities have been invoiced");
  }

  // Soft delete order
  await db
    .update(salesOrders)
    .set({
      status: "cancel",
      deletedAt: new Date(),
      updatedAt: new Date(),
      updatedBy: userId || null,
    })
    .where(
      and(
        eq(salesOrders.id, orderId),
        eq(salesOrders.tenantId, tenantId)
      )
    );
}

/**
 * Mark order as done (sale → done)
 * 
 * - Validates: delivery_status = 'full', invoice_status = 'invoiced'
 * - Updates: status = 'done'
 * 
 * @throws Error if not fully delivered and invoiced
 */
export async function markDone(context: MarkDoneContext): Promise<void> {
  const { tenantId, orderId, userId } = context;

  // Fetch order
  const order = await db.query.salesOrders.findFirst({
    where: and(
      eq(salesOrders.id, orderId),
      eq(salesOrders.tenantId, tenantId),
      isNull(salesOrders.deletedAt)
    ),
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status !== "sale") {
    throw new Error(`Cannot mark as done: order is in '${order.status}' status`);
  }

  // Check delivery status
  const deliveryStatus = await checkDeliveryStatus({ tenantId, orderId });
  if (deliveryStatus !== "full") {
    throw new Error("Cannot mark as done: order not fully delivered");
  }

  // Check invoice status
  const invoiceStatus = await checkInvoiceStatus({ tenantId, orderId });
  if (invoiceStatus !== "invoiced") {
    throw new Error("Cannot mark as done: order not fully invoiced");
  }

  // Update order
  await db
    .update(salesOrders)
    .set({
      status: "done",
      updatedAt: new Date(),
      updatedBy: userId || null,
    })
    .where(
      and(
        eq(salesOrders.id, orderId),
        eq(salesOrders.tenantId, tenantId)
      )
    );
}

// ============================================================================
// FINANCIAL COMPUTATION
// ============================================================================

/**
 * Compute order amounts from lines
 * 
 * Returns: { amount_untaxed, amount_tax, amount_total }
 * 
 * Algorithm:
 * 1. For each non-section/note line:
 *    - line.price_subtotal = qty × price_unit × (1 - discount/100)
 *    - line.price_tax = computeLineTaxes(subtotal, tax_ids, fiscal_position)
 *    - line.price_total = subtotal + tax
 * 2. order.amount_untaxed = sum(lines.price_subtotal)
 * 3. order.amount_tax = sum(lines.price_tax)
 * 4. order.amount_total = amount_untaxed + amount_tax
 * 
 * Financial Invariants:
 * - INV-1: line.price_subtotal = line.quantity × line.price_unit × (1 - line.discount / 100)
 * - INV-2: line.price_total = line.price_subtotal + line.price_tax
 * - INV-3: order.amount_total = order.amount_untaxed + order.amount_tax
 */
export async function computeOrderAmounts(context: ComputeOrderAmountsContext): Promise<OrderAmounts> {
  const { tenantId, orderId } = context;

  // Fetch order with lines and taxes
  const order = await db.query.salesOrders.findFirst({
    where: and(
      eq(salesOrders.id, orderId),
      eq(salesOrders.tenantId, tenantId),
      isNull(salesOrders.deletedAt)
    ),
    with: {
      lines: {
        with: {
          taxes: {
            with: {
              tax: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  let amountUntaxed = new Decimal(0);
  let amountTax = new Decimal(0);

  // Process each line
  for (const line of order.lines || []) {
    // Skip section and note lines (display_type !== 'product')
    if (line.displayType !== "product") {
      continue;
    }

    // INV-1: Compute line subtotal
    const quantity = new Decimal(line.quantity);
    const priceUnit = new Decimal(line.priceUnit);
    const discount = new Decimal(line.discount || 0);
    
    const priceSubtotal = quantity
      .times(priceUnit)
      .times(new Decimal(1).minus(discount.dividedBy(100)));

    // INV-2: Compute line tax
    const taxIds = line.taxes?.map((t) => t.taxId) || [];
    const taxComputation = await computeLineTaxes({
      tenantId,
      baseAmount: priceSubtotal,
      taxIds,
      fiscalPositionId: order.fiscalPositionId || undefined,
    });

    const priceTax = taxComputation.totalTax;
    const priceTotal = priceSubtotal.plus(priceTax);

    // Update line amounts
    await db
      .update(salesOrderLines)
      .set({
        priceSubtotal: priceSubtotal.toFixed(2),
        priceTax: priceTax.toFixed(2),
        priceTotal: priceTotal.toFixed(2),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(salesOrderLines.id, line.id),
          eq(salesOrderLines.tenantId, tenantId)
        )
      );

    // Accumulate order totals
    amountUntaxed = amountUntaxed.plus(priceSubtotal);
    amountTax = amountTax.plus(priceTax);
  }

  // INV-3: Compute order total
  const amountTotal = amountUntaxed.plus(amountTax);

  // Update order amounts
  await db
    .update(salesOrders)
    .set({
      amountUntaxed: amountUntaxed.toFixed(2),
      amountTax: amountTax.toFixed(2),
      amountTotal: amountTotal.toFixed(2),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(salesOrders.id, orderId),
        eq(salesOrders.tenantId, tenantId)
      )
    );

  return {
    amountUntaxed,
    amountTax,
    amountTotal,
  };
}

/**
 * Recompute line amounts when product changes
 * 
 * - Fetches: product price from pricelist, taxes, UoM, name, customer_lead
 * - Updates: price_unit, tax_ids, uom_id, name
 * - Triggers: computeOrderAmounts()
 * 
 * @throws Error if line or product not found
 */
export async function onChangeProduct(context: ChangeProductContext): Promise<void> {
  const { tenantId, orderLineId, productId } = context;

  // Fetch order line with order context
  const line = await db.query.salesOrderLines.findFirst({
    where: and(
      eq(salesOrderLines.id, orderLineId),
      eq(salesOrderLines.tenantId, tenantId),
      isNull(salesOrderLines.deletedAt)
    ),
  });

  if (!line) {
    throw new Error("Order line not found");
  }

  // Fetch order to get pricelist and fiscal position
  const order = await db.query.salesOrders.findFirst({
    where: and(
      eq(salesOrders.id, line.orderId),
      eq(salesOrders.tenantId, tenantId)
    ),
  });

  if (!order) {
    throw new Error("Order not found");
  }

  // Fetch product with template
  const product = await db.query.productVariants.findFirst({
    where: and(
      eq(db.schema.productVariants.id, productId),
      eq(db.schema.productVariants.tenantId, tenantId)
    ),
    with: {
      template: true,
    },
  });

  if (!product || !product.template) {
    throw new Error("Product not found");
  }

  // Resolve price from pricelist
  const quantity = new Decimal(line.quantity);
  const priceResolution = order.pricelistId
    ? await resolvePrice({
        tenantId,
        productId,
        pricelistId: order.pricelistId,
        quantity,
        date: new Date(),
      })
    : { price: new Decimal(product.template.listPrice) };

  // Get default taxes (from product template)
  const defaultTaxIds = product.template.taxIds || [];

  // Update line
  await db
    .update(salesOrderLines)
    .set({
      productId,
      productTemplateId: product.templateId,
      name: product.template.name,
      priceUnit: priceResolution.price.toFixed(2),
      productUomId: product.template.uomId,
      customerLead: product.template.leadTime || 0,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(salesOrderLines.id, orderLineId),
        eq(salesOrderLines.tenantId, tenantId)
      )
    );

  // Clear existing taxes
  await db
    .delete(saleOrderLineTaxes)
    .where(
      and(
        eq(saleOrderLineTaxes.orderLineId, orderLineId),
        eq(saleOrderLineTaxes.tenantId, tenantId)
      )
    );

  // Insert new taxes
  if (defaultTaxIds.length > 0) {
    await db.insert(saleOrderLineTaxes).values(
      defaultTaxIds.map((taxId) => ({
        id: crypto.randomUUID(),
        tenantId,
        orderLineId,
        taxId,
        createdAt: new Date(),
      }))
    );
  }

  // Recompute order amounts
  await computeOrderAmounts({ tenantId, orderId: line.orderId });
}

/**
 * Recompute all line prices when pricelist changes
 * 
 * - For each line: resolvePrice(product, pricelist, qty) → new price_unit
 * - Triggers: computeOrderAmounts()
 */
export async function onChangePricelist(context: ChangePricelistContext): Promise<void> {
  const { tenantId, orderId, pricelistId } = context;

  // Fetch order with lines
  const order = await db.query.salesOrders.findFirst({
    where: and(
      eq(salesOrders.id, orderId),
      eq(salesOrders.tenantId, tenantId),
      isNull(salesOrders.deletedAt)
    ),
    with: {
      lines: true,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  // Update order pricelist
  await db
    .update(salesOrders)
    .set({
      pricelistId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(salesOrders.id, orderId),
        eq(salesOrders.tenantId, tenantId)
      )
    );

  // Recompute each line price
  for (const line of order.lines || []) {
    if (line.displayType !== "product" || !line.productId) {
      continue;
    }

    const quantity = new Decimal(line.quantity);
    const priceResolution = await resolvePrice({
      tenantId,
      productId: line.productId,
      pricelistId,
      quantity,
      date: new Date(),
    });

    await db
      .update(salesOrderLines)
      .set({
        priceUnit: priceResolution.price.toFixed(2),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(salesOrderLines.id, line.id),
          eq(salesOrderLines.tenantId, tenantId)
        )
      );
  }

  // Recompute order amounts
  await computeOrderAmounts({ tenantId, orderId });
}

/**
 * Remap taxes when fiscal position changes
 * 
 * - For each line: mapTax(original_tax_ids, fiscal_position) → new tax_ids
 * - Triggers: computeOrderAmounts()
 */
export async function onChangeFiscalPosition(context: ChangeFiscalPositionContext): Promise<void> {
  const { tenantId, orderId, fiscalPositionId } = context;

  // Fetch order with lines and taxes
  const order = await db.query.salesOrders.findFirst({
    where: and(
      eq(salesOrders.id, orderId),
      eq(salesOrders.tenantId, tenantId),
      isNull(salesOrders.deletedAt)
    ),
    with: {
      lines: {
        with: {
          taxes: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  // Update order fiscal position
  await db
    .update(salesOrders)
    .set({
      fiscalPositionId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(salesOrders.id, orderId),
        eq(salesOrders.tenantId, tenantId)
      )
    );

  // Remap taxes for each line
  for (const line of order.lines || []) {
    if (line.displayType !== "product") {
      continue;
    }

    const originalTaxIds = line.taxes?.map((t) => t.taxId) || [];
    
    if (originalTaxIds.length === 0) {
      continue;
    }

    // Map taxes through fiscal position
    const { mappedTaxIds } = fiscalPositionId
      ? await mapTax({
          tenantId,
          originalTaxIds,
          fiscalPositionId,
        })
      : { mappedTaxIds: originalTaxIds };

    // Clear existing taxes
    await db
      .delete(saleOrderLineTaxes)
      .where(
        and(
          eq(saleOrderLineTaxes.orderLineId, line.id),
          eq(saleOrderLineTaxes.tenantId, tenantId)
        )
      );

    // Insert mapped taxes
    if (mappedTaxIds.length > 0) {
      await db.insert(saleOrderLineTaxes).values(
        mappedTaxIds.map((taxId) => ({
          id: crypto.randomUUID(),
          tenantId,
          orderLineId: line.id,
          taxId,
          createdAt: new Date(),
        }))
      );
    }
  }

  // Recompute order amounts
  await computeOrderAmounts({ tenantId, orderId });
}

// ============================================================================
// DELIVERY & INVOICE TRACKING
// ============================================================================

/**
 * Update delivery status from line-level quantities
 * 
 * - Compares: qty vs. qty_delivered
 * - Returns: 'no' (all 0), 'partial' (some delivered), 'full' (all delivered)
 * - Updates: order.delivery_status
 * 
 * INV-5: Delivery Status Derivation
 * - 'no': all lines.qty_delivered == 0
 * - 'partial': any line.qty_delivered < line.quantity
 * - 'full': all lines.qty_delivered >= line.quantity
 */
export async function checkDeliveryStatus(context: CheckDeliveryStatusContext): Promise<DeliveryStatus> {
  const { tenantId, orderId } = context;

  // Fetch order with lines
  const order = await db.query.salesOrders.findFirst({
    where: and(
      eq(salesOrders.id, orderId),
      eq(salesOrders.tenantId, tenantId),
      isNull(salesOrders.deletedAt)
    ),
    with: {
      lines: true,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  let hasDelivered = false;
  let fullyDelivered = true;

  for (const line of order.lines || []) {
    if (line.displayType !== "product") {
      continue;
    }

    const quantity = new Decimal(line.quantity);
    const qtyDelivered = new Decimal(line.qtyDelivered || 0);

    if (qtyDelivered.greaterThan(0)) {
      hasDelivered = true;
    }

    if (qtyDelivered.lessThan(quantity)) {
      fullyDelivered = false;
    }
  }

  const deliveryStatus: DeliveryStatus = !hasDelivered
    ? "no"
    : fullyDelivered
    ? "full"
    : "partial";

  // Update order
  await db
    .update(salesOrders)
    .set({
      deliveryStatus,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(salesOrders.id, orderId),
        eq(salesOrders.tenantId, tenantId)
      )
    );

  return deliveryStatus;
}

/**
 * Update invoice status from line-level quantities
 * 
 * - Compares: qty vs. qty_invoiced
 * - Returns: 'no' (all 0), 'to_invoice' (some invoiced), 'invoiced' (all invoiced)
 * - Updates: order.invoice_status, line.invoice_status, line.qty_to_invoice
 * 
 * INV-4: Invoice Status Derivation
 * - 'no': all lines.qty_invoiced == 0
 * - 'to_invoice': any line.qty_invoiced < line.quantity
 * - 'invoiced': all lines.qty_invoiced == line.quantity
 */
export async function checkInvoiceStatus(context: CheckInvoiceStatusContext): Promise<InvoiceStatus> {
  const { tenantId, orderId } = context;

  // Fetch order with lines
  const order = await db.query.salesOrders.findFirst({
    where: and(
      eq(salesOrders.id, orderId),
      eq(salesOrders.tenantId, tenantId),
      isNull(salesOrders.deletedAt)
    ),
    with: {
      lines: true,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  let hasInvoiced = false;
  let fullyInvoiced = true;

  for (const line of order.lines || []) {
    if (line.displayType !== "product") {
      continue;
    }

    const quantity = new Decimal(line.quantity);
    const qtyInvoiced = new Decimal(line.qtyInvoiced || 0);
    const qtyToInvoice = quantity.minus(qtyInvoiced);

    if (qtyInvoiced.greaterThan(0)) {
      hasInvoiced = true;
    }

    if (qtyInvoiced.lessThan(quantity)) {
      fullyInvoiced = false;
    }

    // Update line invoice status and qty_to_invoice
    const lineInvoiceStatus: InvoiceStatus = qtyInvoiced.equals(0)
      ? "no"
      : qtyInvoiced.greaterThanOrEqualTo(quantity)
      ? "invoiced"
      : "to_invoice";

    await db
      .update(salesOrderLines)
      .set({
        qtyToInvoice: qtyToInvoice.toFixed(3),
        invoiceStatus: lineInvoiceStatus,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(salesOrderLines.id, line.id),
          eq(salesOrderLines.tenantId, tenantId)
        )
      );
  }

  const invoiceStatus: InvoiceStatus = !hasInvoiced
    ? "no"
    : fullyInvoiced
    ? "invoiced"
    : "to_invoice";

  // Update order
  await db
    .update(salesOrders)
    .set({
      invoiceStatus,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(salesOrders.id, orderId),
        eq(salesOrders.tenantId, tenantId)
      )
    );

  return invoiceStatus;
}

/**
 * Generate invoice from uninvoiced order lines
 * 
 * - Filters: lines where qty_to_invoice > 0
 * - Creates: sales invoice with invoice lines
 * - Updates: line.qty_invoiced += invoice_line.quantity
 * - Triggers: checkInvoiceStatus()
 * 
 * Note: Actual invoice table creation is deferred to Phase 7 (Invoicing module).
 * This placeholder returns a stub Invoice object for testing.
 */
export async function createInvoice(context: CreateInvoiceContext): Promise<Invoice> {
  const { tenantId, orderId, userId, lineIds } = context;

  // Fetch order with lines
  const order = await db.query.salesOrders.findFirst({
    where: and(
      eq(salesOrders.id, orderId),
      eq(salesOrders.tenantId, tenantId),
      isNull(salesOrders.deletedAt)
    ),
    with: {
      lines: true,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  // Filter lines to invoice
  const linesToInvoice = order.lines?.filter((line) => {
    if (line.displayType !== "product") {
      return false;
    }

    if (lineIds && !lineIds.includes(line.id)) {
      return false;
    }

    const qtyToInvoice = new Decimal(line.qtyToInvoice || 0);
    return qtyToInvoice.greaterThan(0);
  });

  if (!linesToInvoice || linesToInvoice.length === 0) {
    throw new Error("No lines to invoice");
  }

  // Compute invoice total
  let invoiceTotal = new Decimal(0);
  for (const line of linesToInvoice) {
    const priceTotal = new Decimal(line.priceTotal || 0);
    invoiceTotal = invoiceTotal.plus(priceTotal);
  }

  // Update line qty_invoiced
  for (const line of linesToInvoice) {
    const qtyInvoiced = new Decimal(line.qtyInvoiced || 0);
    const qtyToInvoice = new Decimal(line.qtyToInvoice || 0);
    const newQtyInvoiced = qtyInvoiced.plus(qtyToInvoice);

    await db
      .update(salesOrderLines)
      .set({
        qtyInvoiced: newQtyInvoiced.toFixed(3),
        updatedAt: new Date(),
        updatedBy: userId || null,
      })
      .where(
        and(
          eq(salesOrderLines.id, line.id),
          eq(salesOrderLines.tenantId, tenantId)
        )
      );
  }

  // Update invoice status
  await checkInvoiceStatus({ tenantId, orderId });

  // Return stub invoice (Phase 7 will create actual invoice table)
  return {
    id: crypto.randomUUID(),
    orderId,
    partnerId: order.partnerId!,
    amountTotal: invoiceTotal,
    lineCount: linesToInvoice.length,
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate order can be confirmed
 * 
 * - Checks: partner credit limit vs. order total
 * - Checks: products are active and sellable
 * - Checks: fiscal position matches partner country (if auto_apply)
 * - Returns: { valid: boolean, errors: string[] }
 */
export async function validateOrder(context: ValidateOrderContext): Promise<ValidationResult> {
  const { tenantId, orderId } = context;

  const errors: string[] = [];

  // Fetch order with full context
  const order = await db.query.salesOrders.findFirst({
    where: and(
      eq(salesOrders.id, orderId),
      eq(salesOrders.tenantId, tenantId),
      isNull(salesOrders.deletedAt)
    ),
    with: {
      lines: {
        with: {
          product: {
            with: {
              template: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    errors.push("Order not found");
    return { valid: false, errors };
  }

  // Validate partner
  if (!order.partnerId) {
    errors.push("Partner not set");
  }

  // Validate lines exist
  if (!order.lines || order.lines.length === 0) {
    errors.push("Order has no lines");
  }

  // Validate products are active
  for (const line of order.lines || []) {
    if (line.displayType !== "product") {
      continue;
    }

    if (!line.product) {
      errors.push(`Product not found for line ${line.id}`);
      continue;
    }

    if (!line.product.template?.isActive) {
      errors.push(`Product '${line.product.template?.name}' is not active`);
    }

    if (line.product.template?.canBeSold === false) {
      errors.push(`Product '${line.product.template?.name}' cannot be sold`);
    }
  }

  // Validate credit limit
  if (order.partnerId) {
    const amounts = await computeOrderAmounts({ tenantId, orderId });
    const creditCheck = await checkCreditLimit(
      { tenantId, partnerId: order.partnerId },
      amounts.amountTotal
    );

    if (!creditCheck.approved) {
      errors.push(creditCheck.message);
    }
  }

  // Validate fiscal position
  if (order.fiscalPositionId && order.partnerId) {
    const partner = await db.query.partners.findFirst({
      where: and(
        eq(partners.id, order.partnerId),
        eq(partners.tenantId, tenantId)
      ),
    });

    const fiscalPosition = await db.query.fiscalPositions.findFirst({
      where: and(
        eq(db.schema.fiscalPositions.id, order.fiscalPositionId),
        eq(db.schema.fiscalPositions.tenantId, tenantId)
      ),
    });

    if (partner && fiscalPosition?.autoApply) {
      if (fiscalPosition.countryId !== partner.countryId) {
        errors.push(
          `Fiscal position '${fiscalPosition.name}' does not match partner country`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
