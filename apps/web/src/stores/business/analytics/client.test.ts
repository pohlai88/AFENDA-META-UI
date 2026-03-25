import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  configureAnalyticsClient,
  flushAnalytics,
  getAnalyticsQueueSize,
  resetAnalyticsClientForTests,
  trackAnalyticsEvent,
} from ".";
import type { AnalyticsProviderAdapter, ErpAnalyticsEvent } from "./schema";

function createEvent(overrides: Partial<ErpAnalyticsEvent> = {}): ErpAnalyticsEvent {
  return {
    event: "erp.invoiceApproved",
    actionType: "erp/invoiceApproved",
    timestamp: new Date().toISOString(),
    domain: "erp",
    outcome: "success",
    userId: "u-1",
    role: "manager",
    isAuthenticated: true,
    permissionsBootstrapStatus: "ready",
    tags: [],
    properties: {},
    ...overrides,
  };
}

describe("analytics client", () => {
  let tracked: string[];
  let batched: Array<{ reason: string; size: number }>;

  beforeEach(() => {
    tracked = [];
    batched = [];

    configureAnalyticsClient({
      providers: [
        {
          id: "console",
          track: (event) => {
            tracked.push(event.event);
          },
          trackBatch: (events, reason) => {
            batched.push({ reason, size: events.length });
          },
        } satisfies AnalyticsProviderAdapter,
      ],
      providerIds: ["console"],
      batchSize: 2,
      flushIntervalMs: 1000,
    });
  });

  afterEach(async () => {
    await flushAnalytics();
    resetAnalyticsClientForTests();
  });

  it("queues events until the batch threshold is reached", async () => {
    await trackAnalyticsEvent(createEvent({ event: "first" }));

    expect(getAnalyticsQueueSize()).toBe(1);
    expect(tracked).toEqual([]);

    await trackAnalyticsEvent(createEvent({ event: "second" }));

    expect(getAnalyticsQueueSize()).toBe(0);
    expect(batched).toEqual([{ reason: "size", size: 2 }]);
  });

  it("flushes queued events on demand", async () => {
    await trackAnalyticsEvent(createEvent({ event: "queued" }));

    await flushAnalytics("manual");

    expect(tracked).toEqual(["queued"]);
    expect(batched).toEqual([]);
  });

  it("sends immediate events without using the queue", async () => {
    await trackAnalyticsEvent(createEvent({ event: "immediate" }), { immediate: true });

    expect(tracked).toEqual(["immediate"]);
    expect(getAnalyticsQueueSize()).toBe(0);
  });

  it("respects provider routing on the event payload", async () => {
    await trackAnalyticsEvent(createEvent({ event: "skip", providers: ["posthog"] }), {
      immediate: true,
    });

    expect(tracked).toEqual([]);
  });
});

describe("analytics client — offline persistence", () => {
  beforeEach(() => {
    localStorage.clear();

    configureAnalyticsClient({
      providers: [
        {
          id: "console",
          track: vi.fn(),
        } satisfies AnalyticsProviderAdapter,
      ],
      providerIds: ["console"],
      batchSize: 10,
      flushIntervalMs: 60_000,
    });
  });

  afterEach(async () => {
    await flushAnalytics();
    resetAnalyticsClientForTests();
    localStorage.clear();
  });

  it("writes queued events to localStorage", async () => {
    await trackAnalyticsEvent(createEvent({ event: "persisted" }));

    const raw = localStorage.getItem("afenda_analytics_queue");
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw!) as Array<{ event: string }>;
    expect(stored[0].event).toBe("persisted");
  });

  it("clears localStorage after a successful flush", async () => {
    await trackAnalyticsEvent(createEvent({ event: "flush-me" }));
    expect(localStorage.getItem("afenda_analytics_queue")).not.toBeNull();

    await flushAnalytics("manual");

    expect(localStorage.getItem("afenda_analytics_queue")).toBeNull();
  });

  it("restores persisted events from a previous session on configure", async () => {
    // Simulate events left from a previous session
    const staleEvents: Array<Record<string, unknown>> = [
      { ...createEvent({ event: "stale-event" }) },
    ];
    localStorage.setItem("afenda_analytics_queue", JSON.stringify(staleEvents));

    // resetForTests clears the queue but not localStorage (we set it manually)
    // Calling configureAnalyticsClient triggers restorePersistedQueue
    configureAnalyticsClient({ batchSize: 10 });

    expect(getAnalyticsQueueSize()).toBe(1);
  });
});

describe("analytics client — retry / backoff", () => {
  let trackAttempts: number;
  let failingProvider: AnalyticsProviderAdapter;

  beforeEach(() => {
    localStorage.clear();
    trackAttempts = 0;

    failingProvider = {
      id: "console",
      track: (_event) => {
        trackAttempts += 1;
        throw new Error("provider unavailable");
      },
    };

    vi.useFakeTimers();

    configureAnalyticsClient({
      providers: [failingProvider],
      providerIds: ["console"],
      batchSize: 10,
      flushIntervalMs: 60_000,
      maxRetries: 2,
      retryBaseDelayMs: 100,
    });
  });

  afterEach(async () => {
    vi.useRealTimers();
    resetAnalyticsClientForTests();
    localStorage.clear();
  });

  it("retries on dispatch failure and re-queues on exhaustion", async () => {
    await trackAnalyticsEvent(createEvent({ event: "retry-me" }));

    // Flush triggers dispatch → fails → retries with backoff → re-queues
    const flushPromise = flushAnalytics("manual");

    // Advance through both retry delays (100ms, 200ms)
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);

    await flushPromise;

    // 1 initial attempt + 2 retries = 3 total
    expect(trackAttempts).toBe(3);
    // Events re-queued so next flush can retry
    expect(getAnalyticsQueueSize()).toBe(1);
  });
});
