/**
 * /api/graph REST routes
 * ======================
 *
 * GET  /api/graph/nodes                  → list all nodes
 * GET  /api/graph/nodes/:nodeId          → get node details
 * GET  /api/graph/:nodeId/related        → get related nodes via specified edge type
 * POST /api/graph/query                  → executecomplex graph query (BFS)
 * GET  /api/graph/stats                  → graph statistics
 */

import { Router, type Request, type Response } from "express";
import {
  getNode,
  listNodes,
  queryGraph,
  getRelated,
  resolveConflict,
  getGraphStats,
} from "../graph/index.js";
import { asyncHandler, ValidationError, NotFoundError } from "../middleware/errorHandler.js";
import type { GraphNode, GraphQuery, GraphNodeType, GraphEdgeType } from "@afenda/meta-types";

const router = Router();

// ────────────────────────────────────────────────────────────────────────
// Nodes
// ────────────────────────────────────────────────────────────────────────

router.get("/nodes", asyncHandler(async (req: Request, res: Response) => {
  const type = (req.query.type as GraphNodeType) || undefined;
  const nodes = listNodes(type);
  res.json({ nodes, count: nodes.length });
}));

router.get("/nodes/:nodeId", asyncHandler(async (req: Request, res: Response) => {
  const { nodeId } = req.params;
  const node = getNode(nodeId);
  if (!node) {
    throw new NotFoundError(`Node "${nodeId}" not found`);
  }
  res.json(node);
}));

// ────────────────────────────────────────────────────────────────────────
// Relationships
// ────────────────────────────────────────────────────────────────────────

router.get("/:nodeId/related", asyncHandler(async (req: Request, res: Response) => {
  const { nodeId } = req.params;
  const edgeType = (req.query.edgeType as GraphEdgeType) || undefined;
  if (!edgeType) {
    throw new ValidationError("edgeType query parameter is required");
  }
  const related = getRelated(nodeId, edgeType);
  res.json({ nodeId, edgeType, related, count: related.length });
}));

// ────────────────────────────────────────────────────────────────────────
// Graph Query (BFS Traversal)
// ────────────────────────────────────────────────────────────────────────

router.post("/query", asyncHandler(async (req: Request, res: Response) => {
  const query = req.body as GraphQuery;
  const result = queryGraph(query);
  res.json(result);
}));

// ────────────────────────────────────────────────────────────────────────
// Truth Resolution
// ────────────────────────────────────────────────────────────────────────

/**
 * Resolve conflicts among multiple nodes (e.g., multiple versions of an order).
 * Returns the node with highest truth priority, or latest timestamp on tie.
 */
router.post("/resolve", asyncHandler(async (req: Request, res: Response) => {
  const { nodes } = req.body as { nodes: unknown[] };
  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw new ValidationError("Nodes array is required and must not be empty");
  }
  const conflict = resolveConflict(nodes as GraphNode<Record<string, unknown>>[]);
  res.json({ conflict });
}));

// ────────────────────────────────────────────────────────────────────────
// Statistics
// ────────────────────────────────────────────────────────────────────────

router.get("/stats", asyncHandler(async (req: Request, res: Response) => {
  const stats = getGraphStats();
  res.json(stats);
}));

export default router;
