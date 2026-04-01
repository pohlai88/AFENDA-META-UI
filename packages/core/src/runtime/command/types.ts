import type { RuntimeInvariant } from "../invariantRunner.js";
import type { CommandContext, InvariantFailurePayload } from "../types.js";
import type {
  TemporalTruthRecord,
  TruthRecordActor,
} from "../memory/recordTypes.js";

export type MutationResult = {
  entityName: string;
  entityId: string;
  previousState?: Record<string, unknown> | null;
  nextState?: Record<string, unknown> | null;
  patch?: Record<string, unknown> | null;
  facts?: Record<string, unknown> | null;
  parentRecordId?: string;
  supersession?:
    | {
        mode: "supersedes";
        supersedesRecordId: string;
        reason: string;
      }
    | {
        mode: "none";
      };
};

export type CommandMetadata = {
  name: string;
  commandId?: string;
  idempotencyKey?: string;
  occurredAt?: string | Date;
  causationId?: string;
  correlationId?: string;
};

export type ExecuteCommandArgs<TInput = unknown> = {
  context: CommandContext<TInput>;
  command: CommandMetadata;
  bindTenant?: (context: CommandContext<TInput>) => Promise<void>;
  authorize: (context: CommandContext<TInput>) => Promise<void>;
  validateContract: (context: CommandContext<TInput>) => Promise<void>;
  checkIdempotency: (context: CommandContext<TInput>) => Promise<void>;
  applyMutation: (context: CommandContext<TInput>) => Promise<MutationResult>;
  appendMemory: (
    context: CommandContext<TInput>,
    truthRecord: TemporalTruthRecord,
  ) => Promise<void>;
  updateProjections: (
    context: CommandContext<TInput>,
    mutationResult: MutationResult,
  ) => Promise<void>;
  invariants: readonly RuntimeInvariant<TInput>[];
  resolveActor?: (context: CommandContext<TInput>) => TruthRecordActor;
  ignoredSupersessionFields?: readonly string[];
};

export type ExecuteCommandSuccess = {
  ok: true;
  mutationResult: MutationResult;
  truthRecord: TemporalTruthRecord;
  postCommitFailures: InvariantFailurePayload[];
};

export type ExecuteCommandInvariantBlock = {
  ok: false;
  stage: "pre_commit_invariants";
  failures: InvariantFailurePayload[];
};

export type ExecuteCommandFailure = ExecuteCommandInvariantBlock;
export type ExecuteCommandResult = ExecuteCommandInvariantBlock | ExecuteCommandSuccess;

export function isInvariantBlockResult(
  result: ExecuteCommandResult,
): result is ExecuteCommandFailure {
  return result.ok === false;
}
