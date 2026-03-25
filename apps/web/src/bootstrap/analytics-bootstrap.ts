/**
 * Analytics Bootstrap
 * ====================
 * Initialises the analytics client from runtime env vars at app startup.
 *
 * Call once before `ReactDOM.createRoot()` in main.tsx.
 *
 * Provider wiring per env tier:
 *   development  → console only          (VITE_ANALYTICS_PROVIDERS=console)
 *   staging      → console + posthog     (VITE_ANALYTICS_PROVIDERS=console,posthog)
 *   production   → posthog               (VITE_ANALYTICS_PROVIDERS=posthog)
 *
 * PostHog SDK:
 *   Option A (CDN):       add a <script> tag in index.html before the app bundle
 *   Option B (npm):       `pnpm add posthog-js` then `posthog.init(...)` before this call
 *   This module calls `posthog.init()` on the globalThis stub when VITE_POSTHOG_API_KEY
 *   is present, so either CDN or npm SDK will both work.
 */

import { getAppConfig } from "~/lib/app-config";
import {
  configureAnalyticsClient,
  createConsoleAnalyticsAdapter,
  createDatadogAnalyticsAdapter,
  createMixpanelAnalyticsAdapter,
  createPostHogAnalyticsAdapter,
  type AnalyticsProviderAdapter,
} from "~/stores/business/analytics";

/** Minimal PostHog surface we need for initialisation and capture. */
type PostHogGlobal = typeof globalThis & {
  posthog?: {
    init?: (apiKey: string, options?: Record<string, unknown>) => void;
    capture?: (event: string, properties?: Record<string, unknown>) => void;
    identify?: (userId: string, properties?: Record<string, unknown>) => void;
  };
};

export function bootstrapAnalytics(): void {
  const config = getAppConfig();

  if (config.analyticsProviders.length === 0) {
    return;
  }

  const providers: AnalyticsProviderAdapter[] = [];

  for (const providerId of config.analyticsProviders) {
    switch (providerId) {
      case "console": {
        providers.push(createConsoleAnalyticsAdapter());
        break;
      }
      case "posthog": {
        const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;
        const host = import.meta.env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com";

        if (apiKey) {
          const g = globalThis as PostHogGlobal;
          // Initialise the SDK if it is loaded (CDN or npm) but not yet inited.
          // Pass autocapture: false so only explicit capture() calls are tracked.
          g.posthog?.init?.(apiKey, {
            api_host: host,
            autocapture: false,
            capture_pageview: false,
          });
        }

        providers.push(createPostHogAnalyticsAdapter());
        break;
      }
      case "mixpanel": {
        providers.push(createMixpanelAnalyticsAdapter());
        break;
      }
      case "datadog": {
        providers.push(createDatadogAnalyticsAdapter());
        break;
      }
    }
  }

  configureAnalyticsClient({
    providers,
    providerIds: config.analyticsProviders,
    batchSize: config.analyticsBatchSize,
    flushIntervalMs: config.analyticsFlushIntervalMs,
  });
}
