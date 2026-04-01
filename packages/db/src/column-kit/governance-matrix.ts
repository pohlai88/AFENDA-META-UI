export type TableLifecycleClass = "mutable" | "appendOnly";

export interface ColumnKitGovernanceProfile {
  readonly lifecycle: TableLifecycleClass;
  readonly mandatory: ReadonlySet<"createdAt" | "updatedAt">;
  readonly recommended: ReadonlySet<"deletedAt" | "createdBy" | "updatedBy">;
  readonly reason: string;
}

const MUTABLE_PROFILE: ColumnKitGovernanceProfile = Object.freeze({
  lifecycle: "mutable",
  mandatory: new Set<"createdAt" | "updatedAt">(["createdAt", "updatedAt"]),
  recommended: new Set<"deletedAt" | "createdBy" | "updatedBy">([
    "deletedAt",
    "createdBy",
    "updatedBy",
  ]),
  reason: "default mutable table policy",
});

const APPEND_ONLY_PROFILE: ColumnKitGovernanceProfile = Object.freeze({
  lifecycle: "appendOnly",
  mandatory: new Set<"createdAt" | "updatedAt">(["createdAt"]),
  recommended: new Set<"deletedAt" | "createdBy" | "updatedBy">(["createdBy"]),
  reason: "append-only tables do not update or soft-delete existing rows",
});

const APPEND_ONLY_TABLES = Object.freeze(
  new Set<string>([
    "hr.employee_request_history",
    "hr.ess_domain_events",
    "hr.leave_request_status_history",
    "sales.domain_event_logs",
    "sales.domain_invariant_logs",
    "sales.truth_decision_locks",
    "sales.accounting_decisions",
  ])
);

const APPEND_ONLY_PATTERNS = Object.freeze([
  /\._?domain_?events$/i,
  /\._?event_?logs$/i,
  /\._?history$/i,
  /\._?status_?history$/i,
  /\._?invariant_?logs$/i,
]);

export function resolveColumnKitGovernanceProfile(table: string): ColumnKitGovernanceProfile {
  if (APPEND_ONLY_TABLES.has(table)) return APPEND_ONLY_PROFILE;
  if (APPEND_ONLY_PATTERNS.some((pattern) => pattern.test(table))) return APPEND_ONLY_PROFILE;
  return MUTABLE_PROFILE;
}

export function matrixExemptsCoverageViolation(
  table: string,
  violation: { readonly kind: "missingMandatory" | "missingRecommended"; readonly column: string }
): boolean {
  const profile = resolveColumnKitGovernanceProfile(table);
  if (violation.kind === "missingMandatory") {
    if (violation.column !== "createdAt" && violation.column !== "updatedAt") return false;
    return !profile.mandatory.has(violation.column);
  }
  if (
    violation.column !== "deletedAt" &&
    violation.column !== "createdBy" &&
    violation.column !== "updatedBy"
  ) {
    return false;
  }
  return !profile.recommended.has(violation.column);
}
