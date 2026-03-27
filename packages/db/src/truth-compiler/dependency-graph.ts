/**
 * @module truth-compiler/dependency-graph
 * @description Phase 3.7 dependency graph stage for deterministic ordering and cycle detection.
 *
 * The graph captures compiler-visible dependencies across:
 * - entities
 * - invariants
 * - cross-invariants
 * - state machine transitions
 * - event contracts
 *
 * The output is deterministic and stable for reviewable compiler artifacts.
 */

import type { NormalizedTruthModel } from "./types.js";

export type DependencyNodeKind =
  | "entity"
  | "invariant"
  | "cross-invariant"
  | "transition"
  | "event";

export interface DependencyNode {
  id: string;
  kind: DependencyNodeKind;
  dependsOn: string[];
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  order: string[];
}

export interface DependencyCycleError {
  message: string;
  cyclePath: string[];
}

function normalizeInvariantNodeId(id: string): string {
  return id.startsWith("invariant:") ? id : `invariant:${id}`;
}

function nodeModelFromEventType(eventType: string): string {
  const dot = eventType.indexOf(".");
  return dot > -1 ? eventType.slice(0, dot) : "_global";
}

function sortStrings(values: Iterable<string>): string[] {
  return [...values].sort((left, right) =>
    left.localeCompare(right, "en", { sensitivity: "base" })
  );
}

export function buildDependencyGraph(model: NormalizedTruthModel): DependencyGraph {
  const nodes = new Map<string, DependencyNode>();

  for (const entity of model.entities) {
    const id = `entity:${entity.name}`;
    nodes.set(id, { id, kind: "entity", dependsOn: [] });
  }

  for (const invariant of model.invariants) {
    const id = normalizeInvariantNodeId(invariant.id);
    nodes.set(id, {
      id,
      kind: "invariant",
      dependsOn: [`entity:${invariant.targetModel}`],
    });
  }

  for (const crossInvariant of model.crossInvariants) {
    const id = `cross-invariant:${crossInvariant.id}`;
    const entityDependencies = crossInvariant.involvedModels.map((name) => `entity:${name}`);
    const explicitDependencies = crossInvariant.dependsOn.map((depId) =>
      depId.startsWith("cross-invariant:") ? depId : normalizeInvariantNodeId(depId)
    );

    nodes.set(id, {
      id,
      kind: "cross-invariant",
      dependsOn: sortStrings(new Set([...entityDependencies, ...explicitDependencies])),
    });
  }

  for (const stateMachine of model.stateMachines) {
    const id = `transition:${stateMachine.model}.${stateMachine.stateField}`;
    nodes.set(id, {
      id,
      kind: "transition",
      dependsOn: [`entity:${stateMachine.model}`],
    });
  }

  for (const eventType of model.events) {
    const eventModel = nodeModelFromEventType(eventType);
    const id = `event:${eventType}`;
    nodes.set(id, {
      id,
      kind: "event",
      dependsOn: [`entity:${eventModel}`],
    });
  }

  const order = topologicalSort(nodes);
  return { nodes, order };
}

export function topologicalSort(nodes: Map<string, DependencyNode>): string[] {
  const indegree = new Map<string, number>();
  const outgoing = new Map<string, Set<string>>();

  for (const [id] of nodes) {
    indegree.set(id, 0);
    outgoing.set(id, new Set());
  }

  for (const [id, node] of nodes) {
    for (const dep of node.dependsOn) {
      if (!nodes.has(dep)) {
        throw new Error(`dependency-graph: unknown dependency \"${dep}\" referenced by \"${id}\"`);
      }
      outgoing.get(dep)?.add(id);
      indegree.set(id, (indegree.get(id) ?? 0) + 1);
    }
  }

  const queue = sortStrings(
    [...indegree.entries()].filter(([, count]) => count === 0).map(([id]) => id)
  );
  const result: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    result.push(current);

    const dependents = sortStrings(outgoing.get(current) ?? []);
    for (const dependent of dependents) {
      const nextValue = (indegree.get(dependent) ?? 0) - 1;
      indegree.set(dependent, nextValue);
      if (nextValue === 0) {
        queue.push(dependent);
        queue.sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base" }));
      }
    }
  }

  if (result.length !== nodes.size) {
    const cycleError = detectCycle(nodes);
    throw new Error(cycleError.message);
  }

  return result;
}

export function detectCycle(nodes: Map<string, DependencyNode>): DependencyCycleError {
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const stack: string[] = [];

  function dfs(nodeId: string): string[] | null {
    visited.add(nodeId);
    inStack.add(nodeId);
    stack.push(nodeId);

    const current = nodes.get(nodeId);
    if (!current) return null;

    for (const dep of sortStrings(current.dependsOn)) {
      if (!visited.has(dep)) {
        const result = dfs(dep);
        if (result) return result;
      } else if (inStack.has(dep)) {
        const startIndex = stack.indexOf(dep);
        return [...stack.slice(startIndex), dep];
      }
    }

    stack.pop();
    inStack.delete(nodeId);
    return null;
  }

  for (const id of sortStrings(nodes.keys())) {
    if (visited.has(id)) continue;
    const cycle = dfs(id);
    if (cycle) {
      return {
        message: `dependency-graph cycle detected: ${cycle.join(" -> ")}`,
        cyclePath: cycle,
      };
    }
  }

  return {
    message: "dependency-graph cycle detection requested, but no cycle was found",
    cyclePath: [],
  };
}
