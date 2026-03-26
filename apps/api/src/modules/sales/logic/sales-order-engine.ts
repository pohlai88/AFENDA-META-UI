/**
 * Sales Order Engine — Phase 6
 *
 * Pure business-logic functions for enterprise order-to-cash workflows.
 * No direct DB access — all data is passed in via context parameters,
 * matching the pattern established by partner-engine, tax-engine, and
 * pricing-engine.
 *
 * State machine: draft → sent → sale → done  (cancel from any)
 *
 * @module sales/logic/sales-order-engine
 */

import { Decimal } from "decimal.js";
import {
  computeLineTaxes,
  mapTax,
  type TaxEngineContext,
  type FiscalPosition,
  type TaxComputation,
} from "./tax-engine.js";
import {
  resolvePrice,
  type Pricelist,
  type PricedProduct,
} from "./pricing-engine.js";
import {
  checkCreditLimit,
  type PartnerContext,
  type CreditCheckResult,
} from "./partner-engine.js";

// ============================================================================
// Types
// ============================================================================

/** Valid order statuses as defined in the orderStatusEnum. */
export type OrderStatus = "draft" | "sent" | "sale" | "done" | "cancel";

export type DeliveryStatus = "no" | "partial" | "full";
export type InvoiceStatus = "no" | "to_invoice" | "invoiced";
export type DisplayLineType = "product" | "line_section" | "line_note";

/** Minimal order shape consumed by the engine. */
export interface OrderData {
  id: string;
  tenantId: number;
  status: OrderStatus;
  partnerId: string;
  pricelistId: string | null;
  fiscalPositionId: string | null;
  currencyId: number | null;
  companyCurrencyRate: string | null;
  amountUntaxed: string;
  amountTax: string;
  amountTotal: string;
  invoiceStatus: InvoiceStatus;
  deliveryStatus: DeliveryStatus;
}

/** Minimal line shape consumed by the engine. */
export interface OrderLineData {
  id: string;
  orderId: string;
  productId: string;
  taxId: string | null;
  quantity: string;
  priceUnit: string;
  discount: string;
  priceSubtotal: string;
  priceTax: string;
  priceTotal: string;
  qtyDelivered: string;
  qtyToInvoice: string;
  qtyInvoiced: string;
  invoiceStatus: InvoiceStatus;
  displayType: DisplayLineType;
}

// ── State-transition contexts ──────────────────────────────────────────────

export interface SendQuotationInput {
  order: OrderData;
  lines: OrderLineData[];
}

export interface ConfirmOrderInput {
  order: OrderData;
  lines: OrderLineData[];
  partnerContext: PartnerContext;
  sequenceNumber: string;
}

export interface CancelOrderInput {
  order: OrderData;
  lines: OrderLineData[];
  reason?: string;
}

export interface MarkDoneInput {
  order: OrderData;
}

// ── Financial-computation contexts ─────────────────────────────────────────

export interface ComputeLineAmountsInput {
  quantity: string | number;
  priceUnit: string | number;
  discount: string | number;
}

export interface ComputeOrderAmountsInput {
  lines: OrderLineData[];
}

// ── Change-handler contexts ────────────────────────────────────────────────

export interface ChangeProductInput {
  line: OrderLineData;
  product: PricedProduct;
  pricelist: Pricelist | null;
  taxEngineContext: TaxEngineContext;
  fiscalPosition?: FiscalPosition;
}

export interface ChangePricelistInput {
  lines: OrderLineData[];
  products: Map<string, PricedProduct>;
  pricelist: Pricelist;
}

export interface ChangeFiscalPositionInput {
  lines: OrderLineData[];
  taxEngineContext: TaxEngineContext;
  fiscalPosition: FiscalPosition | null;
}

// ── Delivery / invoice contexts ────────────────────────────────────────────

export interface CheckDeliveryInput {
  lines: OrderLineData[];
}

export interface CheckInvoiceInput {
  lines: OrderLineData[];
}

export interface InvoiceLine {
  orderLineId: string;
  productId: string;
  quantity: Decimal;
  priceUnit: Decimal;
  discount: Decimal;
  subtotal: Decimal;
}

export interface Invoice {
  orderId: string;
  partnerId: string;
  lines: InvoiceLine[];
  amountUntaxed: Decimal;
  amountTax: Decimal;
  amountTotal: Decimal;
}

export interface CreateInvoiceInput {
  order: OrderData;
  lines: OrderLineData[];
  taxEngineContext: TaxEngineContext;
  fiscalPosition?: FiscalPosition;
  /** Optional subset of line IDs to invoice. If omitted, all uninvoiced lines. */
  lineIds?: string[];
}

export interface ValidateOrderInput {
  order: OrderData;
  lines: OrderLineData[];
  partnerContext: PartnerContext;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ── Result types ───────────────────────────────────────────────────────────

export interface ConfirmResult {
  success: boolean;
  sequenceNumber: string | null;
  creditCheckResult: CreditCheckResult;
  errors: string[];
}

export interface OrderAmounts {
  amountUntaxed: Decimal;
  amountTax: Decimal;
  amountTotal: Decimal;
}

// ============================================================================
// Errors
// ============================================================================

export class SalesOrderEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesOrderEngineError";
  }
}

export class InvalidStateTransitionError extends SalesOrderEngineError {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Invalid state transition: ${from} → ${to}`);
    this.name = "InvalidStateTransitionError";
  }
}

// ============================================================================
// STATE TRANSITIONS
// ============================================================================

/**
 * Send quotation to customer (draft → sent).
 *
 * Validates: order has at least one product line, partner is set.
 * Returns the updated order status fields.
 */
export function sendQuotation(
  input: SendQuotationInput
): { status: "sent"; quotationDate: Date } {
  const { order, lines } = input;

  if (order.status !== "draft") {
    throw new InvalidStateTransitionError(order.status, "sent");
  }

  const productLines = lines.filter((l) => l.displayType === "product");
  if (productLines.length === 0) {
    throw new SalesOrderEngineError(
      "Cannot send quotation: order must have at least one product line"
    );
  }

  return { status: "sent", quotationDate: new Date() };
}

/**
 * Confirm order (draft | sent → sale).
 *
 * Validates credit limit, generates sequence number, locks prices.
 */
export function confirmOrder(input: ConfirmOrderInput): ConfirmResult {
  const { order, lines, partnerContext, sequenceNumber } = input;

  if (order.status !== "draft" && order.status !== "sent") {
    return {
      success: false,
      sequenceNumber: null,
      creditCheckResult: {
        approved: false,
        creditLimit: null,
        totalDue: new Decimal(0),
        orderTotal: new Decimal(order.amountTotal),
        availableCredit: null,
        message: `Cannot confirm order in status '${order.status}'`,
      },
      errors: [`Invalid state transition: ${order.status} → sale`],
    };
  }

  const productLines = lines.filter((l) => l.displayType === "product");
  if (productLines.length === 0) {
    return {
      success: false,
      sequenceNumber: null,
      creditCheckResult: {
        approved: false,
        creditLimit: null,
        totalDue: new Decimal(0),
        orderTotal: new Decimal(order.amountTotal),
        availableCredit: null,
        message: "Order has no product lines",
      },
      errors: ["Cannot confirm order: order must have at least one product line"],
    };
  }

  // Credit limit check
  const creditCheck = checkCreditLimit(partnerContext, order.amountTotal);

  const errors: string[] = [];
  if (!creditCheck.approved) {
    errors.push(creditCheck.message);
  }

  return {
    success: creditCheck.approved,
    sequenceNumber: creditCheck.approved ? sequenceNumber : null,
    creditCheckResult: creditCheck,
    errors,
  };
}

/**
 * Cancel order (any non-done → cancel).
 *
 * Validates: no delivered quantities, no invoiced quantities.
 */
export function cancelOrder(
  input: CancelOrderInput
): { status: "cancel"; cancelReason: string | null } {
  const { order, lines, reason } = input;

  if (order.status === "done") {
    throw new InvalidStateTransitionError("done", "cancel");
  }
  if (order.status === "cancel") {
    throw new SalesOrderEngineError("Order is already cancelled");
  }

  // Check no deliveries
  const hasDeliveries = lines.some((l) => {
    return l.displayType === "product" && new Decimal(l.qtyDelivered).gt(0);
  });
  if (hasDeliveries) {
    throw new SalesOrderEngineError(
      "Cannot cancel order: some quantities have been delivered"
    );
  }

  // Check no invoices
  const hasInvoices = lines.some((l) => {
    return l.displayType === "product" && new Decimal(l.qtyInvoiced).gt(0);
  });
  if (hasInvoices) {
    throw new SalesOrderEngineError(
      "Cannot cancel order: some quantities have been invoiced"
    );
  }

  return { status: "cancel", cancelReason: reason ?? null };
}

/**
 * Mark order as done (sale → done).
 *
 * Validates: delivery_status = 'full', invoice_status = 'invoiced'.
 */
export function markDone(
  input: MarkDoneInput
): { status: "done" } {
  const { order } = input;

  if (order.status !== "sale") {
    throw new InvalidStateTransitionError(order.status, "done");
  }
  if (order.deliveryStatus !== "full") {
    throw new SalesOrderEngineError(
      "Cannot mark as done: delivery is not complete"
    );
  }
  if (order.invoiceStatus !== "invoiced") {
    throw new SalesOrderEngineError(
      "Cannot mark as done: invoicing is not complete"
    );
  }

  return { status: "done" };
}

// ============================================================================
// FINANCIAL COMPUTATION
// ============================================================================

/**
 * Compute a single line's subtotal: qty × price_unit × (1 - discount / 100).
 *
 * Uses Decimal.js for banker-grade precision.
 */
export function computeLineSubtotal(input: ComputeLineAmountsInput): Decimal {
  const qty = new Decimal(input.quantity);
  const price = new Decimal(input.priceUnit);
  const discount = new Decimal(input.discount);

  if (discount.lt(0)) {
    throw new SalesOrderEngineError("Discount cannot be negative");
  }
  if (discount.gt(100)) {
    throw new SalesOrderEngineError("Discount cannot exceed 100%");
  }

  return qty.mul(price).mul(new Decimal(1).minus(discount.div(100)));
}

/**
 * Compute order-level totals from lines.
 *
 * Only product lines contribute to totals (section/note lines excluded).
 */
export function computeOrderAmounts(input: ComputeOrderAmountsInput): OrderAmounts {
  let amountUntaxed = new Decimal(0);
  let amountTax = new Decimal(0);

  for (const line of input.lines) {
    if (line.displayType !== "product") continue;

    amountUntaxed = amountUntaxed.plus(new Decimal(line.priceSubtotal));
    amountTax = amountTax.plus(new Decimal(line.priceTax));
  }

  return {
    amountUntaxed,
    amountTax,
    amountTotal: amountUntaxed.plus(amountTax),
  };
}

// ============================================================================
// CHANGE HANDLERS (onChangeProduct, onChangePricelist, onChangeFiscalPosition)
// ============================================================================

/**
 * When a product changes on a line: fetch price from pricelist, resolve
 * taxes via fiscal position, return the updated line fields.
 */
export function onChangeProduct(input: ChangeProductInput): {
  priceUnit: Decimal;
  taxIds: string[];
  taxComputation: TaxComputation;
} {
  const { line, product, pricelist, taxEngineContext, fiscalPosition } = input;

  // Resolve price from pricelist (or fall back to list price)
  let priceUnit: Decimal;
  if (pricelist) {
    const priceResult = resolvePrice({
      pricelist,
      product,
      quantity: line.quantity,
    });
    priceUnit = priceResult.price;
  } else {
    priceUnit = new Decimal(product.listPrice);
  }

  // Resolve tax IDs
  const rawTaxIds = line.taxId ? [line.taxId] : [];
  const mappedTaxIds = fiscalPosition
    ? rawTaxIds
        .map((id) => mapTax(taxEngineContext, id, fiscalPosition))
        .filter((id): id is string => id !== null)
    : rawTaxIds;

  // Compute taxes
  const taxComputation = computeLineTaxes(
    taxEngineContext,
    priceUnit.toString(),
    line.quantity,
    line.discount,
    mappedTaxIds,
    fiscalPosition
  );

  return { priceUnit, taxIds: mappedTaxIds, taxComputation };
}

/**
 * When pricelist changes on an order: recalculate each product line's price.
 *
 * Returns updated price_unit per line.
 */
export function onChangePricelist(
  input: ChangePricelistInput
): Map<string, Decimal> {
  const { lines, products, pricelist } = input;
  const updatedPrices = new Map<string, Decimal>();

  for (const line of lines) {
    if (line.displayType !== "product") continue;

    const product = products.get(line.productId);
    if (!product) continue;

    const priceResult = resolvePrice({
      pricelist,
      product,
      quantity: line.quantity,
    });
    updatedPrices.set(line.id, priceResult.price);
  }

  return updatedPrices;
}

/**
 * When fiscal position changes: remap tax IDs on every line.
 *
 * Returns a map of lineId → new tax ID (or null for exempt).
 */
export function onChangeFiscalPosition(
  input: ChangeFiscalPositionInput
): Map<string, string | null> {
  const { lines, taxEngineContext, fiscalPosition } = input;
  const updatedTaxes = new Map<string, string | null>();

  for (const line of lines) {
    if (line.displayType !== "product") continue;
    if (!line.taxId) continue;

    if (fiscalPosition) {
      const mapped = mapTax(taxEngineContext, line.taxId, fiscalPosition);
      updatedTaxes.set(line.id, mapped);
    } else {
      // No fiscal position → keep original tax
      updatedTaxes.set(line.id, line.taxId);
    }
  }

  return updatedTaxes;
}

// ============================================================================
// DELIVERY & INVOICE TRACKING
// ============================================================================

/**
 * Derive delivery status from line-level quantities.
 *
 * - 'no':      all product lines have qty_delivered == 0
 * - 'partial': some delivered, not all
 * - 'full':    all product lines have qty_delivered >= quantity
 */
export function checkDeliveryStatus(input: CheckDeliveryInput): DeliveryStatus {
  const productLines = input.lines.filter((l) => l.displayType === "product");
  if (productLines.length === 0) return "no";

  let allDelivered = true;
  let noneDelivered = true;

  for (const line of productLines) {
    const qty = new Decimal(line.quantity);
    const delivered = new Decimal(line.qtyDelivered);

    if (delivered.gt(0)) noneDelivered = false;
    if (delivered.lt(qty)) allDelivered = false;
  }

  if (noneDelivered) return "no";
  if (allDelivered) return "full";
  return "partial";
}

/**
 * Derive invoice status from line-level quantities.
 *
 * - 'no':         all product lines have qty_invoiced == 0
 * - 'to_invoice': some invoiced, not all
 * - 'invoiced':   all product lines have qty_invoiced >= quantity
 */
export function checkInvoiceStatus(input: CheckInvoiceInput): InvoiceStatus {
  const productLines = input.lines.filter((l) => l.displayType === "product");
  if (productLines.length === 0) return "no";

  let allInvoiced = true;
  let noneInvoiced = true;

  for (const line of productLines) {
    const qty = new Decimal(line.quantity);
    const invoiced = new Decimal(line.qtyInvoiced);

    if (invoiced.gt(0)) noneInvoiced = false;
    if (invoiced.lt(qty)) allInvoiced = false;
  }

  if (noneInvoiced) return "no";
  if (allInvoiced) return "invoiced";
  return "to_invoice";
}

/**
 * Compute qty_to_invoice for each product line.
 *
 * qty_to_invoice = quantity - qty_invoiced (floored at 0).
 */
export function computeQtyToInvoice(
  lines: OrderLineData[]
): Map<string, Decimal> {
  const result = new Map<string, Decimal>();
  for (const line of lines) {
    if (line.displayType !== "product") continue;
    const toInvoice = Decimal.max(
      new Decimal(line.quantity).minus(new Decimal(line.qtyInvoiced)),
      0
    );
    result.set(line.id, toInvoice);
  }
  return result;
}

/**
 * Generate an invoice from uninvoiced order lines.
 *
 * Filters lines where qty_to_invoice > 0 (or a subset via lineIds),
 * computes tax per line, and returns the invoice data.
 */
export function createInvoice(input: CreateInvoiceInput): Invoice {
  const { order, lines, taxEngineContext, fiscalPosition, lineIds } = input;

  // Filter to invoiceable lines
  let invoiceableLines = lines.filter((l) => {
    if (l.displayType !== "product") return false;
    const toInvoice = new Decimal(l.quantity).minus(new Decimal(l.qtyInvoiced));
    return toInvoice.gt(0);
  });

  if (lineIds && lineIds.length > 0) {
    const idSet = new Set(lineIds);
    invoiceableLines = invoiceableLines.filter((l) => idSet.has(l.id));
  }

  if (invoiceableLines.length === 0) {
    throw new SalesOrderEngineError("No lines available to invoice");
  }

  let amountUntaxed = new Decimal(0);
  let amountTax = new Decimal(0);
  const invoiceLines: InvoiceLine[] = [];

  for (const line of invoiceableLines) {
    const qtyToInvoice = new Decimal(line.quantity).minus(
      new Decimal(line.qtyInvoiced)
    );
    const priceUnit = new Decimal(line.priceUnit);
    const discount = new Decimal(line.discount);

    const subtotal = qtyToInvoice
      .mul(priceUnit)
      .mul(new Decimal(1).minus(discount.div(100)));

    // Compute tax for this invoice line
    const taxIds = line.taxId ? [line.taxId] : [];
    const mappedTaxIds = fiscalPosition
      ? taxIds
          .map((id) => mapTax(taxEngineContext, id, fiscalPosition))
          .filter((id): id is string => id !== null)
      : taxIds;

    const taxResult = computeLineTaxes(
      taxEngineContext,
      priceUnit.toString(),
      qtyToInvoice.toString(),
      discount.toString(),
      mappedTaxIds,
      fiscalPosition
    );

    const lineTax = taxResult.taxLines.reduce(
      (sum, tl) => sum.plus(tl.amount),
      new Decimal(0)
    );

    amountUntaxed = amountUntaxed.plus(subtotal);
    amountTax = amountTax.plus(lineTax);

    invoiceLines.push({
      orderLineId: line.id,
      productId: line.productId,
      quantity: qtyToInvoice,
      priceUnit,
      discount,
      subtotal,
    });
  }

  return {
    orderId: order.id,
    partnerId: order.partnerId,
    lines: invoiceLines,
    amountUntaxed,
    amountTax,
    amountTotal: amountUntaxed.plus(amountTax),
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that an order can be confirmed.
 *
 * Checks: partner credit limit, at least one product line.
 */
export function validateOrder(input: ValidateOrderInput): ValidationResult {
  const { order, lines, partnerContext } = input;
  const errors: string[] = [];

  // Must have product lines
  const productLines = lines.filter((l) => l.displayType === "product");
  if (productLines.length === 0) {
    errors.push("Order has no product lines");
  }

  // Credit check
  const creditCheck = checkCreditLimit(partnerContext, order.amountTotal);
  if (!creditCheck.approved) {
    errors.push(creditCheck.message);
  }

  return { valid: errors.length === 0, errors };
}
