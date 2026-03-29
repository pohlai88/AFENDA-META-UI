/**
 * Business Truth Graph
 * ====================
 * Unified in-memory graph model for cross-module ERP entities.
 *
 * All entities become nodes. Relationships become edges.
 * Query across Customer → Order → Inventory → Employee without joins.
 *
 * In production, swap the in-memory stores for a graph DB (e.g. Neo4j, ArangoDB).
 */

import type { GraphNode, GraphEdge, GraphNodeType, GraphEdgeType, GraphQuery, GraphQueryResult, TruthConflict } from "@afenda/meta-types/graph";
// ---------------------------------------------------------------------------
// In-Memory Stores
// ---------------------------------------------------------------------------

const nodeStore = new Map<string, GraphNode>();
const edgeStore = new Map<string, GraphEdge>();
let edgeCounter = 0;

// ---------------------------------------------------------------------------
// Node ID helpers
// ---------------------------------------------------------------------------

/**
 * Build a globally unique node ID: "type:localId"
 */
export function buildNodeId(type: GraphNodeType, localId: string): string {
  return `${type}:${localId}`;
}

// ---------------------------------------------------------------------------
// Node CRUD
// ---------------------------------------------------------------------------

/**
 * Upsert a node into the graph.
 * If a node with the same ID already exists it is replaced.
 */
export function upsertNode<TData = Record<string, unknown>>(
  type: GraphNodeType,
  localId: string,
  data: TData,
  truthPriority = 50
): GraphNode<TData> {
  const id = buildNodeId(type, localId);
  const node: GraphNode<TData> = {
    id,
    type,
    data,
    truthPriority,
    updatedAt: new Date().toISOString(),
  };
  nodeStore.set(id, node as GraphNode);
  return node;
}

/**
 * Get a single node by its composite ID.
 */
export function getNode(id: string): GraphNode | undefined {
  return nodeStore.get(id);
}

/**
 * Get a node by type and local ID.
 */
export function getNodeByTypeId(type: GraphNodeType, localId: string): GraphNode | undefined {
  return nodeStore.get(buildNodeId(type, localId));
}

/**
 * Remove a node (and its connected edges) from the graph.
 */
export function removeNode(id: string): boolean {
  if (!nodeStore.has(id)) return false;
  nodeStore.delete(id);
  // Cascade delete edges
  for (const [edgeId, edge] of edgeStore) {
    if (edge.fromId === id || edge.toId === id) {
      edgeStore.delete(edgeId);
    }
  }
  return true;
}

/**
 * List all nodes, optionally filtered by type.
 */
export function listNodes(type?: GraphNodeType): GraphNode[] {
  const all = Array.from(nodeStore.values());
  return type ? all.filter((n) => n.type === type) : all;
}

// ---------------------------------------------------------------------------
// Edge CRUD
// ---------------------------------------------------------------------------

/**
 * Create a directed edge between two nodes.
 * Returns undefined if either node doesn't exist.
 */
export function createEdge(
  fromId: string,
  toId: string,
  type: GraphEdgeType,
  properties?: Record<string, unknown>
): GraphEdge | undefined {
  if (!nodeStore.has(fromId) || !nodeStore.has(toId)) return undefined;

  edgeCounter += 1;
  const edge: GraphEdge = {
    id: `edge_${edgeCounter}`,
    type,
    fromId,
    toId,
    properties,
    createdAt: new Date().toISOString(),
  };
  edgeStore.set(edge.id, edge);
  return edge;
}

/**
 * Remove an edge by ID.
 */
export function removeEdge(id: string): boolean {
  return edgeStore.delete(id);
}

/**
 * List edges, optionally filtered by type and/or node.
 */
export function listEdges(opts?: {
  type?: GraphEdgeType;
  fromId?: string;
  toId?: string;
}): GraphEdge[] {
  let edges = Array.from(edgeStore.values());
  if (opts?.type) edges = edges.filter((e) => e.type === opts.type);
  if (opts?.fromId) edges = edges.filter((e) => e.fromId === opts.fromId);
  if (opts?.toId) edges = edges.filter((e) => e.toId === opts.toId);
  return edges;
}

// ---------------------------------------------------------------------------
// Graph Traversal / Query
// ---------------------------------------------------------------------------

/**
 * Query the graph with optional traversal.
 *
 * Supports:
 * - Start from a node (startNodeId)
 * - Filter reachable nodes by type
 * - Follow specific edge types
 * - Bounded depth traversal
 */
export function queryGraph(query: GraphQuery): GraphQueryResult {
  const depth = query.depth ?? 1;

  // If no starting node, return all filtered nodes
  if (!query.startNodeId) {
    const nodes = listNodes().filter((n) => !query.nodeTypes || query.nodeTypes.includes(n.type));
    return { nodes, edges: [] };
  }

  const startNode = nodeStore.get(query.startNodeId);
  if (!startNode) return { nodes: [], edges: [] };

  const visitedNodeIds = new Set<string>();
  const resultNodes: GraphNode[] = [];
  const resultEdges: GraphEdge[] = [];

  function traverse(nodeId: string, currentDepth: number): void {
    if (visitedNodeIds.has(nodeId) || currentDepth > depth) return;
    visitedNodeIds.add(nodeId);

    const node = nodeStore.get(nodeId);
    if (!node) return;

    // Apply node type filter
    if (!query.nodeTypes || query.nodeTypes.includes(node.type)) {
      resultNodes.push(node);
    }

    if (currentDepth >= depth) return;

    // Traverse outbound edges
    for (const edge of edgeStore.values()) {
      if (edge.fromId !== nodeId) continue;
      if (query.edgeTypes && !query.edgeTypes.includes(edge.type)) continue;
      resultEdges.push(edge);
      traverse(edge.toId, currentDepth + 1);
    }
  }

  traverse(query.startNodeId, 0);
  return { nodes: resultNodes, edges: resultEdges };
}

/**
 * Find all nodes directly reachable from a node via a specific edge type.
 */
export function getRelated(nodeId: string, edgeType: GraphEdgeType): GraphNode[] {
  return listEdges({ fromId: nodeId, type: edgeType })
    .map((e) => nodeStore.get(e.toId))
    .filter((n): n is GraphNode => n !== undefined);
}

// ---------------------------------------------------------------------------
// Truth Resolution Engine
// ---------------------------------------------------------------------------

/**
 * When multiple nodes represent the same entity (e.g. draft + posted),
 * resolve which one is the authoritative truth.
 *
 * Strategy:
 * 1. Highest truthPriority wins.
 * 2. On tie, most recently updated wins.
 */
export function resolveConflict(nodes: GraphNode[]): TruthConflict | null {
  if (nodes.length < 2) return null;

  const nodeId = nodes[0].id;

  const sorted = [...nodes].sort((a, b) => {
    if (b.truthPriority !== a.truthPriority) {
      return b.truthPriority - a.truthPriority;
    }
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  const resolvedNode = sorted[0];
  const strategy: TruthConflict["strategy"] =
    nodes[0].truthPriority !== nodes[1].truthPriority ? "highest_priority" : "latest_timestamp";

  return {
    nodeId,
    conflictingNodes: nodes,
    resolvedNode,
    strategy,
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

export function getGraphStats(): { nodes: number; edges: number; types: string[] } {
  const types = [...new Set(Array.from(nodeStore.values()).map((n) => n.type))];
  return {
    nodes: nodeStore.size,
    edges: edgeStore.size,
    types,
  };
}

export function clearGraph(): void {
  nodeStore.clear();
  edgeStore.clear();
  edgeCounter = 0;
}
