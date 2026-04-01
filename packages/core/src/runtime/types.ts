import type { InvariantFailurePayload } from "../contracts/failures.js";

export type EvidencePayload = Record<string, unknown>;
export type { InvariantFailurePayload } from "../contracts/failures.js";

export type InvariantEvaluationResult =
  | { ok: true }
  | { ok: false; failure: InvariantFailurePayload };

export type CommandExecutionStage =
  | "bind_tenant"
  | "authorize"
  | "validate_contract"
  | "check_idempotency"
  | "pre_commit_invariants"
  | "apply_mutation"
  | "append_memory"
  | "update_projections"
  | "post_commit_invariants";

export type CommandContext<TInput = unknown> = {
  tenantId: string;
  actorId: string;
  commandName: string;
  input: TInput;
  idempotencyKey?: string;
};

export type MemoryRecordInput = {
  eventId: string;
  tenantId: string;
  actorId: string;
  commandName: string;
  entityName: string;
  entityId: string;
  sevenWoneH: {
    who: string;
    what: string;
    when: string;
    where?: string;
    why?: string;
    which?: string;
    with?: string;
    how: string;
  };
  pastState: Record<string, unknown> | null;
  presentState: Record<string, unknown>;
  futureState?: Record<string, unknown> | null;
  supersedesEventId?: string | null;
};
