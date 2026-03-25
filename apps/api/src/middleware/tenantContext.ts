/**
 * Tenant Resolution Middleware
 * =============================
 *
 * Attaches ResolutionContext to each request.
 * Enables automatic metadata resolution in layout, policy, and rule engines.
 *
 * Resolution hierarchy (lowest = most specific):
 *   Global → Industry → Tenant → Department → User
 *
 * Any module can now call:
 *   const resolved = resolveMetadata(model, global, req.tenantContext);
 */

import type { Request, Response, NextFunction } from "express";
import type { SessionContext, ResolutionContext } from "@afenda/meta-types";
import { getTenant } from "../tenant/index.js";

declare global {
  namespace Express {
    interface Request {
      /** Tenant resolution context — scope of the current request */
      tenantContext?: ResolutionContext;
    }
  }
}

/**
 * Middleware that attaches a ResolutionContext to the request.
 * Called after authMiddleware to ensure session exists.
 */
export function tenantContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const session = (req as any).session as SessionContext | undefined;

  if (!session) {
    // No session — allow anonymous requests but with null context
    (req as any).tenantContext = {
      tenantId: "default",
      userId: undefined,
      departmentId: undefined,
      industry: undefined,
    } as ResolutionContext;
    next();
    return;
  }

  // Build ResolutionContext from session
  const tenantId =
    session.tenantId ?? req.headers["x-tenant-id"] ?? "default";
  const departmentId = session.departmentId ?? req.headers["x-department-id"];
  const industry = session.industry;

  (req as any).tenantContext = {
    tenantId: String(tenantId),
    userId: session.userId,
    departmentId: departmentId ? String(departmentId) : undefined,
    industry: industry ? String(industry) : undefined,
  } as ResolutionContext;

  next();
}
