/**
 * Metadata-Driven Workflow Engine Types
 * ======================================
 * Business processes defined as data — no code deployments to change workflows.
 *
 * State machine: Draft → Step1 → Step2 → Completed | Rejected
 */

// ---------------------------------------------------------------------------
// Step Types
// ---------------------------------------------------------------------------

export type WorkflowStepType =
  | "approval"       // Human approval gate
  | "action"         // Automated system action
  | "condition"      // DSL-based branching
  | "timer"          // Wait N seconds/minutes/hours
  | "notification"   // Send notification
  | "integration";   // Call external API / webhook

// ---------------------------------------------------------------------------
// Step Definitions
// ---------------------------------------------------------------------------

export interface WorkflowStep {
  /** Step ID (unique within workflow) */
  id: string;
  /** Human-readable label */
  label: string;
  /** Step type */
  type: WorkflowStepType;
  /**
   * For "approval": role required to approve.
   * For "action": function/action ID to run.
   * For "condition": DSL expression (truthy → next, falsy → else branch).
   * For "timer": ISO 8601 duration, e.g. "PT24H".
   * For "notification": message template.
   * For "integration": endpoint ID.
   */
  config: Record<string, unknown>;
  /** ID of next step on success/approval */
  nextStepId?: string;
  /** ID of next step on rejection/failure (for conditional/approval) */
  elseStepId?: string;
  /** Terminal step — workflow ends here */
  terminal?: boolean;
}

// ---------------------------------------------------------------------------
// Workflow Definition (metadata)
// ---------------------------------------------------------------------------

export interface WorkflowDefinition {
  /** Unique workflow ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Event that triggers this workflow */
  trigger: string;
  /** DSL condition when this workflow activates (optional) */
  condition?: string;
  /** Ordered step definitions */
  steps: WorkflowStep[];
  /** ID of the first step to execute */
  initialStepId: string;
  /** Whether workflow is active */
  enabled: boolean;
  /** Tenant scope (null = global) */
  tenantId?: string | null;
}

// ---------------------------------------------------------------------------
// Workflow Instance (runtime state)
// ---------------------------------------------------------------------------

export type WorkflowStatus =
  | "pending"
  | "running"
  | "waiting_approval"
  | "waiting_timer"
  | "completed"
  | "rejected"
  | "failed";

export interface WorkflowInstance {
  /** Unique instance ID */
  id: string;
  /** Definition this instance runs */
  workflowId: string;
  /** Current step ID */
  currentStepId: string;
  /** Overall workflow status */
  status: WorkflowStatus;
  /** Trigger event data */
  context: Record<string, unknown>;
  /** Accumulated execution log */
  history: WorkflowStepExecution[];
  /** ISO 8601 when workflow started */
  startedAt: string;
  /** ISO 8601 when workflow completed/failed (if terminal) */
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// Step Execution Record
// ---------------------------------------------------------------------------

export interface WorkflowStepExecution {
  stepId: string;
  stepLabel: string;
  executedAt: string;
  result: "completed" | "rejected" | "skipped" | "error";
  actor?: string;
  reason?: string;
  output?: Record<string, unknown>;
}
