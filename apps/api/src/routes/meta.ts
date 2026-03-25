/**
 * /meta routes
 * ============
 *
 * GET  /meta              → list all registered model names
 * GET  /meta/:model       → MetaResponse (RBAC-filtered ModelMeta)
 *
 * The response is intentionally stateless: every field, action, and
 * permission is evaluated server-side per request based on the caller's
 * session roles. The client only receives what it is allowed to see.
 */

import { Router, type Request, type Response } from "express";
import { getSchema, listModels } from "../meta/registry.js";
import { applyRbac } from "../meta/rbac.js";
import { moduleRegistry } from "../meta/moduleRegistry.js";
import type { SessionContext } from "@afenda/meta-types";

const router = Router();

type RequestLog = {
  error: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
};

type RequestWithLog = Request & {
  log?: RequestLog;
};

// Typed helper — auth middleware guarantees session exists
function session(req: Request): SessionContext {
  return (req as Request & { session: SessionContext }).session;
}

// GET /meta
router.get("/", async (_req: Request, res: Response) => {
  try {
    const models = await listModels();
    res.json({ models });
  } catch (_err) {
    res.status(500).json({ error: "Failed to list models" });
  }
});

// GET /meta/modules (must come before /:model to avoid route collision)
router.get("/modules", async (req: Request, res: Response) => {
  try {
    const modules = moduleRegistry.getAll();
    res.json({ modules });
  } catch (err) {
    (req as RequestWithLog).log?.error({ err }, "GET /modules failed");
    res.status(500).json({ error: "Failed to retrieve modules" });
  }
});

// GET /meta/modules/:name
router.get("/modules/:name", async (req: Request, res: Response) => {
  const { name } = req.params;

  try {
    const module = moduleRegistry.get(name);

    if (!module) {
      res.status(404).json({ error: `Module "${name}" not found` });
      return;
    }

    res.json(module);
  } catch (err) {
    (req as RequestWithLog).log?.error({ err, name }, `GET /modules/${name} failed`);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /meta/menus
router.get("/menus", async (req: Request, res: Response) => {
  try {
    const menus = moduleRegistry.getMenus();
    res.json({ menus });
  } catch (err) {
    (req as RequestWithLog).log?.error({ err }, "GET /menus failed");
    res.status(500).json({ error: "Failed to retrieve menus" });
  }
});

// GET /meta/bootstrap
router.get("/bootstrap", async (req: Request, res: Response) => {
  try {
    const sess = session(req);
    const menus = moduleRegistry.getMenus();
    const permissions: Array<{ resource: string; actions: string[] }> = [];

    for (const module of menus) {
      let hasModuleReadAccess = false;

      for (const model of module.models) {
        try {
          const meta = await getSchema(model.name);

          if (!meta) {
            continue;
          }

          const response = applyRbac(meta, sess);

          if (!response.permissions.can_read) {
            continue;
          }

          hasModuleReadAccess = true;
          permissions.push({
            resource: `${module.module}.${model.name}`,
            actions: ["read"],
          });
        } catch (err) {
          (req as RequestWithLog).log?.warn(
            { err, module: module.module, model: model.name },
            "Skipping model during /meta/bootstrap due to metadata resolution error"
          );
        }
      }

      if (hasModuleReadAccess) {
        permissions.push({ resource: module.module, actions: ["read"] });
      }
    }

    res.json({
      role: sess.roles[0] ?? null,
      permissions,
    });
  } catch (err) {
    (req as RequestWithLog).log?.error({ err }, "GET /bootstrap failed");
    res.status(500).json({ error: "Failed to bootstrap permissions" });
  }
});

// GET /meta/:model
router.get("/:model", async (req: Request, res: Response) => {
  const { model } = req.params;

  try {
    const meta = await getSchema(model);

    if (!meta) {
      res.status(404).json({ error: `Model "${model}" not found in schema registry` });
      return;
    }

    const sess = session(req);
    const response = applyRbac(meta, sess);

    // If the role has no read permission, return 403
    if (!response.permissions.can_read) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    res.json(response);
  } catch (err) {
    (req as RequestWithLog).log?.error({ err, model }, `GET /${model} failed`);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
