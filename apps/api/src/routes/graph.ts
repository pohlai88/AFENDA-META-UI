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
import type { GraphQuery, GraphNodeType, GraphEdgeType } from "@afenda/meta-types";

const router = Router();

// ────────────────────────────────────────────────────────────────────────
// Nodes
// ────────────────────────────────────────────────────────────────────────

router.get("/nodes", async (req: Request, res: Response) => {
  try {
    const type = (req.query.type as GraphNodeType) || undefined;
    const nodes = listNodes(type);
    res.json({ nodes, count: nodes.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to list nodes" });
  }
});

router.get("/nodes/:nodeId", async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const node = getNode(nodeId);
    if (!node) {
      return res.status(404).json({ error: `Node "${nodeId}" not found` });
    }
    res.json(node);
  } catch (err) {
    res.status(500).json({ error: "Failed to get node" });
  }
});

// ────────────────────────────────────────────────────────────────────────
// Relationships
// ────────────────────────────────────────────────────────────────────────

router.get("/:nodeId/related", async (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    const edgeType = (req.query.edgeType as GraphEdgeType) || undefined;
    if (!edgeType) {
      return res.status(400).json({ error: "edgeType query parameter is required" });
    }
    const related = getRelated(nodeId, edgeType);
    res.json({ nodeId, edgeType, related, count: related.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to get related nodes" });
  }
});

// ────────────────────────────────────────────────────────────────────────
// Graph Query (BFS Traversal)
// ────────────────────────────────────────────────────────────────────────

router.post("/query", async (req: Request, res: Response) => {
  try {
    const query = req.body as GraphQuery;
    const result = queryGraph(query);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to execute graph query";
    res.status(400).json({ error: msg });
  }
});

// ────────────────────────────────────────────────────────────────────────
// Truth Resolution
// ────────────────────────────────────────────────────────────────────────

/**
 * Resolve conflicts among multiple nodes (e.g., multiple versions of an order).
 * Returns the node with highest truth priority, or latest timestamp on tie.
 */
router.post("/resolve", async (req: Request, res: Response) => {
  try {
    const { nodes } = req.body as { nodes: any[] };
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return res.status(400).json({ error: "Nodes array is required and must not be empty" });
    }
    const conflict = resolveConflict(nodes);
    res.json({ conflict });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to resolve conflict";
    res.status(400).json({ error: msg });
  }
});

// ────────────────────────────────────────────────────────────────────────
// Statistics
// ────────────────────────────────────────────────────────────────────────

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = getGraphStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Failed to get graph stats" });
  }
});

export default router;
