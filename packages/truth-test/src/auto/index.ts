/**
 * Auto-Test Generators — Public API
 * ===================================
 * Re-exports all auto-test generators and the condition evaluator.
 *
 * Usage in a test file:
 * ```ts
 * import { generateStateMachineTests, generateInvariantTests, generatePolicyTests } from "../auto/index.js";
 * import { SALES_STATE_MACHINES, SALES_INVARIANT_REGISTRIES, MUTATION_POLICIES } from "@afenda/db/truth-compiler";
 *
 * generateStateMachineTests(SALES_STATE_MACHINES);
 * generateInvariantTests(SALES_INVARIANT_REGISTRIES);
 * generatePolicyTests(MUTATION_POLICIES);
 * ```
 */

export { evaluateCondition } from "./evaluate-condition.js";
export { generateStateMachineTests } from "./generate-state-machine-tests.js";
export { generateInvariantTests } from "./generate-invariant-tests.js";
export { generatePolicyTests } from "./generate-policy-tests.js";
export { generatePropertyBasedTests, domainArbitraries } from "./generate-property-tests.js";
