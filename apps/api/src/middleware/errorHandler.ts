/**
 * Global Error Handler
 * =====================
 * Catches all errors and returns consistent JSON responses.
 * Never leaks stack traces or sensitive info in production.
 *
 * Error Types:
 *  • ValidationError (400)
 *  • UnauthorizedError (401)
 *  • ForbiddenError (403)
 *  • NotFoundError (404)
 *  • ConflictError (409)
 *  • InternalError (500)
 */

import type { Request, Response, NextFunction } from "express";
import { logger } from "../logging/index.js";

// ---------------------------------------------------------------------------
// Custom error classes
// ---------------------------------------------------------------------------

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, "VALIDATION_ERROR", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, message, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, message, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, "CONFLICT");
  }
}

export class InternalError extends AppError {
  constructor(message = "Internal server error") {
    super(500, message, "INTERNAL_ERROR");
  }
}

// ---------------------------------------------------------------------------
// Error handler middleware (must be registered last)
// ---------------------------------------------------------------------------

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const isDev = process.env.NODE_ENV !== "production";

  // Log error (use req.log from pino-http for automatic requestId context)
  const log = (req as any).log ?? logger;
  log.error(
    {
      err,
      url: req.url,
      method: req.method,
      userId: (req as Request & { session?: { uid: string } }).session?.uid,
    },
    "Error caught by global handler"
  );

  // Determine status code
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  // Build response
  const response: {
    error: string;
    message: string;
    code?: string;
    details?: unknown;
    stack?: string;
  } = {
    error: err.name,
    message: err.message,
  };

  if (err instanceof AppError) {
    response.code = err.code;
    response.details = err.details;
  }

  // Include stack trace in dev mode only
  if (isDev) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

// ---------------------------------------------------------------------------
// 404 handler (for undefined routes)
// ---------------------------------------------------------------------------

export function notFoundHandler(req: Request, res: Response) {
  const log = (req as any).log ?? logger;
  log.warn({ url: req.url, method: req.method }, "404 Not Found");

  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.url} does not exist`,
    code: "NOT_FOUND",
  });
}

// ---------------------------------------------------------------------------
// Async error wrapper - catches errors in async route handlers
// ---------------------------------------------------------------------------

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
