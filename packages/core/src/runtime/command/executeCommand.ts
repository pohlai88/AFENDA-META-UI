import type { InvariantFailurePayload } from "../types.js";
import { buildTruthRegistry } from "../registry.js";
import { createInvariantRunner } from "../invariantRunner.js";
import { buildTemporalTruthRecord } from "../memory/buildTemporalTruthRecord.js";
import { assertSupersessionProvided } from "../memory/supersession.js";
import type { TruthRecordActor } from "../memory/recordTypes.js";
import type {
  ExecuteCommandArgs,
  ExecuteCommandResult,
  MutationResult,
} from "./types.js";

function inferActorFromContext(
  context: { actorId: string } & Record<string, unknown>,
): TruthRecordActor {
  const actor = context.actor;
  if (actor && typeof actor === "object" && !Array.isArray(actor)) {
    const typed = actor as Record<string, unknown>;
    const actorType = typed.type;
    if (actorType === "user" && typeof typed.userId === "string" && typed.userId.trim() !== "") {
      return {
        type: "user",
        userId: typed.userId,
        role: typeof typed.role === "string" ? typed.role : undefined,
      };
    }
    if (
      actorType === "service" &&
      typeof typed.serviceName === "string" &&
      typed.serviceName.trim() !== ""
    ) {
      return {
        type: "service",
        serviceName: typed.serviceName,
        role: typeof typed.role === "string" ? typed.role : undefined,
      };
    }
    if (actorType === "system") {
      return {
        type: "system",
        role: typeof typed.role === "string" ? typed.role : undefined,
      };
    }
  }
  return { type: "user", userId: context.actorId };
}

function buildTruthRecordFromMutation<TInput>(
  args: ExecuteCommandArgs<TInput>,
  mutationResult: MutationResult,
) {
  const supersessionEvaluation = assertSupersessionProvided({
    entityName: mutationResult.entityName,
    previousState: mutationResult.previousState,
    nextState: mutationResult.nextState,
    supersession: mutationResult.supersession,
    ignoredFields: [
      ...(args.ignoredSupersessionFields ?? [
        "updatedAt",
        "updatedBy",
        "version",
        "lastSeenAt",
      ]),
    ],
  });

  const normalizedSupersession = supersessionEvaluation.requiresSupersession
    ? mutationResult.supersession?.mode === "supersedes"
      ? {
          mode: "supersedes" as const,
          supersedesRecordId: mutationResult.supersession.supersedesRecordId,
          reason: mutationResult.supersession.reason,
          changedFields: supersessionEvaluation.changedFields,
        }
      : (() => {
          throw new Error(
            `Supersession required for ${mutationResult.entityName} but metadata normalization failed.`,
          );
        })()
    : ({ mode: "none" } as const);

  return buildTemporalTruthRecord({
    tenantId: args.context.tenantId,
    entityName: mutationResult.entityName,
    entityId: mutationResult.entityId,
    action: args.command.name,
    happenedAt: args.command.occurredAt ?? new Date(),
    actor: args.resolveActor
      ? args.resolveActor(args.context)
      : inferActorFromContext(args.context as { actorId: string } & Record<string, unknown>),
    command: {
      commandName: args.command.name,
      commandId: args.command.commandId,
      idempotencyKey: args.command.idempotencyKey ?? args.context.idempotencyKey,
    },
    causation: {
      causationId: args.command.causationId,
      correlationId: args.command.correlationId,
      parentRecordId: mutationResult.parentRecordId,
    },
    supersession: normalizedSupersession,
    payload: {
      before: mutationResult.previousState ?? null,
      after: mutationResult.nextState ?? null,
      patch: mutationResult.patch ?? null,
      facts: mutationResult.facts ?? null,
    },
  });
}

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
  const truthRecord = buildTruthRecordFromMutation(args, mutationResult);

  await args.appendMemory(args.context, truthRecord);
  await args.updateProjections(args.context, mutationResult);

  const postCommitFailures = await runner.run("post-commit", args.context);

  return {
    ok: true as const,
    mutationResult,
    truthRecord,
    postCommitFailures: postCommitFailures
      .filter((x) => !x.ok)
      .map((x) => (x.ok ? null : x.failure))
      .filter(Boolean) as InvariantFailurePayload[],
  };
}
