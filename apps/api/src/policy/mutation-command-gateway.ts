import { MUTATION_POLICIES } from "@afenda/db";
import {
  isDirectMutationAllowed,
  resolveMutationPolicy,
  type DomainEvent,
  type MutationOperation,
  type MutationPolicy,
  type MutationPolicyDefinition,
} from "@afenda/meta-types";

import { dbAppendEvent } from "../events/dbEventStore.js";
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
      throw new MutationPolicyViolationError({
        model: input.model,
        operation: input.operation,
        mutationPolicy: "event-only",
        policy: resolvedPolicy,
        source: input.source ?? DEFAULT_SOURCE,
        message:
          resolvedPolicy.description ??
          `Direct ${input.operation} is blocked for ${input.model}; provide projection handlers for event-only execution.`,
      });
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
        actor: input.actorId,
        source: input.source ?? DEFAULT_SOURCE,
      }
    );

    const projectedState = await input.projectEvent({
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
    throw new MutationPolicyViolationError({
      model: input.model,
      operation: input.operation,
      mutationPolicy: directWriteCheck.policy?.mutationPolicy ?? "event-only",
      policy: directWriteCheck.policy,
      source: input.source ?? DEFAULT_SOURCE,
      message:
        directWriteCheck.reason ??
        `Direct ${input.operation} is blocked for ${input.model} under active mutation policy.`,
    });
  }

  const resolvedAggregateId = resolveAggregateId({
    recordId: input.recordId,
    record: input.existingRecord,
    nextRecord: input.nextRecord,
    existingRecord: input.existingRecord,
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
