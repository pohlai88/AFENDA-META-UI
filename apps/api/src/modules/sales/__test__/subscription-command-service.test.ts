import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureTestEnv,
  selectMock,
  dbAppendEventMock,
  dbGetAggregateEventsMock,
  getProjectionCheckpointMock,
  upsertProjectionCheckpointMock,
  activateSubscriptionMock,
  cancelSubscriptionMock,
  pauseSubscriptionMock,
  renewSubscriptionMock,
  resumeSubscriptionMock,
  queueSelect,
} = vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/afenda_test";

  const selectQueue: unknown[][] = [];

  const createSelectChain = (rows: unknown[]) => {
    const chain = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(async () => rows),
      then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
    };

    return chain;
  };

  return {
    ensureTestEnv: true,
    selectMock: vi.fn(() => createSelectChain(selectQueue.shift() ?? [])),
    dbAppendEventMock: vi.fn(async (_aggregateType, aggregateId, eventType) => ({
      id: `evt-${eventType}`,
      aggregateType: "subscription",
      aggregateId,
      eventType,
      payload: {},
      version: 1,
      timestamp: new Date("2026-01-10T00:00:00.000Z").toISOString(),
    })),
    dbGetAggregateEventsMock: vi.fn<
      () => Promise<
        Array<{
          id: string;
          aggregateType: string;
          aggregateId: string;
          eventType: string;
          payload: Record<string, unknown>;
          version: number;
          timestamp: string;
        }>
      >
    >(async () => []),
    getProjectionCheckpointMock: vi.fn<() => unknown | null>(() => null),
    upsertProjectionCheckpointMock: vi.fn(),
    activateSubscriptionMock: vi.fn(),
    cancelSubscriptionMock: vi.fn(),
    pauseSubscriptionMock: vi.fn(),
    renewSubscriptionMock: vi.fn(),
    resumeSubscriptionMock: vi.fn(),
    queueSelect: (...rows: unknown[][]) => {
      selectQueue.push(...rows);
    },
  };
});

void ensureTestEnv;

vi.mock("../../../db/index.js", () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock("../../../events/dbEventStore.js", () => ({
  dbAppendEvent: dbAppendEventMock,
  dbGetAggregateEvents: dbGetAggregateEventsMock,
}));

vi.mock("../../../events/projectionCheckpointStore.js", () => ({
  getProjectionCheckpoint: getProjectionCheckpointMock,
  upsertProjectionCheckpoint: upsertProjectionCheckpointMock,
}));

vi.mock("../subscription-service.js", () => ({
  activateSubscription: activateSubscriptionMock,
  cancelSubscription: cancelSubscriptionMock,
  pauseSubscription: pauseSubscriptionMock,
  renewSubscription: renewSubscriptionMock,
  resumeSubscription: resumeSubscriptionMock,
}));

vi.mock("../../../db/schema/index.js", () => ({
  subscriptions: {
    tenantId: "subscriptions.tenantId",
    id: "subscriptions.id",
    deletedAt: "subscriptions.deletedAt",
  },
  subscriptionTemplates: {
    tenantId: "subscriptionTemplates.tenantId",
    id: "subscriptionTemplates.id",
    deletedAt: "subscriptionTemplates.deletedAt",
  },
  subscriptionLines: {
    tenantId: "subscriptionLines.tenantId",
    subscriptionId: "subscriptionLines.subscriptionId",
  },
  subscriptionCloseReasons: {
    tenantId: "subscriptionCloseReasons.tenantId",
    id: "subscriptionCloseReasons.id",
    deletedAt: "subscriptionCloseReasons.deletedAt",
  },
}));

import {
  activateSubscriptionCommand,
  cancelSubscriptionCommand,
  pauseSubscriptionCommand,
  renewSubscriptionCommand,
  resumeSubscriptionCommand,
} from "../subscription-command-service.js";
import { ProjectionDriftError } from "../../../events/projectionRuntime.js";

const baseSubscription = {
  id: "sub-1",
  tenantId: 7,
  status: "draft",
  templateId: "tpl-1",
  dateStart: new Date("2026-01-01T00:00:00.000Z"),
  nextInvoiceDate: new Date("2026-01-15T00:00:00.000Z"),
  lastInvoicedAt: null,
  dateEnd: null,
  recurringTotal: "100.00",
  mrr: "100.00",
  arr: "1200.00",
  closeReasonId: null,
  updatedBy: 1,
  deletedAt: null,
};

const baseTemplate = {
  id: "tpl-1",
  tenantId: 7,
  billingPeriod: "monthly",
  billingDay: 15,
  renewalPeriod: 1,
  deletedAt: null,
};

const baseLine = {
  id: "line-1",
  tenantId: 7,
  subscriptionId: "sub-1",
  productId: "prod-1",
  quantity: "1",
  priceUnit: "100.00",
  discount: "0.00",
  subtotal: "100.00",
};

function queueActivateReads(subscription = baseSubscription): void {
  queueSelect([subscription], [baseTemplate], [baseLine], [subscription]);
}

function queueCancelReads(subscription: typeof baseSubscription): void {
  queueSelect([subscription], [{ id: "reason-1", tenantId: 7, deletedAt: null }], [subscription]);
}

function queuePauseReads(subscription: typeof baseSubscription): void {
  queueSelect([subscription], [subscription]);
}

function queueResumeReads(subscription: typeof baseSubscription): void {
  queueSelect([subscription], [baseTemplate], [subscription]);
}

function queueRenewReads(subscription: typeof baseSubscription): void {
  queueSelect([subscription], [baseTemplate], [baseLine], [subscription]);
}

beforeEach(() => {
  vi.clearAllMocks();
  getProjectionCheckpointMock.mockReturnValue(null);
  dbGetAggregateEventsMock.mockResolvedValue([]);
});

describe("subscription command service", () => {
  it("runs activate command under event-only policy and appends event", async () => {
    queueActivateReads(baseSubscription);
    activateSubscriptionMock.mockResolvedValueOnce({
      subscription: { ...baseSubscription, status: "active" },
      lines: [baseLine],
      validation: { valid: true, errors: [], issues: [] },
    });

    const result = await activateSubscriptionCommand({
      tenantId: 7,
      subscriptionId: "sub-1",
      actorId: 42,
    });

    expect(result.subscription.status).toBe("active");
    expect(result.mutationPolicy).toBe("event-only");
    expect(result.event?.eventType).toBe("subscription.activated");
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "subscription",
      "sub-1",
      "subscription.activated",
      expect.any(Object),
      expect.objectContaining({
        actor: "42",
        source: "api.sales.subscriptions.activate",
      })
    );
    expect(upsertProjectionCheckpointMock).toHaveBeenCalledTimes(1);
    expect(upsertProjectionCheckpointMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectionName: "subscription.read_model",
        aggregateType: "subscription",
        aggregateId: "sub-1",
        lastAppliedVersion: 1,
      })
    );
  });

  it("runs cancel command under event-only policy and appends event", async () => {
    queueCancelReads({ ...baseSubscription, status: "active" });
    cancelSubscriptionMock.mockResolvedValueOnce({
      subscription: { ...baseSubscription, status: "cancelled" },
    });

    const result = await cancelSubscriptionCommand({
      tenantId: 7,
      subscriptionId: "sub-1",
      actorId: 51,
      closeReasonId: "reason-1",
    });

    expect(result.subscription.status).toBe("cancelled");
    expect(result.mutationPolicy).toBe("event-only");
    expect(result.event?.eventType).toBe("subscription.cancelled");
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "subscription",
      "sub-1",
      "subscription.cancelled",
      expect.any(Object),
      expect.objectContaining({
        actor: "51",
        source: "api.sales.subscriptions.cancel",
      })
    );
    expect(upsertProjectionCheckpointMock).toHaveBeenCalledTimes(1);
    expect(upsertProjectionCheckpointMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectionName: "subscription.read_model",
        aggregateType: "subscription",
        aggregateId: "sub-1",
        lastAppliedVersion: 1,
      })
    );
  });

  it("runs pause command under event-only policy and appends event", async () => {
    queuePauseReads({ ...baseSubscription, status: "active" });
    pauseSubscriptionMock.mockResolvedValueOnce({
      subscription: { ...baseSubscription, status: "paused" },
    });

    const result = await pauseSubscriptionCommand({
      tenantId: 7,
      subscriptionId: "sub-1",
      actorId: 53,
      reason: "past due",
    });

    expect(result.subscription.status).toBe("paused");
    expect(result.mutationPolicy).toBe("event-only");
    expect(result.event?.eventType).toBe("subscription.paused");
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "subscription",
      "sub-1",
      "subscription.paused",
      expect.any(Object),
      expect.objectContaining({
        actor: "53",
        source: "api.sales.subscriptions.pause",
      })
    );
    expect(upsertProjectionCheckpointMock).toHaveBeenCalledTimes(1);
    expect(upsertProjectionCheckpointMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectionName: "subscription.read_model",
        aggregateType: "subscription",
        aggregateId: "sub-1",
        lastAppliedVersion: 1,
      })
    );
  });

  it("runs resume command under event-only policy and appends event", async () => {
    queueResumeReads({ ...baseSubscription, status: "paused" });
    resumeSubscriptionMock.mockResolvedValueOnce({
      subscription: { ...baseSubscription, status: "active" },
    });

    const result = await resumeSubscriptionCommand({
      tenantId: 7,
      subscriptionId: "sub-1",
      actorId: 54,
      reason: "payment resolved",
      paymentResolved: true,
    });

    expect(result.subscription.status).toBe("active");
    expect(result.mutationPolicy).toBe("event-only");
    expect(result.event?.eventType).toBe("subscription.activated");
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "subscription",
      "sub-1",
      "subscription.activated",
      expect.any(Object),
      expect.objectContaining({
        actor: "54",
        source: "api.sales.subscriptions.resume",
      })
    );
    expect(upsertProjectionCheckpointMock).toHaveBeenCalledTimes(1);
    expect(upsertProjectionCheckpointMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectionName: "subscription.read_model",
        aggregateType: "subscription",
        aggregateId: "sub-1",
        lastAppliedVersion: 1,
      })
    );
  });

  it("runs renew command under event-only policy and appends event", async () => {
    queueRenewReads({ ...baseSubscription, status: "active" });
    renewSubscriptionMock.mockResolvedValueOnce({
      subscription: { ...baseSubscription, status: "active" },
    });

    const result = await renewSubscriptionCommand({
      tenantId: 7,
      subscriptionId: "sub-1",
      actorId: 55,
      reason: "manual renewal",
    });

    expect(result.subscription.status).toBe("active");
    expect(result.mutationPolicy).toBe("event-only");
    expect(result.event?.eventType).toBe("subscription.direct_update");
    expect(dbAppendEventMock).toHaveBeenCalledWith(
      "subscription",
      "sub-1",
      "subscription.direct_update",
      expect.any(Object),
      expect.objectContaining({
        actor: "55",
        source: "api.sales.subscriptions.renew",
      })
    );
    expect(upsertProjectionCheckpointMock).toHaveBeenCalledTimes(1);
    expect(upsertProjectionCheckpointMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectionName: "subscription.read_model",
        aggregateType: "subscription",
        aggregateId: "sub-1",
        lastAppliedVersion: 1,
      })
    );
  });

  it("captures promotion-readiness evidence for all subscription command paths", async () => {
    const scenarios = [
      {
        name: "activate",
        arrange: () => {
          queueActivateReads(baseSubscription);
          activateSubscriptionMock.mockResolvedValueOnce({
            subscription: { ...baseSubscription, status: "active" },
            lines: [baseLine],
            validation: { valid: true, errors: [], issues: [] },
          });
          dbAppendEventMock.mockResolvedValueOnce({
            id: "evt-sub-activate",
            aggregateType: "subscription",
            aggregateId: "sub-1",
            eventType: "subscription.activated",
            payload: {},
            version: 11,
            timestamp: "2026-03-28T10:00:00.000Z",
          });

          return activateSubscriptionCommand({
            tenantId: 7,
            subscriptionId: "sub-1",
            actorId: 42,
          });
        },
      },
      {
        name: "cancel",
        arrange: () => {
          queueCancelReads({ ...baseSubscription, status: "active" });
          cancelSubscriptionMock.mockResolvedValueOnce({
            subscription: { ...baseSubscription, status: "cancelled" },
          });
          dbAppendEventMock.mockResolvedValueOnce({
            id: "evt-sub-cancel",
            aggregateType: "subscription",
            aggregateId: "sub-1",
            eventType: "subscription.cancelled",
            payload: {},
            version: 12,
            timestamp: "2026-03-28T10:05:00.000Z",
          });

          return cancelSubscriptionCommand({
            tenantId: 7,
            subscriptionId: "sub-1",
            actorId: 51,
            closeReasonId: "reason-1",
          });
        },
      },
      {
        name: "pause",
        arrange: () => {
          queuePauseReads({ ...baseSubscription, status: "active" });
          pauseSubscriptionMock.mockResolvedValueOnce({
            subscription: { ...baseSubscription, status: "paused" },
          });
          dbAppendEventMock.mockResolvedValueOnce({
            id: "evt-sub-pause",
            aggregateType: "subscription",
            aggregateId: "sub-1",
            eventType: "subscription.paused",
            payload: {},
            version: 13,
            timestamp: "2026-03-28T10:10:00.000Z",
          });

          return pauseSubscriptionCommand({
            tenantId: 7,
            subscriptionId: "sub-1",
            actorId: 53,
            reason: "past due",
          });
        },
      },
      {
        name: "resume",
        arrange: () => {
          queueResumeReads({ ...baseSubscription, status: "paused" });
          resumeSubscriptionMock.mockResolvedValueOnce({
            subscription: { ...baseSubscription, status: "active" },
          });
          dbAppendEventMock.mockResolvedValueOnce({
            id: "evt-sub-resume",
            aggregateType: "subscription",
            aggregateId: "sub-1",
            eventType: "subscription.activated",
            payload: {},
            version: 14,
            timestamp: "2026-03-28T10:15:00.000Z",
          });

          return resumeSubscriptionCommand({
            tenantId: 7,
            subscriptionId: "sub-1",
            actorId: 54,
            paymentResolved: true,
            reason: "payment resolved",
          });
        },
      },
      {
        name: "renew",
        arrange: () => {
          queueRenewReads({ ...baseSubscription, status: "active" });
          renewSubscriptionMock.mockResolvedValueOnce({
            subscription: { ...baseSubscription, status: "active" },
          });
          dbAppendEventMock.mockResolvedValueOnce({
            id: "evt-sub-renew",
            aggregateType: "subscription",
            aggregateId: "sub-1",
            eventType: "subscription.direct_update",
            payload: {},
            version: 15,
            timestamp: "2026-03-28T10:20:00.000Z",
          });

          return renewSubscriptionCommand({
            tenantId: 7,
            subscriptionId: "sub-1",
            actorId: 55,
            reason: "manual renewal",
          });
        },
      },
    ] as const;

    for (const scenario of scenarios) {
      const result = await scenario.arrange();
      const checkpoint = upsertProjectionCheckpointMock.mock.calls.at(-1)?.[0];

      expect(
        result.mutationPolicy,
        `${scenario.name} should stay in event-only after promotion`
      ).toBe("event-only");
      expect(
        result.event,
        `${scenario.name} should append an event during event-only execution`
      ).toBeDefined();
      expect(checkpoint).toEqual(
        expect.objectContaining({
          projectionName: "subscription.read_model",
          aggregateType: "subscription",
          aggregateId: "sub-1",
          lastAppliedVersion: result.event?.version,
          updatedAt: result.event?.timestamp,
        })
      );
    }
  });

  it("fails fast when the subscription projection checkpoint is stale", async () => {
    queuePauseReads({ ...baseSubscription, status: "active" });
    getProjectionCheckpointMock.mockReturnValue({
      projectionName: "subscription.read_model",
      aggregateType: "subscription",
      aggregateId: "sub-1",
      lastAppliedVersion: 2,
      projectionVersion: 1,
      schemaHash: "subscription_read_model_v1",
      updatedAt: new Date("2026-03-27T00:00:00.000Z").toISOString(),
    });
    dbGetAggregateEventsMock.mockResolvedValue([
      {
        id: "evt-stale-subscription",
        aggregateType: "subscription",
        aggregateId: "sub-1",
        eventType: "subscription.activated",
        payload: {},
        version: 4,
        timestamp: new Date("2026-03-28T12:00:00.000Z").toISOString(),
      },
    ]);

    await expect(
      pauseSubscriptionCommand({
        tenantId: 7,
        subscriptionId: "sub-1",
        actorId: 53,
        reason: "past due",
      })
    ).rejects.toBeInstanceOf(ProjectionDriftError);

    expect(dbAppendEventMock).not.toHaveBeenCalled();
    expect(pauseSubscriptionMock).not.toHaveBeenCalled();
  });
});
