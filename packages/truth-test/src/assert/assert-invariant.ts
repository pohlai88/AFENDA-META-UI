/**
 * Invariant Assertions
 * ====================
 * Test-time verification that invariants hold.
 *
 * **Design Philosophy:**
 * Invariants are the truth. Assertions verify that truth holds.
 */

import type { TruthContext } from "../types/test-harness.js";
import { evaluateCondition } from "../auto/evaluate-condition.js";
import { SALES_INVARIANT_REGISTRIES } from "@afenda/db/truth-compiler";

/**
 * Assert that an invariant holds.
 *
 * **Truth Guarantee:** Evaluated against live database state.
 *
 * @param name - Invariant name for error messages
 * @param fn - Assertion function (throw on failure)
 *
 * @example
 * ```typescript
 * assertInvariant("commission <= limit", () => {
 *   if (commission.total > limit) {
 *     throw new Error(`Commission ${commission.total} exceeds limit ${limit}`);
 *   }
 * });
 * ```
 */
export function assertInvariant(
  name: string,
  fn: () => void | Promise<void>
): void | Promise<void> {
  try {
    const result = fn();

    // Handle async assertions
    if (result instanceof Promise) {
      return result.catch((err) => {
        throw new InvariantViolationError(name, err.message);
      });
    }
  } catch (err) {
    throw new InvariantViolationError(
      name,
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * Assert that an invariant holds for a specific entity (by targetModel and ID).
 *
 * Looks up all registered invariants for `targetModel` in SALES_INVARIANT_REGISTRIES,
 * loads the entity record from the DB, then evaluates each invariant's ConditionExpression
 * using the runtime evaluator (the JS mirror of the SQL CHECK constraints).
 *
 * Throws on the first violated invariant. If no registry is found for the model,
 * the assertion passes silently (entity is outside the sales truth domain).
 *
 * @param targetModel - Entity model name as registered in truth-config (e.g., "sales_order")
 * @param entityId - Entity ID to load and check (numeric or string)
 * @param context - Truth execution context (provides db access)
 *
 * @example
 * ```typescript
 * await assertEntityInvariant("sales_order", result.id, harness.context);
 * ```
 */
export async function assertEntityInvariant(
  targetModel: string,
  entityId: string,
  context: TruthContext
): Promise<void> {
  const registry = SALES_INVARIANT_REGISTRIES.find((r) => r.model === targetModel);

  // No invariants registered for this model — nothing to check
  if (!registry) return;

  const record = await context.db.findOne(targetModel, {
    id: isNaN(Number(entityId)) ? entityId : Number(entityId),
  } as any);

  if (!record) {
    throw new InvariantViolationError(
      `${targetModel}.exists`,
      `Entity "${targetModel}" with id "${entityId}" not found in database`
    );
  }

  for (const invariant of registry.invariants) {
    const passes = evaluateCondition(invariant.condition, record as Record<string, unknown>);
    if (!passes) {
      throw new InvariantViolationError(invariant.id, invariant.description);
    }
  }
}

/**
 * Assert that ALL invariants hold for an entity.
 *
 * Unlike assertEntityInvariant (fails fast on first violation), this collects
 * every failing invariant and reports them all at once via AggregateInvariantViolationError.
 *
 * @param entityType - Entity model name (e.g., "sales_order", "consignment_agreement")
 * @param entityId - Entity ID to check
 * @param context - Truth execution context
 */
export async function assertAllEntityInvariants(
  entityType: string,
  entityId: string,
  context: TruthContext
): Promise<void> {
  const registry = SALES_INVARIANT_REGISTRIES.find((r) => r.model === entityType);

  if (!registry) return;

  const record = await context.db.findOne(entityType, {
    id: isNaN(Number(entityId)) ? entityId : Number(entityId),
  } as any);

  if (!record) {
    throw new InvariantViolationError(
      `${entityType}.exists`,
      `Entity "${entityType}" with id "${entityId}" not found in database`
    );
  }

  const violations: Array<{ id: string; description: string }> = [];

  for (const invariant of registry.invariants) {
    const passes = evaluateCondition(invariant.condition, record as Record<string, unknown>);
    if (!passes) {
      violations.push({ id: invariant.id, description: invariant.description });
    }
  }

  if (violations.length > 0) {
    throw new AggregateInvariantViolationError(entityType, entityId, violations);
  }
}

/**
 * Custom error for invariant violations.
 */
export class InvariantViolationError extends Error {
  constructor(
    public readonly invariantName: string,
    public readonly details: string
  ) {
    super(`Invariant "${invariantName}" violated: ${details}`);
    this.name = "InvariantViolationError";
  }
}

/**
 * Aggregate error reporting multiple invariant violations at once.
 * Thrown by assertAllEntityInvariants when more than one invariant fails.
 */
export class AggregateInvariantViolationError extends Error {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly violations: Array<{ id: string; description: string }>
  ) {
    const lines = violations.map((v) => `  - ${v.id}: ${v.description}`).join("\n");
    super(
      `${violations.length} invariant(s) violated for "${entityType}" (id: ${entityId}):\n${lines}`
    );
    this.name = "AggregateInvariantViolationError";
  }
}
