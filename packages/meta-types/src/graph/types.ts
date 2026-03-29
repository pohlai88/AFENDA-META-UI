/**
 * @module graph
 * @description Business Truth Graph contracts for cross-entity node/edge relationships and resolution.
 * @layer truth-contract
 * @consumers api, web, db
 */

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

export interface GraphNode<TData = Record<string, unknown>> {
  id: string;
  type: GraphNodeType;
  data: TData;
  truthPriority: number;
  updatedAt: string;
}

export type GraphEdgeType =
  | "PLACED"
  | "RESERVES"
  | "APPROVED_BY"
  | "BELONGS_TO"
  | "GOVERNED_BY"
  | "EMPLOYS"
  | "OWNS"
  | "SUPPLIED_BY"
  | "COVERED_BY";

export interface GraphEdge {
  id: string;
  type: GraphEdgeType;
  fromId: string;
  toId: string;
  properties?: Record<string, unknown>;
  createdAt: string;
}

export interface GraphQuery {
  startNodeId?: string;
  nodeTypes?: GraphNodeType[];
  edgeTypes?: GraphEdgeType[];
  depth?: number;
}

export interface GraphQueryResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface TruthConflict {
  nodeId: string;
  conflictingNodes: GraphNode[];
  resolvedNode: GraphNode;
  strategy: "highest_priority" | "latest_timestamp";
}
