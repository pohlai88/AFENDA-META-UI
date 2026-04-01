import type { CommandContext, InvariantFailurePayload } from "../types.js";
import { buildTruthRegistry } from "../registry.js";
import { createInvariantRunner } from "../invariantRunner.js";
import type { ExecuteCommandArgs, ExecuteCommandResult } from "./types.js";

export async function executeCommand<TInput = unknown>(
  args: ExecuteCommandArgs<TInput>,
): Promise<ExecuteCommandResult> {
  const registry = buildTruthRegistry();
  const runner = createInvariantRunner<TInput>({
    registry,
    invariants: args.invariants,
  });

  if (args.bindTenant) {
    await args.bindTenant(args.context);
  }

  await args.authorize(args.context);
  await args.validateContract(args.context);
  await args.checkIdempotency(args.context);

  const preCommitFailures = await runner.run("pre-commit", args.context);
  const blockingPreCommit = preCommitFailures.filter((x) => !x.ok);

  if (blockingPreCommit.length > 0) {
    return {
      ok: false as const,
      stage: "pre_commit_invariants" as const,
      failures: blockingPreCommit
        .map((x) => (x.ok ? null : x.failure))
        .filter(Boolean) as InvariantFailurePayload[],
    };
  }

  const mutationResult = await args.applyMutation(args.context);
  await args.appendMemory(args.context, mutationResult);
  await args.updateProjections(args.context, mutationResult);

  const postCommitFailures = await runner.run("post-commit", args.context);

  return {
    ok: true as const,
    mutationResult,
    postCommitFailures: postCommitFailures
      .filter((x) => !x.ok)
      .map((x) => (x.ok ? null : x.failure))
      .filter(Boolean) as InvariantFailurePayload[],
  };
}
