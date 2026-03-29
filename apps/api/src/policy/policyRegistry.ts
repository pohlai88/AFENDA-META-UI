/**
 * Policy Registry
 * ===============
 * In-memory store for PolicyDefinitions.
 * Provides scope-based lookup and CRUD for policies.
 *
 * Future: back by schema_registry table or dedicated policy table.
 */

import type { PolicyDefinition } from "@afenda/meta-types/policy";
const policies = new Map<string, PolicyDefinition>();

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export function registerPolicy(policy: PolicyDefinition): void {
  policies.set(policy.id, { ...policy });
}

export function registerPolicies(defs: PolicyDefinition[]): void {
  defs.forEach(registerPolicy);
}

export function getPolicy(id: string): PolicyDefinition | undefined {
  return policies.get(id);
}

export function removePolicy(id: string): boolean {
  return policies.delete(id);
}

export function clearPolicies(): void {
  policies.clear();
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/** Return all policies whose scope prefix-matches the given scope. */
export function getPoliciesForScope(scope: string): PolicyDefinition[] {
  const result: PolicyDefinition[] = [];

  policies.forEach((policy) => {
    if (policy.enabled === false) return;
    if (policy.scope === scope || scope.startsWith(`${policy.scope}.`)) {
      result.push(policy);
    }
  });

  return result;
}

/** Return policies that match ANY of the given tags. */
export function getPoliciesByTags(tags: string[]): PolicyDefinition[] {
  const tagSet = new Set(tags);
  const result: PolicyDefinition[] = [];

  policies.forEach((policy) => {
    if (policy.enabled === false) return;
    if (policy.policyTags?.some((t) => tagSet.has(t))) {
      result.push(policy);
    }
  });

  return result;
}

/** Return all registered policies (includes disabled). */
export function getAllPolicies(): PolicyDefinition[] {
  return Array.from(policies.values());
}
