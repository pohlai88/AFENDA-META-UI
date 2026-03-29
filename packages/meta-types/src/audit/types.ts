/**
 * @module audit
 * @description Audit-trail and masking contracts for compliance-grade change history.
 * @layer truth-contract
 * @consumers api, web, db
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
  field: string;
  oldValue: unknown;
  newValue: unknown;
  sensitivity: SensitivityLevel;
}

export interface AuditEntry {
  id: string;
  entity: string;
  entityId: string;
  timestamp: string;
  actor: string;
  operation: AuditOperation;
  changes: FieldChange[];
  source: AuditSource;
  reason?: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Sensitivity Masking
// ---------------------------------------------------------------------------

export interface MaskingRule {
  threshold: SensitivityLevel;
  strategy: "full" | "partial" | "hash";
  revealChars?: number;
}

// ---------------------------------------------------------------------------
// Timeline View
// ---------------------------------------------------------------------------

export interface AuditTimelineEntry {
  displayTime: string;
  actorName: string;
  summary: string;
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
  fromTimestamp?: string;
  toTimestamp?: string;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Decision/Execution Audit
// ---------------------------------------------------------------------------

export type DecisionEventType =
  | "metadata_resolved"
  | "rule_evaluated"
  | "policy_enforced"
  | "workflow_transitioned"
  | "event_propagated"
  | "layout_rendered";

export interface DecisionAuditEntry {
  id: string;
  timestamp: string;
  tenantId: string;
  userId?: string;
  eventType: DecisionEventType;
  scope: string;
  context: {
    model?: string;
    field?: string;
    workflowId?: string;
    eventId?: string;
    ruleId?: string;
    policyId?: string;
  };
  decision: {
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    reasoning?: string;
    appliedLayers?: string[];
    violations?: Array<{
      type: string;
      message: string;
      severity: "info" | "warning" | "error";
    }>;
  };
  durationMs: number;
  status: "success" | "error";
  error?: {
    message: string;
    code: string;
    stack?: string;
  };
}

export interface DecisionAuditQuery {
  tenantId: string;
  eventType?: DecisionEventType;
  scope?: string;
  userId?: string;
  fromTimestamp?: string;
  toTimestamp?: string;
  limit?: number;
  offset?: number;
}

export interface DecisionAuditChain {
  rootId: string;
  entries: DecisionAuditEntry[];
  totalDurationMs: number;
  errors: DecisionAuditEntry["error"][];
}
