import { and, eq, isNull } from "drizzle-orm";

import { db } from "../../db/index.js";
import {
  returnOrderLines,
  returnOrders,
  salesOrderLines,
  salesOrders,
} from "../../db/schema/index.js";
import { NotFoundError, ValidationError } from "../../middleware/errorHandler.js";
import {
  recordDomainEvent,
  recordValidationIssues,
} from "../../utils/audit-logs.js";
import {
  generateCreditNote,
  inspectReturn,
  returnOrderStateMachine,
  validateReturnQuantities,
  type CreditNote,
  type InspectionResult,
  type ReturnValidationResult,
} from "./logic/returns-engine.js";

/**
 * Input for validateReturnOrder service function.
 */
export interface ValidateReturnOrderInput {
  tenantId: number;
  returnOrderId: string;
  actorId?: number;
}

/**
 * Result of validateReturnOrder service call.
 */
export interface ValidateReturnOrderResult {
  returnOrder: typeof returnOrders.$inferSelect;
  returnLines: Array<typeof returnOrderLines.$inferSelect>;
  sourceOrder: typeof salesOrders.$inferSelect;
  sourceOrderLines: Array<typeof salesOrderLines.$inferSelect>;
  validation: ReturnValidationResult;
}

/**
 * Input for approveReturn service function.
 */
export interface ApproveReturnInput {
  tenantId: number;
  returnOrderId: string;
  actorId: number;
  approvedDate?: Date;
}

/**
 * Result of approveReturn service call.
 */
export interface ApproveReturnResult {
  returnOrder: typeof returnOrders.$inferSelect;
  validation: ReturnValidationResult;
}

/**
 * Input for receiveReturn service function.
 */
export interface ReceiveReturnInput {
  tenantId: number;
  returnOrderId: string;
  actorId?: number;
}

/**
 * Result of receiveReturn service call.
 */
export interface ReceiveReturnResult {
  returnOrder: typeof returnOrders.$inferSelect;
}

/**
 * Input for inspectReturn service function.
 */
export interface InspectReturnInput {
  tenantId: number;
  returnOrderId: string;
  inspectionResults: Array<{
    lineId: string;
    condition: "new" | "used" | "damaged" | "defective";
    notes?: string;
  }>;
  actorId?: number;
}

/**
 * Result of inspectReturn service call.
 */
export interface InspectReturnResult {
  returnOrder: typeof returnOrders.$inferSelect;
  returnLines: Array<typeof returnOrderLines.$inferSelect>;
  inspection: InspectionResult;
}

/**
 * Input for generateCreditNote service function.
 */
export interface GenerateCreditNoteInput {
  tenantId: number;
  returnOrderId: string;
  actorId?: number;
}

/**
 * Result of generateCreditNote service call.
 */
export interface GenerateCreditNoteResult {
  returnOrder: typeof returnOrders.$inferSelect;
  returnLines: Array<typeof returnOrderLines.$inferSelect>;
  validation: ReturnValidationResult;
  creditNote: CreditNote;
}

/**
 * Validate a return order's quantities and credit amounts against the source order.
 * Records validation issues in audit trail if actorId is provided.
 */
export async function validateReturnOrder(
  input: ValidateReturnOrderInput
): Promise<ValidateReturnOrderResult> {
  const returnOrder = await loadReturnOrder(input.tenantId, input.returnOrderId);
  const returnLines = await loadReturnOrderLines(input.tenantId, input.returnOrderId);
  const sourceOrder = await loadSalesOrder(input.tenantId, returnOrder.sourceOrderId);
  const sourceOrderLines = await loadSalesOrderLines(input.tenantId, returnOrder.sourceOrderId);

  const validation = validateReturnQuantities({
    returnOrder,
    returnLines,
    sourceOrder,
    sourceOrderLines: sourceOrderLines.map((line) => ({
      id: line.id,
      productId: line.productId,
      qtyDelivered: line.qtyDelivered,
      priceUnit: line.priceUnit,
    })),
  });

  // Record invariant checks for audit trail (if actorId provided)
  if (input.actorId && validation.issues.length > 0) {
    await recordValidationIssues({
      tenantId: input.tenantId,
      entityType: "return_order",
      entityId: returnOrder.id,
      issues: validation.issues,
      actorId: input.actorId,
    });
  }

  // Record domain event (if actorId provided)
  if (input.actorId) {
    await recordDomainEvent({
      tenantId: input.tenantId,
      eventType: "RETURN_VALIDATED",
      entityType: "return_order",
      entityId: returnOrder.id,
      payload: {
        valid: validation.valid,
        errorCount: validation.errors.length,
        issueCount: validation.issues.length,
      },
      triggeredBy: input.actorId,
      actorId: input.actorId,
    });
  }

  return {
    returnOrder,
    returnLines,
    sourceOrder,
    sourceOrderLines,
    validation,
  };
}

/**
 * Approve a return order after validation.
 * Enforces draft → approved state transition with validation guard.
 * Updates return order status, approvedBy, and approvedDate.
 */
export async function approveReturn(input: ApproveReturnInput): Promise<ApproveReturnResult> {
  const context = await validateReturnOrder({
    tenantId: input.tenantId,
    returnOrderId: input.returnOrderId,
    actorId: input.actorId,
  });

  if (!context.validation.valid) {
    const issueSummary = context.validation.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => `${issue.code}: ${issue.message}`)
      .join("; ");

    throw new ValidationError(`Return order ${context.returnOrder.id} is invalid: ${issueSummary}`);
  }

  // Enforce state transition guard
  returnOrderStateMachine.assertTransition(context.returnOrder.status, "approved", {
    validationValid: true,
  });

  const approvedDate = input.approvedDate ?? new Date();

  const [updatedReturnOrder] = await db
    .update(returnOrders)
    .set({
      status: "approved",
      approvedBy: input.actorId,
      approvedDate,
      updatedBy: input.actorId,
    })
    .where(
      and(
        eq(returnOrders.tenantId, input.tenantId),
        eq(returnOrders.id, input.returnOrderId),
        isNull(returnOrders.deletedAt)
      )
    )
    .returning();

  if (!updatedReturnOrder) {
    throw new NotFoundError(
      `Return order ${input.returnOrderId} was not found for tenant ${input.tenantId}.`
    );
  }

  // Record domain event
  await recordDomainEvent({
    tenantId: input.tenantId,
    eventType: "RETURN_APPROVED",
    entityType: "return_order",
    entityId: updatedReturnOrder.id,
    payload: {
      sourceOrderId: updatedReturnOrder.sourceOrderId,
      approvedBy: input.actorId,
      approvedDate: approvedDate.toISOString(),
    },
    triggeredBy: input.actorId,
    actorId: input.actorId,
  });

  return {
    returnOrder: updatedReturnOrder,
    validation: context.validation,
  };
}

/**
 * Mark a return order as received.
 * Enforces approved → received state transition.
 * Updates return order status to "received".
 */
export async function receiveReturn(input: ReceiveReturnInput): Promise<ReceiveReturnResult> {
  const returnOrder = await loadReturnOrder(input.tenantId, input.returnOrderId);

  // Enforce state transition
  returnOrderStateMachine.assertTransition(returnOrder.status, "received");

  const [updatedReturnOrder] = await db
    .update(returnOrders)
    .set({
      status: "received",
      updatedBy: input.actorId,
    })
    .where(
      and(
        eq(returnOrders.tenantId, input.tenantId),
        eq(returnOrders.id, input.returnOrderId),
        isNull(returnOrders.deletedAt)
      )
    )
    .returning();

  if (!updatedReturnOrder) {
    throw new NotFoundError(
      `Return order ${input.returnOrderId} was not found for tenant ${input.tenantId}.`
    );
  }

  // Record domain event (if actorId provided)
  if (input.actorId) {
    await recordDomainEvent({
      tenantId: input.tenantId,
      eventType: "RETURN_RECEIVED",
      entityType: "return_order",
      entityId: updatedReturnOrder.id,
      payload: {
        sourceOrderId: updatedReturnOrder.sourceOrderId,
      },
      triggeredBy: input.actorId,
      actorId: input.actorId,
    });
  }

  return {
    returnOrder: updatedReturnOrder,
  };
}

/**
 * Inspect received return items and update line conditions.
 * Enforces received → inspected state transition with inspection complete guard.
 * Updates return order status to "inspected" and line conditions.
 */
export async function inspectReturnOrder(
  input: InspectReturnInput
): Promise<InspectReturnResult> {
  const returnOrder = await loadReturnOrder(input.tenantId, input.returnOrderId);
  const returnLines = await loadReturnOrderLines(input.tenantId, input.returnOrderId);

  // Call engine inspection logic
  const inspection = inspectReturn({
    returnOrder,
    returnLines,
    inspectionResults: input.inspectionResults,
  });

  // Enforce state transition guard
  returnOrderStateMachine.assertTransition(returnOrder.status, "inspected", {
    inspectionComplete: true,
  });

  // Update return order status
  const [updatedReturnOrder] = await db
    .update(returnOrders)
    .set({
      status: "inspected",
      updatedBy: input.actorId,
    })
    .where(
      and(
        eq(returnOrders.tenantId, input.tenantId),
        eq(returnOrders.id, input.returnOrderId),
        isNull(returnOrders.deletedAt)
      )
    )
    .returning();

  if (!updatedReturnOrder) {
    throw new NotFoundError(
      `Return order ${input.returnOrderId} was not found for tenant ${input.tenantId}.`
    );
  }

  // Update line conditions
  await Promise.all(
    inspection.conditionUpdates.map(async (update) => {
      await db
        .update(returnOrderLines)
        .set({
          condition: update.newCondition,
        })
        .where(
          and(
            eq(returnOrderLines.tenantId, input.tenantId),
            eq(returnOrderLines.id, update.lineId)
          )
        );
    })
  );

  // Reload lines to get updated conditions
  const updatedLines = await loadReturnOrderLines(input.tenantId, input.returnOrderId);

  // Record domain event (if actorId provided)
  if (input.actorId) {
    await recordDomainEvent({
      tenantId: input.tenantId,
      eventType: "RETURN_INSPECTED",
      entityType: "return_order",
      entityId: updatedReturnOrder.id,
      payload: {
        linesInspected: inspection.linesInspected,
        conditionUpdates: inspection.conditionUpdates,
      },
      triggeredBy: input.actorId,
      actorId: input.actorId,
    });
  }

  return {
    returnOrder: updatedReturnOrder,
    returnLines: updatedLines,
    inspection,
  };
}

/**
 * Generate a credit note (reverse invoice) from an inspected return order.
 * Enforces inspected → credited state transition with validation and creditable amount guards.
 * Returns credit note draft for invoice module to process.
 */
export async function generateReturnCreditNote(
  input: GenerateCreditNoteInput
): Promise<GenerateCreditNoteResult> {
  const context = await validateReturnOrder({
    tenantId: input.tenantId,
    returnOrderId: input.returnOrderId,
    actorId: input.actorId,
  });

  if (!context.validation.valid) {
    const issueSummary = context.validation.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => `${issue.code}: ${issue.message}`)
      .join("; ");

    throw new ValidationError(`Return order ${context.returnOrder.id} is invalid: ${issueSummary}`);
  }

  // Calculate creditable amount
  const hasCreditableAmount = context.returnLines.some(
    (line) => line.creditAmount && parseFloat(line.creditAmount) > 0
  );

  // Call engine credit note generation logic
  const creditNote = generateCreditNote({
    returnOrder: context.returnOrder,
    returnLines: context.returnLines,
    validation: context.validation,
  });

  // Enforce state transition guard
  returnOrderStateMachine.assertTransition(context.returnOrder.status, "credited", {
    validationValid: true,
    hasCreditableAmount,
  });

  // Update return order status
  const [updatedReturnOrder] = await db
    .update(returnOrders)
    .set({
      status: "credited",
      updatedBy: input.actorId,
    })
    .where(
      and(
        eq(returnOrders.tenantId, input.tenantId),
        eq(returnOrders.id, input.returnOrderId),
        isNull(returnOrders.deletedAt)
      )
    )
    .returning();

  if (!updatedReturnOrder) {
    throw new NotFoundError(
      `Return order ${input.returnOrderId} was not found for tenant ${input.tenantId}.`
    );
  }

  // Record domain event (if actorId provided)
  if (input.actorId) {
    await recordDomainEvent({
      tenantId: input.tenantId,
      eventType: "CREDIT_NOTE_GENERATED",
      entityType: "return_order",
      entityId: updatedReturnOrder.id,
      payload: {
        partnerId: creditNote.partnerId,
        sourceOrderId: creditNote.sourceOrderId,
        lineCount: creditNote.lines.length,
        amountTotal: creditNote.amountTotal.toString(),
      },
      triggeredBy: input.actorId,
      actorId: input.actorId,
    });
  }

  return {
    returnOrder: updatedReturnOrder,
    returnLines: context.returnLines,
    validation: context.validation,
    creditNote,
  };
}

/**
 * Load a return order by ID with tenant scoping.
 * @throws {NotFoundError} if return order not found
 */
async function loadReturnOrder(tenantId: number, returnOrderId: string) {
  const [returnOrder] = await db
    .select()
    .from(returnOrders)
    .where(
      and(
        eq(returnOrders.tenantId, tenantId),
        eq(returnOrders.id, returnOrderId),
        isNull(returnOrders.deletedAt)
      )
    )
    .limit(1);

  if (!returnOrder) {
    throw new NotFoundError(
      `Return order ${returnOrderId} was not found for tenant ${tenantId}.`
    );
  }

  return returnOrder;
}

/**
 * Load return order lines by return order ID with tenant scoping.
 */
async function loadReturnOrderLines(tenantId: number, returnOrderId: string) {
  return db
    .select()
    .from(returnOrderLines)
    .where(
      and(
        eq(returnOrderLines.tenantId, tenantId),
        eq(returnOrderLines.returnOrderId, returnOrderId)
      )
    );
}

/**
 * Load a sales order by ID with tenant scoping.
 * @throws {NotFoundError} if sales order not found
 */
async function loadSalesOrder(tenantId: number, salesOrderId: string) {
  const [salesOrder] = await db
    .select()
    .from(salesOrders)
    .where(
      and(
        eq(salesOrders.tenantId, tenantId),
        eq(salesOrders.id, salesOrderId),
        isNull(salesOrders.deletedAt)
      )
    )
    .limit(1);

  if (!salesOrder) {
    throw new NotFoundError(`Sales order ${salesOrderId} was not found for tenant ${tenantId}.`);
  }

  return salesOrder;
}

/**
 * Load sales order lines by sales order ID with tenant scoping.
 */
async function loadSalesOrderLines(tenantId: number, salesOrderId: string) {
  return db
    .select()
    .from(salesOrderLines)
    .where(
      and(
        eq(salesOrderLines.tenantId, tenantId),
        eq(salesOrderLines.orderId, salesOrderId)
      )
    );
}
