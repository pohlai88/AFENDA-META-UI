/// <reference types="vite/client" />

interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  /** API base URL for backend requests */
  readonly VITE_API_URL: string;
  /** Application display title */
  readonly VITE_APP_TITLE: string;
  /** Current environment identifier (development | production | staging) */
  readonly VITE_APP_ENV: string;
  /** Dedupe window for repeated notification toasts in milliseconds */
  readonly VITE_NOTIFICATION_TOAST_DEDUPE_MS?: string;
  /** Permissions bootstrap endpoint */
  readonly VITE_PERMISSIONS_BOOTSTRAP_ENDPOINT?: string;
  /** Comma-separated analytics providers: console,posthog,mixpanel,datadog */
  readonly VITE_ANALYTICS_PROVIDERS?: string;
  /** Max analytics events buffered before a flush */
  readonly VITE_ANALYTICS_BATCH_SIZE?: string;
  /** Analytics flush interval in milliseconds */
  readonly VITE_ANALYTICS_FLUSH_INTERVAL_MS?: string;
  /** PostHog project API key — set via CI/CD secrets in production */
  readonly VITE_POSTHOG_API_KEY?: string;
  /** PostHog ingest host (default: https://us.i.posthog.com) */
  readonly VITE_POSTHOG_HOST?: string;
  /** Log level for frontend logger (trace|debug|info|warn|error|fatal) */
  readonly VITE_LOG_LEVEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
