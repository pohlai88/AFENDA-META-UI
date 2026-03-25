/**
 * Action Executor Service
 * =======================
 * Executes custom model actions defined in module definitions.
 */

import type { Request, Response } from "express";
import { logger } from "../logging/index.js";

export interface ExecuteActionRequest {
  action: string;
  model: string;
  recordId?: string | string[];
  data?: Record<string, unknown>;
}

export interface ExecuteActionResponse {
  success: boolean;
  action: string;
  result?: unknown;
  error?: string;
}

/**
 * Execute a custom model action
 */
export async function executeAction(
  req: Request<{}, {}, ExecuteActionRequest>,
  res: Response<ExecuteActionResponse>
) {
  try {
    const { action, model, recordId, data } = req.body;

    if (!action || !model) {
      return res.status(400).json({
        success: false,
        action: action || "unknown",
        error: "Missing required fields: action, model",
      });
    }

    // Execute action
    let result: unknown;
    try {
      result = await executeActionHandler(action, {
        model,
        recordId,
        data,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Action execution failed";
      logger.error({ action, model }, errMsg);
      return res.status(500).json({
        success: false,
        action,
        error: errMsg,
      });
    }

    res.json({
      success: true,
      action,
      result,
    });
  } catch (err: unknown) {
    logger.error({ err }, "Execute action error");
    res.status(500).json({
      success: false,
      action: req.body.action || "unknown",
      error: "Internal server error",
    });
  }
}

/**
 * Execute action handler by name
 * Supports: "builtin:*" or custom function paths
 */
async function executeActionHandler(
  handler: string,
  context: {
    model: string;
    recordId?: string | string[];
    data?: Record<string, unknown>;
  }
): Promise<unknown> {
  if (handler.startsWith("builtin:")) {
    return executeBuiltinAction(handler.replace("builtin:", ""), context);
  }

  // For custom handlers, they would be resolved from the module
  throw new Error(`Custom handler not yet implemented: ${handler}`);
}

/**
 * Built-in action handlers
 */
async function executeBuiltinAction(
  name: string,
  context: {
    model: string;
    recordId?: string | string[];
    data?: Record<string, unknown>;
  }
): Promise<unknown> {
  switch (name) {
    case "export":
      return { exported: Array.isArray(context.recordId) ? context.recordId.length : 1 };

    case "duplicate":
      return { duplicated: context.recordId };

    case "send_email":
      return { sent: true, recipients: context.data?.recipients };

    case "generate_report":
      return { reportId: `report-${Date.now()}` };

    case "archive":
      return { archived: context.recordId };

    case "unarchive":
      return { unarchived: context.recordId };

    default:
      throw new Error(`Unknown built-in action: ${name}`);
  }
}
