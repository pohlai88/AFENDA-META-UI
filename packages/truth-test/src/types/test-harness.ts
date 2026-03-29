/**
 * Truth Test Harness Types
 * =========================
 * Core type definitions for the truth test harness.
 *
 * **Design Philosophy:**
 * The harness is a controlled truth execution environment.
 * All mutations, queries, events, and projections flow through it.
 */

import type { DomainEvent } from "@afenda/meta-types/events";
import type { MutationOperation, MutationPolicyDefinition } from "@afenda/meta-types/policy";
import type { ModelMeta } from "@afenda/meta-types/schema";

/**
 * Mutation gateway function type for truth engine integration.
 *
 * **Purpose:** Abstract executeMutationCommand from apps/api for dependency injection.
 */
export interface MutationGatewayInput<TRecord = Record<string, unknown>> {
  model: string;
  operation: MutationOperation;
  mutate: () => Promise<TRecord | null>;
  existingRecord?: TRecord | null;
  nextRecord?: TRecord | null;
  recordId?: string;
  actorId?: string;
  source?: string;
  policies?: MutationPolicyDefinition[];
}

export interface MutationGatewayResult<TRecord = Record<string, unknown>> {
  record: TRecord | null;
  event?: DomainEvent;
  mutationPolicy?: string;
  policy?: MutationPolicyDefinition;
}

export type MutationGateway = <TRecord = Record<string, unknown>>(
  input: MutationGatewayInput<TRecord>
) => Promise<MutationGatewayResult<TRecord>>;

/**
 * Schema registry function type for loading ModelMeta.
 */
export type SchemaRegistry = {
  getSchema: (model: string) => Promise<ModelMeta | null>;
};

/**
 * Projection handler for event sourcing.
 */
export type ProjectionHandler = (
  event: DomainEvent,
  currentState: Record<string, unknown> | null
) => Promise<Record<string, unknown> | null> | Record<string, unknown> | null;

/**
 * Truth execution context for a test harness.
 *
 * **Isolation:** Each harness has its own DB, event log, and clock.
 * **Gateway Integration:** Optionally wire real mutation-command-gateway and schema registry.
 */
export interface TruthContext {
  /** Test database instance */
  db: TestDB;

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

  /**
   * Optional mutation gateway for truth engine integration.
   *
   * **When provided:** Mutations go through mutation-command-gateway with:
   * - Policy enforcement
   * - Invariant checking
   * - Event sourcing support
   *
   * **When omitted:** Mutations execute via TestDB directly (Phase 2 behavior).
   */
  mutationGateway?: MutationGateway;

  /**
   * Optional schema registry for loading ModelMeta.
   *
   * **Used by:** Invariant checking, field validation, policy resolution.
   */
  schemaRegistry?: SchemaRegistry;

  /**
   * Optional projection handlers for event sourcing.
   *
   * **Key:** Entity type (e.g., "salesOrder")  * **Value:** Handler function that rebuilds projection from event
   */
  projectionHandlers?: Map<string, ProjectionHandler>;

  /**
   * Optional mutation policies for policy enforcement.
   *
   * **When provided:** Used to resolve mutation policies for entities.
   * **When omitted:** Falls back to TestDB direct access.
   */
  mutationPolicies?: MutationPolicyDefinition[];
}

/**
 * Truth mutation request.
 *
 * **Truth Guarantee:** All mutations go through policy + invariants.
 */
export interface TruthMutation {
  /** Entity type (e.g., "salesOrder", "commission") */
  entity: string;

  /** Mutation operation (create, update, delete, custom) */
  operation: MutationOperation;

  /** Mutation input data */
  input: Record<string, unknown>;

  /** Optional mutation metadata */
  metadata?: {
    /** Skip invariant checks (DANGEROUS - use only for seeding) */
    skipInvariants?: boolean;

    /** Skip policy resolution (DANGEROUS - use only for seeding) */
    skipPolicy?: boolean;

    /** Expected invariant violations (for negative tests) */
    expectViolations?: string[];
  };
}

/**
 * Truth mutation result.
 *
 * **Contains:** Entity ID, emitted events, execution time.
 */
export interface TruthMutationResult<T = unknown> {
  /** Created/mutated entity ID */
  id: string;

  /** Domain events emitted during mutation */
  events: DomainEvent[];

  /** Result data from mutation */
  data: T;

  /** Execution time in milliseconds */
  executionTime: number;

  /** Invariants checked during mutation */
  invariantsChecked: string[];
}

/**
 * Truth query request.
 *
 * **Purpose:** Test projections and read models.
 */
export interface TruthQuery {
  /** Entity type to query */
  entity: string;

  /** Query filters */
  filters?: Record<string, unknown>;

  /** Projection to query (defaults to main entity table) */
  projection?: string;

  /** Include related entities */
  include?: string[];
}

/**
 * Truth query result.
 */
export interface TruthQueryResult<T = unknown> {
  /** Query result data */
  data: T;

  /** Number of rows returned */
  count: number;

  /** Execution time in milliseconds */
  executionTime: number;
}

/**
 * Test database abstraction.
 *
 * **Deterministic:** All operations are synchronous or promise-based.
 * No external state pollution.
 */
export interface TestDB {
  /** Find a single row by criteria */
  findOne<T = unknown>(
    table: string,
    where: Partial<T>
  ): Promise<T | null>;

  /** Find multiple rows by criteria */
  find<T = unknown>(
    table: string,
    where?: Partial<T>
  ): Promise<T[]>;

  /** Insert a row */
  insert<T = unknown>(
    table: string,
    data: Partial<T>
  ): Promise<T>;

  /** Update rows matching criteria */
  update<T = unknown>(
    table: string,
    where: Partial<T>,
    data: Partial<T>
  ): Promise<number>;

  /** Delete rows matching criteria */
  delete<T = unknown>(
    table: string,
    where: Partial<T>
  ): Promise<number>;

  /** Execute raw SQL (for complex queries) */
  sql<T = unknown>(query: string, params?: unknown[]): Promise<T[]>;

  /** Reset database to clean state */
  reset(): Promise<void>;

  /** Get all collected events */
  getEvents(): DomainEvent[];
}

/**
 * Truth test harness.
 *
 * **Core API:** execute, query, replay, reset.
 */
export interface TruthHarness {
  /** Test database instance */
  db: TestDB;

  /** Truth execution context */
  context: TruthContext;

  /** Collected domain events */
  events: DomainEvent[];

  /** Execute a mutation through truth engine */
  execute<T = unknown>(
    mutation: TruthMutation
  ): Promise<TruthMutationResult<T>>;

  /** Query a projection or entity */
  query<T = unknown>(
    query: TruthQuery
  ): Promise<TruthQueryResult<T>>;

  /** Replay all collected events to rebuild projections */
  replay(): Promise<void>;

  /** Reset harness state (DB + events) */
  reset(): Promise<void>;
}
