/**
 * @module policy/mutation-policy
 * @description Type contracts for mutation policy resolution (runtime extracted to consumers).
 * @layer truth-contract
 * @consumers api, db
 */

import type { MutationOperation, MutationPolicyDefinition } from "../compiler/truth-model.js";

export type { MutationOperation, MutationPolicyDefinition } from "../compiler/truth-model.js";

export interface MutationPolicyResolutionInput {
  model: string;
  policies: MutationPolicyDefinition[];
}

export interface DirectMutationPolicyCheckInput extends MutationPolicyResolutionInput {
  operation: MutationOperation;
}

export interface DirectMutationPolicyResult {
  allowed: boolean;
  reason?: string;
  policy?: MutationPolicyDefinition;
}
