/**
 * /api/mesh REST routes
 * ====================
 *
 * POST   /api/mesh/publish                → publish an event to the mesh
 * GET    /api/mesh/subscriptions          → list active subscriptions
 * GET    /api/mesh/dead-letters           → list failed events
 * POST   /api/mesh/dead-letters/:index/retry → retry a dead-letter event
 * GET    /api/mesh/stats                  → mesh statistics
 */

import { Router, type Request, type Response } from "express";
import { publish, getDeadLetters, retryDeadLetter, getMeshStats } from "../mesh/index.js";

const router = Router();

// ────────────────────────────────────────────────────────────────────────
// Publishing
// ────────────────────────────────────────────────────────────────────────

router.post("/publish", async (req: Request, res: Response) => {
  try {
    const { topic, payload, metadata } = req.body as {
      topic: string;
      payload?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    };
    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }
    const event = await publish(topic, payload ?? {}, { metadata });
    res.status(201).json(event);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to publish event";
    res.status(400).json({ error: msg });
  }
});

// ────────────────────────────────────────────────────────────────────────
// Dead-Letter Queue
// ────────────────────────────────────────────────────────────────────────

router.get("/dead-letters", async (req: Request, res: Response) => {
  try {
    const dlq = getDeadLetters();
    res.json({ entries: dlq, count: dlq.length });
  } catch (_err) {
    res.status(500).json({ error: "Failed to list dead-letter entries" });
  }
});

router.post("/dead-letters/:index/retry", async (req: Request, res: Response) => {
  try {
    const index = parseInt(req.params.index, 10);
    if (isNaN(index)) {
      return res.status(400).json({ error: "Index must be a number" });
    }
    const succeeded = await retryDeadLetter(index);
    if (!succeeded) {
      return res.status(404).json({ error: `Dead-letter entry at index ${index} not found` });
    }
    res.json({ message: "Retry succeeded", index });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to retry dead-letter entry";
    res.status(400).json({ error: msg });
  }
});

// ────────────────────────────────────────────────────────────────────────
// Statistics
// ────────────────────────────────────────────────────────────────────────

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = getMeshStats();
    res.json(stats);
  } catch (_err) {
    res.status(500).json({ error: "Failed to get mesh stats" });
  }
});

export default router;
