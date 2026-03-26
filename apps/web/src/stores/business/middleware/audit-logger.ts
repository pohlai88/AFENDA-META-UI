/**
 * Audit Logger Middleware
 * ========================
 * Redux middleware for logging user actions to audit trail.
 *
 * Features:
 * - Logs all dispatched actions
 * - Tracks user actions for compliance
 * - Can be extended to send to analytics/monitoring
 */

import { type Middleware } from "@reduxjs/toolkit";
import { getAppConfig } from "~/lib/app-config";
import { logger } from '../../../lib/logger';
const log = logger.child({ module: 'audit-logger' });


const appConfig = getAppConfig();

/**
 * Audit logger middleware
 *
 * In production, this would send logs to a centralized logging service
 * (e.g., Sentry, Datadog, or custom audit API)
 */
export const auditLogger: Middleware = (store) => (next) => (action) => {
  const timestamp = new Date().toISOString();
  const state = store.getState();

  // Get user info from state (if available)
  const user = state.auth?.user;

  // Actions to audit (in real app, filter sensitive actions)
  const auditableActions = [
    "auth/login",
    "auth/logout",
    "permissions/setPermissions",
    "permissions/removePermission",
    "ui/sidebarToggle",
  ];

  if (typeof action === "object" && action !== null && "type" in action) {
    const actionType = (action as { type: string }).type;
    const shouldAudit = auditableActions.some((pattern) =>
      actionType.startsWith(pattern.replace("/*", ""))
    );

    if (shouldAudit) {
      // Log audit event
      log.warn("[AUDIT LOG]", {
        timestamp,
        user: user ? { id: user.id, email: user.email } : null,
        action: actionType,
        // Don't log sensitive payloads in production
        payload: appConfig.isDev ? action : "[redacted]",
      });

      // In production, send to audit API:
      // await fetch("/api/audit", {
      //   method: "POST",
      //   body: JSON.stringify({ timestamp, user, action: action.type }),
      // });
    }
  }

  return next(action);
};
