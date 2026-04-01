import {
  salesTruthGraphEngine,
  type GraphTraversalResult,
  type SalesGraphLayer,
  type TruthEdgeRole,
} from "@afenda/db/schema/sales";

export type SalesTruthTraversalOptions = {
  layer?: SalesGraphLayer | readonly SalesGraphLayer[];
  role?: TruthEdgeRole | readonly TruthEdgeRole[];
  maxDepth?: number;
  includeStart?: boolean;
};

/**
 * Thin adapter around @afenda/db truth graph runtime.
 * Keeps deterministic traversal semantics in one import path for API services.
 */
export const resolveSalesTruthDependencies = (
  startTable: string,
  options?: SalesTruthTraversalOptions
): GraphTraversalResult =>
  salesTruthGraphEngine.resolveDependencies(startTable, {
    layer: options?.layer,
    role: options?.role,
    maxDepth: options?.maxDepth,
    includeStart: options?.includeStart,
  });

export const analyzeSalesTruthImpact = (startTable: string): GraphTraversalResult =>
  salesTruthGraphEngine.whatBreaksIf(startTable);

export const replaySalesTruthDerivations = (startTable: string): GraphTraversalResult =>
  salesTruthGraphEngine.replay(startTable);

export const propagateSalesTruthLock = (startTable: string): GraphTraversalResult =>
  salesTruthGraphEngine.propagateLock(startTable);

export const validateSalesTruthGraph = (layer: SalesGraphLayer = "truth") =>
  salesTruthGraphEngine.validateGraph(layer);

export const findSalesTruthEdges = (input: {
  layer?: SalesGraphLayer | readonly SalesGraphLayer[];
  from?: string;
  to?: string;
  role?: TruthEdgeRole | readonly TruthEdgeRole[];
  affectsPricing?: boolean;
  affectsAccounting?: boolean;
  lockPropagation?: boolean;
}) => salesTruthGraphEngine.findEdges(input);

/** Serialized on domain-event `metadata` for deterministic replay / impact tooling. */
export type SalesTruthImpactEventMetadata = {
  truthImpact: {
    graphLayer: "truth";
    operation: string;
    startTable: string;
    impactedNodes: string[];
    impactedEdgeIds: string[];
  };
};

export function buildSalesTruthImpactEventMetadata(
  startTable: string,
  operation: string
): SalesTruthImpactEventMetadata {
  const impact = analyzeSalesTruthImpact(startTable);
  return {
    truthImpact: {
      graphLayer: "truth",
      operation,
      startTable,
      impactedNodes: impact.nodes,
      impactedEdgeIds: impact.edges.map((edge) => edge.id),
    },
  };
}
