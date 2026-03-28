import {
  createProjectionDriftValidator,
  executeCommandRuntime,
  type ExecuteMutationCommandResult,
} from "../policy/command-runtime-spine.js";
import {
  getOrganization,
  registerOrganization,
  removeOrganization,
  updateOrganization,
} from "./index.js";

import type { OrganizationDefinition } from "@afenda/meta-types";

type OrganizationRecord = Record<string, unknown>;

const ORGANIZATION_CREATE_SOURCE = "api.organizations.create";
const ORGANIZATION_UPDATE_SOURCE = "api.organizations.update";
const ORGANIZATION_DELETE_SOURCE = "api.organizations.delete";
const ORGANIZATION_PROJECTION_DEFINITION = {
  name: "organization.read_model",
  version: {
    version: 1,
    schemaHash: "organization_read_model_v1",
  },
} as const;
const assertOrganizationProjectionDrift = createProjectionDriftValidator({
  aggregateType: "organization",
  definition: ORGANIZATION_PROJECTION_DEFINITION,
});

function toOrganizationRecord(organization: OrganizationDefinition): OrganizationRecord {
  return organization as unknown as OrganizationRecord;
}

export { toOrganizationRecord };

export async function createOrganizationCommand(input: {
  organization: OrganizationDefinition;
  actorId?: string;
  source?: string;
}): Promise<ExecuteMutationCommandResult<OrganizationRecord>> {
  return executeCommandRuntime<OrganizationRecord>({
    model: "organization",
    operation: "create",
    actorId: input.actorId,
    source: input.source ?? ORGANIZATION_CREATE_SOURCE,
    nextRecord: toOrganizationRecord(input.organization),
    loadProjectionState: async ({ aggregateId }) => loadOrganizationProjectionState(aggregateId),
    projectEvent: ({ currentState, nextRecord }) => nextRecord ?? currentState,
    persistProjectionState: async () => {
      registerOrganization(input.organization);
    },
    validateProjectionDrift: ({ aggregateId }) => assertOrganizationProjectionDrift(aggregateId),
    mutate: async () => {
      registerOrganization(input.organization);
      return toOrganizationRecord(input.organization);
    },
  });
}

export async function updateOrganizationCommand(input: {
  organization: OrganizationDefinition;
  actorId?: string;
  source?: string;
}): Promise<ExecuteMutationCommandResult<OrganizationRecord>> {
  return executeCommandRuntime<OrganizationRecord>({
    model: "organization",
    operation: "update",
    recordId: input.organization.id,
    actorId: input.actorId,
    source: input.source ?? ORGANIZATION_UPDATE_SOURCE,
    nextRecord: toOrganizationRecord(input.organization),
    loadProjectionState: async ({ aggregateId }) => loadOrganizationProjectionState(aggregateId),
    projectEvent: ({ currentState, nextRecord }) => nextRecord ?? currentState,
    persistProjectionState: async () => {
      updateOrganization(input.organization);
    },
    validateProjectionDrift: ({ aggregateId }) => assertOrganizationProjectionDrift(aggregateId),
    mutate: async () => {
      updateOrganization(input.organization);
      return toOrganizationRecord(input.organization);
    },
  });
}

export async function removeOrganizationCommand(input: {
  organizationId: string;
  actorId?: string;
  source?: string;
}): Promise<ExecuteMutationCommandResult<OrganizationRecord>> {
  const existing = getOrganization(input.organizationId);

  return executeCommandRuntime<OrganizationRecord>({
    model: "organization",
    operation: "delete",
    recordId: input.organizationId,
    actorId: input.actorId,
    source: input.source ?? ORGANIZATION_DELETE_SOURCE,
    loadProjectionState: async ({ aggregateId }) => loadOrganizationProjectionState(aggregateId),
    projectEvent: ({ currentState }) => currentState,
    persistProjectionState: async () => {
      removeOrganization(input.organizationId);
    },
    validateProjectionDrift: ({ aggregateId }) => assertOrganizationProjectionDrift(aggregateId),
    mutate: async () => {
      const removed = removeOrganization(input.organizationId);
      return removed && existing ? toOrganizationRecord(existing) : null;
    },
  });
}

async function loadOrganizationProjectionState(
  aggregateId?: string
): Promise<OrganizationRecord | null> {
  if (!aggregateId) {
    return null;
  }

  await assertOrganizationProjectionDrift(aggregateId);
  const organization = getOrganization(aggregateId);

  return organization ? toOrganizationRecord(organization) : null;
}
