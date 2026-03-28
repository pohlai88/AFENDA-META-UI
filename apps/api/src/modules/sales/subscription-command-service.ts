import { requireMutationPolicyById } from "@afenda/db";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "../../db/index.js";
import {
  subscriptionCloseReasons,
  subscriptionLines,
  subscriptionTemplates,
  subscriptions,
} from "../../db/schema/index.js";
import { dbGetAggregateEvents } from "../../events/dbEventStore.js";
import { upsertProjectionCheckpoint } from "../../events/projectionCheckpointStore.js";
import { buildProjectionCheckpoint } from "../../events/projectionRuntime.js";
import { NotFoundError, ValidationError } from "../../middleware/errorHandler.js";
import {
  createProjectionDriftValidator,
  executeCommandRuntime,
  type ExecuteMutationCommandResult,
} from "../../policy/command-runtime-spine.js";
import {
  computeMRR,
  computeNextInvoiceDate,
  subscriptionStateMachine,
  validateSubscription as validateSubscriptionInvariants,
  type SubscriptionValidationResult,
} from "./logic/subscription-engine.js";
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
type SubscriptionTemplateRecord = typeof subscriptionTemplates.$inferSelect;
type SubscriptionLineRecord = typeof subscriptionLines.$inferSelect;

const SUBSCRIPTION_EVENT_ONLY_POLICY = requireMutationPolicyById(
  "sales.subscription.command_projection"
);

const SUBSCRIPTION_PROJECTION_DEFINITION = {
  name: "subscription.read_model",
  version: {
    version: 1,
    schemaHash: "subscription_read_model_v1",
  },
};
const assertSubscriptionProjectionDrift = createProjectionDriftValidator({
  aggregateType: "subscription",
  definition: SUBSCRIPTION_PROJECTION_DEFINITION,
});

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
  const template = await loadSubscriptionTemplate(input.tenantId, existing.templateId);
  const lines = await loadSubscriptionLines(input.tenantId, input.subscriptionId);
  const validation = validateSubscriptionInvariants({
    subscription: existing,
    lines,
    template,
  });

  if (!validation.valid) {
    throw new ValidationError(formatValidationErrors(validation));
  }

  const activationDate = input.activationDate ?? new Date();
  subscriptionStateMachine.assertTransition(existing.status, "active", {
    hasLines: lines.length > 0,
    startDateValid: !existing.dateEnd || existing.dateStart.getTime() < existing.dateEnd.getTime(),
  });

  const mrrResult = computeMRR({
    lines,
    billingPeriod: template.billingPeriod,
  });

  const nextSubscription: SubscriptionRecord = {
    ...existing,
    status: "active",
    dateStart: existing.status === "draft" ? activationDate : existing.dateStart,
    nextInvoiceDate: computeNextInvoiceDate({
      currentDate: activationDate,
      billingPeriod: template.billingPeriod,
      billingDay: template.billingDay,
    }),
    recurringTotal: mrrResult.lineTotal.toDecimalPlaces(2).toString(),
    mrr: mrrResult.mrr.toString(),
    arr: mrrResult.arr.toString(),
    closeReasonId: null,
    updatedBy: input.actorId,
  };

  let serviceResult: ActivateSubscriptionResult | undefined;
  const commandResult = await executeSubscriptionCommand({
    tenantId: input.tenantId,
    subscriptionId: input.subscriptionId,
    actorId: input.actorId,
    source: input.source ?? "api.sales.subscriptions.activate",
    nextSubscription,
    persistProjection: async () => {
      serviceResult = await activateSubscription(input);
    },
  });

  if (!serviceResult) {
    throw new Error("subscription-command-service: activate mutation returned no result");
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
  await ensureCloseReason(input.tenantId, input.closeReasonId);
  subscriptionStateMachine.assertTransition(existing.status, "cancelled", {
    hasCloseReason: true,
  });

  const cancelledAt = input.cancelledAt ?? new Date();
  const nextSubscription: SubscriptionRecord = {
    ...existing,
    status: "cancelled",
    dateEnd: cancelledAt,
    closeReasonId: input.closeReasonId,
    mrr: "0.00",
    arr: "0.00",
    updatedBy: input.actorId,
  };

  let serviceResult: CancelSubscriptionResult | undefined;
  const commandResult = await executeSubscriptionCommand({
    tenantId: input.tenantId,
    subscriptionId: input.subscriptionId,
    actorId: input.actorId,
    source: input.source ?? "api.sales.subscriptions.cancel",
    nextSubscription,
    persistProjection: async () => {
      serviceResult = await cancelSubscription(input);
    },
  });

  if (!serviceResult) {
    throw new Error("subscription-command-service: cancel mutation returned no result");
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
  subscriptionStateMachine.assertTransition(existing.status, "paused");

  let serviceResult: PauseSubscriptionResult | undefined;
  const commandResult = await executeSubscriptionCommand({
    tenantId: input.tenantId,
    subscriptionId: input.subscriptionId,
    actorId: input.actorId,
    source: input.source ?? "api.sales.subscriptions.pause",
    nextSubscription: {
      ...existing,
      status: "paused",
      updatedBy: input.actorId,
    },
    persistProjection: async () => {
      serviceResult = await pauseSubscription(input);
    },
  });

  if (!serviceResult) {
    throw new Error("subscription-command-service: pause mutation returned no result");
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
  const template = await loadSubscriptionTemplate(input.tenantId, existing.templateId);
  if (existing.status === "past_due") {
    subscriptionStateMachine.assertTransition(existing.status, "active", {
      paymentResolved: input.paymentResolved === true,
    });
  } else {
    subscriptionStateMachine.assertTransition(existing.status, "active");
  }

  const resumeDate = input.resumeDate ?? new Date();
  const nextSubscription: SubscriptionRecord = {
    ...existing,
    status: "active",
    nextInvoiceDate: computeNextInvoiceDate({
      currentDate: resumeDate,
      lastInvoiced: existing.lastInvoicedAt ?? undefined,
      billingPeriod: template.billingPeriod,
      billingDay: template.billingDay,
    }),
    updatedBy: input.actorId,
  };

  let serviceResult: ResumeSubscriptionResult | undefined;
  const commandResult = await executeSubscriptionCommand({
    tenantId: input.tenantId,
    subscriptionId: input.subscriptionId,
    actorId: input.actorId,
    source: input.source ?? "api.sales.subscriptions.resume",
    nextSubscription,
    persistProjection: async () => {
      serviceResult = await resumeSubscription(input);
    },
  });

  if (!serviceResult) {
    throw new Error("subscription-command-service: resume mutation returned no result");
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
  const template = await loadSubscriptionTemplate(input.tenantId, existing.templateId);
  const lines = await loadSubscriptionLines(input.tenantId, input.subscriptionId);
  if (existing.status !== "active") {
    throw new ValidationError(
      `Subscription ${existing.id} must be active to renew (current status: ${existing.status}).`
    );
  }

  const renewalDate = input.renewalDate ?? new Date();
  const mrrResult = computeMRR({
    lines,
    billingPeriod: template.billingPeriod,
  });

  const nextSubscription: SubscriptionRecord = {
    ...existing,
    lastInvoicedAt: renewalDate,
    nextInvoiceDate: computeNextInvoiceDate({
      currentDate: renewalDate,
      lastInvoiced: existing.lastInvoicedAt ?? existing.nextInvoiceDate,
      billingPeriod: template.billingPeriod,
      billingDay: template.billingDay,
    }),
    dateEnd: extendDateEnd(existing.dateEnd, template.billingPeriod, template.renewalPeriod),
    recurringTotal: mrrResult.lineTotal.toDecimalPlaces(2).toString(),
    mrr: mrrResult.mrr.toString(),
    arr: mrrResult.arr.toString(),
    updatedBy: input.actorId,
  };

  let serviceResult: RenewSubscriptionResult | undefined;
  const commandResult = await executeSubscriptionCommand({
    tenantId: input.tenantId,
    subscriptionId: input.subscriptionId,
    actorId: input.actorId,
    source: input.source ?? "api.sales.subscriptions.renew",
    nextSubscription,
    persistProjection: async () => {
      serviceResult = await renewSubscription(input);
    },
  });

  if (!serviceResult) {
    throw new Error("subscription-command-service: renew mutation returned no result");
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

async function executeSubscriptionCommand(input: {
  tenantId: number;
  subscriptionId: string;
  actorId: number;
  source: string;
  nextSubscription: SubscriptionRecord;
  persistProjection: () => Promise<void>;
}): Promise<ExecuteMutationCommandResult<SubscriptionRecord>> {
  return executeCommandRuntime({
    model: "subscription",
    operation: "update",
    recordId: input.subscriptionId,
    actorId: String(input.actorId),
    source: input.source,
    policies: [SUBSCRIPTION_EVENT_ONLY_POLICY],
    nextRecord: input.nextSubscription,
    mutate: async () => input.nextSubscription,
    loadProjectionState: async () =>
      loadSubscriptionProjectionState({
        tenantId: input.tenantId,
        subscriptionId: input.subscriptionId,
      }),
    projectEvent: ({ currentState, nextRecord }) => nextRecord ?? currentState,
    persistProjectionState: async ({ event }) => {
      await input.persistProjection();
      upsertProjectionCheckpoint(
        buildProjectionCheckpoint({
          definition: SUBSCRIPTION_PROJECTION_DEFINITION,
          aggregateType: "subscription",
          aggregateId: input.subscriptionId,
          lastAppliedVersion: event.version,
          updatedAt: event.timestamp,
        })
      );
    },
  });
}

async function loadSubscriptionProjectionState(input: {
  tenantId: number;
  subscriptionId: string;
}): Promise<SubscriptionRecord> {
  const subscription = await loadSubscription(input.tenantId, input.subscriptionId);
  await assertSubscriptionProjectionDrift(input.subscriptionId);
  return subscription;
}

async function loadSubscriptionTemplate(
  tenantId: number,
  templateId: string
): Promise<SubscriptionTemplateRecord> {
  const [template] = await db
    .select()
    .from(subscriptionTemplates)
    .where(
      and(
        eq(subscriptionTemplates.tenantId, tenantId),
        eq(subscriptionTemplates.id, templateId),
        isNull(subscriptionTemplates.deletedAt)
      )
    )
    .limit(1);

  if (!template) {
    throw new NotFoundError(
      `Subscription template ${templateId} was not found for tenant ${tenantId}.`
    );
  }

  return template;
}

async function loadSubscriptionLines(
  tenantId: number,
  subscriptionId: string
): Promise<SubscriptionLineRecord[]> {
  return db
    .select()
    .from(subscriptionLines)
    .where(
      and(
        eq(subscriptionLines.tenantId, tenantId),
        eq(subscriptionLines.subscriptionId, subscriptionId)
      )
    );
}

async function ensureCloseReason(tenantId: number, closeReasonId: string): Promise<void> {
  const [closeReason] = await db
    .select()
    .from(subscriptionCloseReasons)
    .where(
      and(
        eq(subscriptionCloseReasons.tenantId, tenantId),
        eq(subscriptionCloseReasons.id, closeReasonId),
        isNull(subscriptionCloseReasons.deletedAt)
      )
    )
    .limit(1);

  if (!closeReason) {
    throw new ValidationError(`Close reason ${closeReasonId} is invalid for tenant ${tenantId}.`);
  }
}

function formatValidationErrors(validation: SubscriptionValidationResult): string {
  const issueSummary = validation.issues
    .filter((issue) => issue.severity === "error")
    .map((issue) => `${issue.code}: ${issue.message}`)
    .join("; ");

  return issueSummary.length > 0
    ? `Subscription validation failed: ${issueSummary}`
    : "Subscription validation failed due to invariant errors.";
}

function extendDateEnd(
  currentDateEnd: Date | null,
  billingPeriod: SubscriptionTemplateRecord["billingPeriod"],
  renewalPeriod: number
): Date | null {
  if (!currentDateEnd) {
    return null;
  }

  const next = new Date(currentDateEnd);

  if (billingPeriod === "weekly") {
    next.setDate(next.getDate() + renewalPeriod * 7);
    return next;
  }

  if (billingPeriod === "monthly") {
    next.setMonth(next.getMonth() + renewalPeriod);
    return next;
  }

  if (billingPeriod === "quarterly") {
    next.setMonth(next.getMonth() + renewalPeriod * 3);
    return next;
  }

  next.setFullYear(next.getFullYear() + renewalPeriod);
  return next;
}
