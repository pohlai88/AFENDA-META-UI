/**
 * @module graph
 * @description Business Truth Graph contracts for cross-entity node/edge relationships and resolution.
 * @layer truth-contract
 * @consumers api, web, db
 */

/**
 * Business Truth Graph Types
 * ===========================
 * Unified graph model for cross-module ERP entities.
 *
 * All entities become nodes. Relationships become edges.
 * No module silos — one queryable truth layer.
 */

// ---------------------------------------------------------------------------
// Node Types (entity categories in the graph)
// ---------------------------------------------------------------------------

export type GraphNodeType =
  | "customer"
  | "order"
  | "employee"
  | "inventory"
  | "ledger"
  | "asset"
  | "vendor"
  | "contract"
  | "tenant"
  | "policy";

// ---------------------------------------------------------------------------
// Graph Node
// ---------------------------------------------------------------------------

export interface GraphNode<TData = Record<string, unknown>> {
  /** Globally unique node ID (e.g. "customer:cust-1") */
  id: string;
  /** Entity category */
  type: GraphNodeType;
  /** The actual entity data */
  data: TData;
  /**
   * Truth source priority — used by conflict resolution engine.
   * Higher number = higher authority.
   */
  truthPriority: number;
  /** ISO 8601 when this node was last written */
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Graph Edge (relationship between nodes)
// ---------------------------------------------------------------------------

export type GraphEdgeType =
  | "PLACED" // customer → order
  | "RESERVES" // order → inventory
  | "APPROVED_BY" // document → employee
  | "BELONGS_TO" // record → tenant
  | "GOVERNED_BY" // scope → policy
  | "EMPLOYS" // tenant → employee
  | "OWNS" // entity → asset
  | "SUPPLIED_BY" // order → vendor
  | "COVERED_BY"; // entity → contract

export interface GraphEdge {
  /** Unique edge ID */
  id: string;
  /** Edge relationship type */
  type: GraphEdgeType;
  /** Source node ID */
  fromId: string;
  /** Target node ID */
  toId: string;
  /** Optional edge payload (e.g. "qty reserved") */
  properties?: Record<string, unknown>;
  /** When the relationship was established */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Graph Query
// ---------------------------------------------------------------------------

export interface GraphQuery {
  /** Start from a specific node */
  startNodeId?: string;
  /** Filter to node types */
  nodeTypes?: GraphNodeType[];
  /** Follow these edge types when traversing */
  edgeTypes?: GraphEdgeType[];
  /** Max traversal depth (default: 1) */
  depth?: number;
}

export interface GraphQueryResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ---------------------------------------------------------------------------
// Truth Resolution
// ---------------------------------------------------------------------------

/** Priority levels for truth resolution */
export const TRUTH_PRIORITY: Record<string, number> = {
  posted_ledger: 100,
  approved_document: 80,
  draft_document: 50,
  user_input_cache: 20,
};

export interface TruthConflict {
  nodeId: string;
  conflictingNodes: GraphNode[];
  resolvedNode: GraphNode;
  strategy: "highest_priority" | "latest_timestamp";
}
