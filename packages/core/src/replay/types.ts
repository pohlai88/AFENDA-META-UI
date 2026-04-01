export type MemoryEvent = {
  eventId: string;
  entityName: string;
  entityId: string;
  presentState: Record<string, unknown>;
  supersedesEventId?: string | null;
};

export type ReplayResult<TProjection> = {
  projection: TProjection;
  checksum: string;
};
