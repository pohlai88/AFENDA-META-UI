import type { DomainEvent, ProjectionDefinition } from "@afenda/meta-types";

interface ProjectionContractIdentity {
  name: string;
  version: {
    version: number;
    schemaHash: string;
  };
}

export interface ProjectionCheckpoint {
  projectionName: string;
  aggregateType: string;
  aggregateId: string;
  lastAppliedVersion: number;
  projectionVersion: number;
  schemaHash: string;
  updatedAt: string;
}

export interface ProjectionReplayResult<TState> {
  state: TState;
  lastAppliedVersion: number;
  appliedEvents: number;
  projectionVersion: number;
  schemaHash: string;
}

export interface ProjectionDriftInput {
  definition: ProjectionContractIdentity;
  checkpoint: ProjectionCheckpoint;
  latestEventVersion: number;
}

export interface ProjectionDriftReport {
  drifted: boolean;
  reasons: string[];
  staleBy: number;
  latestEventVersion: number;
  checkpointVersion: number;
}

export interface ProjectionReplayConflictDetails {
  projectionName: string;
  previousVersion: number;
  receivedVersion: number;
  eventId: string;
  aggregateType: string;
  aggregateId: string;
}

export class ProjectionReplayError extends Error {
  readonly code = "PROJECTION_REPLAY_ERROR";
  readonly details?: ProjectionReplayConflictDetails;

  constructor(message: string, details?: ProjectionReplayConflictDetails) {
    super(message);
    this.name = "ProjectionReplayError";
    this.details = details;
  }
}

export class ProjectionDriftError extends Error {
  readonly code = "PROJECTION_DRIFT";
  readonly report: ProjectionDriftReport;

  constructor(report: ProjectionDriftReport) {
    super(
      `Projection drift detected: ${report.reasons.join("; ")} (checkpoint=${report.checkpointVersion}, latest=${report.latestEventVersion})`
    );
    this.name = "ProjectionDriftError";
    this.report = report;
  }
}

export function replayProjectionEvents<TState>(input: {
  definition: ProjectionDefinition<TState>;
  events: DomainEvent[];
  initialState: TState;
}): ProjectionReplayResult<TState> {
  const sortedEvents = [...input.events].sort((a, b) => a.version - b.version);
  assertMonotonicVersions(sortedEvents, input.definition.name);

  const state = sortedEvents.reduce(
    (current, event) => input.definition.handler(current, event),
    input.initialState
  );

  const lastAppliedVersion = sortedEvents.at(-1)?.version ?? 0;

  return {
    state,
    lastAppliedVersion,
    appliedEvents: sortedEvents.length,
    projectionVersion: input.definition.version.version,
    schemaHash: input.definition.version.schemaHash,
  };
}

export function buildProjectionCheckpoint(input: {
  definition: ProjectionContractIdentity;
  aggregateType: string;
  aggregateId: string;
  lastAppliedVersion: number;
  updatedAt?: string;
}): ProjectionCheckpoint {
  return {
    projectionName: input.definition.name,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    lastAppliedVersion: input.lastAppliedVersion,
    projectionVersion: input.definition.version.version,
    schemaHash: input.definition.version.schemaHash,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

export function detectProjectionDrift(input: ProjectionDriftInput): ProjectionDriftReport {
  const reasons: string[] = [];

  if (input.checkpoint.projectionName !== input.definition.name) {
    reasons.push(
      `projection name mismatch (${input.checkpoint.projectionName} != ${input.definition.name})`
    );
  }

  if (input.checkpoint.projectionVersion !== input.definition.version.version) {
    reasons.push(
      `projection version mismatch (${input.checkpoint.projectionVersion} != ${input.definition.version.version})`
    );
  }

  if (input.checkpoint.schemaHash !== input.definition.version.schemaHash) {
    reasons.push("projection schema hash mismatch");
  }

  if (input.checkpoint.lastAppliedVersion < input.latestEventVersion) {
    reasons.push(
      `projection stale by ${input.latestEventVersion - input.checkpoint.lastAppliedVersion} event(s)`
    );
  }

  if (input.checkpoint.lastAppliedVersion > input.latestEventVersion) {
    reasons.push(
      `projection checkpoint ahead of event stream (${input.checkpoint.lastAppliedVersion} > ${input.latestEventVersion})`
    );
  }

  return {
    drifted: reasons.length > 0,
    reasons,
    staleBy: Math.max(0, input.latestEventVersion - input.checkpoint.lastAppliedVersion),
    latestEventVersion: input.latestEventVersion,
    checkpointVersion: input.checkpoint.lastAppliedVersion,
  };
}

export function assertNoProjectionDrift(report: ProjectionDriftReport): void {
  if (report.drifted) {
    throw new ProjectionDriftError(report);
  }
}

export function getLatestEventVersionStrict(events: DomainEvent[], projectionName: string): number {
  assertMonotonicVersions(events, projectionName);
  return events.at(-1)?.version ?? 0;
}

function assertMonotonicVersions(events: DomainEvent[], projectionName: string): void {
  let previousVersion = 0;

  for (const event of events) {
    if (event.version <= previousVersion) {
      throw new ProjectionReplayError(
        `Projection ${projectionName} requires strictly increasing event versions; received ${event.version} after ${previousVersion}.`,
        {
          projectionName,
          previousVersion,
          receivedVersion: event.version,
          eventId: event.id,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
        }
      );
    }

    previousVersion = event.version;
  }
}
