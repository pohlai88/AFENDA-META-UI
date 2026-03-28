import type { DomainEvent } from "@afenda/meta-types";
import { describe, expect, it } from "vitest";

import {
  assertNoProjectionDrift,
  buildProjectionCheckpoint,
  detectProjectionDrift,
  getLatestEventVersionStrict,
  ProjectionDriftError,
  ProjectionReplayError,
  replayProjectionEvents,
} from "../projectionRuntime.js";

interface CrossContextFixtureInput {
  organizationVersions: number[];
  workflowVersions: number[];
  organizationCheckpointVersion: number;
  workflowCheckpointVersion: number;
}

interface OrganizationProjectionState {
  enabled: boolean;
  updates: number;
}

interface WorkflowProjectionState {
  status: "draft" | "active";
  updates: number;
}

function toEvents(
  aggregateType: "organization" | "workflow",
  aggregateId: string,
  versions: number[]
): DomainEvent[] {
  return versions.map((version) => ({
    id: `${aggregateType}-${aggregateId}-${version}`,
    aggregateType,
    aggregateId,
    eventType: `${aggregateType}.direct_update`,
    payload: {},
    version,
    timestamp: new Date(`2026-03-${String(version).padStart(2, "0")}T00:00:00.000Z`).toISOString(),
  }));
}

function buildPlatformWorkflowFixture(input: CrossContextFixtureInput) {
  const organizationDefinition = {
    name: "organization.read_model",
    version: {
      version: 1,
      schemaHash: "organization_read_model_v1",
    },
  } as const;
  const workflowDefinition = {
    name: "workflow.read_model",
    version: {
      version: 1,
      schemaHash: "workflow_read_model_v1",
    },
  } as const;

  const organizationEvents = toEvents("organization", "org-tenant-1", input.organizationVersions);
  const workflowEvents = toEvents("workflow", "workflow-org-1", input.workflowVersions);

  const organizationLatestVersion = getLatestEventVersionStrict(
    organizationEvents,
    organizationDefinition.name
  );
  const workflowLatestVersion = getLatestEventVersionStrict(
    workflowEvents,
    workflowDefinition.name
  );

  const organizationDrift = detectProjectionDrift({
    definition: organizationDefinition,
    checkpoint: buildProjectionCheckpoint({
      definition: organizationDefinition,
      aggregateType: "organization",
      aggregateId: "org-tenant-1",
      lastAppliedVersion: input.organizationCheckpointVersion,
    }),
    latestEventVersion: organizationLatestVersion,
  });

  const workflowDrift = detectProjectionDrift({
    definition: workflowDefinition,
    checkpoint: buildProjectionCheckpoint({
      definition: workflowDefinition,
      aggregateType: "workflow",
      aggregateId: "workflow-org-1",
      lastAppliedVersion: input.workflowCheckpointVersion,
    }),
    latestEventVersion: workflowLatestVersion,
  });

  return {
    organizationDrift,
    workflowDrift,
  };
}

describe("cross-context drift fixture (platform <-> workflow)", () => {
  it("flags workflow drift while platform projection remains healthy", () => {
    const fixture = buildPlatformWorkflowFixture({
      organizationVersions: [1, 2],
      workflowVersions: [1, 2, 3],
      organizationCheckpointVersion: 2,
      workflowCheckpointVersion: 2,
    });

    expect(fixture.organizationDrift.drifted).toBe(false);
    expect(fixture.workflowDrift.drifted).toBe(true);
    expect(fixture.workflowDrift.reasons).toContain("projection stale by 1 event(s)");
  });

  it("stays clean when platform and workflow checkpoints are aligned", () => {
    const fixture = buildPlatformWorkflowFixture({
      organizationVersions: [1, 2, 3],
      workflowVersions: [1, 2, 3],
      organizationCheckpointVersion: 3,
      workflowCheckpointVersion: 3,
    });

    expect(() => assertNoProjectionDrift(fixture.organizationDrift)).not.toThrow();
    expect(() => assertNoProjectionDrift(fixture.workflowDrift)).not.toThrow();
  });

  it("throws contextual drift error for cross-context replay diagnostics", () => {
    const fixture = buildPlatformWorkflowFixture({
      organizationVersions: [1, 2],
      workflowVersions: [1, 2, 3, 4],
      organizationCheckpointVersion: 2,
      workflowCheckpointVersion: 1,
    });

    expect(() => assertNoProjectionDrift(fixture.workflowDrift)).toThrow(ProjectionDriftError);
    expect(fixture.workflowDrift.reasons).toContain("projection stale by 3 event(s)");
  });

  it("replays platform and workflow projections deterministically from aligned streams", () => {
    const organizationProjection = {
      name: "organization.read_model",
      source: "organization",
      consistency: "materialized",
      version: {
        version: 1,
        schemaHash: "organization_read_model_v1",
      },
      handler: (state: OrganizationProjectionState) => ({
        enabled: true,
        updates: state.updates + 1,
      }),
    } as const;

    const workflowProjection = {
      name: "workflow.read_model",
      source: "workflow",
      consistency: "materialized",
      version: {
        version: 1,
        schemaHash: "workflow_read_model_v1",
      },
      handler: (state: WorkflowProjectionState) => ({
        status: "active" as const,
        updates: state.updates + 1,
      }),
    } as const;

    const organizationReplay = replayProjectionEvents({
      definition: organizationProjection,
      events: toEvents("organization", "org-tenant-1", [1, 2, 3]),
      initialState: {
        enabled: false,
        updates: 0,
      },
    });

    const workflowReplay = replayProjectionEvents({
      definition: workflowProjection,
      events: toEvents("workflow", "workflow-org-1", [1, 2, 3]),
      initialState: {
        status: "draft",
        updates: 0,
      },
    });

    expect(organizationReplay.lastAppliedVersion).toBe(3);
    expect(organizationReplay.state).toEqual({ enabled: true, updates: 3 });
    expect(workflowReplay.lastAppliedVersion).toBe(3);
    expect(workflowReplay.state).toEqual({ status: "active", updates: 3 });
  });

  it("fails replay with actionable errors when workflow stream is non-monotonic", () => {
    expect(() =>
      replayProjectionEvents({
        definition: {
          name: "workflow.read_model",
          source: "workflow",
          consistency: "materialized",
          version: {
            version: 1,
            schemaHash: "workflow_read_model_v1",
          },
          handler: (state: WorkflowProjectionState) => ({
            status: "active" as const,
            updates: state.updates + 1,
          }),
        },
        events: toEvents("workflow", "workflow-org-1", [2, 2, 3]),
        initialState: {
          status: "draft",
          updates: 0,
        },
      })
    ).toThrow(ProjectionReplayError);
  });
});
