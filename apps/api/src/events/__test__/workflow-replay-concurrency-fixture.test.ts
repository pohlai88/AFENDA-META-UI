import type { DomainEvent, ProjectionDefinition } from "@afenda/meta-types";
import { describe, expect, it } from "vitest";

import {
  assertNoProjectionDrift,
  detectProjectionDrift,
  ProjectionDriftError,
  ProjectionReplayError,
  replayProjectionEvents,
} from "../projectionRuntime.js";

interface WorkflowProjectionState {
  status: "draft" | "active";
  updates: number;
}

function toEvents(
  aggregateType: "workflow" | "workflow_instance",
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

describe("workflow replay concurrency fixture", () => {
  const workflowProjection: ProjectionDefinition<WorkflowProjectionState> = {
    name: "workflow.read_model",
    source: "workflow",
    consistency: "materialized",
    version: {
      version: 1,
      schemaHash: "workflow_read_model_v1",
    },
    handler: (state) => ({
      status: "active",
      updates: state.updates + 1,
    }),
  };

  const workflowInstanceProjection: ProjectionDefinition<WorkflowProjectionState> = {
    name: "workflow_instance.read_model",
    source: "workflow_instance",
    consistency: "materialized",
    version: {
      version: 1,
      schemaHash: "workflow_instance_read_model_v1",
    },
    handler: (state) => ({
      status: "active",
      updates: state.updates + 1,
    }),
  };

  it("detects optimistic-concurrency drift when workflow checkpoint is ahead of stream", () => {
    const report = detectProjectionDrift({
      definition: workflowProjection,
      checkpoint: {
        projectionName: workflowProjection.name,
        aggregateType: "workflow",
        aggregateId: "workflow-1",
        lastAppliedVersion: 5,
        projectionVersion: 1,
        schemaHash: "workflow_read_model_v1",
        updatedAt: "2026-03-28T00:00:00.000Z",
      },
      latestEventVersion: 4,
    });

    expect(report.drifted).toBe(true);
    expect(report.reasons).toContain("projection checkpoint ahead of event stream (5 > 4)");
    expect(() => assertNoProjectionDrift(report)).toThrow(ProjectionDriftError);
  });

  it("detects optimistic-concurrency drift when workflow_instance checkpoint is ahead", () => {
    const report = detectProjectionDrift({
      definition: workflowInstanceProjection,
      checkpoint: {
        projectionName: workflowInstanceProjection.name,
        aggregateType: "workflow_instance",
        aggregateId: "wf_1",
        lastAppliedVersion: 7,
        projectionVersion: 1,
        schemaHash: "workflow_instance_read_model_v1",
        updatedAt: "2026-03-28T00:00:00.000Z",
      },
      latestEventVersion: 6,
    });

    expect(report.drifted).toBe(true);
    expect(report.reasons).toContain("projection checkpoint ahead of event stream (7 > 6)");
    expect(() => assertNoProjectionDrift(report)).toThrow(ProjectionDriftError);
  });

  it("rejects replay when duplicate workflow versions imply competing writes", () => {
    expect(() =>
      replayProjectionEvents({
        definition: workflowProjection,
        events: toEvents("workflow", "workflow-1", [1, 2, 2, 3]),
        initialState: {
          status: "draft",
          updates: 0,
        } as WorkflowProjectionState,
      })
    ).toThrow(ProjectionReplayError);
  });

  it("rejects replay when workflow_instance duplicate versions imply competing writes", () => {
    expect(() =>
      replayProjectionEvents({
        definition: workflowInstanceProjection,
        events: toEvents("workflow_instance", "wf_1", [1, 2, 2, 3]),
        initialState: {
          status: "draft",
          updates: 0,
        } as WorkflowProjectionState,
      })
    ).toThrow(ProjectionReplayError);
  });
});
