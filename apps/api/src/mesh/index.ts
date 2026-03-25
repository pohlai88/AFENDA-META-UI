/**
 * ERP Event Mesh
 * ==============
 * Pub/sub bus for real-time cross-module communication.
 *
 * Modules publish events. Subscribers react.
 * Wildcard topic matching: "sales.order.*" matches "sales.order.created".
 * Built-in dead-letter queue for failed handlers.
 *
 * In production, replace with Kafka, NATS, or Redis Streams.
 */

import type {
  MeshEvent,
  MeshEventHandler,
  MeshSubscription,
  StreamProcessor,
  DeadLetterEntry,
} from "@afenda/meta-types";
import { logDecisionAudit } from "../audit/decisionAuditLogger.js";

// ---------------------------------------------------------------------------
// In-Memory Stores
// ---------------------------------------------------------------------------

const subscriptions = new Map<string, MeshSubscription>();
const processors = new Map<string, StreamProcessor>();
const deadLetterQueue: DeadLetterEntry[] = [];

let subCounter = 0;
let eventCounter = 0;

function logEventPropagation(params: {
  event: MeshEvent;
  scopeSuffix?: string;
  status?: "success" | "error";
  reasoning?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: { message: string; code: string; stack?: string };
}) {
  logDecisionAudit({
    id: `mesh_audit_${params.event.id}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    tenantId: params.event.tenantId,
    userId: params.event.actor,
    eventType: "event_propagated",
    scope: `mesh.${params.event.topic}${params.scopeSuffix ?? ""}`,
    context: {
      eventId: params.event.id,
    },
    decision: {
      input: {
        topic: params.event.topic,
        ...(params.input ?? {}),
      },
      output: {
        ...(params.output ?? {}),
      },
      reasoning: params.reasoning,
    },
    durationMs: 0,
    status: params.status ?? "success",
    error: params.error,
  });
}

// ---------------------------------------------------------------------------
// Topic Matching
// ---------------------------------------------------------------------------

/**
 * Match a topic against a pattern.
 * Supports exact match and single-level wildcard (*).
 *
 * Examples:
 *   "sales.order.created"  matches  "sales.order.created"  → true
 *   "sales.order.created"  matches  "sales.order.*"         → true
 *   "sales.order.created"  matches  "sales.*"               → false (only one level)
 *   "sales.order.created"  matches  "*"                     → true
 */
export function matchTopic(topic: string, pattern: string): boolean {
  if (pattern === "*") return true;
  if (pattern === topic) return true;

  const topicParts = topic.split(".");
  const patternParts = pattern.split(".");

  if (topicParts.length !== patternParts.length) return false;

  return patternParts.every((part, i) => part === "*" || part === topicParts[i]);
}

// ---------------------------------------------------------------------------
// Publish
// ---------------------------------------------------------------------------

/**
 * Publish an event to the mesh.
 * Automatically id-stamps and timestamps the event.
 * Dispatches to all matching subscribers.
 * Runs stream processors for topic transformations.
 */
export async function publish<TPayload = Record<string, unknown>>(
  topic: string,
  payload: TPayload,
  options: {
    tenantId?: string;
    actor?: string;
    metadata?: MeshEvent["metadata"];
  } = {}
): Promise<MeshEvent<TPayload>> {
  eventCounter += 1;

  const event: MeshEvent<TPayload> = {
    id: `mesh_${Date.now()}_${eventCounter}`,
    topic,
    tenantId: options.tenantId ?? "global",
    actor: options.actor ?? "system",
    timestamp: new Date().toISOString(),
    payload,
    metadata: options.metadata,
  };

  logEventPropagation({
    event: event as MeshEvent,
    scopeSuffix: ".published",
    reasoning: "Event published to mesh.",
    output: {
      actor: event.actor,
      topic: event.topic,
    },
  });

  // Dispatch to subscribers
  await dispatchToSubscribers(event as MeshEvent);

  // Run stream processors
  await runStreamProcessors(event as MeshEvent);

  return event;
}

async function dispatchToSubscribers(event: MeshEvent): Promise<void> {
  const matchingSubs = Array.from(subscriptions.values()).filter((sub) => {
    if (!matchTopic(event.topic, sub.topic)) return false;
    if (sub.tenantId !== undefined && sub.tenantId !== null) {
      return sub.tenantId === event.tenantId;
    }
    return true;
  });

  await Promise.allSettled(
    matchingSubs.map(async (sub) => {
      try {
        await sub.handler(event);
        logEventPropagation({
          event,
          scopeSuffix: ".subscriber",
          reasoning: "Event delivered to subscriber.",
          input: { subscriptionId: sub.id, pattern: sub.topic },
          output: { delivered: true },
        });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        deadLetterQueue.push({
          event,
          error,
          failedAt: new Date().toISOString(),
          retryCount: 0,
        });

        logEventPropagation({
          event,
          scopeSuffix: ".subscriber",
          status: "error",
          reasoning: "Subscriber handler failed; event moved to dead-letter queue.",
          input: { subscriptionId: sub.id, pattern: sub.topic },
          output: { deadLettered: true },
          error: {
            message: error,
            code: "SUBSCRIBER_HANDLER_ERROR",
          },
        });
      }
    })
  );
}

async function runStreamProcessors(event: MeshEvent): Promise<void> {
  for (const processor of processors.values()) {
    if (!matchTopic(event.topic, processor.inputTopic)) continue;

    try {
      const result = await processor.transform(event);
      if (result !== null && result !== undefined) {
        // Build a new MeshEvent on the outputTopic and dispatch to subscribers
        eventCounter += 1;
        const outEvent: MeshEvent = {
          id: `mesh_${Date.now()}_${eventCounter}`,
          topic: processor.outputTopic,
          tenantId: event.tenantId,
          actor: event.actor,
          timestamp: new Date().toISOString(),
          payload: result,
          metadata: event.metadata,
        };
        logEventPropagation({
          event,
          scopeSuffix: ".processor",
          reasoning: "Stream processor transformed event and emitted output topic.",
          input: { processorId: processor.id, inputTopic: processor.inputTopic },
          output: { outputTopic: processor.outputTopic, emitted: true },
        });
        await dispatchToSubscribers(outEvent);
      }
    } catch {
      // Processor errors are silently dropped to not disrupt main flow
      logEventPropagation({
        event,
        scopeSuffix: ".processor",
        status: "error",
        reasoning: "Stream processor failed and output was dropped.",
        input: { processorId: processor.id, inputTopic: processor.inputTopic },
        error: {
          message: "Processor transform failed",
          code: "PROCESSOR_TRANSFORM_ERROR",
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Subscribe
// ---------------------------------------------------------------------------

/**
 * Subscribe to a topic pattern.
 * Returns a subscription ID for unsubscribing.
 */
export function subscribe(
  topic: string,
  handler: MeshEventHandler,
  options: { tenantId?: string | null } = {}
): string {
  subCounter += 1;
  const id = `sub_${subCounter}`;

  subscriptions.set(id, {
    id,
    topic,
    handler,
    tenantId: options.tenantId,
  });

  return id;
}

/**
 * Unsubscribe by subscription ID.
 */
export function unsubscribe(subscriptionId: string): boolean {
  return subscriptions.delete(subscriptionId);
}

// ---------------------------------------------------------------------------
// Stream Processors
// ---------------------------------------------------------------------------

/**
 * Register a stream processor that transforms events on one topic
 * and emits them to another topic.
 */
export function registerProcessor(processor: StreamProcessor): void {
  processors.set(processor.id, processor);
}

/**
 * Remove a stream processor.
 */
export function removeProcessor(id: string): boolean {
  return processors.delete(id);
}

// ---------------------------------------------------------------------------
// Dead-Letter Queue
// ---------------------------------------------------------------------------

/**
 * Get failed events from the dead-letter queue.
 */
export function getDeadLetters(): DeadLetterEntry[] {
  return [...deadLetterQueue];
}

/**
 * Retry a dead-letter entry by re-dispatching its event.
 */
export async function retryDeadLetter(index: number): Promise<boolean> {
  const entry = deadLetterQueue[index];
  if (!entry) return false;

  try {
    await dispatchToSubscribers(entry.event);
    deadLetterQueue.splice(index, 1);
    logEventPropagation({
      event: entry.event,
      scopeSuffix: ".deadletter.retry",
      reasoning: "Dead-letter event retry succeeded.",
      output: { retrySucceeded: true, retryCount: entry.retryCount + 1 },
    });
    return true;
  } catch {
    deadLetterQueue[index].retryCount += 1;
    logEventPropagation({
      event: entry.event,
      scopeSuffix: ".deadletter.retry",
      status: "error",
      reasoning: "Dead-letter event retry failed.",
      output: { retrySucceeded: false, retryCount: deadLetterQueue[index].retryCount },
      error: {
        message: "Dead-letter retry failed",
        code: "DEADLETTER_RETRY_ERROR",
      },
    });
    return false;
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function getMeshStats(): {
  subscriptions: number;
  processors: number;
  deadLetters: number;
} {
  return {
    subscriptions: subscriptions.size,
    processors: processors.size,
    deadLetters: deadLetterQueue.length,
  };
}

export function clearMesh(): void {
  subscriptions.clear();
  processors.clear();
  deadLetterQueue.length = 0;
  subCounter = 0;
  eventCounter = 0;
}
