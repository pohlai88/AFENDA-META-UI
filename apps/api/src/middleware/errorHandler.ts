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
import {
  StorageIdempotencyInvalidError,
  StorageQuotaExceededError,
  StorageUploadBlockedError,
} from "@afenda/db/queries/storage";
import { logger } from "../logging/index.js";
import { MutationPolicyViolationError } from "../policy/mutation-command-gateway.js";

type RequestLog = {
  error: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
};

type RequestWithLog = Request & {
  log?: RequestLog;
};

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
  const log = (req as RequestWithLog).log ?? logger;
  log.error(
    {
      err,
      url: req.url,
      method: req.method,
      userId: (req as Request & { session?: { uid: string } }).session?.uid,
    },
    "Error caught by global handler"
  );

  if (err instanceof StorageQuotaExceededError) {
    const quotaErr = err as StorageQuotaExceededError;
    res.status(507).json({
      error: "Insufficient storage",
      code: quotaErr.code,
      message: quotaErr.message,
      details: {
        remainingBytes: quotaErr.remainingBytes.toString(),
        requiredBytes: quotaErr.requiredBytes.toString(),
        effectiveLimitBytes: quotaErr.effectiveLimitBytes.toString(),
        requestQuotaIncreasePath: "/api/storage/quota-requests",
      },
    });
    return;
  }

  if (err instanceof StorageUploadBlockedError) {
    const blockedErr = err as StorageUploadBlockedError;
    res.status(403).json({
      error: "Storage uploads blocked",
      code: blockedErr.code,
      message: blockedErr.message,
    });
    return;
  }

  if (err instanceof StorageIdempotencyInvalidError) {
    const idemErr = err as StorageIdempotencyInvalidError;
    res.status(409).json({
      error: "Invalid idempotency key",
      code: idemErr.code,
      message: idemErr.message,
    });
    return;
  }

  const maybeCode = (err as Error & { code?: string }).code;
  if (maybeCode === "STORAGE_TENANT_REQUIRED") {
    res.status(400).json({
      error: "Tenant required",
      code: maybeCode,
      message: err.message,
    });
    return;
  }

  if (maybeCode === "STORAGE_KEY_TENANT_MISMATCH") {
    res.status(400).json({
      error: "Storage key tenant mismatch",
      code: maybeCode,
      message: err.message,
    });
    return;
  }

  // ── Mutation policy violations → 409 ──────────────────────────────────
  if (err instanceof MutationPolicyViolationError) {
    res.status(err.statusCode).json({
      error: "Mutation policy violation",
      code: err.code,
      message: err.message,
      details: {
        model: err.model,
        operation: err.operation,
        mutationPolicy: err.mutationPolicy,
        policyId: err.policy?.id,
        source: err.source,
      },
    });
    return;
  }

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
  const log = (req as RequestWithLog).log ?? logger;
  log.warn({ url: req.url, method: req.method }, "404 Not Found");

  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.url} does not exist`,
    code: "NOT_FOUND",
  });
}

export { asyncHandler } from "./asyncHandler.js";
