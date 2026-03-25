const DEFAULT_NOTIFICATION_TOAST_DEDUPE_MS = 2500;
const MAX_NOTIFICATION_TOAST_DEDUPE_MS = 60_000;
const DEFAULT_PERMISSIONS_BOOTSTRAP_ENDPOINT = "/meta/bootstrap";
const DEFAULT_ANALYTICS_BATCH_SIZE = 20;
const MAX_ANALYTICS_BATCH_SIZE = 100;
const DEFAULT_ANALYTICS_FLUSH_INTERVAL_MS = 5000;
const MAX_ANALYTICS_FLUSH_INTERVAL_MS = 60_000;

const VALID_ANALYTICS_PROVIDERS = ["console", "posthog", "mixpanel", "datadog"] as const;
type AnalyticsProvider = (typeof VALID_ANALYTICS_PROVIDERS)[number];

export interface AppConfig {
  isDev: boolean;
  isTest: boolean;
  notificationToastDedupeMs: number;
  permissionsBootstrapEndpoint: string;
  analyticsProviders: AnalyticsProvider[];
  analyticsBatchSize: number;
  analyticsFlushIntervalMs: number;
}

interface AppRuntimeEnv {
  DEV?: boolean;
  MODE?: string;
  VITE_NOTIFICATION_TOAST_DEDUPE_MS?: string;
  VITE_PERMISSIONS_BOOTSTRAP_ENDPOINT?: string;
  VITE_ANALYTICS_PROVIDERS?: string;
  VITE_ANALYTICS_BATCH_SIZE?: string;
  VITE_ANALYTICS_FLUSH_INTERVAL_MS?: string;
}

export function parseNotificationToastDedupeMs(rawValue: string | undefined): number {
  if (!rawValue) {
    return DEFAULT_NOTIFICATION_TOAST_DEDUPE_MS;
  }

  const parsed = Number(rawValue);
  if (Number.isNaN(parsed)) {
    return DEFAULT_NOTIFICATION_TOAST_DEDUPE_MS;
  }

  return Math.min(Math.max(parsed, 0), MAX_NOTIFICATION_TOAST_DEDUPE_MS);
}

export function parsePermissionsBootstrapEndpoint(rawValue: string | undefined): string {
  if (!rawValue) {
    return DEFAULT_PERMISSIONS_BOOTSTRAP_ENDPOINT;
  }

  const sanitized = rawValue.trim();
  return sanitized || DEFAULT_PERMISSIONS_BOOTSTRAP_ENDPOINT;
}

export function parseAnalyticsProviders(
  rawValue: string | undefined,
  options?: { isDev?: boolean; isTest?: boolean }
): AnalyticsProvider[] {
  if (!rawValue) {
    if (options?.isTest) {
      return [];
    }

    return options?.isDev ? ["console"] : [];
  }

  const allowed = new Set<string>(VALID_ANALYTICS_PROVIDERS);
  const values = rawValue
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is AnalyticsProvider => value.length > 0 && allowed.has(value));

  return Array.from(new Set(values));
}

export function parseAnalyticsBatchSize(rawValue: string | undefined): number {
  if (!rawValue) {
    return DEFAULT_ANALYTICS_BATCH_SIZE;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_ANALYTICS_BATCH_SIZE;
  }

  return Math.min(Math.max(Math.floor(parsed), 1), MAX_ANALYTICS_BATCH_SIZE);
}

export function parseAnalyticsFlushIntervalMs(rawValue: string | undefined): number {
  if (!rawValue) {
    return DEFAULT_ANALYTICS_FLUSH_INTERVAL_MS;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_ANALYTICS_FLUSH_INTERVAL_MS;
  }

  return Math.min(Math.max(Math.floor(parsed), 250), MAX_ANALYTICS_FLUSH_INTERVAL_MS);
}

export function getAppConfig(env: AppRuntimeEnv = import.meta.env): AppConfig {
  const isTest = env.MODE === "test";

  if (env.DEV && env.VITE_NOTIFICATION_TOAST_DEDUPE_MS !== undefined) {
    const raw = env.VITE_NOTIFICATION_TOAST_DEDUPE_MS;
    if (Number.isNaN(Number(raw)) || raw.trim() === "") {
      console.warn(
        `[AppConfig] Invalid VITE_NOTIFICATION_TOAST_DEDUPE_MS: "${raw}", using default (${DEFAULT_NOTIFICATION_TOAST_DEDUPE_MS}ms)`
      );
    }
  }

  return {
    isDev: Boolean(env.DEV),
    isTest,
    notificationToastDedupeMs: parseNotificationToastDedupeMs(
      env.VITE_NOTIFICATION_TOAST_DEDUPE_MS
    ),
    permissionsBootstrapEndpoint: parsePermissionsBootstrapEndpoint(
      env.VITE_PERMISSIONS_BOOTSTRAP_ENDPOINT
    ),
    analyticsProviders: parseAnalyticsProviders(env.VITE_ANALYTICS_PROVIDERS, {
      isDev: Boolean(env.DEV),
      isTest,
    }),
    analyticsBatchSize: parseAnalyticsBatchSize(env.VITE_ANALYTICS_BATCH_SIZE),
    analyticsFlushIntervalMs: parseAnalyticsFlushIntervalMs(env.VITE_ANALYTICS_FLUSH_INTERVAL_MS),
  };
}
