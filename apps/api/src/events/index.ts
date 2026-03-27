// In-memory event store (tests / dev — sync API)
export {
  appendEvent,
  queryEvents,
  getAggregateEvents,
  replayEvents,
  rebuildAggregate,
  rebuildFromSnapshot,
  saveSnapshot,
  getSnapshot,
  getEventStoreStats,
  clearEventStore,
} from "./eventStore.js";

// DB-backed event store (production — async API)
export {
  dbAppendEvent,
  dbQueryEvents,
  dbGetAggregateEvents,
  dbRebuildAggregate,
  dbGetEventStoreStats,
} from "./dbEventStore.js";

export {
  replayProjectionEvents,
  buildProjectionCheckpoint,
  detectProjectionDrift,
  assertNoProjectionDrift,
  ProjectionDriftError,
  ProjectionReplayError,
} from "./projectionRuntime.js";

export {
  getProjectionCheckpoint,
  upsertProjectionCheckpoint,
  clearProjectionCheckpoints,
} from "./projectionCheckpointStore.js";
