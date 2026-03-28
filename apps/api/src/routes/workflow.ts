/**
 * /api/workflows REST routes
 * ==========================
 *
 * GET    /api/workflows                         → list all workflow definitions
 * GET    /api/workflows/:id                     → get workflow definition
 * POST   /api/workflows                         → register new workflow
 * PUT    /api/workflows/:id                     → update workflow
 * DELETE /api/workflows/:id                     → remove workflow
 *
 * GET    /api/workflows/instances               → list instances
 * GET    /api/workflows/instances/:instanceId   → get instance details
 * POST   /api/workflows/instances/:instanceId/approve → submit approval decision
 *
 * POST   /api/workflows/trigger                 → manually trigger workflows by topic (test endpoint)
 */

import { Router, type Request, type Response } from "express";
import {
  getWorkflow,
  listWorkflows,
  triggerWorkflows,
  getInstance,
  listInstances,
  getWorkflowStats,
} from "../workflow/index.js";
import {
  advanceWorkflowInstanceCommand,
  createWorkflowCommand,
  removeWorkflowCommand,
  submitWorkflowApprovalCommand,
  updateWorkflowCommand,
} from "../workflow/workflow-command-service.js";
import { MutationPolicyViolationError } from "../policy/mutation-command-gateway.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { resolveActorId, resolveNumericActorId } from "./_shared/actor-resolution.js";
import type { WorkflowDefinition, WorkflowStatus } from "@afenda/meta-types";

const router = Router();

// ────────────────────────────────────────────────────────────────────────
// Workflow Definitions
// ────────────────────────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  try {
    const enabledOnly = req.query.enabled === "true";
    const tenantId = (req.query.tenantId as string) || undefined;
    const workflows = listWorkflows({
      enabledOnly,
      tenantId,
    });
    res.json({ workflows, count: workflows.length });
  } catch (_err) {
    res.status(500).json({ error: "Failed to list workflows" });
  }
});

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = getWorkflowStats();
    res.json(stats);
  } catch (_err) {
    res.status(500).json({ error: "Failed to get workflow stats" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workflow = getWorkflow(id);
    if (!workflow) {
      return res.status(404).json({ error: `Workflow "${id}" not found` });
    }
    res.json(workflow);
  } catch (_err) {
    res.status(500).json({ error: "Failed to get workflow" });
  }
});

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const def = req.body as WorkflowDefinition;
      if (!def.id) {
        res.status(400).json({ error: "Workflow must have an id" });
        return;
      }

      const result = await createWorkflowCommand({
        workflow: def,
        actorId: resolveActorId(req),
      });

      res.status(201).json({
        data: def,
        meta: {
          mutationPolicy: result.mutationPolicy,
          policyId: result.policy?.id,
          eventType: result.event?.eventType,
          eventId: result.event?.id,
        },
      });
    } catch (err) {
      if (err instanceof MutationPolicyViolationError) throw err;
      const msg = err instanceof Error ? err.message : "Failed to register workflow";
      res.status(400).json({ error: msg });
    }
  })
);

router.put(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const def = req.body as WorkflowDefinition;
      if (def.id !== req.params.id) {
        res.status(400).json({ error: "Workflow ID must match URL parameter" });
        return;
      }

      if (!getWorkflow(def.id)) {
        res.status(404).json({ error: `Workflow "${def.id}" not found` });
        return;
      }

      const result = await updateWorkflowCommand({
        workflow: def,
        actorId: resolveActorId(req),
      });

      res.json({
        data: def,
        meta: {
          mutationPolicy: result.mutationPolicy,
          policyId: result.policy?.id,
          eventType: result.event?.eventType,
          eventId: result.event?.id,
        },
      });
    } catch (err) {
      if (err instanceof MutationPolicyViolationError) throw err;
      const msg = err instanceof Error ? err.message : "Failed to update workflow";
      res.status(400).json({ error: msg });
    }
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!getWorkflow(id)) {
        res.status(404).json({ error: `Workflow "${id}" not found` });
        return;
      }

      const result = await removeWorkflowCommand({ workflowId: id, actorId: resolveActorId(req) });
      if (!result.record) {
        res.status(404).json({ error: `Workflow "${id}" not found` });
        return;
      }

      res.json({
        message: "Workflow deleted",
        meta: {
          mutationPolicy: result.mutationPolicy,
          policyId: result.policy?.id,
          eventType: result.event?.eventType,
          eventId: result.event?.id,
        },
      });
    } catch (err) {
      if (err instanceof MutationPolicyViolationError) throw err;
      res.status(500).json({ error: "Failed to delete workflow" });
    }
  })
);

// ────────────────────────────────────────────────────────────────────────
// Workflow Triggering
// ────────────────────────────────────────────────────────────────────────

/**
 * Manual trigger endpoint — testing/admin only.
 * Publishes an event to trigger matching workflows.
 */
router.post("/trigger", async (req: Request, res: Response) => {
  try {
    const { topic, context } = req.body as {
      topic: string;
      context?: Record<string, unknown>;
    };
    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }
    const instances = await triggerWorkflows(topic, context ?? {});
    res.json({ triggered: instances.length, instances });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to trigger workflows";
    res.status(400).json({ error: msg });
  }
});

// ────────────────────────────────────────────────────────────────────────
// Workflow Instances
// ────────────────────────────────────────────────────────────────────────

router.get("/instances", async (req: Request, res: Response) => {
  try {
    const workflowId = (req.query.workflowId as string) || undefined;
    const rawStatus = req.query.status;
    const status = typeof rawStatus === "string" ? (rawStatus as WorkflowStatus) : undefined;
    const instances = listInstances({
      workflowId,
      status,
    });
    res.json({ instances, count: instances.length });
  } catch (_err) {
    res.status(500).json({ error: "Failed to list instances" });
  }
});

router.get("/instances/:instanceId", async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params;
    const instance = getInstance(instanceId);
    if (!instance) {
      return res.status(404).json({ error: `Instance "${instanceId}" not found` });
    }
    res.json(instance);
  } catch (_err) {
    res.status(500).json({ error: "Failed to get instance" });
  }
});

/**
 * Advance an instance (not usually called directly — workflows auto-advance).
 * Useful for resuming after external actions.
 */
router.post(
  "/instances/:instanceId/advance",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { instanceId } = req.params;
      const { actor, stepInput } = req.body as {
        actor?: string | number;
        stepInput?: Record<string, unknown>;
      };
      const actorId = resolveNumericActorId(req, actor);
      if (!actorId) {
        res.status(400).json({
          error:
            "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user.",
        });
        return;
      }

      const result = await advanceWorkflowInstanceCommand({
        instanceId,
        actorId: String(actorId),
        stepInput,
      });

      res.json({
        data: result.record,
        meta: {
          mutationPolicy: result.mutationPolicy,
          policyId: result.policy?.id,
          eventType: result.event?.eventType,
          eventId: result.event?.id,
        },
      });
    } catch (err) {
      if (err instanceof MutationPolicyViolationError) throw err;
      const msg = err instanceof Error ? err.message : "Failed to advance instance";
      res.status(400).json({ error: msg });
    }
  })
);

/**
 * Submit an approval decision for a waiting instance.
 */
router.post(
  "/instances/:instanceId/approve",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { instanceId } = req.params;
      const { decision, actor, reason } = req.body as {
        decision: "approved" | "rejected";
        actor?: string | number;
        reason?: string;
      };
      const actorId = resolveNumericActorId(req, actor);
      if (!decision || !actorId) {
        res.status(400).json({
          error:
            "A numeric actorId is required. Provide it in the request body or authenticate as a numeric user.",
        });
        return;
      }

      const result = await submitWorkflowApprovalCommand({
        instanceId,
        decision,
        actorId: String(actorId),
        reason,
      });

      res.json({
        data: result.record,
        meta: {
          mutationPolicy: result.mutationPolicy,
          policyId: result.policy?.id,
          eventType: result.event?.eventType,
          eventId: result.event?.id,
        },
      });
    } catch (err) {
      if (err instanceof MutationPolicyViolationError) throw err;
      const msg = err instanceof Error ? err.message : "Failed to submit approval";
      res.status(400).json({ error: msg });
    }
  })
);

export default router;
