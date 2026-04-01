import type { InvariantFailurePayload } from "../runtime/types.js";

export type AuthorityStatus = "authoritative" | "provisional" | "blocked";

export type FinancialInvariantSnapshotRow = {
  invariantName: string;
  status: "failed";
  severity: InvariantFailurePayload["severity"];
  doctrineRef?: string;
};

export type FinancialAuthorityProvenance = {
  checkpointId?: string;
  replayChecksum?: string;
};

export type ValuationBasisStatus = "valid" | "missing" | "invalid";

export type FinancialAuthorityProjection = {
  tenantId: string;
  scopeId: string;
  authorityStatus: AuthorityStatus;
  invariantSnapshot: FinancialInvariantSnapshotRow[];
  valuationBasisStatus: ValuationBasisStatus;
  provenance: FinancialAuthorityProvenance;
  blockedReasons: InvariantFailurePayload[];
  blockingInvariantKeys: string[];
  blockingDoctrineKeys: string[];
};
