/**
 * Business Truth Storage Engine — contracts for Truth Binding and Document Truth Compiler.
 */

import type {
  truthDuplicateRisks,
  truthRecommendedActions,
  truthResolutionStates,
} from "../../schema/reference/tables.js";

export type TruthResolutionState = (typeof truthResolutionStates)[number];
export type TruthRecommendedAction = (typeof truthRecommendedActions)[number];
export type TruthDuplicateRisk = (typeof truthDuplicateRisks)[number];

/** Normalized facts passed into the Document Truth Compiler (V1). */
export type DocumentTruthFactSet = {
  tenantId: number;
  attachmentId: string;
  entityType: string;
  storageKey: string;
  checksum: string | null;
  byteSize: number;
  contentType: string;
  filename: string;
  /** Duplicate checksum match within tenant (excluding tombstone). */
  duplicateChecksumMatch: boolean;
  /** Heuristic near-duplicate signal (filename + size similarity). */
  nearDuplicateSignal: boolean;
  /** Extracted or declared invoice amount for payable matching (optional). */
  extractedInvoiceAmount: string | null;
  /** Matched payable amount from ERP (optional). */
  matchedPayableAmount: string | null;
  /** Prior payment detected for same vendor/invoice key (optional). */
  previousPaymentDetected: boolean;
  /** Vendor + invoice identity bound (optional). */
  invoiceBoundToPayableContext: boolean;
  /** Contract: document is latest approved/signed version in lineage. */
  isLatestApprovedContractVersion: boolean;
  /** When true, require vendor/payable binding for invoice-like docs (AP flows). */
  strictInvoicePayableBinding: boolean;
  /** When `contract`, apply stale-version block (R005). */
  documentClass: "generic" | "invoice" | "contract";
  malwareScanStatus: "not_required" | "pending" | "clean" | "quarantined" | "failed";
  legalHoldActive: boolean;
  retentionExpiresAt: Date | null;
  now: Date;
};

/** Compiler output — Decision Envelope (stable contract). */
export type TruthDecisionEnvelope = {
  resolutionState: TruthResolutionState;
  recommendedAction: TruthRecommendedAction;
  decisionReasons: string[];
  duplicateRisk: TruthDuplicateRisk;
  financialImpactAmount: string | null;
  requiresHumanReview: boolean;
  evidenceRefs: Record<string, unknown>;
  policyVersion: string;
};

export const TRUTH_POLICY_VERSION_V1 = "truth-compiler-v1.0.0";
