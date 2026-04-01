import type { InvariantFailurePayload } from "../runtime/types.js";
import type { FinancialAuthorityProjection } from "./types.js";

export function buildFinancialAuthorityProjection(args: {
  failures: readonly InvariantFailurePayload[];
}): FinancialAuthorityProjection {
  const blockedReasons = [...args.failures];

  return {
    authorityStatus: blockedReasons.length > 0 ? "blocked" : "authoritative",
    blockedReasons,
  };
}
