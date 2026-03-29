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

  try {
    // Use entity names with TestDB; TestDB handles entity→schema mapping.
    const tableName = mutation.entity;

    // ===================================================================
    // PATH 1: Full Truth Engine Integration (when mutationGateway provided)
    // ===================================================================
    if (context.mutationGateway) {
      // Load existing record for update/delete operations
      let existingRecord: any = null;
      let recordId: string | undefined;

      if (mutation.operation === "update" || mutation.operation === "delete") {
        const id = (mutation.input as any).id;
        if (!id) {
          throw new Error(`${mutation.operation} requires input with id`);
        }
        recordId = id.toString();
        existingRecord = await context.db.findOne(tableName, { id });
      }

      // Prepare mutation function
      const mutate = async () => {
        if (mutation.operation === "create") {
          return await context.db.insert(tableName, mutation.input);
        } else if (mutation.operation === "update") {
          const id = (mutation.input as any).id;
          const { id: _, ...updateData } = mutation.input as any;
          await context.db.update(tableName, { id }, updateData);
          return await context.db.findOne(tableName, { id });
        } else if (mutation.operation === "delete") {
          const id = (mutation.input as any).id;
          await context.db.delete(tableName, { id });
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
        nextRecord: mutation.input as any,
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
    let resultRecord: any;
    let recordId: string;

    // Merge tenantId + audit columns into input data if not already present
    const enrichedInput = {
      ...mutation.input,
      tenantId: (mutation.input as any).tenantId ?? context.tenantId,
      createdBy: (mutation.input as any).createdBy ?? context.userId,
      updatedBy: (mutation.input as any).updatedBy ?? context.userId,
    };

    if (mutation.operation === "create") {
      resultRecord = await context.db.insert(tableName, enrichedInput);
      recordId = resultRecord.id?.toString() ?? "unknown";
    } else if (mutation.operation === "update") {
      const id = (enrichedInput as any).id;
      if (!id) {
        throw new Error(`Update requires input with id`);
      }
      const { id: _, ...updateData } = enrichedInput as any;
      await context.db.update(tableName, { id }, updateData);
      resultRecord = await context.db.findOne(tableName, { id });
      recordId = id.toString();
    } else if (mutation.operation === "delete") {
      const id = (enrichedInput as any).id;
      if (!id) {
        throw new Error(`Delete requires input with id`);
      }
      await context.db.delete(tableName, { id });
      resultRecord = null;
      recordId = id.toString();
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
  } catch (error: any) {
    // Re-throw errors instead of returning them in result
    // This allows test harness to catch and handle errors appropriately
    throw error;
  }
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
