import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OrganizationDefinition } from "@afenda/meta-types/platform";
const {
  assertNoProjectionDriftMock,
  dbGetAggregateEventsMock,
  detectProjectionDriftMock,
  executeMutationCommandMock,
  getLatestEventVersionStrictMock,
  getProjectionCheckpointMock,
  getOrganizationMock,
  registerOrganizationMock,
  removeOrganizationMock,
  updateOrganizationMock,
} = vi.hoisted(() => ({
  assertNoProjectionDriftMock: vi.fn(),
  dbGetAggregateEventsMock: vi.fn(),
  detectProjectionDriftMock: vi.fn(),
  executeMutationCommandMock: vi.fn(),
  getLatestEventVersionStrictMock: vi.fn(),
  getProjectionCheckpointMock: vi.fn(),
  getOrganizationMock: vi.fn(),
  registerOrganizationMock: vi.fn(),
  removeOrganizationMock: vi.fn(),
  updateOrganizationMock: vi.fn(),
}));

vi.mock("../../events/index.js", () => ({
  assertNoProjectionDrift: assertNoProjectionDriftMock,
  dbGetAggregateEvents: dbGetAggregateEventsMock,
  detectProjectionDrift: detectProjectionDriftMock,
  getLatestEventVersionStrict: getLatestEventVersionStrictMock,
  getProjectionCheckpoint: getProjectionCheckpointMock,
}));

vi.mock("../../policy/mutation-command-gateway.js", () => ({
  executeMutationCommand: executeMutationCommandMock,
}));

vi.mock("../index.js", () => ({
  getOrganization: getOrganizationMock,
  registerOrganization: registerOrganizationMock,
  removeOrganization: removeOrganizationMock,
  updateOrganization: updateOrganizationMock,
}));

import {
  createOrganizationCommand,
  removeOrganizationCommand,
  updateOrganizationCommand,
} from "../organization-command-service.js";

const organization: OrganizationDefinition = {
  id: "org-1",
  tenantId: "tenant-1",
  name: "Northwind",
  enabled: true,
};

describe("organization command service", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getProjectionCheckpointMock.mockReturnValue(null);
    dbGetAggregateEventsMock.mockResolvedValue([]);
    getLatestEventVersionStrictMock.mockImplementation((events) => events.at(-1)?.version ?? 0);
    detectProjectionDriftMock.mockImplementation(({ checkpoint, latestEventVersion }) => ({
      drifted: checkpoint.lastAppliedVersion !== latestEventVersion,
      reasons:
        checkpoint.lastAppliedVersion === latestEventVersion
          ? []
          : ["projection stale by 1 event(s)"],
      staleBy: Math.max(0, latestEventVersion - checkpoint.lastAppliedVersion),
      latestEventVersion,
      checkpointVersion: checkpoint.lastAppliedVersion,
    }));
    assertNoProjectionDriftMock.mockImplementation((report) => {
      if (report.drifted) {
        throw new Error("Projection drift detected");
      }
    });

    executeMutationCommandMock.mockImplementation(async (input) => ({
      ...(input.validateProjectionDrift
        ? {
            validated: await input.validateProjectionDrift({
              model: input.model,
              operation: input.operation,
              aggregateId:
                input.recordId ??
                (typeof input.nextRecord?.id === "string" ? input.nextRecord.id : undefined),
              policy: undefined,
            }),
          }
        : {}),
      record: await input.mutate(),
      mutationPolicy: "event-only",
      policy: { id: "platform.organization.command_event_only" },
      event: { id: "evt-org", eventType: `organization.direct_${input.operation}` },
    }));
  });

  it("wraps organization create in the mutation gateway", async () => {
    const result = await createOrganizationCommand({ organization, actorId: "user-1" });

    expect(registerOrganizationMock).toHaveBeenCalledWith(organization);
    expect(executeMutationCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "organization",
        operation: "create",
        actorId: "user-1",
        source: "api.organizations.create",
        nextRecord: organization,
      })
    );
    expect(result.event?.eventType).toBe("organization.direct_create");
  });

  it("includes the existing record when updating an organization", async () => {
    getOrganizationMock.mockReturnValueOnce(organization);
    const updatedOrganization = {
      ...organization,
      enabled: false,
    } satisfies OrganizationDefinition;

    const result = await updateOrganizationCommand({ organization: updatedOrganization });

    expect(updateOrganizationMock).toHaveBeenCalledWith(updatedOrganization);
    expect(executeMutationCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "organization",
        operation: "update",
        recordId: updatedOrganization.id,
        nextRecord: updatedOrganization,
      })
    );
    expect(result.event?.eventType).toBe("organization.direct_update");
  });

  it("returns the removed organization record on delete", async () => {
    getOrganizationMock.mockReturnValueOnce(organization);
    removeOrganizationMock.mockReturnValueOnce(true);

    const result = await removeOrganizationCommand({ organizationId: organization.id });

    expect(removeOrganizationMock).toHaveBeenCalledWith(organization.id);
    expect(executeMutationCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "organization",
        operation: "delete",
        recordId: organization.id,
      })
    );
    expect(result.record).toEqual(organization);
  });

  it("returns null organization record on delete when remove returns false", async () => {
    getOrganizationMock.mockReturnValueOnce(organization);
    removeOrganizationMock.mockReturnValueOnce(false);

    const result = await removeOrganizationCommand({ organizationId: organization.id });

    expect(result.record).toBeNull();
  });

  it("rejects organization updates when projection checkpoint is stale", async () => {
    getOrganizationMock.mockReturnValueOnce(organization);
    getProjectionCheckpointMock.mockReturnValueOnce({
      projectionName: "organization.read_model",
      aggregateType: "organization",
      aggregateId: organization.id,
      lastAppliedVersion: 1,
      projectionVersion: 1,
      schemaHash: "organization_read_model_v1",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    dbGetAggregateEventsMock.mockResolvedValueOnce([{ version: 1 }, { version: 2 }]);

    await expect(updateOrganizationCommand({ organization })).rejects.toThrow(
      "Projection drift detected"
    );
    expect(updateOrganizationMock).not.toHaveBeenCalled();
  });

  it("rejects organization updates when event versions are non-monotonic", async () => {
    getOrganizationMock.mockReturnValueOnce(organization);
    getProjectionCheckpointMock.mockReturnValueOnce({
      projectionName: "organization.read_model",
      aggregateType: "organization",
      aggregateId: organization.id,
      lastAppliedVersion: 2,
      projectionVersion: 1,
      schemaHash: "organization_read_model_v1",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    dbGetAggregateEventsMock.mockResolvedValueOnce([{ version: 2 }, { version: 2 }]);
    getLatestEventVersionStrictMock.mockImplementationOnce(() => {
      throw new Error(
        "Projection organization.read_model requires strictly increasing event versions; received 2 after 2."
      );
    });

    await expect(updateOrganizationCommand({ organization })).rejects.toThrow(
      "strictly increasing event versions"
    );
    expect(updateOrganizationMock).not.toHaveBeenCalled();
  });
});
