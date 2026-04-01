import type { InvariantFailurePayload } from "../runtime/types.js";

export type AuthorityStatus = "authoritative" | "blocked";

export type FinancialAuthorityProjection = {
  authorityStatus: AuthorityStatus;
  blockedReasons: InvariantFailurePayload[];
};
