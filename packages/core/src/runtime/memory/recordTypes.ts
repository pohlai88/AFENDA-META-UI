import { createHash } from "node:crypto";

export type TruthRecordActor =
  | {
      type: "user";
      userId: string;
      role?: string;
    }
  | {
      type: "service";
      serviceName: string;
      role?: string;
    }
  | {
      type: "system";
      role?: string;
    };

export type TruthRecordCommandRef = {
  commandName: string;
  commandId?: string;
  idempotencyKey?: string;
};

export type TruthRecordCausationRef = {
  causationId?: string;
  correlationId?: string;
  parentRecordId?: string;
};

export type TruthRecordSupersession =
  | {
      mode: "none";
    }
  | {
      mode: "supersedes";
      supersedesRecordId: string;
      reason: string;
      changedFields?: string[];
    };

export type TruthRecordPayload = {
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  patch?: Record<string, unknown> | null;
  facts?: Record<string, unknown> | null;
};

export type TemporalTruthRecord = {
  recordId: string;
  tenantId: string;

  entityName: string;
  entityId: string;

  action: string;
  semanticVersion: 1;

  happenedAt: string;
  recordedAt: string;

  actor: TruthRecordActor;
  command: TruthRecordCommandRef;
  causation: TruthRecordCausationRef;

  supersession: TruthRecordSupersession;

  payload: TruthRecordPayload;

  payloadHash: string;
  recordHash: string;
};

export type BuildTemporalTruthRecordInput = {
  recordId?: string;
  tenantId: string;

  entityName: string;
  entityId: string;

  action: string;

  happenedAt?: string | Date;
  recordedAt?: string | Date;

  actor: TruthRecordActor;
  command: TruthRecordCommandRef;
  causation?: TruthRecordCausationRef;

  supersession?: TruthRecordSupersession;

  payload?: TruthRecordPayload;
};

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => [key, sortJson(val)]);
    return Object.fromEntries(entries);
  }

  return value;
}
