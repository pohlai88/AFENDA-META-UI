/**
 * Audit Engine Types
 * ==================
 * Change tracking for ERP compliance: SOX, GDPR, ISO.
 *
 * Records WHO changed WHAT, WHEN, and optionally WHY.
 * Field-level sensitivity masking protects high-security values.
 */

// ---------------------------------------------------------------------------
// Core Types
// ---------------------------------------------------------------------------

export type AuditSource = "ui" | "api" | "import" | "system" | "migration";

export type SensitivityLevel = "low" | "medium" | "high";

export type AuditOperation = "create" | "update" | "delete";

// ---------------------------------------------------------------------------
// Change Tracking
// ---------------------------------------------------------------------------

export interface FieldChange {
  /** Field name that changed */
  field: string;
  /** Previous value (undefined for creates) */
  oldValue: unknown;
  /** New value (undefined for deletes) */
  newValue: unknown;
  /** Sensitivity level — drives masking in UI/logs */
  sensitivity: SensitivityLevel;
}

export interface AuditEntry {
  /** Unique audit entry ID */
  id: string;
  /** Model/entity name */
  entity: string;
  /** Record identifier */
  entityId: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** User ID or system principal who made the change */
  actor: string;
  /** CRUD operation */
  operation: AuditOperation;
  /** Individual field-level changes */
  changes: FieldChange[];
  /** Where the change originated */
  source: AuditSource;
  /** Optional reason/comment (required by some compliance regimes) */
  reason?: string;
  /** Arbitrary metadata (IP address, session ID, batch ref, etc.) */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Sensitivity Masking
// ---------------------------------------------------------------------------

export interface MaskingRule {
  /** Minimum sensitivity level that triggers masking */
  threshold: SensitivityLevel;
  /** How to mask the value in UI/logs */
  strategy: "full" | "partial" | "hash";
  /** For "partial" strategy — how many chars to reveal at start/end */
  revealChars?: number;
}

/** Default masking rules per sensitivity level */
export const DEFAULT_MASKING_RULES: Record<SensitivityLevel, MaskingRule> = {
  low: { threshold: "low", strategy: "full" },
  medium: { threshold: "medium", strategy: "partial", revealChars: 2 },
  high: { threshold: "high", strategy: "full" },
};

// ---------------------------------------------------------------------------
// Timeline View
// ---------------------------------------------------------------------------

export interface AuditTimelineEntry {
  /** Formatted timestamp for display */
  displayTime: string;
  /** Actor display name */
  actorName: string;
  /** Human-readable change summary */
  summary: string;
  /** Detailed changes (may be masked) */
  changes: FieldChange[];
  operation: AuditOperation;
  source: AuditSource;
}

// ---------------------------------------------------------------------------
// Query Types
// ---------------------------------------------------------------------------

export interface AuditQuery {
  entity?: string;
  entityId?: string;
  actor?: string;
  operation?: AuditOperation;
  source?: AuditSource;
  /** ISO 8601 range start */
  fromTimestamp?: string;
  /** ISO 8601 range end */
  toTimestamp?: string;
  /** Max results to return */
  limit?: number;
  /** Pagination offset */
  offset?: number;
}

// ---------------------------------------------------------------------------
// Decision/Execution Audit (Phase 4)
// ---------------------------------------------------------------------------
// Complements change tracking with visibility into deterministic decisions:
// - Metadata resolution (which layers applied)
// - Rule evaluations (did expression fire?)
// - Policy enforcement (violations detected?)
// - Workflow transitions (step executed?)
// - Event propagation (published where?)

export type DecisionEventType =
  | "metadata_resolved"
  | "rule_evaluated"
  | "policy_enforced"
  | "workflow_transitioned"
  | "event_propagated"
  | "layout_rendered";

export interface DecisionAuditEntry {
  /** Unique audit entry ID */
  id: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Tenant scope */
  tenantId: string;
  /** User making the decision */
  userId?: string;
  /** Type of decision */
  eventType: DecisionEventType;
  /** Scoped identifier: "model.field.action" or "model.action" */
  scope: string;
  /** Context about what triggered this decision */
  context: {
    model?: string;
    field?: string;
    workflowId?: string;
    eventId?: string;
    ruleId?: string;
    policyId?: string;
  };
  /** The decision and its reasoning */
  decision: {
    /** Input parameters */
    input: Record<string, unknown>;
    /** Output/result */
    output: Record<string, unknown>;
    /** Why this outcome (human-readable explanation) */
    reasoning?: string;
    /** Which tenant layers, rules, policies applied */
    appliedLayers?: string[];
    /** Any violations or warnings */
    violations?: Array<{
      type: string;
      message: string;
      severity: "info" | "warning" | "error";
    }>;
  };
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Success or error */
  status: "success" | "error";
  /** Error details if status is "error" */
  error?: {
    message: string;
    code: string;
    stack?: string;
  };
}

/** Query filter for decision audit logs */
export interface DecisionAuditQuery {
  tenantId: string;
  eventType?: DecisionEventType;
  scope?: string;
  userId?: string;
  /** ISO 8601 range start */
  fromTimestamp?: string;
  /** ISO 8601 range end */
  toTimestamp?: string;
  /** Max results to return */
  limit?: number;
  /** Pagination offset */
  offset?: number;
}

/** Complete decision chain from request start to finish */
export interface DecisionAuditChain {
  /** Root decision ID (e.g., request to resolve layout) */
  rootId: string;
  /** Linked chain of dependent decisions */
  entries: DecisionAuditEntry[];
  /** Total execution time */
  totalDurationMs: number;
  /** Any errors encountered in chain */
  errors: DecisionAuditEntry["error"][];
}
