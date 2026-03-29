import type { MutationOperation } from "@afenda/meta-types/policy";
type MutationRecord = Record<string, unknown>;

export interface EventTypeResolverInput {
  operation: MutationOperation;
  before?: MutationRecord | null;
  after?: MutationRecord | null;
}

export type EventTypeResolver = (input: EventTypeResolverInput) => string;

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const registry = new Map<string, EventTypeResolver>();

export function registerEventTypeResolver(model: string, resolver: EventTypeResolver): void {
  registry.set(model, resolver);
}

export function resolveEventType(input: {
  model: string;
  operation: MutationOperation;
  before?: MutationRecord | null;
  after?: MutationRecord | null;
}): string {
  const resolver = registry.get(input.model);
  if (resolver) {
    return resolver({
      operation: input.operation,
      before: input.before,
      after: input.after,
    });
  }

  return `${input.model}.direct_${input.operation}`;
}

export function hasEventTypeResolver(model: string): boolean {
  return registry.has(model);
}

export function registeredModels(): string[] {
  return [...registry.keys()];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeStatus(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value.toLowerCase() : undefined;
}

// ---------------------------------------------------------------------------
// Sales domain resolvers
// ---------------------------------------------------------------------------

registerEventTypeResolver("sales_order", (input) => {
  const beforeStatus = normalizeStatus(input.before?.status);
  const afterStatus = normalizeStatus(input.after?.status);

  if (input.operation === "delete") {
    return "sales_order.cancelled";
  }

  if (afterStatus === "cancel" || afterStatus === "cancelled") {
    return "sales_order.cancelled";
  }

  if (
    afterStatus &&
    ["sale", "confirmed", "done"].includes(afterStatus) &&
    beforeStatus !== afterStatus
  ) {
    return "sales_order.confirmed";
  }

  return "sales_order.submitted";
});

registerEventTypeResolver("subscription", (input) => {
  if (input.operation === "delete") {
    return "subscription.cancelled";
  }

  const beforeStatus = normalizeStatus(input.before?.status);
  const afterStatus = normalizeStatus(input.after?.status);

  if (afterStatus === "cancelled") {
    return "subscription.cancelled";
  }

  if (afterStatus === "active" && beforeStatus !== "active") {
    return "subscription.activated";
  }

  if (afterStatus === "paused" && beforeStatus !== "paused") {
    return "subscription.paused";
  }

  return "subscription.direct_update";
});

registerEventTypeResolver("return_order", (input) => {
  if (input.operation === "delete") {
    return "return_order.cancelled";
  }

  const beforeStatus = normalizeStatus(input.before?.status);
  const afterStatus = normalizeStatus(input.after?.status);

  if (afterStatus === "approved" && beforeStatus !== "approved") {
    return "return_order.approved";
  }

  if (afterStatus === "received" && beforeStatus !== "received") {
    return "return_order.received";
  }

  if (afterStatus === "inspected" && beforeStatus !== "inspected") {
    return "return_order.inspected";
  }

  if (afterStatus === "credited" && beforeStatus !== "credited") {
    return "return_order.credited";
  }

  return "return_order.direct_update";
});

registerEventTypeResolver("commission_entry", (input) => {
  if (input.operation === "delete") {
    return "commission_entry.deleted";
  }

  if (input.operation === "create") {
    return "commission_entry.generated";
  }

  const beforeStatus = normalizeStatus(input.before?.status);
  const afterStatus = normalizeStatus(input.after?.status);

  if (beforeStatus !== undefined && afterStatus === "approved" && beforeStatus !== "approved") {
    return "commission_entry.approved";
  }

  if (beforeStatus !== undefined && afterStatus === "paid" && beforeStatus !== "paid") {
    return "commission_entry.paid";
  }

  return input.operation === "update"
    ? "commission_entry.recalculated"
    : "commission_entry.direct_update";
});

// ---------------------------------------------------------------------------
// Platform domain resolvers (generic direct_* pattern)
// ---------------------------------------------------------------------------

for (const model of ["tenant", "organization", "workflow", "workflow_instance"]) {
  registerEventTypeResolver(model, (input) => `${model}.direct_${input.operation}`);
}
