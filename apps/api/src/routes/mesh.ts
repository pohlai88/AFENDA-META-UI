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
import { asyncHandler, ValidationError, NotFoundError } from "../middleware/errorHandler.js";

const router = Router();

// ────────────────────────────────────────────────────────────────────────
// Publishing
// ────────────────────────────────────────────────────────────────────────

router.post("/publish", asyncHandler(async (req: Request, res: Response) => {
  const { topic, payload, metadata } = req.body as {
    topic: string;
    payload?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };
  if (!topic) {
    throw new ValidationError("Topic is required");
  }
  const event = await publish(topic, payload ?? {}, { metadata });
  res.status(201).json(event);
}));

// ────────────────────────────────────────────────────────────────────────
// Dead-Letter Queue
// ────────────────────────────────────────────────────────────────────────

router.get("/dead-letters", asyncHandler(async (req: Request, res: Response) => {
  const dlq = getDeadLetters();
  res.json({ entries: dlq, count: dlq.length });
}));

router.post("/dead-letters/:index/retry", asyncHandler(async (req: Request, res: Response) => {
  const index = parseInt(req.params.index, 10);
  if (isNaN(index)) {
    throw new ValidationError("Index must be a number");
  }
  const succeeded = await retryDeadLetter(index);
  if (!succeeded) {
    throw new NotFoundError(`Dead-letter entry at index ${index} not found`);
  }
  res.json({ message: "Retry succeeded", index });
}));

// ────────────────────────────────────────────────────────────────────────
// Statistics
// ────────────────────────────────────────────────────────────────────────

router.get("/stats", asyncHandler(async (req: Request, res: Response) => {
  const stats = getMeshStats();
  res.json(stats);
}));

export default router;
