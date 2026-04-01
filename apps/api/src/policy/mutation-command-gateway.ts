/**
 * Mutation policy + command gateways for the API surface (`apps/api`).
 * Architecture envelope: see `apps/api/ARCHITECTURE-ENVELOPE.md` (grep: AFENDA-SURFACE-API-ENVELOPE).
 */
import {
  MUTATION_POLICIES,
  isDirectMutationAllowed,
  resolveMutationPolicy,
} from "@afenda/db/truth-compiler";
import type { MutationPolicy } from "@afenda/meta-types/compiler";
import type { DomainEvent } from "@afenda/meta-types/events";
import type { EventMetadata } from "@afenda/meta-types/events";
import type {
  InvariantRegistry,
  MutationOperation,
  MutationPolicyDefinition,
} from "@afenda/meta-types/policy";
import {
  executeCommand,
  type CommandContext,
  type InvariantFailurePayload,
  type MutationResult,
  type RuntimeInvariant,
  type TemporalTruthRecord,
  type TruthRecordActor,
} from "@afenda/core";
import { dbAppendEvent } from "../events/dbEventStore.js";
import { evaluateCondition } from "./evaluate-condition.js";
import { resolveEventType } from "./event-type-registry.js";

type MutationRecord = Record<string, unknown>;

const DEFAULT_SOURCE = "api.generic-crud";
const DEFAULT_BULK_SOURCE = "api.generic-crud.bulk";
const DEFAULT_POLICY: MutationPolicy = "direct";
const DEFAULT_OPERATIONS: MutationOperation[] = ["create", "update", "delete"];

export interface ExecuteMutationCommandInput<TRecord extends MutationRecord> {
  model: string;
  operation: MutationOperation;
  mutate: () => Promise<TRecord | null>;
  existingRecord?: TRecord | null;
  nextRecord?: TRecord | null;
  recordId?: string;
  actorId?: string;
  source?: string;
  eventMetadata?: EventMetadata;
  policies?: MutationPolicyDefinition[];
  loadProjectionState?: (input: {
    model: string;
    operation: MutationOperation;
    aggregateId?: string;
    policy?: MutationPolicyDefinition;
  }) => Promise<TRecord | null>;
  projectEvent?: (input: {
    model: string;
    operation: MutationOperation;
    currentState: TRecord | null;
    nextRecord?: TRecord | null;
    event: DomainEvent<MutationEventPayload>;
    policy: MutationPolicyDefinition;
  }) => Promise<TRecord | null> | TRecord | null;
  persistProjectionState?: (input: {
    model: string;
    operation: MutationOperation;
    aggregateId: string;
    projectedState: TRecord | null;
    event: DomainEvent<MutationEventPayload>;
    policy: MutationPolicyDefinition;
  }) => Promise<void>;
  validateProjectionDrift?: (input: {
    model: string;
    operation: MutationOperation;
    aggregateId?: string;
    policy?: MutationPolicyDefinition;
  }) => Promise<void>;
  /**
   * Optional pre-mutation invariant check.
   *
   * Called after policy resolution but before the mutation (or event append) executes.
   * Use this to run application-level invariant assertions (e.g. wrapping assertAllEntityInvariants
   * from @afenda/truth-test) as a pre-flight check. The DB-layer CHECK constraints remain the
   * authoritative backstop; this provides earlier feedback.
   *
   * If the callback throws, the mutation is aborted and the error propagates to the caller.
   */
  validateInvariants?: (input: {
    model: string;
    operation: MutationOperation;
    aggregateId?: string;
    record?: TRecord | null;
  }) => Promise<void>;
  /**
   * Optional violation observer. Called with every MutationPolicyViolationError before it is
   * thrown. Use this to persist violation records, emit metrics, or trigger alerts.
   *
   * The observer runs regardless of whether the error is ultimately caught by the caller.
   */
  onPolicyViolation?: (error: MutationPolicyViolationError) => Promise<void>;
}

export type MutationEventPayload = Record<string, unknown> & {
  operation: MutationOperation;
  policyId: string;
  model: string;
  before: MutationRecord | null;
  after: MutationRecord | null;
};

export interface ExecuteMutationCommandResult<TRecord extends MutationRecord> {
  record: TRecord | null;
  mutationPolicy: MutationPolicy;
  policy?: MutationPolicyDefinition;
  event?: DomainEvent<MutationEventPayload>;
}

export interface AssertBulkMutationAllowedInput {
  model: string;
  operation: MutationOperation;
  policies?: MutationPolicyDefinition[];
  source?: string;
}

export class MutationPolicyViolationError extends Error {
  readonly code = "MUTATION_POLICY_VIOLATION";
  readonly statusCode = 409;
  readonly model: string;
  readonly operation: MutationOperation;
  readonly mutationPolicy: MutationPolicy;
  readonly policy?: MutationPolicyDefinition;
  readonly source: string;

  constructor(input: {
    model: string;
    operation: MutationOperation;
    mutationPolicy: MutationPolicy;
    source: string;
    policy?: MutationPolicyDefinition;
    message: string;
  }) {
    super(input.message);
    this.name = "MutationPolicyViolationError";
    this.model = input.model;
    this.operation = input.operation;
    this.mutationPolicy = input.mutationPolicy;
    this.policy = input.policy;
    this.source = input.source;
  }
}

function policiesFor(policies?: MutationPolicyDefinition[]): MutationPolicyDefinition[] {
  return policies ?? MUTATION_POLICIES;
}

function operationsFor(policy: MutationPolicyDefinition): MutationOperation[] {
  return policy.directMutationOperations?.length
    ? policy.directMutationOperations
    : DEFAULT_OPERATIONS;
}

function resolveAggregateId(input: {
  recordId?: string;
  record?: MutationRecord | null;
  nextRecord?: MutationRecord | null;
  existingRecord?: MutationRecord | null;
}): string | undefined {
  if (input.recordId) {
    return input.recordId;
  }

  for (const candidate of [input.record, input.nextRecord, input.existingRecord]) {
    const idValue = candidate?.id;
    if (typeof idValue === "string" && idValue.length > 0) {
      return idValue;
    }
  }

  return undefined;
}

function buildEventPayload(input: {
  model: string;
  operation: MutationOperation;
  policy: MutationPolicyDefinition;
  existingRecord?: MutationRecord | null;
  nextRecord?: MutationRecord | null;
  result: MutationRecord | null;
}): MutationEventPayload {
  return {
    operation: input.operation,
    policyId: input.policy.id,
    model: input.model,
    before: input.existingRecord ?? null,
    after: input.result ?? input.nextRecord ?? null,
  };
}

function resolveCommandEventType(input: {
  model: string;
  operation: MutationOperation;
  before?: MutationRecord | null;
  after?: MutationRecord | null;
}): string {
  return resolveEventType(input);
}

function buildViolationMessage(input: {
  model: string;
  operation: MutationOperation;
  policy: MutationPolicyDefinition;
  source: string;
  bulk?: boolean;
}): string {
  const base = input.bulk
    ? `Bulk ${input.operation} is not supported for ${input.model}`
    : `Direct ${input.operation} is blocked for ${input.model}`;

  return (
    input.policy.description ??
    `${base} while mutation policy ${input.policy.id} is ${input.policy.mutationPolicy}. Use a command-specific event flow instead of ${input.source}.`
  );
}

async function throwViolation(
  error: MutationPolicyViolationError,
  onPolicyViolation?: (e: MutationPolicyViolationError) => Promise<void>
): Promise<never> {
  if (onPolicyViolation) {
    try {
      await onPolicyViolation(error);
    } catch {
      // observer failures must never suppress the original violation throw
    }
  }
  throw error;
}

export function assertBulkMutationAllowed(
  input: AssertBulkMutationAllowedInput
): MutationPolicyDefinition | undefined {
  const policy = resolveMutationPolicy({
    model: input.model,
    policies: policiesFor(input.policies),
  });

  if (!policy || policy.mutationPolicy === DEFAULT_POLICY) {
    return policy;
  }

  if (!operationsFor(policy).includes(input.operation)) {
    return policy;
  }

  throw new MutationPolicyViolationError({
    model: input.model,
    operation: input.operation,
    mutationPolicy: policy.mutationPolicy,
    policy,
    source: input.source ?? DEFAULT_BULK_SOURCE,
    message: buildViolationMessage({
      model: input.model,
      operation: input.operation,
      policy,
      source: input.source ?? DEFAULT_BULK_SOURCE,
      bulk: true,
    }),
  });
}

export async function executeMutationCommand<TRecord extends MutationRecord>(
  input: ExecuteMutationCommandInput<TRecord>
): Promise<ExecuteMutationCommandResult<TRecord>> {
  const policies = policiesFor(input.policies);
  const resolvedPolicy = resolveMutationPolicy({
    model: input.model,
    policies,
  });
  const mutationPolicy = resolvedPolicy?.mutationPolicy ?? DEFAULT_POLICY;

  if (
    resolvedPolicy?.mutationPolicy === "event-only" &&
    operationsFor(resolvedPolicy).includes(input.operation)
  ) {
    if (!input.projectEvent) {
      await throwViolation(
        new MutationPolicyViolationError({
          model: input.model,
          operation: input.operation,
          mutationPolicy: "event-only",
          policy: resolvedPolicy,
          source: input.source ?? DEFAULT_SOURCE,
          message:
            resolvedPolicy.description ??
            `Direct ${input.operation} is blocked for ${input.model}; provide projection handlers for event-only execution.`,
        }),
        input.onPolicyViolation
      );
    }

    const currentState =
      input.existingRecord ??
      (await input.loadProjectionState?.({
        model: input.model,
        operation: input.operation,
        aggregateId: input.recordId,
        policy: resolvedPolicy,
      })) ??
      null;

    const aggregateId = resolveAggregateId({
      recordId: input.recordId,
      record: currentState,
      nextRecord: input.nextRecord,
      existingRecord: input.existingRecord,
    });

    if (!aggregateId) {
      throw new Error(
        `mutation-command-gateway: unable to resolve aggregate id for ${input.model} ${input.operation}`
      );
    }

    await input.validateInvariants?.({
      model: input.model,
      operation: input.operation,
      aggregateId,
      record: currentState,
    });

    const event = await dbAppendEvent(
      input.model,
      aggregateId,
      resolveCommandEventType({
        model: input.model,
        operation: input.operation,
        before: currentState,
        after: input.nextRecord ?? null,
      }),
      buildEventPayload({
        model: input.model,
        operation: input.operation,
        policy: resolvedPolicy,
        existingRecord: currentState,
        nextRecord: input.nextRecord,
        result: null,
      }),
      {
        ...input.eventMetadata,
        actor: input.actorId,
        source: input.source ?? DEFAULT_SOURCE,
      }
    );

    const projectedState = await input.projectEvent!({
      model: input.model,
      operation: input.operation,
      currentState,
      nextRecord: input.nextRecord,
      event,
      policy: resolvedPolicy,
    });

    if (input.persistProjectionState) {
      await input.persistProjectionState({
        model: input.model,
        operation: input.operation,
        aggregateId,
        projectedState,
        event,
        policy: resolvedPolicy,
      });
    }

    return {
      record: projectedState,
      mutationPolicy,
      policy: resolvedPolicy,
      event,
    };
  }

  const directWriteCheck = isDirectMutationAllowed({
    model: input.model,
    operation: input.operation,
    policies,
  });

  if (!directWriteCheck.allowed) {
    await throwViolation(
      new MutationPolicyViolationError({
        model: input.model,
        operation: input.operation,
        mutationPolicy: directWriteCheck.policy?.mutationPolicy ?? "event-only",
        policy: directWriteCheck.policy,
        source: input.source ?? DEFAULT_SOURCE,
        message:
          directWriteCheck.reason ??
          `Direct ${input.operation} is blocked for ${input.model} under active mutation policy.`,
      }),
      input.onPolicyViolation
    );
  }

  const resolvedAggregateId = resolveAggregateId({
    recordId: input.recordId,
    record: input.existingRecord,
    nextRecord: input.nextRecord,
    existingRecord: input.existingRecord,
  });

  await input.validateInvariants?.({
    model: input.model,
    operation: input.operation,
    aggregateId: resolvedAggregateId ?? undefined,
    record: input.existingRecord ?? null,
  });

  if (input.validateProjectionDrift) {
    await input.validateProjectionDrift({
      model: input.model,
      operation: input.operation,
      aggregateId: resolvedAggregateId,
      policy: resolvedPolicy,
    });
  }

  const result = await input.mutate();

  if (
    !resolvedPolicy ||
    resolvedPolicy.mutationPolicy !== "dual-write" ||
    !operationsFor(resolvedPolicy).includes(input.operation)
  ) {
    return {
      record: result,
      mutationPolicy,
      policy: resolvedPolicy,
    };
  }

  const aggregateId =
    resolvedAggregateId ??
    resolveAggregateId({
      recordId: input.recordId,
      record: result,
      nextRecord: input.nextRecord,
      existingRecord: input.existingRecord,
    });

  if (!aggregateId) {
    throw new Error(
      `mutation-command-gateway: unable to resolve aggregate id for ${input.model} ${input.operation}`
    );
  }

  const event = await dbAppendEvent(
    input.model,
    aggregateId,
    resolveCommandEventType({
      model: input.model,
      operation: input.operation,
      before: input.existingRecord,
      after: result ?? input.nextRecord ?? null,
    }),
    buildEventPayload({
      model: input.model,
      operation: input.operation,
      policy: resolvedPolicy,
      existingRecord: input.existingRecord,
      nextRecord: input.nextRecord,
      result,
    }),
    {
      ...input.eventMetadata,
      actor: input.actorId,
      source: input.source ?? DEFAULT_SOURCE,
    }
  );

  return {
    record: result,
    mutationPolicy,
    policy: resolvedPolicy,
    event,
  };
}

/**
 * Invariant Enforcement Middleware Factory
 * =========================================
 *
 * Creates a validateInvariants callback that enforces application-level invariants
 * during mutation execution. Use this factory to wrap your InvariantRegistry[] array
 * so callers don't need to pass the registries manually.
 *
 * **Non-breaking:** Default behavior (no callback provided) remains no-op.
 * Wire this middleware only when you want pre-flight invariant checks before mutations.
 *
 * **DB-layer backstop:** This runs before mutations; postgres CHECK constraints
 * and DEFERRABLE CONSTRAINT TRIGGERS remain the authoritative enforcement layer.
 *
 * @param registries - Array of InvariantRegistry to validate against
 * @returns validateInvariants callback for ExecuteMutationCommandInput
 *
 * @example
 * ```typescript
 * const validateInvariants = invariantEnforcementMiddleware(SALES_INVARIANT_REGISTRIES);
 *
 * const result = await executeMutationCommand({
 *   model: "sales_order",
 *   operation: "update",
 *   validateInvariants,  // Pre-flight check before mutation
 *   // ... other options
 * });
 * ```
 */
export function invariantEnforcementMiddleware(registries: InvariantRegistry[]) {
  return async (input: {
    model: string;
    operation: MutationOperation;
    aggregateId?: string;
    record?: MutationRecord | null;
  }): Promise<void> => {
    const registry = registries.find((r) => r.model === input.model);
    if (!registry || input.record == null) {
      return;
    }

    const violations: Array<{ id: string; description: string }> = [];

    for (const invariant of registry.invariants) {
      if (invariant.triggerOn.length > 0 && !invariant.triggerOn.includes(input.operation)) {
        continue;
      }

      const passes = evaluateCondition(
        invariant.condition,
        input.record as Record<string, unknown>
      );
      if (!passes) {
        violations.push({
          id: invariant.id,
          description: invariant.description,
        });
      }
    }

    if (violations.length > 0) {
      const lines = violations.map((v) => `  - ${v.id}: ${v.description}`).join("\n");
      throw new Error(
        `${violations.length} invariant(s) violated for "${input.model}" (id: ${input.aggregateId}):\n${lines}`
      );
    }
  };
}

/**
 * Canonical command pipeline: routes domain commands through {@link executeCommand}
 * (pre/post invariants, supersession guard, temporal truth record, append memory, projections).
 *
 * Generic CRUD continues to use {@link executeMutationCommand}; vertical/domain commands should
 * call this adapter until all entry points are consolidated.
 */
export type MutationCommandGatewayContext<TInput = unknown> = CommandContext<TInput> & {
  actor?: TruthRecordActor;
  commandId?: string;
  occurredAt?: string | Date;
  causationId?: string;
  correlationId?: string;
};

export type MutationCommandGatewayArgs<TInput = unknown> = {
  commandName: string;
  context: MutationCommandGatewayContext<TInput>;
  applyMutation: (context: CommandContext<TInput>) => Promise<MutationResult>;
  updateProjections: (
    context: CommandContext<TInput>,
    mutationResult: MutationResult
  ) => Promise<void>;
  appendMemory: (
    context: CommandContext<TInput>,
    record: TemporalTruthRecord
  ) => Promise<void>;
  invariants: readonly RuntimeInvariant<TInput>[];
  authorize: (context: CommandContext<TInput>) => Promise<void>;
  validateContract: (context: CommandContext<TInput>) => Promise<void>;
  checkIdempotency: (context: CommandContext<TInput>) => Promise<void>;
  bindTenant?: (context: CommandContext<TInput>) => Promise<void>;
  resolveActor?: (context: MutationCommandGatewayContext<TInput>) => TruthRecordActor;
  ignoredSupersessionFields?: readonly string[];
};

export type MutationCommandGatewayResult =
  | { status: "blocked"; failures: InvariantFailurePayload[] }
  | {
      status: "ok";
      mutationResult: MutationResult;
      truthRecord: TemporalTruthRecord;
      postCommitFailures: InvariantFailurePayload[];
    };

function defaultMutationGatewayResolveActor<TInput>(
  ctx: MutationCommandGatewayContext<TInput>
): TruthRecordActor {
  if (ctx.actor) {
    return ctx.actor;
  }
  return { type: "system" };
}

export async function mutationCommandGateway<TInput = unknown>(
  args: MutationCommandGatewayArgs<TInput>
): Promise<MutationCommandGatewayResult> {
  const ctx = args.context;
  const result = await executeCommand({
    context: ctx,
    command: {
      name: args.commandName,
      commandId: ctx.commandId,
      idempotencyKey: ctx.idempotencyKey,
      occurredAt: ctx.occurredAt,
      causationId: ctx.causationId,
      correlationId: ctx.correlationId,
    },
    bindTenant: args.bindTenant,
    authorize: args.authorize,
    validateContract: args.validateContract,
    checkIdempotency: args.checkIdempotency,
    applyMutation: args.applyMutation,
    appendMemory: args.appendMemory,
    updateProjections: args.updateProjections,
    invariants: args.invariants,
    resolveActor: args.resolveActor ?? defaultMutationGatewayResolveActor,
    ignoredSupersessionFields: args.ignoredSupersessionFields,
  });

  if (!result.ok) {
    return { status: "blocked", failures: result.failures };
  }

  return {
    status: "ok",
    mutationResult: result.mutationResult,
    truthRecord: result.truthRecord,
    postCommitFailures: result.postCommitFailures,
  };
}
