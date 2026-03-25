import { getAppConfig } from "~/lib/app-config";

import { createDefaultAnalyticsProviders, dispatchAnalyticsBatch } from "./providers";
import type {
  AnalyticsClientConfig,
  AnalyticsFlushReason,
  AnalyticsProviderAdapter,
  AnalyticsTrackControl,
  ErpAnalyticsEvent,
} from "./schema";

const appConfig = getAppConfig();

/** localStorage key used for cross-navigation queue persistence. */
const ANALYTICS_STORAGE_KEY = "afenda_analytics_queue";

interface QueuedAnalyticsEvent {
  event: ErpAnalyticsEvent;
}

interface ConfigureAnalyticsClientOptions extends Partial<AnalyticsClientConfig> {
  providers?: AnalyticsProviderAdapter[];
}

const defaultAnalyticsClientConfig: AnalyticsClientConfig = {
  providerIds: appConfig.analyticsProviders,
  batchSize: appConfig.analyticsBatchSize,
  flushIntervalMs: appConfig.analyticsFlushIntervalMs,
  maxRetries: 2,
  retryBaseDelayMs: 300,
};

class AnalyticsClient {
  private config: AnalyticsClientConfig = { ...defaultAnalyticsClientConfig };
  private providers: AnalyticsProviderAdapter[] = createDefaultAnalyticsProviders();
  private queue: QueuedAnalyticsEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private lifecycleBound = false;
  private lifecycleListener: (() => void) | null = null;

  configure(options: ConfigureAnalyticsClientOptions = {}) {
    if (options.providers) {
      this.providers = options.providers;
    }

    this.config = {
      ...this.config,
      ...options,
      providerIds: options.providerIds ?? this.config.providerIds,
      batchSize: options.batchSize ?? this.config.batchSize,
      flushIntervalMs: options.flushIntervalMs ?? this.config.flushIntervalMs,
    };

    this.restorePersistedQueue();
    this.bindLifecycleFlush();
  }

  getQueueSize() {
    return this.queue.length;
  }

  async track(event: ErpAnalyticsEvent, control: AnalyticsTrackControl = {}): Promise<void> {
    this.bindLifecycleFlush();

    const normalizedEvent: ErpAnalyticsEvent = {
      ...event,
      providers: event.providers ?? this.config.providerIds,
    };

    if (!normalizedEvent.providers || normalizedEvent.providers.length === 0) {
      return;
    }

    if (control.immediate || this.config.batchSize <= 1) {
      await this.dispatchWithRetry([normalizedEvent], control.flush ? "metadata" : "manual");
      return;
    }

    this.queue.push({ event: normalizedEvent });
    this.persistQueue();

    if (this.queue.length >= this.config.batchSize) {
      await this.flush("size");
      return;
    }

    if (control.flush) {
      await this.flush("metadata");
      return;
    }

    this.scheduleFlush();
  }

  async flush(reason: AnalyticsFlushReason = "manual"): Promise<void> {
    this.clearTimer();

    if (this.queue.length === 0) {
      return;
    }

    const events = this.queue.map((entry) => entry.event);
    this.queue = [];
    this.clearPersistedQueue();

    await this.dispatchWithRetry(events, reason);
    await Promise.all(this.providers.map((provider) => provider.flush?.()));
  }

  resetForTests() {
    this.clearTimer();
    this.queue = [];
    this.providers = createDefaultAnalyticsProviders();
    this.config = { ...defaultAnalyticsClientConfig };
    this.clearPersistedQueue();

    if (this.lifecycleListener && typeof window !== "undefined") {
      window.removeEventListener("pagehide", this.lifecycleListener);
      this.lifecycleListener = null;
    }
    this.lifecycleBound = false;
  }

  /**
   * Dispatches a batch of events with exponential-backoff retry.
   * On exhaustion, re-queues events so the next scheduled flush will retry.
   */
  private async dispatchWithRetry(
    events: ErpAnalyticsEvent[],
    reason: AnalyticsFlushReason,
    attempt = 0
  ): Promise<void> {
    const maxAttempts = (this.config.maxRetries ?? 2) + 1;
    const baseDelay = this.config.retryBaseDelayMs ?? 300;

    try {
      await dispatchAnalyticsBatch(this.providers, events, reason);
    } catch {
      if (attempt < maxAttempts - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
        return this.dispatchWithRetry(events, "retry", attempt + 1);
      }
      // All retries exhausted — re-enqueue so the next interval flush retries.
      this.queue.unshift(...events.map((event) => ({ event })));
      this.persistQueue();
    }
  }

  /** Serialises the in-memory queue to localStorage for cross-navigation persistence. */
  private persistQueue(): void {
    if (typeof localStorage === "undefined" || this.queue.length === 0) {
      return;
    }
    try {
      localStorage.setItem(
        ANALYTICS_STORAGE_KEY,
        JSON.stringify(this.queue.map((entry) => entry.event))
      );
    } catch {
      // Storage quota exceeded or private-browsing restrictions — not fatal.
    }
  }

  private clearPersistedQueue(): void {
    if (typeof localStorage === "undefined") {
      return;
    }
    try {
      localStorage.removeItem(ANALYTICS_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  /**
   * Restores events that were persisted during a previous page session.
   * Called on `configure()` so recovered events are dispatched on the next flush.
   */
  private restorePersistedQueue(): void {
    if (typeof localStorage === "undefined") {
      return;
    }
    try {
      const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const events = JSON.parse(raw) as ErpAnalyticsEvent[];
      if (Array.isArray(events) && events.length > 0) {
        // Prepend so recovered events are sent before any new ones.
        this.queue.unshift(...events.map((event) => ({ event })));
      }
    } catch {
      this.clearPersistedQueue();
    }
  }

  private clearTimer() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private scheduleFlush() {
    if (this.flushTimer) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush("interval");
    }, this.config.flushIntervalMs);
  }

  private bindLifecycleFlush() {
    if (this.lifecycleBound || typeof window === "undefined") {
      return;
    }

    const flushOnPageHide = () => {
      void this.flush("pagehide");
    };

    this.lifecycleListener = flushOnPageHide;
    window.addEventListener("pagehide", flushOnPageHide);
    this.lifecycleBound = true;
  }
}

const analyticsClient = new AnalyticsClient();

export function configureAnalyticsClient(options: ConfigureAnalyticsClientOptions = {}) {
  analyticsClient.configure(options);
}

export function trackAnalyticsEvent(event: ErpAnalyticsEvent, control?: AnalyticsTrackControl) {
  return analyticsClient.track(event, control);
}

export function flushAnalytics(reason?: AnalyticsFlushReason) {
  return analyticsClient.flush(reason);
}

export function getAnalyticsQueueSize() {
  return analyticsClient.getQueueSize();
}

export function resetAnalyticsClientForTests() {
  analyticsClient.resetForTests();
}
