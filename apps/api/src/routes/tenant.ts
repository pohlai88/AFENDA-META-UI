/**
 * /api/tenants REST routes
 * ========================
 *
 * GET    /api/tenants                    → list all tenants
 * POST   /api/tenants                    → register new tenant
 * GET    /api/tenants/:tenantId          → get tenant
 * PUT    /api/tenants/:tenantId          → update tenant
 * DELETE /api/tenants/:tenantId          → remove tenant
 *
 * GET    /api/tenants/:tenantId/overrides           → list overrides
 * POST   /api/tenants/:tenantId/overrides           → add override
 * DELETE /api/tenants/:tenantId/overrides/:overId   → remove override
 *
 * POST   /api/tenants/:tenantId/resolve/:model   → resolve metadata for model
 * GET    /api/tenants/:tenantId/stats            → tenant stats
 */

import { Router, type Request, type Response } from "express";
import {
  getTenant,
  listTenants,
  registerOverride,
  removeOverride,
  getOverridesForModel,
  resolveMetadata,
  validateOverride,
  registerIndustryTemplate,
  getTenantStats,
} from "../tenant/index.js";
import {
  registerTenantCommand,
  removeTenantCommand,
  updateTenantCommand,
} from "../tenant/tenant-command-service.js";
import { MutationPolicyViolationError } from "../policy/mutation-command-gateway.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { resolveActorId } from "./_shared/actor-resolution.js";
import type { TenantDefinition, MetadataOverride, ResolutionContext } from "@afenda/meta-types";

const router = Router();

// ────────────────────────────────────────────────────────────────────────
// Tenant Registry
// ────────────────────────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  try {
    const enabledOnly = req.query.enabled === "true";
    const tenants = listTenants(enabledOnly);
    res.json({ tenants, count: tenants.length });
  } catch (_err) {
    res.status(500).json({ error: "Failed to list tenants" });
  }
});

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const tenant = req.body as TenantDefinition;
      if (!tenant.id) {
        res.status(400).json({ error: "Tenant must have an id" });
        return;
      }

      const result = await registerTenantCommand({
        tenant,
        actorId: resolveActorId(req),
      });

      res.status(201).json({
        data: tenant,
        meta: {
          mutationPolicy: result.mutationPolicy,
          policyId: result.policy?.id,
          eventType: result.event?.eventType,
          eventId: result.event?.id,
        },
      });
    } catch (err) {
      if (err instanceof MutationPolicyViolationError) throw err;
      const msg = err instanceof Error ? err.message : "Failed to register tenant";
      res.status(400).json({ error: msg });
    }
  })
);

router.get("/:tenantId", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const tenant = getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: `Tenant "${tenantId}" not found` });
    }
    res.json(tenant);
  } catch (_err) {
    res.status(500).json({ error: "Failed to get tenant" });
  }
});

router.put(
  "/:tenantId",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const tenant = req.body as TenantDefinition;
      if (tenant.id !== req.params.tenantId) {
        res.status(400).json({ error: "Tenant ID must match URL parameter" });
        return;
      }

      if (!getTenant(tenant.id)) {
        res.status(404).json({ error: `Tenant "${tenant.id}" not found` });
        return;
      }

      const result = await updateTenantCommand({
        tenant,
        actorId: resolveActorId(req),
      });

      res.json({
        data: tenant,
        meta: {
          mutationPolicy: result.mutationPolicy,
          policyId: result.policy?.id,
          eventType: result.event?.eventType,
          eventId: result.event?.id,
        },
      });
    } catch (err) {
      if (err instanceof MutationPolicyViolationError) throw err;
      const msg = err instanceof Error ? err.message : "Failed to update tenant";
      res.status(400).json({ error: msg });
    }
  })
);

router.delete(
  "/:tenantId",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;
      if (!getTenant(tenantId)) {
        res.status(404).json({ error: `Tenant "${tenantId}" not found` });
        return;
      }

      const result = await removeTenantCommand({
        tenantId,
        actorId: resolveActorId(req),
      });

      if (!result.record) {
        res.status(404).json({ error: `Tenant "${tenantId}" not found` });
        return;
      }

      res.json({
        message: "Tenant deleted",
        meta: {
          mutationPolicy: result.mutationPolicy,
          policyId: result.policy?.id,
          eventType: result.event?.eventType,
          eventId: result.event?.id,
        },
      });
    } catch (err) {
      if (err instanceof MutationPolicyViolationError) throw err;
      res.status(500).json({ error: "Failed to delete tenant" });
    }
  })
);

// ────────────────────────────────────────────────────────────────────────
// Overrides (Customization Stack)
// ────────────────────────────────────────────────────────────────────────

router.get("/:tenantId/overrides", async (req: Request, res: Response) => {
  try {
    const model = (req.query.model as string) || undefined;
    const fields = model ? getOverridesForModel(model) : [];
    res.json({ overrides: fields, count: fields.length, model });
  } catch (_err) {
    res.status(500).json({ error: "Failed to list overrides" });
  }
});

router.post("/:tenantId/overrides", async (req: Request, res: Response) => {
  try {
    const override = req.body as MetadataOverride;
    if (!override.id) {
      return res.status(400).json({ error: "Override must have an id" });
    }

    // Validate before registering
    const violations = validateOverride(override);
    const errors = violations.filter((v) => v.severity === "error");
    if (errors.length > 0) {
      return res.status(400).json({
        error: "Override validation failed",
        violations: errors,
      });
    }

    registerOverride(override);
    res.status(201).json({
      id: override.id,
      message: "Override registered",
      warnings: violations.filter((v) => v.severity === "warning"),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to register override";
    res.status(400).json({ error: msg });
  }
});

router.delete("/:tenantId/overrides/:overrideId", async (req: Request, res: Response) => {
  try {
    const { overrideId } = req.params;
    const removed = removeOverride(overrideId);
    if (!removed) {
      return res.status(404).json({ error: `Override "${overrideId}" not found` });
    }
    res.json({ message: "Override deleted" });
  } catch (_err) {
    res.status(500).json({ error: "Failed to delete override" });
  }
});

// ────────────────────────────────────────────────────────────────────────
// Resolution Engine
// ────────────────────────────────────────────────────────────────────────

router.post("/:tenantId/resolve/:model", async (req: Request, res: Response) => {
  try {
    const { tenantId, model } = req.params;
    const { globalMeta, context } = req.body as {
      globalMeta: Record<string, unknown>;
      context?: Partial<ResolutionContext>;
    };
    if (!globalMeta) {
      return res.status(400).json({ error: "globalMeta is required" });
    }

    const resolved = resolveMetadata(model, globalMeta, {
      tenantId,
      departmentId: context?.departmentId,
      userId: context?.userId,
      industry: context?.industry,
    });

    res.json({ model, tenantId, resolved });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to resolve metadata";
    res.status(400).json({ error: msg });
  }
});

// ────────────────────────────────────────────────────────────────────────
// Industry Templates
// ────────────────────────────────────────────────────────────────────────

router.post("/industries/:industry/template", async (req: Request, res: Response) => {
  try {
    const { industry } = req.params;
    const template = req.body as Record<string, unknown>;
    if (!template || Object.keys(template).length === 0) {
      return res.status(400).json({ error: "Template cannot be empty" });
    }
    registerIndustryTemplate(industry, template);
    res.status(201).json({ industry, message: "Industry template registered" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to register industry template";
    res.status(400).json({ error: msg });
  }
});

// ────────────────────────────────────────────────────────────────────────
// Statistics
// ────────────────────────────────────────────────────────────────────────

router.get("/:tenantId/stats", async (req: Request, res: Response) => {
  try {
    const stats = getTenantStats();
    res.json(stats);
  } catch (_err) {
    res.status(500).json({ error: "Failed to get tenant stats" });
  }
});

export default router;
