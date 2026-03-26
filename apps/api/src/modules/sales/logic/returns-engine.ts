import { Decimal } from "decimal.js";
import type {
  ReturnCondition,
  ReturnOrder,
  ReturnOrderLine,
  ReturnStatus,
  SalesOrder,
  SalesOrderLine,
} from "@afenda/db/schema-domain";
import { StateMachine, type TransitionRule } from "../../../utils/state-machine.js";

export type ReturnInvariantCode =
  | "INVALID_RETURN_STATUS"
  | "EMPTY_RETURN"
  | "NEGATIVE_QUANTITY"
  | "QUANTITY_EXCEEDS_DELIVERED"
  | "NEGATIVE_PRICING"
  | "CREDIT_TOTAL_MISMATCH"
  | "INVALID_SOURCE_ORDER"
  | "INVALID_APPROVAL_STATE"
  | "MISSING_INSPECTION_DATA"
  | "NO_CREDITABLE_QUANTITY";

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  code: ReturnInvariantCode;
  severity: ValidationSeverity;
  message: string;
  context?: Record<string, unknown>;
}

export interface ReturnLineValidation {
  lineId: ReturnOrderLine["id"];
  productId: ReturnOrderLine["productId"];
  returnQuantity: string;
  deliveredQuantity: string;
  quantityValid: boolean;
  creditAmount: string;
  expectedCredit: string;
  creditValid: boolean;
}

export interface ReturnValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  errors: string[];
  lineChecks: ReturnLineValidation[];
}

export interface ValidateReturnQuantitiesInput {
  returnOrder: Pick<ReturnOrder, "id" | "sourceOrderId" | "status">;
  returnLines: Array<
    Pick<ReturnOrderLine, "id" | "productId" | "quantity" | "unitPrice" | "creditAmount">
  >;
  sourceOrder: Pick<SalesOrder, "id">;
  sourceOrderLines: Array<Pick<SalesOrderLine, "id" | "productId" | "qtyDelivered" | "priceUnit">>;
}

export interface CreditNoteLineItem {
  returnLineId: ReturnOrderLine["id"];
  productId: ReturnOrderLine["productId"];
  quantity: Decimal;
  unitPrice: Decimal;
  creditAmount: Decimal;
}

export interface CreditNote {
  returnOrderId: ReturnOrder["id"];
  partnerId: ReturnOrder["partnerId"];
  sourceOrderId: ReturnOrder["sourceOrderId"];
  lines: CreditNoteLineItem[];
  amountUntaxed: Decimal;
  amountTax: Decimal;
  amountTotal: Decimal;
}

export interface GenerateCreditNoteInput {
  returnOrder: Pick<ReturnOrder, "id" | "partnerId" | "sourceOrderId" | "status">;
  returnLines: Array<
    Pick<ReturnOrderLine, "id" | "productId" | "quantity" | "unitPrice" | "creditAmount">
  >;
  validation?: Pick<ReturnValidationResult, "valid" | "issues">;
  taxPolicy?: TaxPolicy;
}

export interface TaxPolicy {
  computeTax: (amountUntaxed: Decimal) => Decimal;
  round: (amount: Decimal) => Decimal;
}

export interface InspectReturnInput {
  returnOrder: Pick<ReturnOrder, "id" | "status">;
  returnLines: Array<Pick<ReturnOrderLine, "id" | "condition">>;
  inspectionResults: Array<{
    lineId: ReturnOrderLine["id"];
    condition: ReturnCondition;
    notes?: string;
  }>;
}

export interface InspectionResult {
  returnOrderId: ReturnOrder["id"];
  linesInspected: number;
  conditionUpdates: Array<{
    lineId: ReturnOrderLine["id"];
    oldCondition: ReturnCondition;
    newCondition: ReturnCondition;
  }>;
}

/**
 * Return state transitions.
 *
 * Lifecycle: draft → approved → received → inspected → credited
 *                ↓
 *             cancelled
 *
 * Guards:
 * - approved: requires valid quantities
 * - credited: requires inspection complete and valid return
 */
const RETURN_STATE_MACHINE_RULES: TransitionRule<ReturnStatus>[] = [
  {
    from: "draft",
    to: "approved",
    guard: (ctx) => {
      const validationValid = ctx.validationValid === true;
      return validationValid;
    },
    description: "Approve draft return after validation",
  },
  {
    from: "approved",
    to: "received",
    description: "Mark return as physically received",
  },
  {
    from: "received",
    to: "inspected",
    guard: (ctx) => {
      const inspectionComplete = ctx.inspectionComplete === true;
      return inspectionComplete;
    },
    description: "Complete inspection of received items",
  },
  {
    from: "inspected",
    to: "credited",
    guard: (ctx) => {
      const validationValid = ctx.validationValid === true;
      const hasCredit = ctx.hasCreditableAmount === true;
      return validationValid && hasCredit;
    },
    description: "Generate credit note for inspected return",
  },
  {
    from: "draft",
    to: "cancelled",
    description: "Cancel draft return",
  },
  {
    from: "approved",
    to: "cancelled",
    description: "Cancel approved return before receipt",
  },
];

export const returnOrderStateMachine = new StateMachine<ReturnStatus>(RETURN_STATE_MACHINE_RULES);

const DEFAULT_TAX_POLICY: TaxPolicy = {
  computeTax: () => new Decimal(0),
  round: (amount) => amount.toDecimalPlaces(2),
};

/**
 * Validates return quantities against delivered quantities from source order.
 *
 * Invariants:
 * - RTRN-1: Return quantity must be > 0
 * - RTRN-2: Return quantity ≤ delivered quantity
 * - RTRN-3: Credit amount = quantity × unit price (within $0.01)
 * - RTRN-4: Return must have at least one line
 * - RTRN-5: Source order must be valid
 *
 * @param input - Return order, lines, source order, and source lines
 * @returns Validation result with issues and line checks
 */
export function validateReturnQuantities(
  input: ValidateReturnQuantitiesInput
): ReturnValidationResult {
  const issues: ValidationIssue[] = [];
  const lineChecks: ReturnLineValidation[] = [];

  // RTRN-5: Source order validation
  if (!input.sourceOrder) {
    issues.push({
      code: "INVALID_SOURCE_ORDER",
      severity: "error",
      message: "Return must reference a valid source order",
      context: { returnOrderId: input.returnOrder.id },
    });
    return {
      valid: false,
      issues,
      errors: issues.filter((i) => i.severity === "error").map((i) => i.message),
      lineChecks,
    };
  }

  // RTRN-4: Empty return check
  if (input.returnLines.length === 0) {
    issues.push({
      code: "EMPTY_RETURN",
      severity: "error",
      message: "Return order must contain at least one line",
      context: { returnOrderId: input.returnOrder.id },
    });
    return {
      valid: false,
      issues,
      errors: issues.filter((i) => i.severity === "error").map((i) => i.message),
      lineChecks,
    };
  }

  // Validate each return line
  for (const returnLine of input.returnLines) {
    const returnQty = new Decimal(returnLine.quantity);
    const unitPrice = new Decimal(returnLine.unitPrice);
    const creditAmount = new Decimal(returnLine.creditAmount);

    // Find corresponding source order line
    const sourceLine = input.sourceOrderLines.find(
      (sl) => sl.productId === returnLine.productId
    );

    let deliveredQty = new Decimal(0);
    let quantityValid = false;

    if (sourceLine) {
      deliveredQty = new Decimal(sourceLine.qtyDelivered);
    }

    // RTRN-1: Negative quantity check
    if (returnQty.lte(0)) {
      issues.push({
        code: "NEGATIVE_QUANTITY",
        severity: "error",
        message: `Return line ${returnLine.id} has non-positive quantity`,
        context: {
          lineId: returnLine.id,
          productId: returnLine.productId,
          quantity: returnLine.quantity,
        },
      });
    } else if (!sourceLine) {
      // Product not found in source order
      issues.push({
        code: "QUANTITY_EXCEEDS_DELIVERED",
        severity: "error",
        message: `Return line ${returnLine.id} references product not in source order`,
        context: {
          lineId: returnLine.id,
          productId: returnLine.productId,
        },
      });
    } else if (returnQty.gt(deliveredQty)) {
      // RTRN-2: Quantity exceeds delivered
      issues.push({
        code: "QUANTITY_EXCEEDS_DELIVERED",
        severity: "error",
        message: `Return quantity ${returnQty.toString()} exceeds delivered quantity ${deliveredQty.toString()}`,
        context: {
          lineId: returnLine.id,
          productId: returnLine.productId,
          returnQty: returnQty.toString(),
          deliveredQty: deliveredQty.toString(),
        },
      });
    } else {
      quantityValid = true;
    }

    // RTRN-3: Credit amount validation
    const expectedCredit = returnQty.mul(unitPrice);
    const creditDiff = expectedCredit.sub(creditAmount).abs();
    const creditValid = creditDiff.lte(0.01);

    if (!creditValid) {
      issues.push({
        code: "CREDIT_TOTAL_MISMATCH",
        severity: "error",
        message: `Credit amount mismatch: expected ${expectedCredit.toFixed(2)}, got ${creditAmount.toFixed(2)}`,
        context: {
          lineId: returnLine.id,
          expected: expectedCredit.toFixed(2),
          actual: creditAmount.toFixed(2),
          difference: creditDiff.toFixed(2),
        },
      });
    }

    // Unit price negativity check
    if (unitPrice.lt(0)) {
      issues.push({
        code: "NEGATIVE_PRICING",
        severity: "error",
        message: `Return line ${returnLine.id} has negative unit price`,
        context: {
          lineId: returnLine.id,
          unitPrice: unitPrice.toString(),
        },
      });
    }

    lineChecks.push({
      lineId: returnLine.id,
      productId: returnLine.productId,
      returnQuantity: returnQty.toString(),
      deliveredQuantity: deliveredQty.toString(),
      quantityValid,
      creditAmount: creditAmount.toFixed(2),
      expectedCredit: expectedCredit.toFixed(2),
      creditValid,
    });
  }

  const errorIssues = issues.filter((i) => i.severity === "error");
  const valid = errorIssues.length === 0;

  return {
    valid,
    issues,
    errors: errorIssues.map((i) => i.message),
    lineChecks,
  };
}

/**
 * Generates a credit note (reverse invoice) from an inspected return order.
 *
 * Preconditions (enforced by state machine):
 * - Return order status must be "inspected"
 * - Validation must pass
 * - Must have creditable amount > 0
 *
 * @param input - Return order, lines, and optional tax policy
 * @returns Credit note draft
 * @throws Error if preconditions not met
 */
export function generateCreditNote(input: GenerateCreditNoteInput): CreditNote {
  const { returnOrder, returnLines, validation, taxPolicy = DEFAULT_TAX_POLICY } = input;

  // State machine enforcement: inspected → credited
  returnOrderStateMachine.assertTransition(returnOrder.status, "credited", {
    validationValid: validation?.valid === true,
    hasCreditableAmount: returnLines.some((line) => new Decimal(line.creditAmount).gt(0)),
  });

  const lines: CreditNoteLineItem[] = [];
  let totalCredit = new Decimal(0);

  for (const returnLine of returnLines) {
    const quantity = new Decimal(returnLine.quantity);
    const unitPrice = new Decimal(returnLine.unitPrice);
    const creditAmount = new Decimal(returnLine.creditAmount);

    if (creditAmount.lte(0)) {
      continue; // Skip lines with no credit
    }

    lines.push({
      returnLineId: returnLine.id,
      productId: returnLine.productId,
      quantity,
      unitPrice,
      creditAmount,
    });

    totalCredit = totalCredit.add(creditAmount);
  }

  if (lines.length === 0) {
    throw new Error("Cannot generate credit note: no creditable lines");
  }

  const amountUntaxed = taxPolicy.round(totalCredit);
  const amountTax = taxPolicy.computeTax(amountUntaxed);
  const amountTotal = taxPolicy.round(amountUntaxed.add(amountTax));

  return {
    returnOrderId: returnOrder.id,
    partnerId: returnOrder.partnerId,
    sourceOrderId: returnOrder.sourceOrderId,
    lines,
    amountUntaxed,
    amountTax,
    amountTotal,
  };
}

/**
 * Records inspection results for received return order.
 *
 * Updates condition fields for each line based on inspection.
 *
 * @param input - Return order, lines, and inspection results
 * @returns Inspection result summary
 * @throws Error if return not in "received" status
 */
export function inspectReturn(input: InspectReturnInput): InspectionResult {
  const { returnOrder, returnLines, inspectionResults } = input;

  // State machine enforcement: received → inspected
  returnOrderStateMachine.assertTransition(returnOrder.status, "inspected", {
    inspectionComplete: inspectionResults.length === returnLines.length,
  });

  const conditionUpdates: InspectionResult["conditionUpdates"] = [];

  for (const inspection of inspectionResults) {
    const line = returnLines.find((l) => l.id === inspection.lineId);
    if (!line) {
      throw new Error(`Inspection result for unknown line: ${inspection.lineId}`);
    }

    conditionUpdates.push({
      lineId: line.id,
      oldCondition: line.condition,
      newCondition: inspection.condition,
    });
  }

  return {
    returnOrderId: returnOrder.id,
    linesInspected: conditionUpdates.length,
    conditionUpdates,
  };
}
