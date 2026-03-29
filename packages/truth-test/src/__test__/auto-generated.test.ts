/**
 * Auto-Generated Truth Tests
 * ============================
 * No hand-written test cases. Every test is derived from the declarative
 * truth-config: state machines, invariant registries, mutation policies.
 *
 * Add a new invariant to truth-config → test appears automatically.
 * Add a new state machine transition → test appears automatically.
 * Change a policy from dual-write to event-only → enforcement test updates.
 */

import {
  SALES_STATE_MACHINES,
  SALES_INVARIANT_REGISTRIES,
  MUTATION_POLICY_REGISTRY,
} from "@afenda/db/truth-compiler";

import { generateStateMachineTests } from "../auto/generate-state-machine-tests.js";
import { generateInvariantTests } from "../auto/generate-invariant-tests.js";
import { generatePolicyTests } from "../auto/generate-policy-tests.js";

// ---------------------------------------------------------------------------
// Activate: state machine transition graph exhaustive tests
// 3 machines × (structure + valid + invalid + terminal + reachability) tests
// ---------------------------------------------------------------------------
generateStateMachineTests(SALES_STATE_MACHINES);

// ---------------------------------------------------------------------------
// Activate: invariant condition evaluation tests
// 2 registries × (metadata + valid/invalid record synthesis) tests
// ---------------------------------------------------------------------------
generateInvariantTests(SALES_INVARIANT_REGISTRIES);

// ---------------------------------------------------------------------------
// Activate: mutation policy enforcement tests
// 9 policies × (metadata + per-model per-operation) tests
// ---------------------------------------------------------------------------
generatePolicyTests(MUTATION_POLICY_REGISTRY);
