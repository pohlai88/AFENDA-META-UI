/**
 * @module workflow
 * @description Metadata-driven workflow contracts for process steps, execution state, and transitions.
 * @layer truth-contract
 * @consumers api, web, db
 */

export type WorkflowStepType =
  | "approval"
  | "action"
  | "condition"
  | "timer"
  | "notification"
  | "integration";

export interface WorkflowStep {
  id: string;
  label: string;
  type: WorkflowStepType;
  config: Record<string, unknown>;
  nextStepId?: string;
  elseStepId?: string;
  terminal?: boolean;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  trigger: string;
  condition?: string;
  steps: WorkflowStep[];
  initialStepId: string;
  enabled: boolean;
  tenantId?: string | null;
}

export type WorkflowStatus =
  | "pending"
  | "running"
  | "waiting_approval"
  | "waiting_timer"
  | "completed"
  | "rejected"
  | "failed";

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  currentStepId: string;
  status: WorkflowStatus;
  context: Record<string, unknown>;
  history: WorkflowStepExecution[];
  startedAt: string;
  completedAt?: string;
}

export interface WorkflowStepExecution {
  stepId: string;
  stepLabel: string;
  executedAt: string;
  result: "completed" | "rejected" | "skipped" | "error";
  actor?: string;
  reason?: string;
  output?: Record<string, unknown>;
}
