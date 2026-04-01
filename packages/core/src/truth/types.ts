export type IdentityKind = {
  key: string;
  brand: string;
  description?: string;
};

export type EnumValue = {
  value: string;
  description?: string;
};

export type EnumSpec = {
  key: string;
  description?: string;
  values: readonly EnumValue[];
};

export type RelationKind = "one-to-many" | "many-to-one" | "one-to-one" | "self-reference";

export type RelationSpec = {
  key: string;
  from: string;
  to: string;
  kind: RelationKind;
  fromField: string;
  toField: string;
  description?: string;
};

export type DoctrineSpec = {
  key: string;
  family: string;
  standard: string;
  section: string;
  clauseRef?: string;
  title: string;
  interpretation: "strict" | "policy-adjusted" | "advisory";
};

export type ResolutionAction =
  | { type: "navigate"; label: string; target: string }
  | { type: "instruction"; label: string }
  | { type: "workflow"; label: string; target: string }
  | { type: "retry"; label: string }
  | { type: "reference"; label: string; target?: string }
  | { type: "contact"; label: string; target?: string }
  | { type: "autofix"; label: string; target?: string };

export type ResolutionSpec = {
  key: string;
  resolutionId: string;
  resolutionClass:
    | "user-resolvable"
    | "role-resolvable"
    | "workflow-resolvable"
    | "admin-only"
    | "non-resolvable";
  title: string;
  summary: string;
  responsibleRole?: string;
  /** Actions shown when the actor may resolve directly (role matches or no role gate). */
  allowedActions: readonly ResolutionAction[];
  /** When the actor cannot take direct actions, this single path is offered instead. */
  escalation?: ResolutionAction;
};

export type InvariantSeverity = "critical" | "major" | "minor" | "informational";
export type FailurePolicy = "block" | "quarantine" | "allow-with-flag" | "alert-only";

export type InvariantTiming = "pre-commit" | "post-commit" | "read-time";

export type InvariantSpec = {
  key: string;
  description: string;
  severity: InvariantSeverity;
  failurePolicy: FailurePolicy;
  timing: InvariantTiming;
  doctrineRef: string;
  resolutionRef?: string;
  evidenceShape: readonly string[];
};

export type TruthSpecBundle = {
  identities: readonly IdentityKind[];
  enums: readonly EnumSpec[];
  relations: readonly RelationSpec[];
  doctrines: readonly DoctrineSpec[];
  resolutions: readonly ResolutionSpec[];
  invariants: readonly InvariantSpec[];
};
