/**
 * Analytics Middleware
 * ====================
 * Redux middleware for tracking user actions to analytics.
 * 
 * Features:
 * - Pattern-based action tracking
 * - Metadata-driven event enrichment
 * - User and session context capture
 * - Provider-agnostic analytics output
 * - Batching and flush controls via analytics client
 */

import { type Middleware } from "@reduxjs/toolkit";
import { trackAnalyticsEvent } from "../analytics";
import type {
  AnalyticsAction,
  AnalyticsActionMeta,
  AnalyticsDomain,
  AnalyticsMetaConfig,
  AnalyticsOutcome,
  ErpAnalyticsEvent,
} from "../analytics";

export const ANALYTICS_TRACK_PATTERNS: TrackPattern[] = [
  /^auth\//,
  /^permissions\//,
  /^erp\//,
  /^ui\//,
];

function isAnalyticsAction(action: unknown): action is AnalyticsAction {
  return typeof action === "object" && action !== null && "type" in action;
}

function shouldTrackByMeta(meta: AnalyticsActionMeta | undefined): boolean | null {
  if (meta?.analytics === true) {
    return true;
  }

  if (meta?.analytics === false) {
    return false;
  }

  if (typeof meta?.analytics === "object") {
    return true;
  }

  return null;
}

export function shouldTrackAnalytics(action: AnalyticsAction): boolean {
  const metaDecision = shouldTrackByMeta(action.meta);

  if (metaDecision !== null) {
    return metaDecision;
  }

  return ANALYTICS_TRACK_PATTERNS.some((pattern) => pattern.test(action.type));
}

type TrackPattern = RegExp;

function getAnalyticsConfig(meta: AnalyticsActionMeta | undefined): AnalyticsMetaConfig | undefined {
  return typeof meta?.analytics === "object" ? meta.analytics : undefined;
}

function deriveAnalyticsDomain(actionType: string, config?: AnalyticsMetaConfig): AnalyticsDomain {
  if (config?.domain) {
    return config.domain;
  }

  const namespace = actionType.split("/")[0];
  switch (namespace) {
    case "auth":
      return "auth";
    case "ui":
      return "ui";
    case "erp":
      return "erp";
    case "permissions":
      return "permissions";
    default:
      return "custom";
  }
}

function deriveAnalyticsOutcome(action: AnalyticsAction, config?: AnalyticsMetaConfig): AnalyticsOutcome {
  if (config?.outcome) {
    return config.outcome;
  }

  if (action.error || /(failure|error|rejected|denied)$/i.test(action.type)) {
    return "error";
  }

  if (/(success|fulfilled|approved|completed)$/i.test(action.type)) {
    return "success";
  }

  return "unknown";
}

export function buildAnalyticsEvent(action: AnalyticsAction, state: Record<string, unknown>): ErpAnalyticsEvent {
  const authState = (state.auth ?? {}) as {
    user?: { id?: string; role?: string } | null;
    isAuthenticated?: boolean;
  };
  const permissionsState = (state.permissions ?? {}) as {
    bootstrapStatus?: string;
  };
  const analyticsMeta = getAnalyticsConfig(action.meta);

  return {
    event: analyticsMeta?.event ?? action.type,
    actionType: action.type,
    timestamp: new Date().toISOString(),
    domain: deriveAnalyticsDomain(action.type, analyticsMeta),
    outcome: deriveAnalyticsOutcome(action, analyticsMeta),
    userId: authState.user?.id ?? null,
    role: authState.user?.role ?? null,
    isAuthenticated: Boolean(authState.isAuthenticated),
    model: action.meta?.model,
    recordId: action.meta?.recordId != null ? String(action.meta.recordId) : undefined,
    viewId: action.meta?.viewId,
    module: analyticsMeta?.module ?? action.meta?.module,
    feature: analyticsMeta?.feature,
    operation: analyticsMeta?.operation,
    category: analyticsMeta?.category ?? action.meta?.category ?? deriveAnalyticsDomain(action.type, analyticsMeta),
    label: analyticsMeta?.label ?? action.meta?.label,
    tags: analyticsMeta?.tags ?? [],
    properties: analyticsMeta?.properties ?? {},
    providers: analyticsMeta?.providers,
    permissionsBootstrapStatus: permissionsState.bootstrapStatus,
  };
}

/**
 * Analytics middleware
 * 
 * In production, this would send events to analytics service
 */
export const analytics: Middleware = (store) => (next) => (action) => {
  const result = next(action);

  if (!isAnalyticsAction(action) || !shouldTrackAnalytics(action)) {
    return result;
  }

  const event = buildAnalyticsEvent(action, store.getState() as Record<string, unknown>);
  const analyticsMeta = getAnalyticsConfig(action.meta);

  void trackAnalyticsEvent(event, {
    immediate: analyticsMeta?.immediate,
    flush: analyticsMeta?.flush,
  });

  return result;
};
