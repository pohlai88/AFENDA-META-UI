/**
 * Entity Seeding
 * ==============
 * Seed individual entities for test setup.
 *
 * **Design Philosophy:**
 * Seeding can bypass truth engine for test data setup, but should
 * still maintain referential integrity.
 */

import type { TruthContext, TruthMutation } from "../types/test-harness.js";
import { executeMutation } from "../execute/execute-mutation.js";
import type { DomainEvent } from "@afenda/meta-types/events";

/**
 * Seed an entity directly (bypasses truth engine).
 *
 * **Use Case:** Fast test data setup without invariant checks.
 * **Warning:** Only use for test setup, not for testing mutations.
 *
 * @param entity - Entity type to seed
 * @param data - Entity data
 * @param context - Truth execution context
 * @returns Promise<string> - Created entity ID
 *
 * @example
 * ```typescript
 * const customerId = await seedEntity(
 *   "customer",
 *   { name: "Acme Corp", tier: "platinum" },
 *   harness.context
 * );
 * ```
 */
export async function seedEntity(
  entity: string,
  data: Record<string, unknown>,
  context: TruthContext
): Promise<string> {
  // Enrich with tenantId + audit columns from context if not already present
  const enriched: Record<string, unknown> = {
    ...data,
    tenantId: data["tenantId"] ?? context.tenantId,
    createdBy: data["createdBy"] ?? context.userId,
    updatedBy: data["updatedBy"] ?? context.userId,
  };

  const record = await context.db.insert(entity, enriched);
  return (record as any)?.id?.toString() ?? "unknown";
}

/**
 * Seed multiple entities in batch.
 *
 * **Optimization:** Batch insert for better performance.
 *
 * @param entity - Entity type to seed
 * @param data - Array of entity data
 * @param context - Truth execution context
 * @returns Promise<string[]> - Created entity IDs
 *
 * @example
 * ```typescript
 * const productIds = await seedEntityBatch("product", [
 *   { name: "Widget", price: 100 },
 *   { name: "Gadget", price: 200 }
 * ], harness.context);
 * ```
 */
export async function seedEntityBatch(
  entity: string,
  data: Array<Record<string, unknown>>,
  context: TruthContext
): Promise<string[]> {
  return Promise.all(data.map((d) => seedEntity(entity, d, context)));
}

/**
 * Seed entity via truth engine (enforces invariants).
 *
 * **Use Case:** When test setup needs to verify invariants.
 *
 * @param mutation - Truth mutation to execute
 * @param context - Truth execution context
 * @returns Promise<string> - Created entity ID
 *
 * @example
 * ```typescript
 * const orderId = await seedEntityViaEngine(
 *   {
 *     entity: "salesOrder",
 *     operation: "create",
 *     input: { customerId: "C1", total: 1000 }
 *   },
 *   harness.context
 * );
 * ```
 */
export async function seedEntityViaEngine(
  mutation: TruthMutation,
  context: TruthContext
): Promise<string> {
  // Seeding events are separate from harness.events to avoid polluting test assertions
  const seedEvents: DomainEvent[] = [];
  const result = await executeMutation({ mutation, context, events: seedEvents });
  return result.id;
}
