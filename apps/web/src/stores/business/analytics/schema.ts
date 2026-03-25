export const ANALYTICS_PROVIDER_IDS = ["console", "posthog", "mixpanel", "datadog"] as const;

export type AnalyticsProviderId = (typeof ANALYTICS_PROVIDER_IDS)[number];

export type AnalyticsDomain =
  | "auth"
  | "ui"
  | "erp"
  | "system"
  | "permissions"
  | "custom";

export type AnalyticsOutcome = "success" | "error" | "unknown";

export type AnalyticsFlushReason = "size" | "interval" | "manual" | "metadata" | "pagehide" | "retry";

export interface AnalyticsMetaConfig {
  enabled?: boolean;
  event?: string;
  category?: string;
  label?: string;
  domain?: AnalyticsDomain;
  module?: string;
  feature?: string;
  operation?: string;
  outcome?: AnalyticsOutcome;
  providers?: AnalyticsProviderId[];
  tags?: string[];
  properties?: Record<string, unknown>;
  immediate?: boolean;
  flush?: boolean;
}

export interface AnalyticsActionMeta {
  analytics?: boolean | AnalyticsMetaConfig;
  model?: string;
  recordId?: string | number;
  viewId?: string;
  module?: string;
  category?: string;
  label?: string;
}

export interface AnalyticsAction {
  type: string;
  payload?: unknown;
  meta?: AnalyticsActionMeta;
  error?: unknown;
}

export interface AnalyticsContext {
  userId: string | null;
  role: string | null;
  isAuthenticated: boolean;
  permissionsBootstrapStatus?: string;
}

export interface ErpAnalyticsEvent {
  event: string;
  actionType: string;
  timestamp: string;
  domain: AnalyticsDomain;
  outcome: AnalyticsOutcome;
  userId: string | null;
  role: string | null;
  isAuthenticated: boolean;
  permissionsBootstrapStatus?: string;
  model?: string;
  recordId?: string;
  viewId?: string;
  module?: string;
  feature?: string;
  operation?: string;
  category?: string;
  label?: string;
  tags: string[];
  properties: Record<string, unknown>;
  providers?: AnalyticsProviderId[];
}

export interface AnalyticsTrackControl {
  immediate?: boolean;
  flush?: boolean;
}

export interface AnalyticsProviderAdapter {
  id: AnalyticsProviderId;
  track: (event: ErpAnalyticsEvent) => void | Promise<void>;
  trackBatch?: (events: ErpAnalyticsEvent[], reason: AnalyticsFlushReason) => void | Promise<void>;
  flush?: () => void | Promise<void>;
}

export interface AnalyticsClientConfig {
  providerIds: AnalyticsProviderId[];
  batchSize: number;
  flushIntervalMs: number;
  /** Maximum number of retry attempts on a failed flush. Default: 2. */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff between retries. Default: 300. */
  retryBaseDelayMs?: number;
}