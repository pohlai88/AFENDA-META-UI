import { checksumProjection } from "./checksum.js";
import type { MemoryEvent, ReplayResult } from "./types.js";

export function replayLatestStateProjection(
  events: readonly MemoryEvent[],
): ReplayResult<Record<string, Record<string, unknown>>> {
  const normalizedEvents = [...events].sort((a, b) => a.eventId.localeCompare(b.eventId));
  const projection: Record<string, Record<string, unknown>> = {};

  for (const event of normalizedEvents) {
    if (!event.entityName?.trim() || !event.entityId?.trim()) {
      throw new Error(`Invalid MemoryEvent identity: ${event.eventId}`);
    }
    const key = `${event.entityName}::${event.entityId}`;
    projection[key] = event.presentState;
  }
  const sortedProjection = Object.fromEntries(
    Object.entries(projection).sort(([a], [b]) => a.localeCompare(b)),
  ) as Record<string, Record<string, unknown>>;

  return {
    projection: sortedProjection,
    checksum: checksumProjection(sortedProjection),
  };
}

export function replayMatchesCurrentProjection(
  replay: ReplayResult<unknown>,
  currentProjection: unknown,
): boolean {
  return replay.checksum === checksumProjection(currentProjection);
}
