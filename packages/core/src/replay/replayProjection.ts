import { checksumProjection } from "./checksum.js";
import type { MemoryEvent, ReplayResult } from "./types.js";

export function replayLatestStateProjection(
  events: readonly MemoryEvent[],
): ReplayResult<Record<string, Record<string, unknown>>> {
  const projection: Record<string, Record<string, unknown>> = {};

  for (const event of events) {
    projection[event.entityId] = event.presentState;
  }

  return {
    projection,
    checksum: checksumProjection(projection),
  };
}

export function replayMatchesCurrentProjection(
  replay: ReplayResult<unknown>,
  currentProjection: unknown,
): boolean {
  return replay.checksum === checksumProjection(currentProjection);
}
