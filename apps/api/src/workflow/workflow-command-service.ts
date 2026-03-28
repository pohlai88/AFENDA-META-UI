import {
  createProjectionDriftValidator,
  executeCommandRuntime,
  type ExecuteMutationCommandResult,
} from "../policy/command-runtime-spine.js";
import {
  advanceInstance,
  getInstance,
  getWorkflow,
  registerWorkflow,
  removeWorkflow,
  submitApproval,
  updateWorkflow,
} from "./index.js";

import type { WorkflowDefinition, WorkflowInstance } from "@afenda/meta-types";

type WorkflowRecord = Record<string, unknown>;

const WORKFLOW_CREATE_SOURCE = "api.workflows.create";
const WORKFLOW_UPDATE_SOURCE = "api.workflows.update";
const WORKFLOW_DELETE_SOURCE = "api.workflows.delete";
const WORKFLOW_INSTANCE_ADVANCE_SOURCE = "api.workflows.instances.advance";
const WORKFLOW_INSTANCE_APPROVE_SOURCE = "api.workflows.instances.approve";
const WORKFLOW_PROJECTION_DEFINITION = {
  name: "workflow.read_model",
  version: {
    version: 1,
    schemaHash: "workflow_read_model_v1",
  },
} as const;
const WORKFLOW_INSTANCE_PROJECTION_DEFINITION = {
  name: "workflow_instance.read_model",
  version: {
    version: 1,
    schemaHash: "workflow_instance_read_model_v1",
  },
} as const;
const assertWorkflowProjectionDrift = createProjectionDriftValidator({
  aggregateType: "workflow",
  definition: WORKFLOW_PROJECTION_DEFINITION,
});
const assertWorkflowInstanceProjectionDrift = createProjectionDriftValidator({
  aggregateType: "workflow_instance",
  definition: WORKFLOW_INSTANCE_PROJECTION_DEFINITION,
});

function toWorkflowRecord(workflow: WorkflowDefinition): WorkflowRecord {
  return workflow as unknown as WorkflowRecord;
}

function toWorkflowInstanceRecord(instance: WorkflowInstance): WorkflowRecord {
  return instance as unknown as WorkflowRecord;
}

export async function createWorkflowCommand(input: {
  workflow: WorkflowDefinition;
  actorId?: string;
  source?: string;
}): Promise<ExecuteMutationCommandResult<WorkflowRecord>> {
  return executeCommandRuntime<WorkflowRecord>({
    model: "workflow",
    operation: "create",
    actorId: input.actorId,
    source: input.source ?? WORKFLOW_CREATE_SOURCE,
    nextRecord: toWorkflowRecord(input.workflow),
    validateProjectionDrift: ({ aggregateId }) => assertWorkflowProjectionDrift(aggregateId),
    mutate: async () => {
      registerWorkflow(input.workflow);
      return toWorkflowRecord(input.workflow);
    },
  });
}

export async function updateWorkflowCommand(input: {
  workflow: WorkflowDefinition;
  actorId?: string;
  source?: string;
}): Promise<ExecuteMutationCommandResult<WorkflowRecord>> {
  const existing = getWorkflow(input.workflow.id);

  return executeCommandRuntime<WorkflowRecord>({
    model: "workflow",
    operation: "update",
    recordId: input.workflow.id,
    actorId: input.actorId,
    source: input.source ?? WORKFLOW_UPDATE_SOURCE,
    existingRecord: existing ? toWorkflowRecord(existing) : null,
    nextRecord: toWorkflowRecord(input.workflow),
    validateProjectionDrift: ({ aggregateId }) => assertWorkflowProjectionDrift(aggregateId),
    mutate: async () => {
      updateWorkflow(input.workflow);
      return toWorkflowRecord(input.workflow);
    },
  });
}

export async function removeWorkflowCommand(input: {
  workflowId: string;
  actorId?: string;
  source?: string;
}): Promise<ExecuteMutationCommandResult<WorkflowRecord>> {
  const existing = getWorkflow(input.workflowId);

  return executeCommandRuntime<WorkflowRecord>({
    model: "workflow",
    operation: "delete",
    recordId: input.workflowId,
    actorId: input.actorId,
    source: input.source ?? WORKFLOW_DELETE_SOURCE,
    existingRecord: existing ? toWorkflowRecord(existing) : null,
    validateProjectionDrift: ({ aggregateId }) => assertWorkflowProjectionDrift(aggregateId),
    mutate: async () => {
      const removed = removeWorkflow(input.workflowId);
      return removed && existing ? toWorkflowRecord(existing) : null;
    },
  });
}

export async function advanceWorkflowInstanceCommand(input: {
  instanceId: string;
  actorId?: string;
  stepInput?: Record<string, unknown>;
  source?: string;
}): Promise<ExecuteMutationCommandResult<WorkflowRecord>> {
  const existing = getInstance(input.instanceId);
  const resolvedActorId = input.actorId ?? "system";

  return executeCommandRuntime<WorkflowRecord>({
    model: "workflow_instance",
    operation: "update",
    recordId: input.instanceId,
    actorId: resolvedActorId,
    source: input.source ?? WORKFLOW_INSTANCE_ADVANCE_SOURCE,
    existingRecord: existing ? toWorkflowInstanceRecord(existing) : null,
    validateProjectionDrift: ({ aggregateId }) =>
      assertWorkflowInstanceProjectionDrift(aggregateId),
    mutate: async () => {
      const instance = await advanceInstance(input.instanceId, {
        actor: resolvedActorId,
        stepInput: input.stepInput,
      });

      return toWorkflowInstanceRecord(instance);
    },
  });
}

export async function submitWorkflowApprovalCommand(input: {
  instanceId: string;
  decision: "approved" | "rejected";
  actorId: string;
  reason?: string;
  source?: string;
}): Promise<ExecuteMutationCommandResult<WorkflowRecord>> {
  const existing = getInstance(input.instanceId);

  return executeCommandRuntime<WorkflowRecord>({
    model: "workflow_instance",
    operation: "update",
    recordId: input.instanceId,
    actorId: input.actorId,
    source: input.source ?? WORKFLOW_INSTANCE_APPROVE_SOURCE,
    existingRecord: existing ? toWorkflowInstanceRecord(existing) : null,
    validateProjectionDrift: ({ aggregateId }) =>
      assertWorkflowInstanceProjectionDrift(aggregateId),
    mutate: async () => {
      const instance = await submitApproval(
        input.instanceId,
        input.decision,
        input.actorId,
        input.reason
      );

      return toWorkflowInstanceRecord(instance);
    },
  });
}
