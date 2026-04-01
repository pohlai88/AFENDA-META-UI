import type { SubscriptionStatus } from "@afenda/db/schema/sales";
import {
  pricelists,
  subscriptionCloseReasons,
  subscriptionLines,
  subscriptionLogs,
  subscriptionPricingResolutions,
  subscriptions,
  subscriptionTemplates,
} from "@afenda/db/schema/sales";
import { Decimal } from "decimal.js";
import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "../../db/index.js";
import { NotFoundError, ValidationError } from "../../middleware/errorHandler.js";
import { recordDomainEvent, recordValidationIssues } from "../../utils/audit-logs.js";
import {
  computeNextInvoiceDate,
  subscriptionStateMachine,
  validateSubscription as validateSubscriptionInvariants,
  type SubscriptionValidationResult,
} from "./logic/subscription-engine.js";
import {
  buildSubscriptionPricingSnapshotV1,
  resolveSubscriptionPricingAggregate,
  type SubscriptionPricingSnapshotV1,
} from "./logic/subscription-pricing-kernel.js";

export interface ValidateSubscriptionInput {
  tenantId: number;
  subscriptionId: string;
  actorId?: number;
}

export interface ValidateSubscriptionResult {
  subscription: typeof subscriptions.$inferSelect;
  template: typeof subscriptionTemplates.$inferSelect;
  lines: Array<typeof subscriptionLines.$inferSelect>;
  validation: SubscriptionValidationResult;
}

export interface ActivateSubscriptionInput {
  tenantId: number;
  subscriptionId: string;
  actorId: number;
  activationDate?: Date;
}

export interface ActivateSubscriptionResult {
  subscription: typeof subscriptions.$inferSelect;
  lines: Array<typeof subscriptionLines.$inferSelect>;
  validation: SubscriptionValidationResult;
}

export interface PauseSubscriptionInput {
  tenantId: number;
  subscriptionId: string;
  actorId: number;
  reason?: string;
}

export interface PauseSubscriptionResult {
  subscription: typeof subscriptions.$inferSelect;
}

export interface ResumeSubscriptionInput {
  tenantId: number;
  subscriptionId: string;
  actorId: number;
  resumeDate?: Date;
  paymentResolved?: boolean;
  reason?: string;
}

export interface ResumeSubscriptionResult {
  subscription: typeof subscriptions.$inferSelect;
}

export interface CancelSubscriptionInput {
  tenantId: number;
  subscriptionId: string;
  actorId: number;
  closeReasonId: string;
  cancelledAt?: Date;
  reason?: string;
}

export interface CancelSubscriptionResult {
  subscription: typeof subscriptions.$inferSelect;
}

export interface RenewSubscriptionInput {
  tenantId: number;
  subscriptionId: string;
  actorId: number;
  renewalDate?: Date;
  reason?: string;
}

export interface RenewSubscriptionResult {
  subscription: typeof subscriptions.$inferSelect;
}

export async function resolveSubscriptionCurrencyId(
  tenantId: number,
  templateId: string
): Promise<number | null> {
  const [row] = await db
    .select({ currencyId: pricelists.currencyId })
    .from(subscriptionTemplates)
    .leftJoin(pricelists, eq(subscriptionTemplates.pricelistId, pricelists.id))
    .where(
      and(
        eq(subscriptionTemplates.tenantId, tenantId),
        eq(subscriptionTemplates.id, templateId),
        isNull(subscriptionTemplates.deletedAt)
      )
    )
    .limit(1);

  return row?.currencyId ?? null;
}

async function nextSubscriptionPricingResolutionRevision(
  tenantId: number,
  subscriptionId: string
): Promise<number> {
  const [row] = await db
    .select({
      maxRev: sql<number>`coalesce(max(${subscriptionPricingResolutions.resolutionRevision}), 0)`,
    })
    .from(subscriptionPricingResolutions)
    .where(
      and(
        eq(subscriptionPricingResolutions.tenantId, tenantId),
        eq(subscriptionPricingResolutions.subscriptionId, subscriptionId)
      )
    );

  return Number(row?.maxRev ?? 0) + 1;
}

async function appendSubscriptionPricingResolution(input: {
  tenantId: number;
  subscriptionId: string;
  snapshot: SubscriptionPricingSnapshotV1;
  recurringTotal: string;
  mrr: string;
  arr: string;
}): Promise<void> {
  const resolutionRevision = await nextSubscriptionPricingResolutionRevision(
    input.tenantId,
    input.subscriptionId
  );

  await db.insert(subscriptionPricingResolutions).values({
    tenantId: input.tenantId,
    subscriptionId: input.subscriptionId,
    resolutionRevision,
    snapshot: input.snapshot,
    recurringTotal: input.recurringTotal,
    mrr: input.mrr,
    arr: input.arr,
  });
}

export async function validateSubscription(
  input: ValidateSubscriptionInput
): Promise<ValidateSubscriptionResult> {
  const subscription = await loadSubscription(input.tenantId, input.subscriptionId);
  const template = await loadSubscriptionTemplate(input.tenantId, subscription.templateId);
  const lines = await loadSubscriptionLines(input.tenantId, input.subscriptionId);

  const validation = validateSubscriptionInvariants({
    subscription,
    lines,
    template,
  });

  if (input.actorId && validation.issues.length > 0) {
    await recordValidationIssues({
      tenantId: input.tenantId,
      entityType: "subscription",
      entityId: subscription.id,
      issues: validation.issues,
      actorId: input.actorId,
    });
  }

  if (input.actorId) {
    await recordDomainEvent({
      tenantId: input.tenantId,
      eventType: "SUBSCRIPTION_VALIDATED",
      entityType: "subscription",
      entityId: subscription.id,
      payload: {
        valid: validation.valid,
        errorCount: validation.errors.length,
        issueCount: validation.issues.length,
      },
      triggeredBy: input.actorId,
      actorId: input.actorId,
    });
  }

  return {
    subscription,
    template,
    lines,
    validation,
  };
}

export async function activateSubscription(
  input: ActivateSubscriptionInput
): Promise<ActivateSubscriptionResult> {
  const context = await validateSubscription({
    tenantId: input.tenantId,
    subscriptionId: input.subscriptionId,
    actorId: input.actorId,
  });

  if (!context.validation.valid) {
    throw new ValidationError(formatValidationErrors(context.validation));
  }

  const activationDate = input.activationDate ?? new Date();

  subscriptionStateMachine.assertTransition(context.subscription.status as SubscriptionStatus, "active", {
    hasLines: context.lines.length > 0,
    startDateValid:
      !context.subscription.dateEnd ||
      context.subscription.dateStart.getTime() < context.subscription.dateEnd.getTime(),
  });

  const mrrResult = resolveSubscriptionPricingAggregate({
    lines: context.lines,
    billingPeriod: context.template.billingPeriod,
  });
  const pricingSnapshot = buildSubscriptionPricingSnapshotV1({
    template: context.template,
    lines: context.lines,
    mrrResult,
  });
  const currencyId =
    (await resolveSubscriptionCurrencyId(input.tenantId, context.subscription.templateId)) ??
    context.subscription.currencyId;

  const newTruthRevision = context.subscription.truthRevision + 1;
  const effectiveDateStart =
    context.subscription.status === "draft" ? activationDate : context.subscription.dateStart;
  const billingAnchorDate =
    context.subscription.status === "draft"
      ? effectiveDateStart
      : context.subscription.billingAnchorDate;
  const pricingLockedAt = new Date();

  const [updatedSubscription] = await db
    .update(subscriptions)
    .set({
      status: "active",
      dateStart: effectiveDateStart,
      nextInvoiceDate: computeNextInvoiceDate({
        currentDate: activationDate,
        billingPeriod: context.template.billingPeriod,
        billingDay: context.template.billingDay,
        billingAnchorDate,
      }),
      recurringTotal: mrrResult.lineTotal.toDecimalPlaces(2).toString(),
      mrr: mrrResult.mrr.toString(),
      arr: mrrResult.arr.toString(),
      truthRevision: newTruthRevision,
      pricingLockedAt,
      pricingSnapshot,
      billingAnchorDate,
      currencyId,
      closeReasonId: null,
      updatedBy: input.actorId,
    })
    .where(
      and(
        eq(subscriptions.tenantId, input.tenantId),
        eq(subscriptions.id, input.subscriptionId),
        isNull(subscriptions.deletedAt)
      )
    )
    .returning();

  if (!updatedSubscription) {
    throw new NotFoundError(
      `Subscription ${input.subscriptionId} was not found for tenant ${input.tenantId}.`
    );
  }

  await appendSubscriptionPricingResolution({
    tenantId: input.tenantId,
    subscriptionId: updatedSubscription.id,
    snapshot: pricingSnapshot,
    recurringTotal: updatedSubscription.recurringTotal,
    mrr: updatedSubscription.mrr,
    arr: updatedSubscription.arr,
  });

  await recordSubscriptionLog({
    tenantId: input.tenantId,
    subscriptionId: updatedSubscription.id,
    eventType: "created",
    oldMrr: context.subscription.mrr,
    newMrr: mrrResult.mrr.toString(),
    changeReason: "Subscription activated",
    actorId: input.actorId,
  });

  await recordDomainEvent({
    tenantId: input.tenantId,
    eventType: "SUBSCRIPTION_ACTIVATED",
    entityType: "subscription",
    entityId: updatedSubscription.id,
    payload: {
      oldStatus: context.subscription.status,
      newStatus: updatedSubscription.status,
      mrr: updatedSubscription.mrr,
      arr: updatedSubscription.arr,
    },
    triggeredBy: input.actorId,
    actorId: input.actorId,
  });

  return {
    subscription: updatedSubscription,
    lines: context.lines,
    validation: context.validation,
  };
}

export async function pauseSubscription(
  input: PauseSubscriptionInput
): Promise<PauseSubscriptionResult> {
  const subscription = await loadSubscription(input.tenantId, input.subscriptionId);

  subscriptionStateMachine.assertTransition(subscription.status as SubscriptionStatus, "paused");

  const [updatedSubscription] = await db
    .update(subscriptions)
    .set({
      status: "paused",
      truthRevision: subscription.truthRevision + 1,
      updatedBy: input.actorId,
    })
    .where(
      and(
        eq(subscriptions.tenantId, input.tenantId),
        eq(subscriptions.id, input.subscriptionId),
        isNull(subscriptions.deletedAt)
      )
    )
    .returning();

  if (!updatedSubscription) {
    throw new NotFoundError(
      `Subscription ${input.subscriptionId} was not found for tenant ${input.tenantId}.`
    );
  }

  await recordSubscriptionLog({
    tenantId: input.tenantId,
    subscriptionId: updatedSubscription.id,
    eventType: "paused",
    oldMrr: subscription.mrr,
    newMrr: subscription.mrr,
    changeReason: input.reason ?? "Subscription paused",
    actorId: input.actorId,
  });

  await recordDomainEvent({
    tenantId: input.tenantId,
    eventType: "SUBSCRIPTION_PAUSED",
    entityType: "subscription",
    entityId: updatedSubscription.id,
    payload: {
      oldStatus: subscription.status,
      newStatus: updatedSubscription.status,
      reason: input.reason ?? null,
    },
    triggeredBy: input.actorId,
    actorId: input.actorId,
  });

  return {
    subscription: updatedSubscription,
  };
}

export async function resumeSubscription(
  input: ResumeSubscriptionInput
): Promise<ResumeSubscriptionResult> {
  const subscription = await loadSubscription(input.tenantId, input.subscriptionId);
  const template = await loadSubscriptionTemplate(input.tenantId, subscription.templateId);

  if (subscription.status === "past_due") {
    subscriptionStateMachine.assertTransition(subscription.status as SubscriptionStatus, "active", {
      paymentResolved: input.paymentResolved === true,
    });
  } else {
    subscriptionStateMachine.assertTransition(subscription.status as SubscriptionStatus, "active");
  }

  const resumeDate = input.resumeDate ?? new Date();
  const nextInvoiceDate = computeNextInvoiceDate({
    currentDate: resumeDate,
    lastInvoiced: subscription.lastInvoicedAt ?? undefined,
    billingPeriod: template.billingPeriod,
    billingDay: template.billingDay,
  });

  const [updatedSubscription] = await db
    .update(subscriptions)
    .set({
      status: "active",
      nextInvoiceDate,
      truthRevision: subscription.truthRevision + 1,
      updatedBy: input.actorId,
    })
    .where(
      and(
        eq(subscriptions.tenantId, input.tenantId),
        eq(subscriptions.id, input.subscriptionId),
        isNull(subscriptions.deletedAt)
      )
    )
    .returning();

  if (!updatedSubscription) {
    throw new NotFoundError(
      `Subscription ${input.subscriptionId} was not found for tenant ${input.tenantId}.`
    );
  }

  await recordSubscriptionLog({
    tenantId: input.tenantId,
    subscriptionId: updatedSubscription.id,
    eventType: "resumed",
    oldMrr: subscription.mrr,
    newMrr: subscription.mrr,
    changeReason: input.reason ?? "Subscription resumed",
    actorId: input.actorId,
  });

  await recordDomainEvent({
    tenantId: input.tenantId,
    eventType: "SUBSCRIPTION_RESUMED",
    entityType: "subscription",
    entityId: updatedSubscription.id,
    payload: {
      oldStatus: subscription.status,
      newStatus: updatedSubscription.status,
      nextInvoiceDate: updatedSubscription.nextInvoiceDate.toISOString(),
      reason: input.reason ?? null,
    },
    triggeredBy: input.actorId,
    actorId: input.actorId,
  });

  return {
    subscription: updatedSubscription,
  };
}

export async function cancelSubscription(
  input: CancelSubscriptionInput
): Promise<CancelSubscriptionResult> {
  const subscription = await loadSubscription(input.tenantId, input.subscriptionId);

  await ensureCloseReason(input.tenantId, input.closeReasonId);

  subscriptionStateMachine.assertTransition(subscription.status as SubscriptionStatus, "cancelled", {
    hasCloseReason: true,
  });

  const oldMrr = new Decimal(subscription.mrr);
  const cancelledAt = input.cancelledAt ?? new Date();

  const [updatedSubscription] = await db
    .update(subscriptions)
    .set({
      status: "cancelled",
      dateEnd: cancelledAt,
      closeReasonId: input.closeReasonId,
      mrr: "0.00",
      arr: "0.00",
      truthRevision: subscription.truthRevision + 1,
      updatedBy: input.actorId,
    })
    .where(
      and(
        eq(subscriptions.tenantId, input.tenantId),
        eq(subscriptions.id, input.subscriptionId),
        isNull(subscriptions.deletedAt)
      )
    )
    .returning();

  if (!updatedSubscription) {
    throw new NotFoundError(
      `Subscription ${input.subscriptionId} was not found for tenant ${input.tenantId}.`
    );
  }

  await recordSubscriptionLog({
    tenantId: input.tenantId,
    subscriptionId: updatedSubscription.id,
    eventType: "cancelled",
    oldMrr: oldMrr.toString(),
    newMrr: "0.00",
    changeReason: input.reason ?? "Subscription cancelled",
    actorId: input.actorId,
  });

  await recordDomainEvent({
    tenantId: input.tenantId,
    eventType: "SUBSCRIPTION_CANCELLED",
    entityType: "subscription",
    entityId: updatedSubscription.id,
    payload: {
      oldStatus: subscription.status,
      newStatus: updatedSubscription.status,
      closeReasonId: input.closeReasonId,
      cancelledAt: cancelledAt.toISOString(),
    },
    triggeredBy: input.actorId,
    actorId: input.actorId,
  });

  return {
    subscription: updatedSubscription,
  };
}

export async function renewSubscription(
  input: RenewSubscriptionInput
): Promise<RenewSubscriptionResult> {
  const subscription = await loadSubscription(input.tenantId, input.subscriptionId);
  const template = await loadSubscriptionTemplate(input.tenantId, subscription.templateId);
  const lines = await loadSubscriptionLines(input.tenantId, subscription.id);

  if (subscription.status !== "active") {
    throw new ValidationError(
      `Subscription ${subscription.id} must be active to renew (current status: ${subscription.status}).`
    );
  }

  const renewalDate = input.renewalDate ?? new Date();
  const mrrResult = resolveSubscriptionPricingAggregate({
    lines,
    billingPeriod: template.billingPeriod,
  });
  const pricingSnapshot = buildSubscriptionPricingSnapshotV1({
    template,
    lines,
    mrrResult,
    computedAt: renewalDate,
  });
  const oldMrr = new Decimal(subscription.mrr);

  const nextInvoiceDate = computeNextInvoiceDate({
    currentDate: renewalDate,
    lastInvoiced: subscription.lastInvoicedAt ?? subscription.nextInvoiceDate,
    billingPeriod: template.billingPeriod,
    billingDay: template.billingDay,
    billingAnchorDate: subscription.billingAnchorDate,
  });

  const pricingLockedAt = renewalDate;
  const newTruthRevision = subscription.truthRevision + 1;

  const [updatedSubscription] = await db
    .update(subscriptions)
    .set({
      lastInvoicedAt: renewalDate,
      nextInvoiceDate,
      dateEnd: extendDateEnd(subscription.dateEnd, template.billingPeriod, template.renewalPeriod),
      recurringTotal: mrrResult.lineTotal.toDecimalPlaces(2).toString(),
      mrr: mrrResult.mrr.toString(),
      arr: mrrResult.arr.toString(),
      truthRevision: newTruthRevision,
      pricingLockedAt,
      pricingSnapshot,
      updatedBy: input.actorId,
    })
    .where(
      and(
        eq(subscriptions.tenantId, input.tenantId),
        eq(subscriptions.id, input.subscriptionId),
        isNull(subscriptions.deletedAt)
      )
    )
    .returning();

  if (!updatedSubscription) {
    throw new NotFoundError(
      `Subscription ${input.subscriptionId} was not found for tenant ${input.tenantId}.`
    );
  }

  await appendSubscriptionPricingResolution({
    tenantId: input.tenantId,
    subscriptionId: updatedSubscription.id,
    snapshot: pricingSnapshot,
    recurringTotal: updatedSubscription.recurringTotal,
    mrr: updatedSubscription.mrr,
    arr: updatedSubscription.arr,
  });

  await recordSubscriptionLog({
    tenantId: input.tenantId,
    subscriptionId: updatedSubscription.id,
    eventType: "renewed",
    oldMrr: oldMrr.toString(),
    newMrr: updatedSubscription.mrr,
    changeReason: input.reason ?? "Subscription renewed",
    actorId: input.actorId,
  });

  await recordDomainEvent({
    tenantId: input.tenantId,
    eventType: "SUBSCRIPTION_RENEWED",
    entityType: "subscription",
    entityId: updatedSubscription.id,
    payload: {
      renewedAt: renewalDate.toISOString(),
      nextInvoiceDate: updatedSubscription.nextInvoiceDate.toISOString(),
      mrr: updatedSubscription.mrr,
      arr: updatedSubscription.arr,
    },
    triggeredBy: input.actorId,
    actorId: input.actorId,
  });

  return {
    subscription: updatedSubscription,
  };
}

async function loadSubscription(tenantId: number, subscriptionId: string) {
  const [subscription] = await db
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

  if (!subscription) {
    throw new NotFoundError(`Subscription ${subscriptionId} was not found for tenant ${tenantId}.`);
  }

  return subscription;
}

async function loadSubscriptionTemplate(tenantId: number, templateId: string) {
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

async function loadSubscriptionLines(tenantId: number, subscriptionId: string) {
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

async function recordSubscriptionLog(input: {
  tenantId: number;
  subscriptionId: string;
  eventType: typeof subscriptionLogs.$inferInsert.eventType;
  oldMrr: string;
  newMrr: string;
  changeReason?: string;
  actorId: number;
}) {
  await db.insert(subscriptionLogs).values({
    tenantId: input.tenantId,
    subscriptionId: input.subscriptionId,
    eventType: input.eventType,
    oldMrr: input.oldMrr,
    newMrr: input.newMrr,
    changeReason: input.changeReason ?? null,
    actorId: input.actorId,
    createdBy: input.actorId,
    updatedBy: input.actorId,
  });
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
  billingPeriod: typeof subscriptionTemplates.$inferSelect.billingPeriod,
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
