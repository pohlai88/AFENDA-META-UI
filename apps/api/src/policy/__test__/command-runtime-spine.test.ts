import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  assertNoProjectionDriftMock,
  dbGetAggregateEventsMock,
  detectProjectionDriftMock,
  getLatestEventVersionStrictMock,
  getProjectionCheckpointMock,
  executeMutationCommandMock,
} = vi.hoisted(() => ({
  assertNoProjectionDriftMock: vi.fn(),
  dbGetAggregateEventsMock: vi.fn(),
  detectProjectionDriftMock: vi.fn(),
  getLatestEventVersionStrictMock: vi.fn(),
  getProjectionCheckpointMock: vi.fn(),
  executeMutationCommandMock: vi.fn(),
}));

vi.mock("../../events/index.js", () => ({
  assertNoProjectionDrift: assertNoProjectionDriftMock,
  dbGetAggregateEvents: dbGetAggregateEventsMock,
  detectProjectionDrift: detectProjectionDriftMock,
  getLatestEventVersionStrict: getLatestEventVersionStrictMock,
  getProjectionCheckpoint: getProjectionCheckpointMock,
}));

vi.mock("../mutation-command-gateway.js", () => ({
  executeMutationCommand: executeMutationCommandMock,
}));

import { createProjectionDriftValidator, executeCommandRuntime } from "../command-runtime-spine.js";

describe("command runtime spine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    detectProjectionDriftMock.mockReturnValue({ drifted: false, reasons: [] });
    getLatestEventVersionStrictMock.mockReturnValue(2);
    executeMutationCommandMock.mockResolvedValue({ mutationPolicy: "dual-write", record: null });
  });

  it("delegates executeCommandRuntime to executeMutationCommand", async () => {
    const input = {
      model: "tenant",
      operation: "create" as const,
      mutate: vi.fn().mockResolvedValue({ id: "tenant-1" }),
    };

    await executeCommandRuntime(input);

    expect(executeMutationCommandMock).toHaveBeenCalledWith(input);
  });

  it("skips drift checks when aggregateId is not provided", async () => {
    const validate = createProjectionDriftValidator({
      aggregateType: "organization",
      definition: {
        name: "organization.read_model",
        version: { version: 1, schemaHash: "organization_read_model_v1" },
      },
    });

    await validate(undefined);

    expect(getProjectionCheckpointMock).not.toHaveBeenCalled();
    expect(dbGetAggregateEventsMock).not.toHaveBeenCalled();
  });

  it("skips drift checks when checkpoint is absent", async () => {
    getProjectionCheckpointMock.mockReturnValueOnce(null);
    const validate = createProjectionDriftValidator({
      aggregateType: "organization",
      definition: {
        name: "organization.read_model",
        version: { version: 1, schemaHash: "organization_read_model_v1" },
      },
    });

    await validate("org-1");

    expect(getProjectionCheckpointMock).toHaveBeenCalledOnce();
    expect(dbGetAggregateEventsMock).not.toHaveBeenCalled();
  });

  it("checks replay drift when checkpoint exists", async () => {
    getProjectionCheckpointMock.mockReturnValueOnce({
      projectionName: "organization.read_model",
      aggregateType: "organization",
      aggregateId: "org-1",
      lastAppliedVersion: 2,
      projectionVersion: 1,
      schemaHash: "organization_read_model_v1",
      updatedAt: "2026-03-28T00:00:00.000Z",
    });
    dbGetAggregateEventsMock.mockResolvedValueOnce([{ version: 1 }, { version: 2 }]);

    const validate = createProjectionDriftValidator({
      aggregateType: "organization",
      definition: {
        name: "organization.read_model",
        version: { version: 1, schemaHash: "organization_read_model_v1" },
      },
    });

    await validate("org-1");

    expect(dbGetAggregateEventsMock).toHaveBeenCalledWith("organization", "org-1");
    expect(getLatestEventVersionStrictMock).toHaveBeenCalledWith(
      [{ version: 1 }, { version: 2 }],
      "organization.read_model"
    );
    expect(detectProjectionDriftMock).toHaveBeenCalledOnce();
    expect(assertNoProjectionDriftMock).toHaveBeenCalledOnce();
  });
});
