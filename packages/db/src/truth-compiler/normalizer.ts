/**
 * @module truth-compiler/normalizer
 * @description Resolves a TruthModel manifest into a fully concrete NormalizedTruthModel
 * by merging entity defs, flattening invariant registries, and filtering cross-references
 * to models declared in the manifest.
 * @layer db/truth-compiler
 */

import type { EntityDef, StateMachineDefinition } from "@afenda/meta-types/compiler";
import type { CrossInvariantDefinition, InvariantDefinition, InvariantRegistry, MutationPolicyDefinition } from "@afenda/meta-types/policy";
import type { TruthModel } from "@afenda/meta-types/compiler";

import type { NormalizedTruthModel } from "./types.js";

export interface NormalizerInput {
  /** The ID-reference manifest from the truth contract layer. */
  model: TruthModel;
  /**
   * Concrete entity definitions for the schema compiler stage.
   * These are merged with any entityDefs embedded in the manifest;
   * manifest-embedded defs take precedence (they are more specific).
   */
  entityDefs: EntityDef[];
  /** Invariant registries for models declared in the truth model manifest. */
  invariantRegistries: InvariantRegistry[];
  /** State machine definitions for models declaring lifecycle transitions. */
  stateMachines: StateMachineDefinition[];
  /** Cross-entity invariants for advanced compiler stages. */
  crossInvariantDefinitions?: CrossInvariantDefinition[];
  /** Event-sourcing rollout policies for compiler/runtime enforcement scaffolding. */
  mutationPolicies?: MutationPolicyDefinition[];
  /** Optional DB schema prefix for generated artifact names (default: "public"). */
  namespace?: string;
}

/**
 * Normalizes a TruthModel manifest into a concrete, resolved pipeline input.
 *
 * Resolution rules:
 * - Entity defs are merged; manifest-embedded defs win on conflict (more specific).
 * - Invariant registries are filtered to models declared in the manifest.
 * - Invariants are deduplicated by invariant ID (last writer wins on collision).
 * - State machines are filtered to declared models.
 * - Events are deduplicated.
 */
export function normalize(input: NormalizerInput): NormalizedTruthModel {
  const modelSet = new Set(input.model.entities);

  // 1. Build entity index — explicit entityDefs as baseline,
  //    then manifest.entityDefs override (they are more authoritative).
  const entityIndex = new Map<string, EntityDef>();
  for (const def of input.entityDefs) {
    entityIndex.set(def.name, def);
  }
  if (input.model.entityDefs) {
    for (const def of input.model.entityDefs) {
      entityIndex.set(def.name, def);
    }
  }

  // 2. Flatten + deduplicate invariants from registries for declared models only.
  const invariantIndex = new Map<string, InvariantDefinition>();
  for (const registry of input.invariantRegistries) {
    if (!modelSet.has(registry.model)) continue;
    for (const inv of registry.invariants) {
      invariantIndex.set(inv.id, inv);
    }
  }

  // 3. Filter state machines to declared models.
  const stateMachines = input.stateMachines.filter((sm) => modelSet.has(sm.model));
  const crossInvariants = (input.crossInvariantDefinitions ?? []).filter((crossInvariant) =>
    crossInvariant.involvedModels.every((modelId) => modelSet.has(modelId))
  );
  const mutationPolicies = (input.mutationPolicies ?? input.model.mutationPolicies ?? []).filter(
    (policy) => policy.appliesTo.every((modelId) => modelSet.has(modelId))
  );

  return {
    entities: Array.from(entityIndex.values()),
    invariants: Array.from(invariantIndex.values()),
    crossInvariants,
    mutationPolicies,
    stateMachines,
    events: [...new Set(input.model.events)],
    namespace: input.namespace,
  };
}
