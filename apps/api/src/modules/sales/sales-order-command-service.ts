import { requireMutationPolicyById } from "@afenda/db";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "../../db/index.js";
import { partners, salesOrderLines, salesOrders } from "../../db/schema/index.js";
import { upsertProjectionCheckpoint } from "../../events/projectionCheckpointStore.js";
import { buildProjectionCheckpoint } from "../../events/projectionRuntime.js";
import { ConflictError, NotFoundError } from "../../middleware/errorHandler.js";
import {
  createProjectionDriftValidator,
  executeCommandRuntime,
  type ExecuteMutationCommandResult,
} from "../../policy/command-runtime-spine.js";
import type { MutationEventPayload } from "../../policy/mutation-command-gateway.js";
import {
  cancelOrder,
  confirmOrder,
  type CancelOrderInput,
  type ConfirmResult,
  type OrderData,
  type OrderLineData,
} from "./logic/sales-order-engine.js";
import type { CreditCheckResult, PartnerContext } from "./logic/partner-engine.js";

type SalesOrderRecord = typeof salesOrders.$inferSelect;
type SalesOrderLineRecord = typeof salesOrderLines.$inferSelect;
type PartnerRecord = typeof partners.$inferSelect;
type SalesOrderPatch = Partial<SalesOrderRecord>;

const SALES_ORDER_EVENT_ONLY_POLICY = requireMutationPolicyById(
  "sales.sales_order.command_projection"
);

const SALES_ORDER_PROJECTION_DEFINITION = {
  name: "sales_order.read_model",
  version: {
    version: 1,
    schemaHash: "sales_order_read_model_v1",
  },
};
const assertSalesOrderProjectionDrift = createProjectionDriftValidator({
  aggregateType: "sales_order",
  definition: SALES_ORDER_PROJECTION_DEFINITION,
});

export interface ConfirmSalesOrderInput {
  tenantId: number;
  orderId: string;
  actorId: number;
  source?: string;
}

export interface CancelSalesOrderInput extends ConfirmSalesOrderInput {
  reason?: string;
}

export interface SalesOrderCommandResult {
  order: SalesOrderRecord;
  mutationPolicy: ExecuteMutationCommandResult<SalesOrderRecord>["mutationPolicy"];
  event?: ExecuteMutationCommandResult<SalesOrderRecord>["event"];
}

export interface ConfirmSalesOrderResult extends SalesOrderCommandResult {
  creditCheck: CreditCheckResult;
}

export async function confirmSalesOrder(
  input: ConfirmSalesOrderInput
): Promise<ConfirmSalesOrderResult> {
  const order = await loadSalesOrder(input.tenantId, input.orderId);
  const lines = await loadSalesOrderLines(input.tenantId, input.orderId);
  const partner = await loadPartner(input.tenantId, order.partnerId);

  const confirmation = confirmOrder({
    order: toOrderData(order),
    lines: lines.map(toOrderLineData),
    partnerContext: toPartnerContext(partner),
    sequenceNumber: resolveSequenceNumber(order),
  });

  if (!confirmation.success) {
    throw new ConflictError(
      confirmation.errors.join("; ") || "Sales order confirmation was rejected by policy."
    );
  }

  const patch = buildConfirmedOrderPatch(order, confirmation, input.actorId);
  const projectedOrder = applyOrderPatch(order, patch);
  const commandResult = await executeSalesOrderCommand({
    tenantId: input.tenantId,
    orderId: input.orderId,
    actorId: input.actorId,
    source: input.source ?? "api.sales.orders.confirm",
    nextOrder: projectedOrder,
    persistPatch: patch,
  });

  return {
    order: commandResult.record ?? projectedOrder,
    mutationPolicy: commandResult.mutationPolicy,
    event: commandResult.event,
    creditCheck: confirmation.creditCheckResult,
  };
}

export async function cancelSalesOrder(
  input: CancelSalesOrderInput
): Promise<SalesOrderCommandResult> {
  const order = await loadSalesOrder(input.tenantId, input.orderId);
  const lines = await loadSalesOrderLines(input.tenantId, input.orderId);

  let cancellation: ReturnType<typeof cancelOrder>;
  try {
    cancellation = cancelOrder({
      order: toOrderData(order),
      lines: lines.map(toOrderLineData),
      reason: input.reason,
    });
  } catch (error) {
    throw mapOrderCommandError(error);
  }

  const patch = buildCancelledOrderPatch(cancellation, input.actorId);
  const projectedOrder = applyOrderPatch(order, patch);
  const commandResult = await executeSalesOrderCommand({
    tenantId: input.tenantId,
    orderId: input.orderId,
    actorId: input.actorId,
    source: input.source ?? "api.sales.orders.cancel",
    nextOrder: projectedOrder,
    persistPatch: patch,
  });

  return {
    order: commandResult.record ?? projectedOrder,
    mutationPolicy: commandResult.mutationPolicy,
    event: commandResult.event,
  };
}

async function executeSalesOrderCommand(input: {
  tenantId: number;
  orderId: string;
  actorId: number;
  source: string;
  nextOrder: SalesOrderRecord;
  persistPatch: SalesOrderPatch;
}): Promise<ExecuteMutationCommandResult<SalesOrderRecord>> {
  return executeCommandRuntime({
    model: "sales_order",
    operation: "update",
    recordId: input.orderId,
    actorId: String(input.actorId),
    source: input.source,
    policies: [SALES_ORDER_EVENT_ONLY_POLICY],
    nextRecord: input.nextOrder,
    mutate: async () =>
      persistSalesOrderPatch({
        tenantId: input.tenantId,
        orderId: input.orderId,
        patch: input.persistPatch,
      }),
    loadProjectionState: async () =>
      loadSalesOrderProjectionState({
        tenantId: input.tenantId,
        orderId: input.orderId,
      }),
    projectEvent: ({ currentState, nextRecord }) => {
      if (nextRecord) {
        return nextRecord;
      }

      return currentState;
    },
    persistProjectionState: async ({ aggregateId, projectedState, event }) => {
      if (!projectedState) {
        return;
      }

      await persistSalesOrderProjectionState({
        tenantId: input.tenantId,
        orderId: aggregateId,
        patch: input.persistPatch,
        eventVersion: event.version,
        eventTimestamp: event.timestamp,
      });
    },
  });
}

async function loadSalesOrderProjectionState(input: {
  tenantId: number;
  orderId: string;
}): Promise<SalesOrderRecord> {
  const order = await loadSalesOrder(input.tenantId, input.orderId);
  await assertSalesOrderProjectionDrift(input.orderId);
  return order;
}

async function persistSalesOrderProjectionState(input: {
  tenantId: number;
  orderId: string;
  patch: SalesOrderPatch;
  eventVersion: number;
  eventTimestamp?: string;
}): Promise<void> {
  await persistSalesOrderPatch({
    tenantId: input.tenantId,
    orderId: input.orderId,
    patch: input.patch,
  });

  upsertProjectionCheckpoint(
    buildProjectionCheckpoint({
      definition: SALES_ORDER_PROJECTION_DEFINITION,
      aggregateType: "sales_order",
      aggregateId: input.orderId,
      lastAppliedVersion: input.eventVersion,
      updatedAt: input.eventTimestamp,
    })
  );
}

function buildConfirmedOrderPatch(
  order: SalesOrderRecord,
  confirmation: ConfirmResult,
  actorId: number
): SalesOrderPatch {
  const now = new Date();

  return {
    status: "sale",
    sequenceNumber:
      confirmation.sequenceNumber ?? order.sequenceNumber ?? resolveSequenceNumber(order),
    confirmationDate: now,
    confirmedBy: actorId,
    creditCheckPassed: confirmation.creditCheckResult.approved,
    creditCheckAt: now,
    creditCheckBy: actorId,
    creditLimitAtCheck: confirmation.creditCheckResult.creditLimit?.toString() ?? null,
    updatedAt: now,
    updatedBy: actorId,
  };
}

function buildCancelledOrderPatch(
  cancellation: ReturnType<typeof cancelOrder>,
  actorId: number
): SalesOrderPatch {
  const now = new Date();

  return {
    status: cancellation.status,
    cancelReason: cancellation.cancelReason,
    updatedAt: now,
    updatedBy: actorId,
  };
}

function applyOrderPatch(order: SalesOrderRecord, patch: SalesOrderPatch): SalesOrderRecord {
  return {
    ...order,
    ...patch,
  };
}

async function loadSalesOrder(tenantId: number, orderId: string): Promise<SalesOrderRecord> {
  const [order] = await db
    .select()
    .from(salesOrders)
    .where(
      and(
        eq(salesOrders.tenantId, tenantId),
        eq(salesOrders.id, orderId),
        isNull(salesOrders.deletedAt)
      )
    )
    .limit(1);

  if (!order) {
    throw new NotFoundError(`Sales order ${orderId} was not found for tenant ${tenantId}.`);
  }

  return order;
}

async function loadSalesOrderLines(
  tenantId: number,
  orderId: string
): Promise<SalesOrderLineRecord[]> {
  return db
    .select()
    .from(salesOrderLines)
    .where(
      and(
        eq(salesOrderLines.tenantId, tenantId),
        eq(salesOrderLines.orderId, orderId),
        isNull(salesOrderLines.deletedAt)
      )
    );
}

async function loadPartner(tenantId: number, partnerId: string): Promise<PartnerRecord> {
  const [partner] = await db
    .select()
    .from(partners)
    .where(
      and(eq(partners.tenantId, tenantId), eq(partners.id, partnerId), isNull(partners.deletedAt))
    )
    .limit(1);

  if (!partner) {
    throw new NotFoundError(`Partner ${partnerId} was not found for tenant ${tenantId}.`);
  }

  return partner;
}

async function persistSalesOrderPatch(input: {
  tenantId: number;
  orderId: string;
  patch: SalesOrderPatch;
}): Promise<SalesOrderRecord> {
  const [order] = await db
    .update(salesOrders)
    .set(input.patch)
    .where(
      and(
        eq(salesOrders.tenantId, input.tenantId),
        eq(salesOrders.id, input.orderId),
        isNull(salesOrders.deletedAt)
      )
    )
    .returning();

  if (!order) {
    throw new NotFoundError(
      `Sales order ${input.orderId} was not found for tenant ${input.tenantId}.`
    );
  }

  return order;
}

function toOrderData(order: SalesOrderRecord): OrderData {
  return {
    id: order.id,
    tenantId: order.tenantId,
    status: order.status,
    partnerId: order.partnerId,
    pricelistId: order.pricelistId,
    fiscalPositionId: order.fiscalPositionId,
    currencyId: order.currencyId,
    companyCurrencyRate: order.companyCurrencyRate,
    amountUntaxed: order.amountUntaxed,
    amountTax: order.amountTax,
    amountTotal: order.amountTotal,
    invoiceStatus: order.invoiceStatus,
    deliveryStatus: order.deliveryStatus,
  };
}

function toOrderLineData(line: SalesOrderLineRecord): OrderLineData {
  return {
    id: line.id,
    orderId: line.orderId,
    productId: line.productId,
    taxId: line.taxId,
    quantity: line.quantity,
    priceUnit: line.priceUnit,
    discount: line.discount,
    priceSubtotal: line.priceSubtotal,
    priceTax: line.priceTax,
    priceTotal: line.priceTotal,
    qtyDelivered: line.qtyDelivered,
    qtyToInvoice: line.qtyToInvoice,
    qtyInvoiced: line.qtyInvoiced,
    invoiceStatus: line.invoiceStatus,
    displayType: line.displayType,
  };
}

function toPartnerContext(partner: PartnerRecord): PartnerContext {
  return {
    partner: {
      id: partner.id,
      creditLimit: partner.creditLimit,
      totalDue: partner.totalDue,
    },
  };
}

function resolveSequenceNumber(order: Pick<SalesOrderRecord, "sequenceNumber" | "name" | "id">) {
  return order.sequenceNumber ?? order.name ?? `SO-${order.id.slice(0, 8).toUpperCase()}`;
}

function mapOrderCommandError(error: unknown): Error {
  if (error instanceof Error) {
    return new ConflictError(error.message);
  }

  return new ConflictError("Sales-order command failed.");
}

export type { MutationEventPayload };
