import type { MemoryEvent } from "../replay/types.js";
import type { InvariantFailurePayload } from "../runtime/types.js";

export type TruthVerificationAdapters = {
  readMemoryEvents(): Promise<readonly MemoryEvent[]>;
  readCurrentProjection(): Promise<Record<string, Record<string, unknown>>>;
  readInvariantFailures(): Promise<readonly InvariantFailurePayload[]>;
};

export type InMemoryTruthVerificationAdaptersArgs = {
  events: readonly MemoryEvent[];
  currentProjection: Record<string, Record<string, unknown>>;
  failures?: readonly InvariantFailurePayload[];
};

export function createInMemoryTruthVerificationAdapters(
  args: InMemoryTruthVerificationAdaptersArgs,
): TruthVerificationAdapters {
  return {
    async readMemoryEvents() {
      return args.events;
    },
    async readCurrentProjection() {
      return args.currentProjection;
    },
    async readInvariantFailures() {
      return args.failures ?? [];
    },
  };
}
