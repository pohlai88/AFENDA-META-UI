import type { ProjectionCheckpoint } from "./projectionRuntime.js";

const checkpointStore = new Map<string, ProjectionCheckpoint>();

interface ProjectionCheckpointLookup {
  projectionName: string;
  aggregateType: string;
  aggregateId: string;
}

function checkpointKey(input: ProjectionCheckpointLookup): string {
  return `${input.projectionName}:${input.aggregateType}:${input.aggregateId}`;
}

export function getProjectionCheckpoint(
  input: ProjectionCheckpointLookup
): ProjectionCheckpoint | null {
  return checkpointStore.get(checkpointKey(input)) ?? null;
}

export function upsertProjectionCheckpoint(checkpoint: ProjectionCheckpoint): ProjectionCheckpoint {
  checkpointStore.set(checkpointKey(checkpoint), checkpoint);
  return checkpoint;
}

export function clearProjectionCheckpoints(): void {
  checkpointStore.clear();
}
