/**
 * Scenario Type Definitions
 * ==========================
 * Reusable test scenarios for consistent data setup.
 *
 * **Design Philosophy:**
 * Tests declare "what" they need, scenarios encapsulate "how" to create it.
 */

import type { TruthMutation } from "./test-harness.js";

/**
 * Scenario step.
 *
 * **Options:**
 * - mutation: Execute a truth mutation
 * - seed: Seed entity directly (bypasses truth engine)
 * - wait: Wait for async operations
 * - assertion: Run assertion checkpoint
 */
export type ScenarioStep =
  | { type: "mutation"; mutation: TruthMutation }
  | { type: "seed"; entity: string; data: Record<string, unknown> }
  | { type: "wait"; ms: number }
  | { type: "assertion"; name: string; fn: () => void | Promise<void> };

/**
 * Scenario definition.
 *
 * **Reusability:** Scenarios can be registered and reused across tests.
 */
export interface ScenarioDefinition {
  /** Unique scenario name */
  name: string;

  /** Human-readable description */
  description: string;

  /** Execution steps */
  steps: ScenarioStep[];

  /** Optional tags for filtering */
  tags?: string[];

  /** Dependencies on other scenarios */
  requires?: string[];
}

/**
 * Seeded scenario result.
 *
 * **Contains:** Entity IDs created during seeding.
 */
export interface SeededScenario {
  /** Scenario name */
  name: string;

  /** Created entity IDs (keyed by entity type) */
  entities: Record<string, string | string[]>;

  /** Cleanup function to remove seeded data */
  cleanup: () => Promise<void>;
}

/**
 * Scenario builder DSL.
 *
 * **Fluent API:** Chain operations for readable scenario definitions.
 */
export interface ScenarioBuilder {
  /** Add a mutation step */
  mutate(mutation: TruthMutation): ScenarioBuilder;

  /** Add a seed step (bypasses truth engine) */
  seed(entity: string, data: Record<string, unknown>): ScenarioBuilder;

  /** Add a wait step */
  wait(ms: number): ScenarioBuilder;

  /** Add an assertion checkpoint */
  assert(name: string, fn: () => void | Promise<void>): ScenarioBuilder;

  /** Build the scenario definition */
  build(): ScenarioDefinition;
}
