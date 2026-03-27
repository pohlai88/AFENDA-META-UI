/**
 * @module mutation-policy
 * @description Runtime helpers for event-sourcing mutation policy enforcement.
 * @layer truth-contract
 * @consumers api, db
 */

import type {
  MutationOperation,
  MutationPolicyDefinition,
} from "./truth-model.js";

const DEFAULT_OPERATIONS: MutationOperation[] = ["create", "update", "delete"];

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

function operationsFor(policy: MutationPolicyDefinition): MutationOperation[] {
  return policy.directMutationOperations?.length ? policy.directMutationOperations : DEFAULT_OPERATIONS;
}

export function resolveMutationPolicy(
  input: MutationPolicyResolutionInput
): MutationPolicyDefinition | undefined {
  return input.policies.find((policy) => policy.appliesTo.includes(input.model));
}

export function isDirectMutationAllowed(
  input: DirectMutationPolicyCheckInput
): DirectMutationPolicyResult {
  const policy = resolveMutationPolicy(input);
  if (!policy) {
    return { allowed: true };
  }

  if (policy.mutationPolicy !== "event-only") {
    return { allowed: true, policy };
  }

  if (!operationsFor(policy).includes(input.operation)) {
    return { allowed: true, policy };
  }

  return {
    allowed: false,
    policy,
    reason:
      policy.description ??
      `Direct ${input.operation} is blocked for ${input.model} by event-only mutation policy ${policy.id}.`,
  };
}

export function assertDirectMutationAllowed(input: DirectMutationPolicyCheckInput): void {
  const result = isDirectMutationAllowed(input);
  if (result.allowed) return;

  throw new Error(result.reason ?? `Direct mutation blocked by policy ${result.policy?.id ?? "unknown"}`);
}