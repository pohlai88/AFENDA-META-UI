/**
 * Truth Test Harness Factory
 * ===========================
 * Creates a controlled truth execution environment for testing.
 *
 * **Core Guarantee:**
 * All mutations → truth engine → invariants → events → projections
 */

import type {
  TruthHarness,
  TruthContext,
  TestDB,
  TruthMutation,
  TruthMutationResult,
  TruthQuery,
  TruthQueryResult,
} from "../types/test-harness.js";
import type { DomainEvent } from "@afenda/meta-types/events";
import { executeMutation } from "../execute/execute-mutation.js";
import { executeQuery } from "../execute/execute-query.js";
import { replayEvents } from "../execute/replay-events.js";
import { createTestContext } from "./test-context.js";

/**
 * Harness creation options.
 */
export interface TruthHarnessOptions {
  /** Test database instance (defaults to in-memory DB) */
  db?: TestDB;

  /** Deterministic clock for event timestamps */
  clock?: () => Date;

  /** Tenant ID for multi-tenant isolation */
  tenantId?: string;

  /** User ID for RBAC enforcement */
  userId?: number;

  /** Correlation ID for distributed tracing */
  correlationId?: string;
}

/**
 * Create a new truth test harness.
 *
 * **Usage:**
 * ```typescript
 * const harness = createTruthHarness({
 *   tenantId: "tenant-1",
 *   userId: 100
 * });
 *
 * await harness.execute({
 *   entity: "salesOrder",
 *   operation: "create",
 *   input: { total: 1000 }
 * });
 *
 * await harness.reset();
 * ```
 *
 * @param options - Harness configuration options
 * @returns TruthHarness - Isolated truth execution environment
 */
export function createTruthHarness(
  options: TruthHarnessOptions = {}
): TruthHarness {
  // Event collection
  const events: DomainEvent[] = [];

  // Create test context
  const context = createTestContext({
    db: options.db,
    emit: (event: DomainEvent) => {
      events.push(event);
    },
    clock: options.clock ?? (() => new Date()),
    tenantId: options.tenantId ?? "test-tenant",
    userId: options.userId ?? 1,
    correlationId: options.correlationId,
  });

  // Harness API
  const harness: TruthHarness = {
    db: context.db,
    context,
    events,

    /**
     * Execute a mutation through truth engine.
     *
     * **Truth Guarantee:** Policy + invariants are enforced.
     */
    async execute<T = unknown>(
      mutation: TruthMutation
    ): Promise<TruthMutationResult<T>> {
      return executeMutation({ mutation, context, events });
    },

    /**
     * Query a projection or entity.
     *
     * **Purpose:** Test read models and projections.
     */
    async query<T = unknown>(
      query: TruthQuery
    ): Promise<TruthQueryResult<T>> {
      return executeQuery({ query, context });
    },

    /**
     * Replay all collected events to rebuild projections.
     *
     * **Use Case:** Verify event sourcing consistency.
     */
    async replay(): Promise<void> {
      return replayEvents(events, context);
    },

    /**
     * Reset harness state (DB + events).
     *
     * **Isolation:** Ensures no state pollution between tests.
     */
    async reset(): Promise<void> {
      events.length = 0;
      await context.db.reset();
    },
  };

  return harness;
}
