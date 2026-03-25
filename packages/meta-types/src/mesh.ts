/**
 * ERP Event Mesh Types
 * ====================
 * Pub/sub nervous system for cross-module real-time communication.
 *
 * Modules publish events. Interested systems subscribe and react.
 * No hard dependencies between modules — only message contracts.
 */

// ---------------------------------------------------------------------------
// Event Envelope — every mesh event has this shape
// ---------------------------------------------------------------------------

export interface MeshEvent<TPayload = Record<string, unknown>> {
  /** Unique event ID */
  id: string;
  /** Dot-namespaced event name, e.g. "sales.order.created" */
  topic: string;
  /** Tenant identifier for multi-tenant routing */
  tenantId: string;
  /** Actor who caused the event */
  actor: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Event-specific payload */
  payload: TPayload;
  /** Tracing / correlation */
  metadata?: {
    correlationId?: string;
    causationId?: string;
    source?: string;
    [key: string]: unknown;
  };
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export type MeshEventHandler<TPayload = Record<string, unknown>> = (
  event: MeshEvent<TPayload>
) => void | Promise<void>;

export interface MeshSubscription {
  /** Unique subscription ID */
  id: string;
  /** Topic pattern — exact ("sales.order.created") or wildcard ("sales.order.*") */
  topic: string;
  /** Handler callback */
  handler: MeshEventHandler;
  /** Optional tenant filter — null means all tenants */
  tenantId?: string | null;
}

// ---------------------------------------------------------------------------
// Stream Processing
// ---------------------------------------------------------------------------

export type StreamTransformFn = (
  event: MeshEvent<Record<string, unknown>>
) => Record<string, unknown> | null | Promise<Record<string, unknown> | null>;

export interface StreamProcessor {
  /** Processor ID */
  id: string;
  /** Topic to consume */
  inputTopic: string;
  /** Topic to emit transformed events on */
  outputTopic: string;
  /** Transformation function — return null to filter/drop */
  transform: StreamTransformFn;
}

// ---------------------------------------------------------------------------
// Dead-Letter Queue
// ---------------------------------------------------------------------------

export interface DeadLetterEntry {
  event: MeshEvent;
  error: string;
  failedAt: string;
  retryCount: number;
}
