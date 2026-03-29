/**
 * Truth Test Harness - Public API
 * ================================
 * Deterministic truth engine testing infrastructure.
 *
 * **Core Philosophy:**
 * Test truth, not implementation. Verify invariants, not mocks.
 *
 * **Architecture:**
 * - Harness-centric: All operations go through TruthHarness
 * - Event collection: Events are logged and can be replayed
 * - Deterministic: Same inputs → same outputs
 * - Isolated: Each harness has its own DB and state
 */

// ==========================================
// Core Harness
// ==========================================
export { createTruthHarness } from "./harness/create-harness.js";
export type { TruthHarnessOptions } from "./harness/create-harness.js";
export { createTestDB } from "./harness/test-db.js";

// ==========================================
// Execution Layer
// ==========================================
export {
  executeMutation,
  executeMutationBatch,
} from "./execute/execute-mutation.js";
export { executeQuery } from "./execute/execute-query.js";
export {
  replayEvents,
  replayEventsForProjection,
} from "./execute/replay-events.js";

// ==========================================
// Assertion Layer
// ==========================================
export {
  assertInvariant,
  assertEntityInvariant,
  assertAllEntityInvariants,
  InvariantViolationError,
  AggregateInvariantViolationError,
} from "./assert/assert-invariant.js";

export {
  assertEvent,
  assertEventSequence,
  assertNoEvent,
  assertEventCount,
  EventAssertionError,
} from "./assert/assert-event.js";

export {
  assertState,
  assertExists,
  assertNotExists,
  assertRowCount,
  StateAssertionError,
} from "./assert/assert-state.js";

export {
  assertProjection,
  assertProjectionReplay,
  ProjectionAssertionError,
} from "./assert/assert-projection.js";

// ==========================================
// Seeding Layer
// ==========================================
export {
  seedEntity,
  seedEntityBatch,
  seedEntityViaEngine,
} from "./seed/seed-entity.js";

export {
  seedScenario,
  registerScenario,
  listScenarios,
  defineScenario,
} from "./seed/seed-scenario.js";

// ==========================================
// Type Definitions
// ==========================================
export type {
  TruthContext,
  TruthMutation,
  TruthMutationResult,
  TruthQuery,
  TruthQueryResult,
  TestDB,
  TruthHarness,
} from "./types/test-harness.js";

export type {
  ScenarioDefinition,
  SeededScenario,
  ScenarioStep,
  ScenarioBuilder,
} from "./types/scenario.js";

// ==========================================
// Auto-Test Generators
// ==========================================
export { evaluateCondition } from "./auto/evaluate-condition.js";
export { generateStateMachineTests } from "./auto/generate-state-machine-tests.js";
export { generateInvariantTests } from "./auto/generate-invariant-tests.js";
export { generatePolicyTests } from "./auto/generate-policy-tests.js";
