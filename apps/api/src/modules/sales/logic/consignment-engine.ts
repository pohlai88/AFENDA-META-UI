import { Decimal } from "decimal.js";
import type {
  ConsignmentAgreement,
  ConsignmentReportStatus,
  ConsignmentStatus,
  ConsignmentStockReport,
  ConsignmentStockReportLine,
} from "@afenda/db/schema-domain";
import { StateMachine, type TransitionRule } from "../../../utils/state-machine.js";

type DecimalLike = string | number;

export type InvariantCode =
  | "INVALID_REPORT_STATUS"
  | "EMPTY_REPORT"
  | "NEGATIVE_QUANTITY"
  | "STOCK_BALANCE_MISMATCH"
  | "NEGATIVE_PRICING"
  | "PRICE_TOTAL_MISMATCH"
  | "INVALID_AGREEMENT_STATUS_FOR_INVOICE"
  | "INVALID_REPORT_STATUS_FOR_INVOICE"
  | "INVALID_REPORT_FOR_INVOICE"
  | "NO_SOLD_QUANTITY";

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  code: InvariantCode;
  severity: ValidationSeverity;
  message: string;
  context?: Record<string, unknown>;
}

export interface StockLineValidation {
  lineId: ConsignmentStockReportLine["id"];
  expectedClosingQty: string;
  actualClosingQty: string;
  isBalanced: boolean;
}

export interface StockReportValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  errors: string[];
  lineChecks: StockLineValidation[];
}

export interface ValidateStockReportInput {
  report: Pick<ConsignmentStockReport, "id" | "status">;
  lines: Array<
    Pick<
      ConsignmentStockReportLine,
      | "id"
      | "productId"
      | "openingQty"
      | "receivedQty"
      | "soldQty"
      | "returnedQty"
      | "closingQty"
      | "unitPrice"
      | "lineTotal"
    >
  >;
}

export interface ConsignmentInvoiceLine {
  reportLineId: ConsignmentStockReportLine["id"];
  productId: ConsignmentStockReportLine["productId"];
  quantity: Decimal;
  unitPrice: Decimal;
  subtotal: Decimal;
}

export interface ConsignmentInvoiceDraft {
  agreementId: ConsignmentAgreement["id"];
  reportId: ConsignmentStockReport["id"];
  partnerId: ConsignmentAgreement["partnerId"];
  lines: ConsignmentInvoiceLine[];
  amountUntaxed: Decimal;
  amountTax: Decimal;
  amountTotal: Decimal;
}

export interface PricingPolicy {
  computeTax: (amountUntaxed: Decimal) => Decimal;
  round: (amount: Decimal) => Decimal;
}

export interface GenerateInvoiceFromReportInput {
  agreement: Pick<ConsignmentAgreement, "id" | "partnerId" | "status">;
  report: Pick<ConsignmentStockReport, "id" | "agreementId" | "status">;
  lines: Array<
    Pick<ConsignmentStockReportLine, "id" | "productId" | "soldQty" | "unitPrice" | "lineTotal">
  >;
  validation?: Pick<StockReportValidationResult, "valid" | "issues">;
  pricingPolicy?: PricingPolicy;
}

export type AgreementTransition =
  | {
      type: "NOOP";
    }
  | {
      type: "EXPIRE";
      effectiveAt: Date;
    };

export interface AgreementExpiryResult {
  currentStatus: ConsignmentStatus;
  nextStatus: ConsignmentStatus;
  expired: boolean;
  shouldTransition: boolean;
  transition: AgreementTransition;
  evaluatedAt: Date;
}

export interface CheckAgreementExpiryInput {
  agreement: Pick<ConsignmentAgreement, "status" | "startDate" | "endDate">;
  evaluatedAt?: Date;
}

const VALIDATABLE_REPORT_STATUSES: ConsignmentReportStatus[] = ["confirmed", "invoiced"];

const DEFAULT_PRICING_POLICY: PricingPolicy = {
  computeTax: () => new Decimal(0),
  round: (amount) => amount.toDecimalPlaces(2),
};

/**
 * State machine for consignment stock report lifecycle transitions.
 *
 * Lifecycle: draft → confirmed → invoiced
 *
 * Guards:
 * - confirmed → invoiced: requires valid validation result and active agreement
 */
const REPORT_STATE_MACHINE_RULES: TransitionRule<ConsignmentReportStatus>[] = [
  {
    from: "draft",
    to: "confirmed",
    description: "Submit and confirm a draft report",
  },
  {
    from: "confirmed",
    to: "invoiced",
    guard: (ctx) => {
      const validationValid = ctx.validationValid === true;
      const agreementActive = ctx.agreementStatus === "active";
      return validationValid && agreementActive;
    },
    description: "Generate invoice from confirmed report (requires valid validation + active agreement)",
  },
];

export const consignmentReportStateMachine = new StateMachine<ConsignmentReportStatus>(
  REPORT_STATE_MACHINE_RULES
);

export class ConsignmentEngineError extends Error {
  constructor(message: string, readonly code?: InvariantCode) {
    super(message);
    this.name = "ConsignmentEngineError";
  }
}

export function computeExpectedClosingQty(params: {
  opening: Decimal;
  received: Decimal;
  sold: Decimal;
  returned: Decimal;
}): Decimal {
  return params.opening.plus(params.received).minus(params.sold).minus(params.returned);
}

export function computeLineSubtotal(soldQty: Decimal, unitPrice: Decimal): Decimal {
  return soldQty.mul(unitPrice);
}

export function canValidateStockReportStatus(status: ConsignmentReportStatus): boolean {
  return VALIDATABLE_REPORT_STATUSES.includes(status);
}

export function canInvoiceReport(status: ConsignmentReportStatus): boolean {
  return status === "confirmed";
}

export function assertCanInvoiceReport(status: ConsignmentReportStatus): void {
  if (!canInvoiceReport(status)) {
    throw new ConsignmentEngineError(
      `Only confirmed reports can be invoiced (current: '${status}').`,
      "INVALID_REPORT_STATUS_FOR_INVOICE"
    );
  }
}

export function validateStockReport(
  input: ValidateStockReportInput
): StockReportValidationResult {
  const { report, lines } = input;
  const issues: ValidationIssue[] = [];

  if (!canValidateStockReportStatus(report.status)) {
    issues.push({
      code: "INVALID_REPORT_STATUS",
      severity: "error",
      message: `Report status '${report.status}' cannot be validated for stock posting.`,
      context: { reportId: report.id, status: report.status },
    });
  }

  if (lines.length === 0) {
    issues.push({
      code: "EMPTY_REPORT",
      severity: "error",
      message: "Consignment report must include at least one line.",
      context: { reportId: report.id },
    });
  }

  const lineChecks = lines.map((line) => {
    const opening = dec(line.openingQty);
    const received = dec(line.receivedQty);
    const sold = dec(line.soldQty);
    const returned = dec(line.returnedQty);
    const actualClosing = dec(line.closingQty);

    if (opening.lt(0) || received.lt(0) || sold.lt(0) || returned.lt(0) || actualClosing.lt(0)) {
      issues.push({
        code: "NEGATIVE_QUANTITY",
        severity: "error",
        message: `Line '${line.id}' has negative stock quantities.`,
        context: { lineId: line.id, productId: line.productId },
      });
    }

    const expectedClosing = computeExpectedClosingQty({ opening, received, sold, returned });
    const isBalanced = expectedClosing.eq(actualClosing);

    if (!isBalanced) {
      issues.push({
        code: "STOCK_BALANCE_MISMATCH",
        severity: "error",
        message: `Line '${line.id}' stock mismatch: expected closing ${expectedClosing.toFixed(4)}, got ${actualClosing.toFixed(4)}.`,
        context: {
          lineId: line.id,
          expectedClosingQty: expectedClosing.toFixed(4),
          actualClosingQty: actualClosing.toFixed(4),
        },
      });
    }

    const unitPrice = dec(line.unitPrice);
    const actualTotal = dec(line.lineTotal);
    const expectedTotal = computeLineSubtotal(sold, unitPrice);

    if (unitPrice.lt(0) || actualTotal.lt(0)) {
      issues.push({
        code: "NEGATIVE_PRICING",
        severity: "error",
        message: `Line '${line.id}' has negative pricing values.`,
        context: { lineId: line.id, productId: line.productId },
      });
    }

    if (!expectedTotal.eq(actualTotal)) {
      issues.push({
        code: "PRICE_TOTAL_MISMATCH",
        severity: "error",
        message: `Line '${line.id}' total mismatch: expected ${expectedTotal.toFixed(2)}, got ${actualTotal.toFixed(2)}.`,
        context: {
          lineId: line.id,
          expectedTotal: expectedTotal.toFixed(2),
          actualTotal: actualTotal.toFixed(2),
        },
      });
    }

    return {
      lineId: line.id,
      expectedClosingQty: expectedClosing.toFixed(4),
      actualClosingQty: actualClosing.toFixed(4),
      isBalanced,
    };
  });

  const errors = issues
    .filter((issue) => issue.severity === "error")
    .map((issue) => issue.message);

  return {
    valid: errors.length === 0,
    issues,
    errors,
    lineChecks,
  };
}

export function generateInvoiceFromReport(
  input: GenerateInvoiceFromReportInput
): ConsignmentInvoiceDraft {
  const { agreement, report, lines, validation, pricingPolicy = DEFAULT_PRICING_POLICY } = input;

  // Use state machine to validate transition to invoiced status
  try {
    consignmentReportStateMachine.assertTransition(report.status, "invoiced", {
      validationValid: validation ? validation.valid : true,
      agreementStatus: agreement.status,
    });
  } catch (error) {
    if (agreement.status !== "active") {
      throw new ConsignmentEngineError(
        `Cannot invoice consignment report for agreement in status '${agreement.status}'.`,
        "INVALID_AGREEMENT_STATUS_FOR_INVOICE"
      );
    }
    if (validation && !validation.valid) {
      throw new ConsignmentEngineError(
        "Cannot invoice invalid report. Resolve validation issues first.",
        "INVALID_REPORT_FOR_INVOICE"
      );
    }
    throw new ConsignmentEngineError(
      `Cannot transition report from '${report.status}' to 'invoiced'.`,
      "INVALID_REPORT_STATUS_FOR_INVOICE"
    );
  }

  const invoiceLines: ConsignmentInvoiceLine[] = [];
  let amountUntaxed = new Decimal(0);

  for (const line of lines) {
    const soldQty = dec(line.soldQty);
    const unitPrice = dec(line.unitPrice);

    if (soldQty.lte(0)) {
      continue;
    }

    const subtotal = pricingPolicy.round(computeLineSubtotal(soldQty, unitPrice));
    const reportedTotal = dec(line.lineTotal);

    if (!subtotal.eq(reportedTotal)) {
      throw new ConsignmentEngineError(
        `Line '${line.id}' cannot be invoiced because reported total (${reportedTotal.toFixed(2)}) differs from sold_qty × unit_price (${subtotal.toFixed(2)}).`,
        "PRICE_TOTAL_MISMATCH"
      );
    }

    invoiceLines.push({
      reportLineId: line.id,
      productId: line.productId,
      quantity: soldQty,
      unitPrice,
      subtotal,
    });

    amountUntaxed = amountUntaxed.plus(subtotal);
  }

  if (invoiceLines.length === 0) {
    throw new ConsignmentEngineError("No sold quantities found to invoice.", "NO_SOLD_QUANTITY");
  }

  amountUntaxed = pricingPolicy.round(amountUntaxed);
  const amountTax = pricingPolicy.round(pricingPolicy.computeTax(amountUntaxed));
  const amountTotal = pricingPolicy.round(amountUntaxed.plus(amountTax));

  return {
    agreementId: agreement.id,
    reportId: report.id,
    partnerId: agreement.partnerId,
    lines: invoiceLines,
    amountUntaxed,
    amountTax,
    amountTotal,
  };
}

export function checkAgreementExpiry(
  input: CheckAgreementExpiryInput
): AgreementExpiryResult {
  const { agreement, evaluatedAt = new Date() } = input;
  const { status, endDate } = agreement;

  if (status === "terminated") {
    return {
      currentStatus: status,
      nextStatus: "terminated",
      expired: false,
      shouldTransition: false,
      transition: { type: "NOOP" },
      evaluatedAt,
    };
  }

  if (status === "expired") {
    return {
      currentStatus: status,
      nextStatus: "expired",
      expired: true,
      shouldTransition: false,
      transition: { type: "NOOP" },
      evaluatedAt,
    };
  }

  const hasEndDate = endDate !== null;
  const isExpired = hasEndDate ? endDate.getTime() < evaluatedAt.getTime() : false;

  return {
    currentStatus: status,
    nextStatus: isExpired ? "expired" : status,
    expired: isExpired,
    shouldTransition: isExpired,
    transition: isExpired ? { type: "EXPIRE", effectiveAt: evaluatedAt } : { type: "NOOP" },
    evaluatedAt,
  };
}

function dec(value: DecimalLike): Decimal {
  return new Decimal(value);
}
