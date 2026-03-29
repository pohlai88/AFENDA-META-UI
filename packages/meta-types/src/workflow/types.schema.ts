/**
 * @module workflow/types.schema
 * @description Zod schemas for workflow definitions, instances, and step execution.
 * @layer truth-contract
 */

import { z } from "zod";

export const WorkflowStepTypeSchema = z.enum([
  "approval",
  "action",
  "condition",
  "timer",
  "notification",
  "integration",
]);

export const WorkflowStepSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: WorkflowStepTypeSchema,
  config: z.record(z.string(), z.unknown()),
  nextStepId: z.string().optional(),
  elseStepId: z.string().optional(),
  terminal: z.boolean().optional(),
});

export const WorkflowDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  trigger: z.string(),
  condition: z.string().optional(),
  steps: z.array(WorkflowStepSchema),
  initialStepId: z.string(),
  enabled: z.boolean(),
  tenantId: z.string().nullish(),
});

export const WorkflowStatusSchema = z.enum([
  "pending",
  "running",
  "waiting_approval",
  "waiting_timer",
  "completed",
  "rejected",
  "failed",
]);

export const WorkflowStepExecutionSchema = z.object({
  stepId: z.string(),
  stepLabel: z.string(),
  executedAt: z.string(),
  result: z.enum(["completed", "rejected", "skipped", "error"]),
  actor: z.string().optional(),
  reason: z.string().optional(),
  output: z.record(z.string(), z.unknown()).optional(),
});

export const WorkflowInstanceSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  currentStepId: z.string(),
  status: WorkflowStatusSchema,
  context: z.record(z.string(), z.unknown()),
  history: z.array(WorkflowStepExecutionSchema),
  startedAt: z.string(),
  completedAt: z.string().optional(),
});
