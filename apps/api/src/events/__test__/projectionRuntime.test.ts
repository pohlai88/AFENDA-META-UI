import type { DomainEvent, ProjectionDefinition } from "@afenda/meta-types";
import { describe, expect, it } from "vitest";

import {
  assertNoProjectionDrift,
  buildProjectionCheckpoint,
  detectProjectionDrift,
  ProjectionDriftError,
  ProjectionReplayError,
  replayProjectionEvents,
} from "../projectionRuntime.js";

interface SalesProjectionState {
  status: string;
  totalEvents: number;
}

const salesOrderProjection: ProjectionDefinition<SalesProjectionState> = {
  name: "sales_order.read_model",
  source: "sales_order",
  consistency: "materialized",
  version: {
    version: 2,
    schemaHash: "sales-order-v2-hash",
  },
  handler: (state, event) => {
    if (event.eventType === "sales_order.confirmed") {
      return {
        status: "sale",
        totalEvents: state.totalEvents + 1,
      };
    }

    if (event.eventType === "sales_order.cancelled") {
      return {
        status: "cancel",
        totalEvents: state.totalEvents + 1,
      };
    }

    return {
      ...state,
      totalEvents: state.totalEvents + 1,
    };
  },
};

const initialState: SalesProjectionState = {
  status: "draft",
  totalEvents: 0,
};

const makeEvent = (version: number, eventType: string): DomainEvent => ({
  id: `evt-${version}`,
  aggregateType: "sales_order",
  aggregateId: "so-1",
  eventType,
  payload: {},
  version,
  timestamp: new Date(`2026-01-0${version}T00:00:00.000Z`).toISOString(),
});

describe("projectionRuntime", () => {
  it("replays deterministic projection state with version metadata", () => {
    const result = replayProjectionEvents({
      definition: salesOrderProjection,
      events: [makeEvent(1, "sales_order.submitted"), makeEvent(2, "sales_order.confirmed")],
      initialState,
    });

    expect(result.state).toEqual({
      status: "sale",
      totalEvents: 2,
    });
    expect(result.lastAppliedVersion).toBe(2);
    expect(result.appliedEvents).toBe(2);
    expect(result.projectionVersion).toBe(2);
    expect(result.schemaHash).toBe("sales-order-v2-hash");
  });

  it("rejects non-monotonic event versions", () => {
    let error: unknown;

    try {
      replayProjectionEvents({
        definition: salesOrderProjection,
        events: [makeEvent(2, "sales_order.submitted"), makeEvent(2, "sales_order.confirmed")],
        initialState,
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ProjectionReplayError);
    expect((error as ProjectionReplayError).details).toEqual({
      projectionName: "sales_order.read_model",
      previousVersion: 2,
      receivedVersion: 2,
      eventId: "evt-2",
      aggregateType: "sales_order",
      aggregateId: "so-1",
    });
  });

  it("detects stale projections and hash/version drift", () => {
    const checkpoint = buildProjectionCheckpoint({
      definition: salesOrderProjection,
      aggregateType: "sales_order",
      aggregateId: "so-1",
      lastAppliedVersion: 2,
    });

    const drift = detectProjectionDrift({
      definition: {
        ...salesOrderProjection,
        version: {
          version: 3,
          schemaHash: "sales-order-v3-hash",
        },
      },
      checkpoint,
      latestEventVersion: 5,
    });

    expect(drift.drifted).toBe(true);
    expect(drift.staleBy).toBe(3);
    expect(drift.reasons).toContain("projection schema hash mismatch");
    expect(drift.reasons.some((reason) => reason.includes("version mismatch"))).toBe(true);
    expect(drift.reasons.some((reason) => reason.includes("stale by 3 event"))).toBe(true);
  });

  it("throws actionable error when drift is asserted", () => {
    const drift = detectProjectionDrift({
      definition: salesOrderProjection,
      checkpoint: {
        projectionName: salesOrderProjection.name,
        aggregateType: "sales_order",
        aggregateId: "so-1",
        lastAppliedVersion: 1,
        projectionVersion: 2,
        schemaHash: "sales-order-v2-hash",
        updatedAt: new Date().toISOString(),
      },
      latestEventVersion: 4,
    });

    expect(() => assertNoProjectionDrift(drift)).toThrow(ProjectionDriftError);
  });

  it("passes clean projections without drift", () => {
    const checkpoint = buildProjectionCheckpoint({
      definition: salesOrderProjection,
      aggregateType: "sales_order",
      aggregateId: "so-1",
      lastAppliedVersion: 4,
    });

    const drift = detectProjectionDrift({
      definition: salesOrderProjection,
      checkpoint,
      latestEventVersion: 4,
    });

    expect(drift.drifted).toBe(false);
    expect(() => assertNoProjectionDrift(drift)).not.toThrow();
  });
});
