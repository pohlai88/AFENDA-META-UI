import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "../../db/index.js";
import {
  consignmentAgreements,
  consignmentStockReportLines,
  consignmentStockReports,
} from "../../db/schema/index.js";
import { NotFoundError, ValidationError } from "../../middleware/errorHandler.js";
import { recordDomainEvent, recordValidationIssues } from "../../utils/audit-logs.js";
import {
  checkAgreementExpiry,
  generateInvoiceFromReport,
  validateStockReport,
  type AgreementExpiryResult,
  type ConsignmentInvoiceDraft,
  type StockReportValidationResult,
} from "./logic/consignment-engine.js";

// ---------------------------------------------------------------------------
// Prepared Statements (Hot Paths)
// ---------------------------------------------------------------------------

const loadStockReportPrepared = db
  .select()
  .from(consignmentStockReports)
  .where(
    and(
      eq(consignmentStockReports.tenantId, sql.placeholder("tenantId")),
      eq(consignmentStockReports.id, sql.placeholder("reportId")),
      isNull(consignmentStockReports.deletedAt)
    )
  )
  .limit(1)
  .prepare("consignment_load_stock_report");

const loadAgreementPrepared = db
  .select()
  .from(consignmentAgreements)
  .where(
    and(
      eq(consignmentAgreements.tenantId, sql.placeholder("tenantId")),
      eq(consignmentAgreements.id, sql.placeholder("agreementId")),
      isNull(consignmentAgreements.deletedAt)
    )
  )
  .limit(1)
  .prepare("consignment_load_agreement");

const loadStockReportLinesPrepared = db
  .select()
  .from(consignmentStockReportLines)
  .where(
    and(
      eq(consignmentStockReportLines.tenantId, sql.placeholder("tenantId")),
      eq(consignmentStockReportLines.reportId, sql.placeholder("reportId"))
    )
  )
  .prepare("consignment_load_stock_report_lines");

export interface ValidateConsignmentStockReportInput {
  tenantId: number;
  reportId: string;
  actorId?: number;
}

export interface ValidateConsignmentStockReportResult {
  report: typeof consignmentStockReports.$inferSelect;
  agreement: typeof consignmentAgreements.$inferSelect;
  lines: Array<typeof consignmentStockReportLines.$inferSelect>;
  validation: StockReportValidationResult;
}

export interface GenerateConsignmentInvoiceDraftInput {
  tenantId: number;
  reportId: string;
  actorId?: number;
}

export interface GenerateConsignmentInvoiceDraftResult {
  report: typeof consignmentStockReports.$inferSelect;
  agreement: typeof consignmentAgreements.$inferSelect;
  lines: Array<typeof consignmentStockReportLines.$inferSelect>;
  validation: StockReportValidationResult;
  draft: ConsignmentInvoiceDraft;
}

export interface ExpireConsignmentAgreementInput {
  tenantId: number;
  agreementId: string;
  actorId: number;
  evaluatedAt?: Date;
}

export interface ExpireConsignmentAgreementResult {
  persistence: "updated" | "unchanged";
  agreement: typeof consignmentAgreements.$inferSelect;
  expiry: AgreementExpiryResult;
}

export async function validateConsignmentStockReport(
  input: ValidateConsignmentStockReportInput
): Promise<ValidateConsignmentStockReportResult> {
  const report = await loadStockReport(input.tenantId, input.reportId);
  const agreement = await loadAgreement(input.tenantId, report.agreementId);
  const lines = await loadStockReportLines(input.tenantId, report.id);

  const validation = validateStockReport({ report, lines });

  // Record invariant checks for audit trail (if actorId provided)
  if (input.actorId && validation.issues.length > 0) {
    await recordValidationIssues({
      tenantId: input.tenantId,
      entityType: "consignment_stock_report",
      entityId: report.id,
      issues: validation.issues,
      actorId: input.actorId,
    });
  }

  // Record domain event (if actorId provided)
  if (input.actorId) {
    await recordDomainEvent({
      tenantId: input.tenantId,
      eventType: "REPORT_VALIDATED",
      entityType: "consignment_stock_report",
      entityId: report.id,
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
    report,
    agreement,
    lines,
    validation,
  };
}

export async function generateConsignmentInvoiceDraft(
  input: GenerateConsignmentInvoiceDraftInput
): Promise<GenerateConsignmentInvoiceDraftResult> {
  const context = await validateConsignmentStockReport(input);

  if (!context.validation.valid) {
    const issueSummary = context.validation.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => `${issue.code}: ${issue.message}`)
      .join("; ");

    throw new ValidationError(`Stock report ${context.report.id} is invalid: ${issueSummary}`);
  }

  const draft = generateInvoiceFromReport({
    agreement: context.agreement,
    report: context.report,
    lines: context.lines,
    validation: context.validation,
  });

  // Record invoice generation event (if actorId provided)
  if (input.actorId) {
    await recordDomainEvent({
      tenantId: input.tenantId,
      eventType: "INVOICE_GENERATED",
      entityType: "consignment_stock_report",
      entityId: context.report.id,
      payload: {
        agreementId: draft.agreementId,
        partnerId: draft.partnerId,
        lineCount: draft.lines.length,
        amountTotal: draft.amountTotal.toString(),
      },
      triggeredBy: input.actorId,
      actorId: input.actorId,
    });
  }

  return {
    ...context,
    draft,
  };
}

export async function expireConsignmentAgreementIfNeeded(
  input: ExpireConsignmentAgreementInput
): Promise<ExpireConsignmentAgreementResult> {
  const agreement = await loadAgreement(input.tenantId, input.agreementId);
  const expiry = checkAgreementExpiry({ agreement, evaluatedAt: input.evaluatedAt });

  if (!expiry.shouldTransition) {
    return {
      persistence: "unchanged",
      agreement,
      expiry,
    };
  }

  const [updatedAgreement] = await db
    .update(consignmentAgreements)
    .set({
      status: expiry.nextStatus,
      updatedBy: input.actorId,
    })
    .where(
      and(
        eq(consignmentAgreements.tenantId, input.tenantId),
        eq(consignmentAgreements.id, input.agreementId),
        isNull(consignmentAgreements.deletedAt)
      )
    )
    .returning();

  if (!updatedAgreement) {
    throw new NotFoundError(
      `Consignment agreement ${input.agreementId} was not found for tenant ${input.tenantId}.`
    );
  }

  return {
    persistence: "updated",
    agreement: updatedAgreement,
    expiry,
  };
}

async function loadStockReport(tenantId: number, reportId: string) {
  const [report] = await loadStockReportPrepared.execute({ tenantId, reportId });

  if (!report) {
    throw new NotFoundError(
      `Consignment stock report ${reportId} was not found for tenant ${tenantId}.`
    );
  }

  return report;
}

async function loadAgreement(tenantId: number, agreementId: string) {
  const [agreement] = await loadAgreementPrepared.execute({ tenantId, agreementId });

  if (!agreement) {
    throw new NotFoundError(
      `Consignment agreement ${agreementId} was not found for tenant ${tenantId}.`
    );
  }

  return agreement;
}

async function loadStockReportLines(tenantId: number, reportId: string) {
  return loadStockReportLinesPrepared.execute({ tenantId, reportId });
}
