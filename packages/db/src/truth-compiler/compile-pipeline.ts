/**
 * @module truth-compiler/compile-pipeline
 * @description Single source for ordered SQL segments — matches `generate-truth-sql.ts` orchestration.
 * @layer db/truth-compiler
 */

import { buildDependencyGraph } from "./dependency-graph.js";
import { compileCrossInvariants } from "./cross-invariant-compiler.js";
import { compileEvents } from "./event-compiler.js";
import { compileInvariants } from "./invariant-compiler.js";
import { compileMutationPolicies } from "./mutation-policy-compiler.js";
import { compileTransitions } from "./transition-compiler.js";
import type { NormalizedTruthModel, SqlSegment } from "./types.js";

function applyDependencyOrder(segments: SqlSegment[], order: string[]): SqlSegment[] {
  const orderIndex = new Map<string, number>();
  order.forEach((nodeId, index) => {
    orderIndex.set(nodeId, index);
  });

  return segments.map((segment) => ({
    ...segment,
    orderIndex: segment.nodeId ? orderIndex.get(segment.nodeId) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER,
  }));
}

/**
 * Compiles all truth stages in the same order as the CLI bundle generator, then applies
 * dependency-graph ordering indices for deterministic emission.
 */
export function buildOrderedSqlSegments(model: NormalizedTruthModel): SqlSegment[] {
  const dependencyGraph = buildDependencyGraph(model);
  return applyDependencyOrder(
    [
      ...compileInvariants(model),
      ...compileCrossInvariants(model, { strict: true }),
      ...compileMutationPolicies(model, { strict: true }),
      ...compileTransitions(model),
      ...compileEvents(model),
    ],
    dependencyGraph.order
  );
}
