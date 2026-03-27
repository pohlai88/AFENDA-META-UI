import type { MutationPolicyDefinition } from "@afenda/meta-types";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "../../db/index.js";
import { subscriptions } from "../../db/schema/index.js";
import { NotFoundError } from "../../middleware/errorHandler.js";
import { buildProjectionCheckpoint } from "../../events/projectionRuntime.js";
import { upsertProjectionCheckpoint } from "../../events/projectionCheckpointStore.js";
import {
  executeMutationCommand,
  type ExecuteMutationCommandResult,
} from "../../policy/mutation-command-gateway.js";
import {
  activateSubscription,
  cancelSubscription,
  pauseSubscription,
  renewSubscription,
  resumeSubscription,
  type ActivateSubscriptionInput,
  type ActivateSubscriptionResult,
  type CancelSubscriptionInput,
  type CancelSubscriptionResult,
  type PauseSubscriptionInput,
  type PauseSubscriptionResult,
  type RenewSubscriptionInput,
  type RenewSubscriptionResult,
  type ResumeSubscriptionInput,
  type ResumeSubscriptionResult,
} from "./subscription-service.js";

type SubscriptionRecord = typeof subscriptions.$inferSelect;

const SUBSCRIPTION_DUAL_WRITE_POLICY: MutationPolicyDefinition = {
  id: "sales.subscription.dual_write_rollout",
  mutationPolicy: "dual-write",
  appliesTo: ["subscription"],
  requiredEvents: ["subscription.activated", "subscription.cancelled", "subscription.paused"],
  directMutationOperations: ["update"],
  description:
    "Subscription command routes execute domain mutations and append policy-aware events during rollout.",
};

export interface ActivateSubscriptionCommandInput extends ActivateSubscriptionInput {
  source?: string;
}

export interface CancelSubscriptionCommandInput extends CancelSubscriptionInput {
  source?: string;
}

export interface PauseSubscriptionCommandInput extends PauseSubscriptionInput {
  source?: string;
}

export interface ResumeSubscriptionCommandInput extends ResumeSubscriptionInput {
  source?: string;
}

export interface RenewSubscriptionCommandInput extends RenewSubscriptionInput {
  source?: string;
}

interface SubscriptionCommandMetadata {
  mutationPolicy: ExecuteMutationCommandResult<SubscriptionRecord>["mutationPolicy"];
  event?: ExecuteMutationCommandResult<SubscriptionRecord>["event"];
}

export interface ActivateSubscriptionCommandResult
  extends ActivateSubscriptionResult, SubscriptionCommandMetadata {}

export interface CancelSubscriptionCommandResult
  extends CancelSubscriptionResult, SubscriptionCommandMetadata {}

export interface PauseSubscriptionCommandResult
  extends PauseSubscriptionResult, SubscriptionCommandMetadata {}

export interface ResumeSubscriptionCommandResult
  extends ResumeSubscriptionResult, SubscriptionCommandMetadata {}

export interface RenewSubscriptionCommandResult
  extends RenewSubscriptionResult, SubscriptionCommandMetadata {}

export async function activateSubscriptionCommand(
  input: ActivateSubscriptionCommandInput
): Promise<ActivateSubscriptionCommandResult> {
  const existing = await loadSubscription(input.tenantId, input.subscriptionId);
  let serviceResult: ActivateSubscriptionResult | undefined;

  const commandResult = await executeMutationCommand<SubscriptionRecord>({
    model: "subscription",
    operation: "update",
    recordId: input.subscriptionId,
    actorId: String(input.actorId),
    source: input.source ?? "api.sales.subscriptions.activate",
    policies: [SUBSCRIPTION_DUAL_WRITE_POLICY],
    existingRecord: existing,
    nextRecord: {
      ...existing,
      status: "active",
    },
    mutate: async () => {
      serviceResult = await activateSubscription(input);
      return serviceResult.subscription;
    },
  });

  if (!serviceResult) {
    throw new Error("subscription-command-service: activate mutation returned no result");
  }

  if (commandResult.event) {
    upsertProjectionCheckpoint(
      buildProjectionCheckpoint({
        definition: {
          name: "subscription.read_model",
          version: {
            version: 1,
            schemaHash: "subscription_read_model_v1",
          },
        },
        aggregateType: "subscription",
        aggregateId: input.subscriptionId,
        lastAppliedVersion: commandResult.event.version,
        updatedAt: commandResult.event.timestamp,
      })
    );
  }

  return {
    ...serviceResult,
    mutationPolicy: commandResult.mutationPolicy,
    event: commandResult.event,
  };
}

export async function cancelSubscriptionCommand(
  input: CancelSubscriptionCommandInput
): Promise<CancelSubscriptionCommandResult> {
  const existing = await loadSubscription(input.tenantId, input.subscriptionId);
  let serviceResult: CancelSubscriptionResult | undefined;

  const commandResult = await executeMutationCommand<SubscriptionRecord>({
    model: "subscription",
    operation: "update",
    recordId: input.subscriptionId,
    actorId: String(input.actorId),
    source: input.source ?? "api.sales.subscriptions.cancel",
    policies: [SUBSCRIPTION_DUAL_WRITE_POLICY],
    existingRecord: existing,
    nextRecord: {
      ...existing,
      status: "cancelled",
    },
    mutate: async () => {
      serviceResult = await cancelSubscription(input);
      return serviceResult.subscription;
    },
  });

  if (!serviceResult) {
    throw new Error("subscription-command-service: cancel mutation returned no result");
  }

  if (commandResult.event) {
    upsertProjectionCheckpoint(
      buildProjectionCheckpoint({
        definition: {
          name: "subscription.read_model",
          version: {
            version: 1,
            schemaHash: "subscription_read_model_v1",
          },
        },
        aggregateType: "subscription",
        aggregateId: input.subscriptionId,
        lastAppliedVersion: commandResult.event.version,
        updatedAt: commandResult.event.timestamp,
      })
    );
  }

  return {
    ...serviceResult,
    mutationPolicy: commandResult.mutationPolicy,
    event: commandResult.event,
  };
}

export async function pauseSubscriptionCommand(
  input: PauseSubscriptionCommandInput
): Promise<PauseSubscriptionCommandResult> {
  const existing = await loadSubscription(input.tenantId, input.subscriptionId);
  let serviceResult: PauseSubscriptionResult | undefined;

  const commandResult = await executeMutationCommand<SubscriptionRecord>({
    model: "subscription",
    operation: "update",
    recordId: input.subscriptionId,
    actorId: String(input.actorId),
    source: input.source ?? "api.sales.subscriptions.pause",
    policies: [SUBSCRIPTION_DUAL_WRITE_POLICY],
    existingRecord: existing,
    nextRecord: {
      ...existing,
      status: "paused",
    },
    mutate: async () => {
      serviceResult = await pauseSubscription(input);
      return serviceResult.subscription;
    },
  });

  if (!serviceResult) {
    throw new Error("subscription-command-service: pause mutation returned no result");
  }

  if (commandResult.event) {
    upsertProjectionCheckpoint(
      buildProjectionCheckpoint({
        definition: {
          name: "subscription.read_model",
          version: {
            version: 1,
            schemaHash: "subscription_read_model_v1",
          },
        },
        aggregateType: "subscription",
        aggregateId: input.subscriptionId,
        lastAppliedVersion: commandResult.event.version,
        updatedAt: commandResult.event.timestamp,
      })
    );
  }

  return {
    ...serviceResult,
    mutationPolicy: commandResult.mutationPolicy,
    event: commandResult.event,
  };
}

export async function resumeSubscriptionCommand(
  input: ResumeSubscriptionCommandInput
): Promise<ResumeSubscriptionCommandResult> {
  const existing = await loadSubscription(input.tenantId, input.subscriptionId);
  let serviceResult: ResumeSubscriptionResult | undefined;

  const commandResult = await executeMutationCommand<SubscriptionRecord>({
    model: "subscription",
    operation: "update",
    recordId: input.subscriptionId,
    actorId: String(input.actorId),
    source: input.source ?? "api.sales.subscriptions.resume",
    policies: [SUBSCRIPTION_DUAL_WRITE_POLICY],
    existingRecord: existing,
    nextRecord: {
      ...existing,
      status: "active",
    },
    mutate: async () => {
      serviceResult = await resumeSubscription(input);
      return serviceResult.subscription;
    },
  });

  if (!serviceResult) {
    throw new Error("subscription-command-service: resume mutation returned no result");
  }

  if (commandResult.event) {
    upsertProjectionCheckpoint(
      buildProjectionCheckpoint({
        definition: {
          name: "subscription.read_model",
          version: {
            version: 1,
            schemaHash: "subscription_read_model_v1",
          },
        },
        aggregateType: "subscription",
        aggregateId: input.subscriptionId,
        lastAppliedVersion: commandResult.event.version,
        updatedAt: commandResult.event.timestamp,
      })
    );
  }

  return {
    ...serviceResult,
    mutationPolicy: commandResult.mutationPolicy,
    event: commandResult.event,
  };
}

export async function renewSubscriptionCommand(
  input: RenewSubscriptionCommandInput
): Promise<RenewSubscriptionCommandResult> {
  const existing = await loadSubscription(input.tenantId, input.subscriptionId);
  let serviceResult: RenewSubscriptionResult | undefined;

  const commandResult = await executeMutationCommand<SubscriptionRecord>({
    model: "subscription",
    operation: "update",
    recordId: input.subscriptionId,
    actorId: String(input.actorId),
    source: input.source ?? "api.sales.subscriptions.renew",
    policies: [SUBSCRIPTION_DUAL_WRITE_POLICY],
    existingRecord: existing,
    nextRecord: {
      ...existing,
      status: "active",
    },
    mutate: async () => {
      serviceResult = await renewSubscription(input);
      return serviceResult.subscription;
    },
  });

  if (!serviceResult) {
    throw new Error("subscription-command-service: renew mutation returned no result");
  }

  if (commandResult.event) {
    upsertProjectionCheckpoint(
      buildProjectionCheckpoint({
        definition: {
          name: "subscription.read_model",
          version: {
            version: 1,
            schemaHash: "subscription_read_model_v1",
          },
        },
        aggregateType: "subscription",
        aggregateId: input.subscriptionId,
        lastAppliedVersion: commandResult.event.version,
        updatedAt: commandResult.event.timestamp,
      })
    );
  }

  return {
    ...serviceResult,
    mutationPolicy: commandResult.mutationPolicy,
    event: commandResult.event,
  };
}

async function loadSubscription(
  tenantId: number,
  subscriptionId: string
): Promise<SubscriptionRecord> {
  const [record] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.tenantId, tenantId),
        eq(subscriptions.id, subscriptionId),
        isNull(subscriptions.deletedAt)
      )
    )
    .limit(1);

  if (!record) {
    throw new NotFoundError(`Subscription ${subscriptionId} was not found for tenant ${tenantId}.`);
  }

  return record;
}
