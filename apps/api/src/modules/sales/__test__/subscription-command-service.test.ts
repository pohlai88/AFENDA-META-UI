import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureTestEnv,
  selectMock,
  dbAppendEventMock,
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
}));

vi.mock("../../../events/projectionCheckpointStore.js", () => ({
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
}));

import {
  activateSubscriptionCommand,
  cancelSubscriptionCommand,
  pauseSubscriptionCommand,
  renewSubscriptionCommand,
  resumeSubscriptionCommand,
} from "../subscription-command-service.js";

const baseSubscription = {
  id: "sub-1",
  tenantId: 7,
  status: "draft",
  templateId: "tpl-1",
  deletedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("subscription command service", () => {
  it("runs activate command under dual-write policy and appends event", async () => {
    queueSelect([baseSubscription]);
    activateSubscriptionMock.mockResolvedValueOnce({
      subscription: { ...baseSubscription, status: "active" },
      lines: [],
      validation: { valid: true, errors: [], issues: [] },
    });

    const result = await activateSubscriptionCommand({
      tenantId: 7,
      subscriptionId: "sub-1",
      actorId: 42,
    });

    expect(result.subscription.status).toBe("active");
    expect(result.mutationPolicy).toBe("dual-write");
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

  it("runs cancel command under dual-write policy and appends event", async () => {
    queueSelect([{ ...baseSubscription, status: "active" }]);
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
    expect(result.mutationPolicy).toBe("dual-write");
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

  it("runs pause command under dual-write policy and appends event", async () => {
    queueSelect([{ ...baseSubscription, status: "active" }]);
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
    expect(result.mutationPolicy).toBe("dual-write");
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

  it("runs resume command under dual-write policy and appends event", async () => {
    queueSelect([{ ...baseSubscription, status: "paused" }]);
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
    expect(result.mutationPolicy).toBe("dual-write");
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

  it("runs renew command under dual-write policy and appends event", async () => {
    queueSelect([{ ...baseSubscription, status: "active" }]);
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
    expect(result.mutationPolicy).toBe("dual-write");
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
});
