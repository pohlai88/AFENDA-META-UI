/**
 * Scenario Seeding
 * ================
 * Execute complex multi-step scenarios for test setup.
 *
 * **Design Philosophy:**
 * Scenarios encapsulate common data patterns and relationships.
 */

import type {
  ScenarioDefinition,
  SeededScenario,
  ScenarioStep,
  ScenarioBuilder,
} from "../types/scenario.js";
import type { TruthHarness, TruthMutation } from "../types/test-harness.js";
import { seedEntity } from "./seed-entity.js";

/**
 * Registry of scenario definitions.
 */
const SCENARIO_REGISTRY = new Map<string, ScenarioDefinition>();

/**
 * Seed a scenario by name.
 *
 * **Execution:** Runs all scenario steps in order.
 *
 * @param harness - Truth test harness
 * @param scenarioName - Registered scenario name
 * @param overrides - Optional data overrides
 * @returns Promise<SeededScenario> - Seeded entities with cleanup function
 *
 * @example
 * ```typescript
 * const scenario = await seedScenario(harness, "multi-tier-commission");
 *
 * // Use scenario entities
 * const orderId = scenario.entities.salesOrder;
 *
 * // Cleanup when done
 * await scenario.cleanup();
 * ```
 */
export async function seedScenario(
  harness: TruthHarness,
  scenarioName: string,
  overrides?: Record<string, unknown>
): Promise<SeededScenario> {
  const definition = SCENARIO_REGISTRY.get(scenarioName);

  if (!definition) {
    throw new Error(
      `Unknown scenario: "${scenarioName}". ` +
        `Available: ${Array.from(SCENARIO_REGISTRY.keys()).join(", ")}`
    );
  }

  const entities: Record<string, string | string[]> = {};
  // Track all created entity IDs for cleanup: [entity type, id]
  const createdEntities: Array<{ entity: string; id: string }> = [];

  for (const step of definition.steps) {
    // Apply overrides to step data using entity type as key
    const stepOverrides =
      overrides && "entity" in step ? (overrides[(step as any).entity] as Record<string, unknown> | undefined) : undefined;

    switch (step.type) {
      case "mutation": {
        const mutationWithOverrides: TruthMutation = stepOverrides
          ? { ...step.mutation, input: { ...step.mutation.input, ...stepOverrides } }
          : step.mutation;
        const result = await harness.execute(mutationWithOverrides);
        const entityType = step.mutation.entity;
        // If multiple entities of same type, collect as array; otherwise single string
        if (entities[entityType] !== undefined) {
          const existing = entities[entityType];
          entities[entityType] = Array.isArray(existing) ? [...existing, result.id] : [existing, result.id];
        } else {
          entities[entityType] = result.id;
        }
        createdEntities.push({ entity: entityType, id: result.id });
        break;
      }

      case "seed": {
        const data = stepOverrides ? { ...step.data, ...stepOverrides } : step.data;
        const id = await seedEntity(step.entity, data, harness.context);
        const entityType = step.entity;
        if (entities[entityType] !== undefined) {
          const existing = entities[entityType];
          entities[entityType] = Array.isArray(existing) ? [...existing, id] : [existing, id];
        } else {
          entities[entityType] = id;
        }
        createdEntities.push({ entity: entityType, id });
        break;
      }

      case "wait":
        await new Promise<void>((resolve) => setTimeout(resolve, step.ms));
        break;

      case "assertion":
        await step.fn();
        break;
    }
  }

  return {
    name: scenarioName,
    entities,
    cleanup: async () => {
      // Delete in reverse order to respect foreign key constraints
      for (const { entity, id } of [...createdEntities].reverse()) {
        try {
          await harness.context.db.delete(entity, { id });
        } catch {
          // Best-effort cleanup — cascade deletes may have already removed records
        }
      }
    },
  };
}

/**
 * Register a scenario definition.
 *
 * **Use Case:** Projects define domain-specific scenarios.
 *
 * @param definition - Scenario definition
 *
 * @example
 * ```typescript
 * registerScenario({
 *   name: "subscription-renewal",
 *   description: "Active subscription nearing renewal",
 *   steps: [
 *     { type: "seed", entity: "subscription", data: { status: "active" } }
 *   ]
 * });
 * ```
 */
export function registerScenario(definition: ScenarioDefinition): void {
  if (SCENARIO_REGISTRY.has(definition.name)) {
    throw new Error(`Scenario already registered: "${definition.name}"`);
  }

  SCENARIO_REGISTRY.set(definition.name, definition);
}

/**
 * Get list of registered scenario names.
 *
 * @returns string[] - Array of scenario names
 */
export function listScenarios(): string[] {
  return Array.from(SCENARIO_REGISTRY.keys());
}

/**
 * Create a scenario builder for fluent scenario definition.
 *
 * **Fluent API:** Chain operations for readable scenario definitions.
 *
 * @param name - Scenario name
 * @param description - Scenario description
 * @returns ScenarioBuilder - Fluent builder interface
 *
 * @example
 * ```typescript
 * const scenario = defineScenario("commission-overflow", "Test commission limits")
 *   .mutate({
 *     entity: "customer",
 *     operation: "create",
 *     input: { name: "Acme Corp" }
 *   })
 *   .mutate({
 *     entity: "salesOrder",
 *     operation: "create",
 *     input: { customerId: "{{customer}}", total: 1000 }
 *   })
 *   .assert("commission calculated", async () => {
 *     // Assertion logic
 *   })
 *   .build();
 *
 * registerScenario(scenario);
 * ```
 */
export function defineScenario(name: string, description: string): ScenarioBuilder {
  const steps: ScenarioStep[] = [];

  const builder: ScenarioBuilder = {
    mutate(mutation: TruthMutation) {
      steps.push({ type: "mutation", mutation });
      return builder;
    },

    seed(entity: string, data: Record<string, unknown>) {
      steps.push({ type: "seed", entity, data });
      return builder;
    },

    wait(ms: number) {
      steps.push({ type: "wait", ms });
      return builder;
    },

    assert(name: string, fn: () => void | Promise<void>) {
      steps.push({ type: "assertion", name, fn });
      return builder;
    },

    build(): ScenarioDefinition {
      return {
        name,
        description,
        steps,
      };
    },
  };

  return builder;
}

// Register built-in scenarios
registerScenario({
  name: "multi-tier-commission",
  description: "Sales order with tiered commission plan",
  steps: [
    {
      type: "seed",
      entity: "customer",
      data: { id: "CUST-001", name: "Acme Corp", tier: "platinum" },
    },
    {
      type: "seed",
      entity: "product",
      data: { id: "PROD-123", name: "Widget", price: 100 },
    },
    {
      type: "seed",
      entity: "commissionPlan",
      data: {
        id: "PLAN-001",
        name: "Standard Tiered",
        tiers: [
          { from: 0, to: 1000, rate: 0.05 },
          { from: 1000, to: 5000, rate: 0.07 },
          { from: 5000, to: null, rate: 0.1 },
        ],
      },
    },
  ],
});

registerScenario({
  name: "tenant-isolation",
  description: "Multi-tenant test data for isolation verification",
  steps: [
    {
      type: "seed",
      entity: "tenant",
      data: { id: "tenant-1", name: "Tenant One" },
    },
    {
      type: "seed",
      entity: "tenant",
      data: { id: "tenant-2", name: "Tenant Two" },
    },
    {
      type: "seed",
      entity: "customer",
      data: { id: "CUST-T1-001", name: "Customer 1A", tenantId: "tenant-1" },
    },
    {
      type: "seed",
      entity: "customer",
      data: { id: "CUST-T2-001", name: "Customer 2A", tenantId: "tenant-2" },
    },
  ],
});
