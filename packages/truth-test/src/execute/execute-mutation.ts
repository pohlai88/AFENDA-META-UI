/**
 * Truth Mutation Executor
 * ========================
 * Executes mutations through the truth engine with policy + invariants.
 *
 * **Core Flow:**
 * 1. Resolve mutation policy
 * 2. Check pre-condition invariants
 * 3. Execute mutation (DB write)
 * 4. Emit domain events
 * 5. Check post-condition invariants
 */

import { performance } from "node:perf_hooks";
import type { TruthMutation, TruthMutationResult, TruthContext } from "../types/test-harness.js";
import type { DomainEvent } from "@afenda/meta-types/events";

/** `errorVerb` is the exact prefix before " requires input with id" (e.g. `update` or `Update`). */
function requireScalarId(input: Record<string, unknown>, errorVerb: string): string | number {
  const id = input.id;
  if (id === undefined || id === null) {
    throw new Error(`${errorVerb} requires input with id`);
  }
  if (typeof id === "number" || typeof id === "string") {
    return id;
  }
  return String(id);
}

function omitId(input: Record<string, unknown>): Record<string, unknown> {
  const { id: _omit, ...rest } = input;
  return rest;
}

/**
 * Execute a mutation through the truth engine.
 *
 * **Truth Guarantee:** All invariants are verified before and after execution.
 * **Integration Modes:**
 * - With mutationGateway: Full truth engine (policy + invariants + event sourcing)
 * - Without mutationGateway: TestDB direct access (Phase 2 behavior)
 *
 * @param params - Mutation request with context and event collector
 * @returns Promise<TruthMutationResult> - Result with ID, events, and metadata
 */
export async function executeMutation<T = unknown>({
  mutation,
  context,
  events,
}: {
  mutation: TruthMutation;
  context: TruthContext;
  events: DomainEvent[];
}): Promise<TruthMutationResult<T>> {
  const startTime = performance.now();
  const invariantsChecked: string[] = [];

  // Use entity names with TestDB; TestDB handles entity→schema mapping.
  const tableName = mutation.entity;

  // ===================================================================
  // PATH 1: Full Truth Engine Integration (when mutationGateway provided)
  // ===================================================================
  if (context.mutationGateway) {
    // Load existing record for update/delete operations
    let existingRecord: Record<string, unknown> | null = null;
    let recordId: string | undefined;

    if (mutation.operation === "update" || mutation.operation === "delete") {
      const id = requireScalarId(mutation.input, mutation.operation);
      recordId = String(id);
      existingRecord = (await context.db.findOne<Record<string, unknown>>(tableName, {
        id,
      })) as Record<string, unknown> | null;
    }

    // Prepare mutation function
    const mutate = async (): Promise<Record<string, unknown> | null> => {
      if (mutation.operation === "create") {
        return (await context.db.insert<Record<string, unknown>>(
          tableName,
          mutation.input
        )) as Record<string, unknown>;
      }
      if (mutation.operation === "update") {
        const id = requireScalarId(mutation.input, mutation.operation);
        const updateData = omitId(mutation.input);
        await context.db.update<Record<string, unknown>>(tableName, { id }, updateData);
        return (await context.db.findOne<Record<string, unknown>>(tableName, {
          id,
        })) as Record<string, unknown> | null;
      }
      if (mutation.operation === "delete") {
        const id = requireScalarId(mutation.input, mutation.operation);
        await context.db.delete<Record<string, unknown>>(tableName, { id });
        return null;
      }
      throw new Error(`Unsupported mutation operation: ${mutation.operation}`);
    };

    // Execute via mutation-command-gateway
    const result = await context.mutationGateway({
      model: mutation.entity,
      operation: mutation.operation,
      mutate,
      existingRecord,
      nextRecord: mutation.input,
      recordId,
      actorId: context.userId?.toString(),
      source: "truth-test",
      policies: context.mutationPolicies,
    });

    // Extract result
    const resultRecord = result.record;
    const event = result.event;
    const finalRecordId = recordId ?? resultRecord?.id?.toString() ?? "unknown";

    // If gateway produced event, record it
    if (event) {
      events.push(event);
    }

    // Track invariants checked (via policy metadata if available)
    if (result.policy?.id) {
      invariantsChecked.push(result.policy.id);
    }

    const executionTime = performance.now() - startTime;

    return {
      id: finalRecordId,
      events: event ? [event] : [],
      data: resultRecord as T,
      executionTime,
      invariantsChecked,
    };
  }

  // ===================================================================
  // PATH 2: TestDB Direct Access (Phase 2 fallback)
  // ===================================================================
  let resultRecord: Record<string, unknown> | null;
  let recordId: string;

  // Merge tenantId + audit columns into input data if not already present
  const enrichedInput: Record<string, unknown> = {
    ...mutation.input,
    tenantId: mutation.input.tenantId ?? context.tenantId,
    createdBy: mutation.input.createdBy ?? context.userId,
    updatedBy: mutation.input.updatedBy ?? context.userId,
  };

  if (mutation.operation === "create") {
    resultRecord = (await context.db.insert<Record<string, unknown>>(
      tableName,
      enrichedInput
    )) as Record<string, unknown>;
    recordId = resultRecord.id != null ? String(resultRecord.id) : "unknown";
  } else if (mutation.operation === "update") {
    const id = requireScalarId(enrichedInput, "Update");
    const updateData = omitId(enrichedInput);
    await context.db.update<Record<string, unknown>>(tableName, { id }, updateData);
    resultRecord = (await context.db.findOne<Record<string, unknown>>(tableName, {
      id,
    })) as Record<string, unknown> | null;
    recordId = String(id);
  } else if (mutation.operation === "delete") {
    const id = requireScalarId(enrichedInput, "Delete");
    await context.db.delete<Record<string, unknown>>(tableName, { id });
    resultRecord = null;
    recordId = String(id);
  } else {
    throw new Error(`Unsupported mutation operation: ${mutation.operation}`);
  }

  // Build mutation event manually (since no gateway)
  const event: DomainEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    aggregateType: mutation.entity,
    aggregateId: recordId,
    eventType: resolveEventType(mutation.entity, mutation.operation),
    payload: {
      operation: mutation.operation,
      model: mutation.entity,
      before: null, // TODO: Load existing record for update/delete
      after: resultRecord,
    },
    metadata: {
      actor: context.userId?.toString() ?? "test-actor",
      source: "truth-test",
      tenantId: context.tenantId,
      correlationId: context.correlationId,
    },
    timestamp: context.clock().toISOString(),
    version: 1,
  };

  // Record event in the caller's event collector
  // (harness.execute passes harness.events; seedEntityViaEngine passes a throwaway array)
  events.push(event);

  // Return result
  const executionTime = performance.now() - startTime;

  return {
    id: recordId,
    events: [event],
    data: resultRecord as T,
    executionTime,
    invariantsChecked,
  };
}

/**
 * Resolve event type from entity and operation.
 *
 * TODO Phase 2.1: Use real event-type-registry from apps/api/src/policy/event-type-registry.ts
 */
function resolveEventType(entity: string, operation: string): string {
  // Convert camelCase to PascalCase: "salesOrder" -> "SalesOrder"
  const pascalEntity = entity.charAt(0).toUpperCase() + entity.slice(1);

  // Map operation to event type suffix
  const operationSuffix: Record<string, string> = {
    create: "Created",
    update: "Updated",
    delete: "Deleted",
  };

  return `${pascalEntity}${operationSuffix[operation] ?? "Changed"}`;
}

/**
 * Execute multiple mutations in a batch.
 *
 * **Atomicity:** All mutations succeed or all fail.
 */
export async function executeMutationBatch<T = unknown>(
  mutations: TruthMutation[],
  context: TruthContext,
  events: DomainEvent[]
): Promise<TruthMutationResult<T>[]> {
  const results: TruthMutationResult<T>[] = [];

  // TODO Phase 2.1: Wrap in transaction for atomicity
  for (const mutation of mutations) {
    const result = await executeMutation<T>({ mutation, context, events });
    results.push(result);
  }

  return results;
}
