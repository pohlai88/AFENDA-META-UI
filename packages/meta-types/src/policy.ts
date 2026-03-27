/**
 * @module policy
 * @description Declarative policy contracts for cross-module validation and decision rules.
 * @layer truth-contract
 * @consumers api, web, db
 */

/**
 * Validation Policy Engine Types
 * ===============================
 * Cross-module business rules that go beyond field-level validation.
 *
 * Examples:
 *   - "Cannot approve PO if vendor is blacklisted"
 *   - "Invoice total must match line item sums"
 *   - "Employee age must be ≥ legal working age"
 *
 * Policies are defined declaratively and evaluated by the policy engine
 * on both client (optimistic) and server (authoritative).
 */

// ---------------------------------------------------------------------------
// Policy Definition
// ---------------------------------------------------------------------------

export type PolicySeverity = "error" | "warning" | "info";

export interface PolicyDefinition {
  /** Unique policy identifier */
  id: string;
  /** Scoped target, e.g. "finance.invoice", "hr.employee" */
  scope: string;
  /** Human-readable policy name */
  name: string;
  description?: string;
  /**
   * Precondition DSL — policy only evaluates when this is true.
   * e.g. `"status == 'posted'"`, `"operation == 'approve'"`
   */
  when?: string;
  /**
   * Assertion DSL — if this evaluates to false, the policy is violated.
   * e.g. `"sum(lines.amount) == total_amount"`, `"age >= 18"`
   */
  validate: string;
  /** Message shown when the policy is violated */
  message: string;
  severity: PolicySeverity;
  /** Allow disabling policies without deleting them */
  enabled?: boolean;
  /** Tags for filtering (e.g. ["sox", "gdpr", "internal"]) */
  policyTags?: string[];
}

// ---------------------------------------------------------------------------
// Evaluation Context — what the engine receives at runtime
// ---------------------------------------------------------------------------

export type PolicyOperation =
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "submit"
  | "cancel"
  | "validate";

export interface PolicyContext {
  /** Model being operated on */
  model: string;
  /** The record being validated */
  record: Record<string, unknown>;
  /** Related records keyed by relation name */
  relatedRecords?: Record<string, Record<string, unknown>[]>;
  /** Who triggered the operation */
  actor: {
    uid: string;
    roles: string[];
  };
  /** What operation is being performed */
  operation: PolicyOperation;
  /** Extra context (e.g. previous record state for updates) */
  previousRecord?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Evaluation Result
// ---------------------------------------------------------------------------

export interface PolicyViolation {
  policyId: string;
  policyName: string;
  message: string;
  severity: PolicySeverity;
  /** Specific field the violation relates to (if applicable) */
  field?: string;
}

export interface PolicyEvaluationResult {
  /** True when no errors (warnings alone don't block) */
  passed: boolean;
  /** Violations with severity "error" */
  errors: PolicyViolation[];
  /** Violations with severity "warning" */
  warnings: PolicyViolation[];
  /** Violations with severity "info" */
  info: PolicyViolation[];
  /** Total evaluation time in ms */
  evaluationTimeMs: number;
}
