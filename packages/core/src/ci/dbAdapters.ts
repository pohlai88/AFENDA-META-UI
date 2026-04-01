import type { MemoryEvent } from "../replay/types.js";
import type { InvariantFailurePayload } from "../runtime/types.js";
import type { TruthVerificationAdapters } from "./adapters.js";

export type DbMemoryEventRow = {
  event_id: string;
  entity_name: string;
  entity_id: string;
  present_state: Record<string, unknown>;
  supersedes_event_id?: string | null;
};

export type DbInvariantFailureRow = {
  invariant_name: string;
  severity?: InvariantFailurePayload["severity"];
  failurePolicy?: InvariantFailurePayload["failurePolicy"];
  doctrine: InvariantFailurePayload["doctrine"];
  evidence: InvariantFailurePayload["evidence"];
  resolution?: InvariantFailurePayload["resolution"];
};

export type DbTruthVerificationReaders = {
  readMemoryEventRows(): Promise<readonly DbMemoryEventRow[]>;
  readCurrentProjection(): Promise<Record<string, Record<string, unknown>>>;
  readInvariantFailureRows(): Promise<readonly DbInvariantFailureRow[]>;
};

export function mapDbMemoryEventRow(row: DbMemoryEventRow): MemoryEvent {
  return {
    eventId: row.event_id,
    entityName: row.entity_name,
    entityId: row.entity_id,
    presentState: row.present_state,
    supersedesEventId: row.supersedes_event_id,
  };
}

export function mapDbInvariantFailureRow(
  row: DbInvariantFailureRow,
): InvariantFailurePayload {
  return {
    invariantName: row.invariant_name,
    severity: row.severity ?? "critical",
    failurePolicy: row.failurePolicy ?? "block",
    doctrine: row.doctrine,
    evidence: row.evidence,
    resolution: row.resolution,
  };
}

export function createDbTruthVerificationAdapters(
  readers: DbTruthVerificationReaders,
): TruthVerificationAdapters {
  return {
    async readMemoryEvents() {
      const rows = await readers.readMemoryEventRows();
      return rows.map(mapDbMemoryEventRow);
    },
    async readCurrentProjection() {
      return readers.readCurrentProjection();
    },
    async readInvariantFailures() {
      const rows = await readers.readInvariantFailureRows();
      return rows.map(mapDbInvariantFailureRow);
    },
  };
}
