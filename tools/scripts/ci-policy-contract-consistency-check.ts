import {
  MUTATION_POLICIES,
  SCOPED_MUTATION_POLICIES,
} from "../../packages/db/src/truth-compiler/truth-config.ts";
import type { MutationOperation, MutationPolicyDefinition } from "@afenda/meta-types/policy";

const ALLOWED_OPERATIONS: ReadonlySet<MutationOperation> = new Set(["create", "update", "delete"]);

type ConsistencyIssue = {
  code: string;
  message: string;
};

function pushIssue(issues: ConsistencyIssue[], code: string, message: string): void {
  issues.push({ code, message });
}

function validatePolicyUniqueness(
  policies: MutationPolicyDefinition[],
  issues: ConsistencyIssue[]
): void {
  const ids = new Set<string>();
  const aggregateOwners = new Map<string, string>();

  for (const policy of policies) {
    if (ids.has(policy.id)) {
      pushIssue(issues, "duplicate-policy-id", `Duplicate mutation policy id: ${policy.id}`);
    }
    ids.add(policy.id);

    const appliesTo = new Set(policy.appliesTo ?? []);
    if (appliesTo.size === 0) {
      pushIssue(
        issues,
        "missing-applies-to",
        `Policy ${policy.id} must declare at least one aggregate in appliesTo.`
      );
      continue;
    }

    for (const aggregate of appliesTo) {
      const existingOwner = aggregateOwners.get(aggregate);
      if (existingOwner && existingOwner !== policy.id) {
        pushIssue(
          issues,
          "contradictory-aggregate-policy",
          `Aggregate ${aggregate} is declared by both ${existingOwner} and ${policy.id}.`
        );
        continue;
      }

      aggregateOwners.set(aggregate, policy.id);
    }
  }
}

function validateOperations(policy: MutationPolicyDefinition, issues: ConsistencyIssue[]): void {
  const operations = policy.directMutationOperations;
  if (!operations) {
    return;
  }

  const duplicates = operations.filter((op, index) => operations.indexOf(op) !== index);
  if (duplicates.length > 0) {
    pushIssue(
      issues,
      "duplicate-direct-operations",
      `Policy ${policy.id} repeats directMutationOperations: ${[...new Set(duplicates)].join(", ")}.`
    );
  }

  for (const operation of operations) {
    if (!ALLOWED_OPERATIONS.has(operation)) {
      pushIssue(
        issues,
        "unknown-direct-operation",
        `Policy ${policy.id} has unsupported directMutationOperation: ${String(operation)}.`
      );
    }
  }
}

function validateRequiredEvents(
  policy: MutationPolicyDefinition,
  issues: ConsistencyIssue[]
): void {
  if (policy.mutationPolicy === "direct") {
    return;
  }

  if (!policy.requiredEvents || policy.requiredEvents.length === 0) {
    pushIssue(
      issues,
      "missing-required-events",
      `Policy ${policy.id} uses ${policy.mutationPolicy} but does not declare requiredEvents.`
    );
    return;
  }

  const aggregatePrefixes = new Set((policy.appliesTo ?? []).map((aggregate) => `${aggregate}.`));
  for (const eventType of policy.requiredEvents) {
    const isMatchingAggregateEvent = [...aggregatePrefixes].some((prefix) =>
      eventType.startsWith(prefix)
    );
    if (!isMatchingAggregateEvent) {
      pushIssue(
        issues,
        "required-event-prefix-mismatch",
        `Policy ${policy.id} declares event ${eventType} that does not match appliesTo aggregates ${[
          ...aggregatePrefixes,
        ].join(", ")}.`
      );
    }
  }
}

function validateTargetModeDrift(
  policy: MutationPolicyDefinition,
  issues: ConsistencyIssue[]
): void {
  const { targetMode, mutationPolicy } = policy;
  if (!targetMode) {
    return;
  }

  // targetMode must be a valid forward transition from mutationPolicy
  const VALID_TRANSITIONS: Record<string, ReadonlySet<string>> = {
    direct: new Set(["dual-write", "event-only"]),
    "dual-write": new Set(["event-only"]),
    "event-only": new Set(["event-only"]), // already at target — no drift
  };

  const allowed = VALID_TRANSITIONS[mutationPolicy];
  if (!allowed || !allowed.has(targetMode)) {
    pushIssue(
      issues,
      "target-mode-drift",
      `Policy ${policy.id} declares targetMode="${targetMode}" which is not a valid forward transition from mutationPolicy="${mutationPolicy}".`
    );
  }

  // If already at target, the targetMode field is redundant but not an error
  if (mutationPolicy === targetMode) {
    pushIssue(
      issues,
      "target-mode-redundant",
      `Policy ${policy.id} declares targetMode="${targetMode}" equal to mutationPolicy — consider removing targetMode once promotion is complete.`
    );
  }
}

function validatePolicies(policies: MutationPolicyDefinition[]): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  validatePolicyUniqueness(policies, issues);

  for (const policy of policies) {
    validateOperations(policy, issues);
    validateRequiredEvents(policy, issues);
    validateTargetModeDrift(policy, issues);
  }

  return issues;
}

function validateScopedPolicies(
  scopedPolicies: MutationPolicyDefinition[],
  basePolicies: MutationPolicyDefinition[]
): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];
  const knownPolicyIds = new Set(basePolicies.map((policy) => policy.id));

  for (const policy of scopedPolicies) {
    if (knownPolicyIds.has(policy.id)) {
      pushIssue(
        issues,
        "duplicate-policy-id",
        `Scoped mutation policy reuses existing id: ${policy.id}.`
      );
      continue;
    }

    knownPolicyIds.add(policy.id);

    if ((policy.appliesTo ?? []).length === 0) {
      pushIssue(
        issues,
        "missing-applies-to",
        `Scoped policy ${policy.id} must declare at least one aggregate in appliesTo.`
      );
      continue;
    }

    validateOperations(policy, issues);
    validateRequiredEvents(policy, issues);
    validateTargetModeDrift(policy, issues);
  }

  return issues;
}

function main(): void {
  const issues = [
    ...validatePolicies(MUTATION_POLICIES),
    ...validateScopedPolicies(SCOPED_MUTATION_POLICIES, MUTATION_POLICIES),
  ];

  if (issues.length > 0) {
    console.error("❌ Policy contract consistency check failed.");
    for (const issue of issues) {
      console.error(`- [${issue.code}] ${issue.message}`);
    }
    process.exit(1);
  }

  console.log(
    `✅ Policy contract consistency check passed (${MUTATION_POLICIES.length + SCOPED_MUTATION_POLICIES.length} mutation policies validated).`
  );
}

main();
