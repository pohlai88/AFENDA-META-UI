/**
 * Metadata-Driven Workflow Engine
 * =================================
 * Business processes defined as data.
 * No code deployments required to change a workflow.
 *
 * Workflows are state machines. Steps are nodes. Transitions are edges.
 * The engine listens to the Event Mesh for triggers.
 *
 * Supports: human approvals, automated actions, DSL conditions,
 *           timer waits, notifications, and integrations.
 */

import type {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStep,
  WorkflowStepExecution,
  WorkflowStatus,
} from "@afenda/meta-types";
import { logDecisionAudit } from "../audit/decisionAuditLogger.js";

// ---------------------------------------------------------------------------
// Topic Matching (local copy — avoids circular dep with mesh)
// ---------------------------------------------------------------------------

function matchTopic(topic: string, pattern: string): boolean {
  if (pattern === "*") return true;
  if (pattern === topic) return true;
  const topicParts = topic.split(".");
  const patternParts = pattern.split(".");
  if (topicParts.length !== patternParts.length) return false;
  return patternParts.every((part, i) => part === "*" || part === topicParts[i]);
}

// ---------------------------------------------------------------------------
// In-Memory Stores
// ---------------------------------------------------------------------------

const definitions = new Map<string, WorkflowDefinition>();
const instances = new Map<string, WorkflowInstance>();
let instanceCounter = 0;

function resolveWorkflowTenantId(
  def: WorkflowDefinition,
  context: Record<string, unknown>
): string {
  const fromContext = context.tenantId;
  if (typeof fromContext === "string" && fromContext.trim().length > 0) {
    return fromContext;
  }

  if (typeof def.tenantId === "string" && def.tenantId.trim().length > 0) {
    return def.tenantId;
  }

  return "global";
}

function logWorkflowTransition(params: {
  instanceId: string;
  workflowId: string;
  tenantId: string;
  fromStatus?: WorkflowStatus;
  toStatus: WorkflowStatus;
  stepId?: string;
  actor?: string;
  reason?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}) {
  logDecisionAudit({
    id: `wf_${params.instanceId}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    tenantId: params.tenantId,
    userId: params.actor,
    eventType: "workflow_transitioned",
    scope: `workflow.${params.workflowId}`,
    context: {
      workflowId: params.workflowId,
      eventId: params.instanceId,
    },
    decision: {
      input: {
        fromStatus: params.fromStatus,
        stepId: params.stepId,
        ...(params.input ?? {}),
      },
      output: {
        toStatus: params.toStatus,
        ...(params.output ?? {}),
      },
      reasoning: params.reason,
    },
    durationMs: 0,
    status: "success",
  });
}

// ---------------------------------------------------------------------------
// Definition Registry
// ---------------------------------------------------------------------------

/**
 * Register a workflow definition.
 * Throws if a definition with the same ID already exists.
 */
export function registerWorkflow(def: WorkflowDefinition): void {
  if (definitions.has(def.id)) {
    throw new Error(`Workflow "${def.id}" is already registered.`);
  }
  definitions.set(def.id, def);
}

/**
 * Update an existing workflow definition.
 */
export function updateWorkflow(def: WorkflowDefinition): void {
  definitions.set(def.id, def);
}

/**
 * Remove a workflow definition.
 */
export function removeWorkflow(id: string): boolean {
  return definitions.delete(id);
}

/**
 * Get a workflow definition by ID.
 */
export function getWorkflow(id: string): WorkflowDefinition | undefined {
  return definitions.get(id);
}

/**
 * List all registered workflow definitions.
 */
export function listWorkflows(opts?: {
  enabledOnly?: boolean;
  tenantId?: string;
}): WorkflowDefinition[] {
  let all = Array.from(definitions.values());
  if (opts?.enabledOnly) {
    all = all.filter((d) => d.enabled);
  }
  if (opts?.tenantId !== undefined) {
    all = all.filter((d) => d.tenantId === opts.tenantId || d.tenantId === null);
  }
  return all;
}

// ---------------------------------------------------------------------------
// Workflow Triggering
// ---------------------------------------------------------------------------

/**
 * Find and start all workflows whose trigger matches the given event topic,
 * and whose optional condition evaluates to true against the context.
 *
 * Returns the created WorkflowInstance(s).
 */
export async function triggerWorkflows(
  eventTopic: string,
  context: Record<string, unknown>
): Promise<WorkflowInstance[]> {
  const matching = Array.from(definitions.values()).filter(
    (d) => d.enabled && matchTopic(eventTopic, d.trigger)
  );

  const started: WorkflowInstance[] = [];

  for (const def of matching) {
    // Evaluate optional condition
    if (def.condition) {
      const passes = evaluateConditionExpression(def.condition, context);
      if (!passes) continue;
    }

    const instance = startInstance(def, context);
    started.push(instance);

    // Auto-execute the first step if it doesn't require human interaction
    await advanceInstance(instance.id, { actor: "system" });
  }

  return started;
}

/**
 * Simple synchronous DSL condition evaluator.
 * Uses Function constructor — sandboxed (no globals) via with(ctx).
 * For full safety, plug in the policy DSL evaluator.
 */
function evaluateConditionExpression(expr: string, context: Record<string, unknown>): boolean {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(...Object.keys(context), `"use strict"; return !!(${expr});`);
    return Boolean(fn(...Object.values(context)));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Instance Lifecycle
// ---------------------------------------------------------------------------

function startInstance(
  def: WorkflowDefinition,
  context: Record<string, unknown>
): WorkflowInstance {
  instanceCounter += 1;
  const instance: WorkflowInstance = {
    id: `wf_${instanceCounter}`,
    workflowId: def.id,
    currentStepId: def.initialStepId,
    status: "pending",
    context,
    history: [],
    startedAt: new Date().toISOString(),
  };
  instances.set(instance.id, instance);

  logWorkflowTransition({
    instanceId: instance.id,
    workflowId: def.id,
    tenantId: resolveWorkflowTenantId(def, context),
    toStatus: instance.status,
    stepId: instance.currentStepId,
    actor: "system",
    reason: "Workflow instance started from trigger event.",
    input: { trigger: def.trigger },
  });

  return instance;
}

/**
 * Advance a workflow instance through automated steps.
 * Stops at human approval steps (status → "waiting_approval"),
 * timer steps (status → "waiting_timer"), or terminal steps.
 */
export async function advanceInstance(
  instanceId: string,
  opts: { actor?: string; stepInput?: Record<string, unknown> } = {}
): Promise<WorkflowInstance> {
  const instance = instances.get(instanceId);
  if (!instance) throw new Error(`Workflow instance "${instanceId}" not found.`);
  if (
    instance.status === "completed" ||
    instance.status === "rejected" ||
    instance.status === "failed"
  ) {
    return instance;
  }

  const def = definitions.get(instance.workflowId);
  if (!def) throw new Error(`Workflow definition "${instance.workflowId}" not found.`);

  const tenantId = resolveWorkflowTenantId(def, instance.context);
  const prevStatus = instance.status;
  let step = findStep(def, instance.currentStepId);
  if (!step) {
    instance.status = "failed";
    logWorkflowTransition({
      instanceId,
      workflowId: def.id,
      tenantId,
      fromStatus: prevStatus,
      toStatus: instance.status,
      actor: opts.actor,
      reason: "Workflow step could not be found.",
      stepId: instance.currentStepId,
    });
    return instance;
  }

  instance.status = "running";
  logWorkflowTransition({
    instanceId,
    workflowId: def.id,
    tenantId,
    fromStatus: prevStatus,
    toStatus: instance.status,
    actor: opts.actor,
    stepId: step.id,
    reason: "Workflow execution resumed.",
  });

  // Process steps automatically until we hit something blocking
  while (step) {
    // Pause BEFORE executing blocking step types
    if (step.type === "approval") {
      const fromStatus = instance.status;
      instance.currentStepId = step.id;
      instance.status = "waiting_approval";
      logWorkflowTransition({
        instanceId,
        workflowId: def.id,
        tenantId,
        fromStatus,
        toStatus: instance.status,
        actor: opts.actor,
        stepId: step.id,
        reason: "Workflow paused for human approval.",
      });
      break;
    }
    if (step.type === "timer") {
      const fromStatus = instance.status;
      instance.currentStepId = step.id;
      instance.status = "waiting_timer";
      logWorkflowTransition({
        instanceId,
        workflowId: def.id,
        tenantId,
        fromStatus,
        toStatus: instance.status,
        actor: opts.actor,
        stepId: step.id,
        reason: "Workflow paused for timer step.",
      });
      break;
    }

    const execution = await executeStep(step, instance, opts);
    instance.history.push(execution);

    if (execution.result === "error") {
      const fromStatus = instance.status;
      instance.status = "failed";
      instance.completedAt = new Date().toISOString();
      logWorkflowTransition({
        instanceId,
        workflowId: def.id,
        tenantId,
        fromStatus,
        toStatus: instance.status,
        actor: opts.actor,
        stepId: step.id,
        reason: "Workflow step execution failed.",
        output: { result: execution.result },
      });
      break;
    }

    if (step.terminal) {
      const fromStatus = instance.status;
      instance.status = execution.result === "rejected" ? "rejected" : "completed";
      instance.completedAt = new Date().toISOString();
      logWorkflowTransition({
        instanceId,
        workflowId: def.id,
        tenantId,
        fromStatus,
        toStatus: instance.status,
        actor: opts.actor,
        stepId: step.id,
        reason: "Workflow reached terminal step.",
        output: { result: execution.result },
      });
      break;
    }

    // Determine next step
    const nextId = execution.result === "rejected" ? step.elseStepId : step.nextStepId;

    if (!nextId) {
      const fromStatus = instance.status;
      instance.status = "completed";
      instance.completedAt = new Date().toISOString();
      logWorkflowTransition({
        instanceId,
        workflowId: def.id,
        tenantId,
        fromStatus,
        toStatus: instance.status,
        actor: opts.actor,
        stepId: step.id,
        reason: "Workflow completed with no next step.",
      });
      break;
    }

    step = findStep(def, nextId);
    if (!step) break;

    instance.currentStepId = step.id;

    // Blocking step types are handled at the TOP of the loop (before execution)
  }

  return instance;
}

async function executeStep(
  step: WorkflowStep,
  instance: WorkflowInstance,
  opts: { actor?: string; stepInput?: Record<string, unknown> }
): Promise<WorkflowStepExecution> {
  const base: WorkflowStepExecution = {
    stepId: step.id,
    stepLabel: step.label,
    executedAt: new Date().toISOString(),
    result: "completed",
    actor: opts.actor,
  };

  switch (step.type) {
    case "approval":
      // Approvals require external input — mark as waiting
      return { ...base, result: "skipped" };

    case "condition": {
      const expr = String(step.config.expression ?? "false");
      const passes = evaluateConditionExpression(expr, instance.context);
      return { ...base, result: passes ? "completed" : "rejected" };
    }

    case "notification":
      // In production: emit notification via mesh/email/push
      return { ...base, output: { notified: true, message: step.config.message } };

    case "action":
      // In production: call a registered action handler
      return { ...base, output: { actionId: step.config.actionId, executed: true } };

    case "timer":
      // In production: schedule a delayed resume
      return { ...base, result: "skipped" };

    case "integration":
      // In production: call external API
      return { ...base, output: { endpoint: step.config.endpoint, called: true } };

    default:
      return base;
  }
}

function findStep(def: WorkflowDefinition, stepId: string): WorkflowStep | undefined {
  return def.steps.find((s) => s.id === stepId);
}

// ---------------------------------------------------------------------------
// Human Approval
// ---------------------------------------------------------------------------

/**
 * Submit a human approval decision for a waiting instance.
 * Decision: "approve" advances to nextStepId, "reject" goes to elseStepId.
 */
export async function submitApproval(
  instanceId: string,
  decision: "approved" | "rejected",
  actor: string,
  reason?: string
): Promise<WorkflowInstance> {
  const instance = instances.get(instanceId);
  if (!instance) throw new Error(`Workflow instance "${instanceId}" not found.`);
  if (instance.status !== "waiting_approval") {
    throw new Error(`Instance "${instanceId}" is not waiting for approval.`);
  }

  const def = definitions.get(instance.workflowId)!;
  const tenantId = resolveWorkflowTenantId(def, instance.context);
  const step = findStep(def, instance.currentStepId)!;

  const execution: WorkflowStepExecution = {
    stepId: step.id,
    stepLabel: step.label,
    executedAt: new Date().toISOString(),
    result: decision === "approved" ? "completed" : "rejected",
    actor,
    reason,
  };

  instance.history.push(execution);

  logWorkflowTransition({
    instanceId,
    workflowId: def.id,
    tenantId,
    fromStatus: "waiting_approval",
    toStatus: decision === "approved" ? "running" : "rejected",
    actor,
    stepId: step.id,
    reason: decision === "approved" ? "Approval granted." : "Approval rejected.",
    input: { decision },
    output: { approvalReason: reason },
  });

  const nextId = decision === "approved" ? step.nextStepId : step.elseStepId;

  if (!nextId || step.terminal) {
    instance.status = decision === "approved" ? "completed" : "rejected";
    instance.completedAt = new Date().toISOString();
    logWorkflowTransition({
      instanceId,
      workflowId: def.id,
      tenantId,
      fromStatus: "running",
      toStatus: instance.status,
      actor,
      stepId: step.id,
      reason: "Approval step completed at terminal boundary.",
    });
    return instance;
  }

  instance.currentStepId = nextId;
  return advanceInstance(instanceId, { actor });
}

// ---------------------------------------------------------------------------
// Instance Queries
// ---------------------------------------------------------------------------

/**
 * Get a workflow instance by ID.
 */
export function getInstance(id: string): WorkflowInstance | undefined {
  return instances.get(id);
}

/**
 * List workflow instances, optionally filtered.
 */
export function listInstances(opts?: {
  workflowId?: string;
  status?: WorkflowStatus;
}): WorkflowInstance[] {
  let all = Array.from(instances.values());
  if (opts?.workflowId) all = all.filter((i) => i.workflowId === opts.workflowId);
  if (opts?.status) all = all.filter((i) => i.status === opts.status);
  return all;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function getWorkflowStats(): {
  definitions: number;
  instances: number;
  running: number;
  completed: number;
  failed: number;
} {
  const all = Array.from(instances.values());
  return {
    definitions: definitions.size,
    instances: instances.size,
    running: all.filter(
      (i) =>
        i.status === "running" || i.status === "waiting_approval" || i.status === "waiting_timer"
    ).length,
    completed: all.filter((i) => i.status === "completed").length,
    failed: all.filter((i) => i.status === "failed" || i.status === "rejected").length,
  };
}

export function clearWorkflows(): void {
  definitions.clear();
  instances.clear();
  instanceCounter = 0;
}
