/**
 * Optional sink for graph-guardrail decisions (wire to Pino or OTEL in apps).
 */

import type { GraphValidationPolicy } from "../../graph-validation/types.js";

export type GraphGuardTelemetryEvent = {
  readonly type: "graph_guard";
  readonly outcome: "allow" | "block" | "stale_block" | "stale_allow" | "noop";
  readonly route?: string;
  readonly tenantId?: string;
  readonly severity?: string;
  readonly action?: string;
  readonly isSecurityBlocking?: boolean;
};

type TelemetrySink = (event: GraphGuardTelemetryEvent) => void;

let telemetrySink: TelemetrySink | null = null;

/** Register a structured-log sink (e.g. Pino child logger). */
export function setGraphGuardrailTelemetrySink(sink: TelemetrySink | null): void {
  telemetrySink = sink;
}

export function resetGraphGuardrailTelemetrySink(): void {
  telemetrySink = null;
}

export function emitGuardEvent(event: GraphGuardTelemetryEvent): void {
  if (!telemetrySink) return;
  if ((event.outcome === "allow" || event.outcome === "noop") && !shouldSampleAllowLikeEvent()) {
    return;
  }
  telemetrySink?.(event);
}

export function telemetryFromPolicy(
  policy: GraphValidationPolicy,
  outcome: GraphGuardTelemetryEvent["outcome"],
  ctx?: { route?: string; tenantId?: string }
): GraphGuardTelemetryEvent {
  return {
    type: "graph_guard",
    outcome,
    route: ctx?.route,
    tenantId: ctx?.tenantId,
    severity: policy.decision?.severity,
    action: policy.decision?.action,
    isSecurityBlocking: policy.isSecurityBlocking,
  };
}

function shouldSampleAllowLikeEvent(): boolean {
  const raw = process.env.GRAPH_GUARD_ALLOW_EVENT_SAMPLE_RATE?.trim();
  if (!raw) return true;
  const n = Number(raw);
  if (!Number.isFinite(n)) return true;
  if (n <= 0) return false;
  if (n >= 1) return true;
  return Math.random() < n;
}
