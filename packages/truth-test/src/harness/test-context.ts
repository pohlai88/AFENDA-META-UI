/**
 * Test Context Factory
 * ====================
 * Creates a truth execution context for test harness.
 *
 * **Purpose:** Encapsulate tenant, user, clock, and DB access.
 */

import type { TruthContext, TestDB } from "../types/test-harness.js";
import type { DomainEvent } from "@afenda/meta-types/events";
import { createTestDB } from "./test-db.js";

/**
 * Test context creation options.
 */
export interface TestContextOptions {
  /** Test database instance */
  db?: TestDB;

  /** Event emission function */
  emit: (event: DomainEvent) => void;

  /** Deterministic clock for event timestamps */
  clock: () => Date;

  /** Tenant ID for multi-tenant isolation */
  tenantId: string;

  /** User ID for RBAC enforcement */
  userId: number;

  /** Optional correlation ID for distributed tracing */
  correlationId?: string;
}

/**
 * Create a truth execution context.
 *
 * **Isolation:** Each context has its own tenant, user, and clock.
 *
 * @param options - Context configuration options
 * @returns TruthContext - Isolated execution context
 */
export function createTestContext(
  options: TestContextOptions
): TruthContext {
  // Use real TestDB implementation backed by Drizzle + Neon
  const db: TestDB = options.db ?? createTestDB({
    tenantId: options.tenantId,
    userId: options.userId,
  });

  return {
    db,
    emit: options.emit,
    clock: options.clock,
    tenantId: options.tenantId,
    userId: options.userId,
    correlationId: options.correlationId,
  };
}
