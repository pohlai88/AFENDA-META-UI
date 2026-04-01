import { randomUUID } from "node:crypto";

import type {
  BuildTemporalTruthRecordInput,
  TemporalTruthRecord,
  TruthRecordPayload,
  TruthRecordSupersession,
} from "./recordTypes.js";
import { sha256Hex, stableStringify } from "./recordTypes.js";

function toIsoInstant(input?: string | Date): string {
  if (!input) return new Date().toISOString();

  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      throw new Error("Invalid Date supplied for truth record timestamp.");
    }
    return input.toISOString();
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid timestamp supplied for truth record: ${input}`);
  }

  return parsed.toISOString();
}

function assertNonEmptyString(value: string, fieldName: string): void {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Expected non-empty string for ${fieldName}.`);
  }
}

function normalizePayload(payload?: TruthRecordPayload): TruthRecordPayload {
  return {
    before: payload?.before ?? null,
    after: payload?.after ?? null,
    patch: payload?.patch ?? null,
    facts: payload?.facts ?? null,
  };
}

function normalizeSupersession(
  supersession?: TruthRecordSupersession,
): TruthRecordSupersession {
  if (!supersession) {
    return { mode: "none" };
  }

  if (supersession.mode === "none") {
    return { mode: "none" };
  }

  assertNonEmptyString(
    supersession.supersedesRecordId,
    "supersession.supersedesRecordId",
  );
  assertNonEmptyString(supersession.reason, "supersession.reason");

  return {
    mode: "supersedes",
    supersedesRecordId: supersession.supersedesRecordId,
    reason: supersession.reason.trim(),
    changedFields:
      supersession.changedFields?.filter(
        (field) => typeof field === "string" && field.trim() !== "",
      ) ?? [],
  };
}

export function buildTemporalTruthRecord(
  input: BuildTemporalTruthRecordInput,
): TemporalTruthRecord {
  assertNonEmptyString(input.tenantId, "tenantId");
  assertNonEmptyString(input.entityName, "entityName");
  assertNonEmptyString(input.entityId, "entityId");
  assertNonEmptyString(input.action, "action");
  assertNonEmptyString(input.command.commandName, "command.commandName");

  const happenedAt = toIsoInstant(input.happenedAt);
  const recordedAt = toIsoInstant(input.recordedAt);
  const payload = normalizePayload(input.payload);
  const supersession = normalizeSupersession(input.supersession);

  const base: Omit<TemporalTruthRecord, "payloadHash" | "recordHash"> = {
    recordId: input.recordId ?? randomUUID(),
    tenantId: input.tenantId,

    entityName: input.entityName,
    entityId: input.entityId,

    action: input.action,
    semanticVersion: 1,

    happenedAt,
    recordedAt,

    actor: input.actor,
    command: {
      commandName: input.command.commandName,
      commandId: input.command.commandId,
      idempotencyKey: input.command.idempotencyKey,
    },
    causation: {
      causationId: input.causation?.causationId,
      correlationId: input.causation?.correlationId,
      parentRecordId: input.causation?.parentRecordId,
    },

    supersession,
    payload,
  };

  const payloadHash = sha256Hex(stableStringify(payload));
  const recordHash = sha256Hex(
    stableStringify({
      ...base,
      payloadHash,
    }),
  );

  return {
    ...base,
    payloadHash,
    recordHash,
  };
}
