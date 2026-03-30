/**
 * Document Truth Compiler — deterministic rule evaluation (R001–R010, V1).
 */

import {
  TRUTH_POLICY_VERSION_V1,
  type DocumentTruthFactSet,
  type TruthDecisionEnvelope,
} from "./contracts.js";

const AMOUNT_TOLERANCE_RATIO = 0.001;

function amountsDiffer(
  extracted: string | null,
  matched: string | null
): boolean {
  if (extracted == null || matched == null) return false;
  const a = Number.parseFloat(extracted);
  const b = Number.parseFloat(matched);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const tol = Math.max(Math.abs(a), Math.abs(b)) * AMOUNT_TOLERANCE_RATIO;
  return Math.abs(a - b) > tol;
}

/**
 * Compile truth decision from facts. Later: load DSL rules; V1 uses fixed priority order.
 */
export function compileDocumentTruth(facts: DocumentTruthFactSet): TruthDecisionEnvelope {
  const reasons: string[] = [];
  let resolutionState: TruthDecisionEnvelope["resolutionState"] = "RESOLVED";
  let recommendedAction: TruthDecisionEnvelope["recommendedAction"] = "ALLOW";
  let duplicateRisk: TruthDecisionEnvelope["duplicateRisk"] = "NONE";
  let requiresHumanReview = false;
  let financialImpactAmount: string | null = null;

  const evidenceRefs: Record<string, unknown> = {
    attachmentId: facts.attachmentId,
    tenantId: facts.tenantId,
    storageKey: facts.storageKey,
    checksum: facts.checksum,
  };

  // R010 — Audit evidence guard (policy version always set at end; here we ensure facts exist)
  if (!facts.storageKey || facts.byteSize < 0) {
    return {
      resolutionState: "REJECTED",
      recommendedAction: "BLOCK",
      decisionReasons: ["R010_AUDIT_EVIDENCE_INVALID"],
      duplicateRisk: "HIGH",
      financialImpactAmount: null,
      requiresHumanReview: true,
      evidenceRefs,
      policyVersion: TRUTH_POLICY_VERSION_V1,
    };
  }

  // R008 — Malware quarantine
  if (facts.malwareScanStatus === "pending" || facts.malwareScanStatus === "failed") {
    reasons.push("R008_MALWARE_QUARANTINE");
    resolutionState = "REJECTED";
    recommendedAction = "BLOCK";
    requiresHumanReview = true;
  }
  if (facts.malwareScanStatus === "quarantined") {
    reasons.push("R008_MALWARE_QUARANTINED");
    resolutionState = "REJECTED";
    recommendedAction = "BLOCK";
    requiresHumanReview = true;
  }

  // R006 / R007 — Legal hold & retention (deletion guard; blocks DELETE type elsewhere)
  if (facts.legalHoldActive) {
    reasons.push("R006_LEGAL_HOLD_ACTIVE");
  }
  if (facts.retentionExpiresAt && facts.now < facts.retentionExpiresAt) {
    reasons.push("R007_RETENTION_NOT_EXPIRED");
  }

  // R005 — Stale contract execution
  if (facts.documentClass === "contract" && !facts.isLatestApprovedContractVersion) {
    reasons.push("R005_STALE_CONTRACT_VERSION");
    resolutionState = "REJECTED";
    recommendedAction = "BLOCK";
    requiresHumanReview = true;
  }

  // Duplicate / invoice rules
  const invoiceLike =
    facts.documentClass === "invoice" ||
    (facts.contentType.includes("pdf") &&
      (facts.filename.toLowerCase().includes("inv") ||
        facts.filename.toLowerCase().includes("invoice")));

  if (facts.duplicateChecksumMatch && facts.previousPaymentDetected) {
    duplicateRisk = "HIGH";
    reasons.push("R001_DUPLICATE_INVOICE_BLOCK");
    resolutionState = "REJECTED";
    recommendedAction = "BLOCK";
    requiresHumanReview = true;
    financialImpactAmount = facts.extractedInvoiceAmount;
  } else if (facts.nearDuplicateSignal && !facts.previousPaymentDetected) {
    duplicateRisk = "MEDIUM";
    reasons.push("R002_NEAR_DUPLICATE_ESCALATE");
    resolutionState = "AMBIGUOUS";
    recommendedAction = "ESCALATE";
    requiresHumanReview = true;
  } else if (facts.duplicateChecksumMatch) {
    duplicateRisk = "HIGH";
    reasons.push("R001_DUPLICATE_CHECKSUM");
    resolutionState = "AMBIGUOUS";
    recommendedAction = "ESCALATE";
    requiresHumanReview = true;
  }

  if (invoiceLike && amountsDiffer(facts.extractedInvoiceAmount, facts.matchedPayableAmount)) {
    reasons.push("R003_INVOICE_AMOUNT_MISMATCH");
    resolutionState = "AMBIGUOUS";
    recommendedAction = "ESCALATE";
    requiresHumanReview = true;
  }

  if (invoiceLike && facts.strictInvoicePayableBinding && !facts.invoiceBoundToPayableContext) {
    reasons.push("R004_UNBOUND_INVOICE");
    resolutionState = "REJECTED";
    recommendedAction = "BLOCK";
    requiresHumanReview = true;
  }

  // R009 — Conflicting signals → ambiguous
  if (
    reasons.includes("R002_NEAR_DUPLICATE_ESCALATE") &&
    reasons.includes("R003_INVOICE_AMOUNT_MISMATCH")
  ) {
    reasons.push("R009_AMBIGUOUS_CONFLICT");
    resolutionState = "AMBIGUOUS";
    recommendedAction = "ESCALATE";
    requiresHumanReview = true;
  }

  if (reasons.length === 0) {
    reasons.push("NO_RULES_TRIGGERED");
  }

  return {
    resolutionState,
    recommendedAction,
    decisionReasons: reasons,
    duplicateRisk,
    financialImpactAmount,
    requiresHumanReview,
    evidenceRefs,
    policyVersion: TRUTH_POLICY_VERSION_V1,
  };
}
