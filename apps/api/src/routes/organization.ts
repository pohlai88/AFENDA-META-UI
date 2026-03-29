import { Router, type Request, type Response } from "express";
import { getOrganization, listOrganizations } from "../organization/index.js";
import {
  createOrganizationCommand,
  removeOrganizationCommand,
  updateOrganizationCommand,
} from "../organization/organization-command-service.js";
import { MutationPolicyViolationError } from "../policy/mutation-command-gateway.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { resolveActorId } from "./_shared/actor-resolution.js";

import type { OrganizationDefinition } from "@afenda/meta-types/platform";
const router = Router();

router.get("/", (_req: Request, res: Response) => {
  try {
    const organizations = listOrganizations();
    res.json({ organizations, count: organizations.length });
  } catch (_err) {
    res.status(500).json({ error: "Failed to list organizations" });
  }
});

router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const organization = req.body as OrganizationDefinition;
      if (!organization.id) {
        res.status(400).json({ error: "Organization must have an id" });
        return;
      }

      const result = await createOrganizationCommand({
        organization,
        actorId: resolveActorId(req),
      });

      res.status(201).json({
        data: organization,
        meta: {
          mutationPolicy: result.mutationPolicy,
          policyId: result.policy?.id,
          eventType: result.event?.eventType,
          eventId: result.event?.id,
        },
      });
    } catch (err) {
      if (err instanceof MutationPolicyViolationError) throw err;
      const msg = err instanceof Error ? err.message : "Failed to create organization";
      res.status(400).json({ error: msg });
    }
  })
);

router.get("/:organizationId", (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    const organization = getOrganization(organizationId);
    if (!organization) {
      return res.status(404).json({ error: `Organization "${organizationId}" not found` });
    }

    res.json(organization);
  } catch (_err) {
    res.status(500).json({ error: "Failed to get organization" });
  }
});

router.put(
  "/:organizationId",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const organization = req.body as OrganizationDefinition;
      if (organization.id !== req.params.organizationId) {
        res.status(400).json({ error: "Organization ID must match URL parameter" });
        return;
      }

      if (!getOrganization(organization.id)) {
        res.status(404).json({ error: `Organization "${organization.id}" not found` });
        return;
      }

      const result = await updateOrganizationCommand({
        organization,
        actorId: resolveActorId(req),
      });

      res.json({
        data: organization,
        meta: {
          mutationPolicy: result.mutationPolicy,
          policyId: result.policy?.id,
          eventType: result.event?.eventType,
          eventId: result.event?.id,
        },
      });
    } catch (err) {
      if (err instanceof MutationPolicyViolationError) throw err;
      const msg = err instanceof Error ? err.message : "Failed to update organization";
      res.status(400).json({ error: msg });
    }
  })
);

router.delete(
  "/:organizationId",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { organizationId } = req.params;
      if (!getOrganization(organizationId)) {
        res.status(404).json({ error: `Organization "${organizationId}" not found` });
        return;
      }

      const result = await removeOrganizationCommand({
        organizationId,
        actorId: resolveActorId(req),
      });

      if (!result.record) {
        res.status(404).json({ error: `Organization "${organizationId}" not found` });
        return;
      }

      res.json({
        message: "Organization deleted",
        meta: {
          mutationPolicy: result.mutationPolicy,
          policyId: result.policy?.id,
          eventType: result.event?.eventType,
          eventId: result.event?.id,
        },
      });
    } catch (err) {
      if (err instanceof MutationPolicyViolationError) throw err;
      res.status(500).json({ error: "Failed to delete organization" });
    }
  })
);

export default router;
