/**
 * Runtime/API failure contract — see architecture §10.6 and Phase 1 blueprint.
 */
export type EvidencePayload = Record<string, unknown>;

export type InvariantFailurePayload = {
  invariantName: string;
  severity: "critical" | "major" | "minor" | "informational";
  failurePolicy: "block" | "quarantine" | "allow-with-flag" | "alert-only";
  doctrine: {
    doctrineRef: string;
    family: string;
    standard: string;
    section: string;
    clauseRef?: string;
    title: string;
    interpretation: "strict" | "policy-adjusted" | "advisory";
  };
  evidence: {
    summary: string;
    facts: EvidencePayload;
  };
  resolution?: {
    resolutionId: string;
    resolutionClass:
      | "user-resolvable"
      | "role-resolvable"
      | "workflow-resolvable"
      | "admin-only"
      | "non-resolvable";
    title: string;
    actions: Array<{
      type: "navigate" | "instruction" | "workflow" | "retry" | "reference" | "contact" | "autofix";
      label: string;
      target?: string;
    }>;
    responsibleRole?: string;
  };
};
