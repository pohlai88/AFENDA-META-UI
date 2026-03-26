import type { AnalyticsFlushReason, AnalyticsProviderAdapter, ErpAnalyticsEvent } from "./schema";

type AnalyticsGlobal = typeof globalThis & {
  posthog?: {
    capture?: (event: string, properties?: Record<string, unknown>) => void;
  };
  mixpanel?: {
    track?: (event: string, properties?: Record<string, unknown>) => void;
  };
  DD_RUM?: {
    addAction?: (name: string, context?: Record<string, unknown>) => void;
  };
};

function toProviderProperties(event: ErpAnalyticsEvent): Record<string, unknown> {
  return {
    actionType: event.actionType,
    domain: event.domain,
    outcome: event.outcome,
    userId: event.userId,
    role: event.role,
    isAuthenticated: event.isAuthenticated,
    permissionsBootstrapStatus: event.permissionsBootstrapStatus,
    model: event.model,
    recordId: event.recordId,
    viewId: event.viewId,
    module: event.module,
    feature: event.feature,
    operation: event.operation,
    category: event.category,
    label: event.label,
    tags: event.tags,
    ...event.properties,
  };
}

export function createConsoleAnalyticsAdapter(
  logger: (label: string, payload: unknown) => void = console.warn
): AnalyticsProviderAdapter {
  return {
    id: "console",
    track: (event) => {
      logger("[ANALYTICS]", event);
    },
    trackBatch: (events, reason) => {
      logger("[ANALYTICS_BATCH]", { reason, events });
    },
  };
}

export function createPostHogAnalyticsAdapter(
  analyticsGlobal: AnalyticsGlobal = globalThis as AnalyticsGlobal
): AnalyticsProviderAdapter {
  return {
    id: "posthog",
    track: (event) => {
      analyticsGlobal.posthog?.capture?.(event.event, toProviderProperties(event));
    },
  };
}

export function createMixpanelAnalyticsAdapter(
  analyticsGlobal: AnalyticsGlobal = globalThis as AnalyticsGlobal
): AnalyticsProviderAdapter {
  return {
    id: "mixpanel",
    track: (event) => {
      analyticsGlobal.mixpanel?.track?.(event.event, toProviderProperties(event));
    },
  };
}

export function createDatadogAnalyticsAdapter(
  analyticsGlobal: AnalyticsGlobal = globalThis as AnalyticsGlobal
): AnalyticsProviderAdapter {
  return {
    id: "datadog",
    track: (event) => {
      analyticsGlobal.DD_RUM?.addAction?.(event.event, toProviderProperties(event));
    },
  };
}

export function createDefaultAnalyticsProviders(): AnalyticsProviderAdapter[] {
  return [
    createConsoleAnalyticsAdapter(),
    createPostHogAnalyticsAdapter(),
    createMixpanelAnalyticsAdapter(),
    createDatadogAnalyticsAdapter(),
  ];
}

export async function dispatchAnalyticsBatch(
  providers: AnalyticsProviderAdapter[],
  events: ErpAnalyticsEvent[],
  reason: AnalyticsFlushReason
): Promise<void> {
  const dispatches = providers.map(async (provider) => {
    const providerEvents = events.filter(
      (event) => !event.providers || event.providers.includes(provider.id)
    );

    if (providerEvents.length === 0) {
      return;
    }

    if (providerEvents.length > 1 && provider.trackBatch) {
      await provider.trackBatch(providerEvents, reason);
      return;
    }

    await Promise.all(providerEvents.map((event) => provider.track(event)));
  });

  await Promise.all(dispatches);
}
