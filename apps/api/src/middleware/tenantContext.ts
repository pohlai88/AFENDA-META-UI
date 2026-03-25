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

declare global {
  namespace Express {
    interface Request {
      /** Tenant resolution context — scope of the current request */
      tenantContext?: ResolutionContext;
      /** Auth session attached by auth middleware */
      session?: SessionContext;
    }
  }
}

/**
 * Middleware that attaches a ResolutionContext to the request.
 * Called after authMiddleware to ensure session exists.
 */
export function tenantContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const session = req.session;

  if (!session) {
    // No session — allow anonymous requests but with null context
    req.tenantContext = {
      tenantId: "default",
      userId: undefined,
      departmentId: undefined,
      industry: undefined,
    };
    next();
    return;
  }

  // Build ResolutionContext from session
  const tenantId = session.tenantId ?? req.headers["x-tenant-id"] ?? "default";
  const departmentId = session.departmentId ?? req.headers["x-department-id"];
  const industry = session.industry;

  req.tenantContext = {
    tenantId: String(tenantId),
    userId: session.userId ?? session.uid,
    departmentId: departmentId ? String(departmentId) : undefined,
    industry: industry ? String(industry) : undefined,
  };

  next();
}
