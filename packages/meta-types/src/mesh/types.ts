/**
 * @module mesh
 * @description Event mesh contracts for pub/sub communication and stream processing.
 * @layer truth-contract
 * @consumers api, web, db
 */

export interface MeshEvent<TPayload = Record<string, unknown>> {
  id: string;
  topic: string;
  tenantId: string;
  actor: string;
  timestamp: string;
  payload: TPayload;
  metadata?: {
    correlationId?: string;
    causationId?: string;
    source?: string;
    [key: string]: unknown;
  };
}

export type MeshEventHandler<TPayload = Record<string, unknown>> = (
  event: MeshEvent<TPayload>
) => void | Promise<void>;

export interface MeshSubscription {
  id: string;
  topic: string;
  handler: MeshEventHandler;
  tenantId?: string | null;
}

export type StreamTransformFn = (
  event: MeshEvent<Record<string, unknown>>
) => Record<string, unknown> | null | Promise<Record<string, unknown> | null>;

export interface StreamProcessor {
  id: string;
  inputTopic: string;
  outputTopic: string;
  transform: StreamTransformFn;
}

export interface DeadLetterEntry {
  event: MeshEvent;
  error: string;
  failedAt: string;
  retryCount: number;
}
