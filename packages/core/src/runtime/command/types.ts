import type { RuntimeInvariant } from "../invariantRunner.js";
import type { CommandContext, InvariantFailurePayload } from "../types.js";

export type ExecuteCommandArgs<TInput = unknown> = {
  context: CommandContext<TInput>;
  bindTenant?: (context: CommandContext<TInput>) => Promise<void>;
  authorize: (context: CommandContext<TInput>) => Promise<void>;
  validateContract: (context: CommandContext<TInput>) => Promise<void>;
  checkIdempotency: (context: CommandContext<TInput>) => Promise<void>;
  applyMutation: (context: CommandContext<TInput>) => Promise<Record<string, unknown>>;
  appendMemory: (
    context: CommandContext<TInput>,
    mutationResult: Record<string, unknown>,
  ) => Promise<void>;
  updateProjections: (
    context: CommandContext<TInput>,
    mutationResult: Record<string, unknown>,
  ) => Promise<void>;
  invariants: readonly RuntimeInvariant<TInput>[];
};

export type ExecuteCommandSuccess = {
  ok: true;
  mutationResult: Record<string, unknown>;
  postCommitFailures: InvariantFailurePayload[];
};

export type ExecuteCommandInvariantBlock = {
  ok: false;
  stage: "pre_commit_invariants";
  failures: InvariantFailurePayload[];
};

export type ExecuteCommandResult = ExecuteCommandInvariantBlock | ExecuteCommandSuccess;
