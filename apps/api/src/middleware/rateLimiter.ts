/**
 * Rate Limiting Middleware
 * ========================
 * Protects against brute force attacks, DDoS, and API abuse.
 *
 * Strategy:
 *  • Global rate limit: 100 requests/15min per IP
 *  • Auth endpoints: 5 attempts/15min per IP (stricter)
 *  • GraphQL: 50 requests/15min per IP (compute-heavy)
 *  • API endpoints: 100 requests/15min per IP
 *
 * In production, use Redis store for distributed rate limiting.
 */

import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request, Response } from "express";

// Custom key generator - use IP + user ID if authenticated
function keyGenerator(req: Request): string {
  const session = (req as Request & { session?: { uid: string } }).session;

  // Normalize IP using express-rate-limit helper to handle IPv6 safely.
  const forwardedFor = req.headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0]?.trim()
      : undefined;
  const rawIp = req.ip || forwardedIp || req.socket.remoteAddress || "unknown";
  const ip = ipKeyGenerator(rawIp);

  if (session?.uid && session.uid !== "anonymous") {
    return `${ip}:${session.uid}`;
  }

  return ip;
}

// Custom error handler
function handler(req: Request, res: Response) {
  res.status(429).json({
    error: "Too many requests",
    message: "Rate limit exceeded. Please try again later.",
    retryAfter: res.getHeader("Retry-After"),
  });
}

// ---------------------------------------------------------------------------
// Global rate limiter - applies to all routes
// ---------------------------------------------------------------------------

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator,
  handler,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/health";
  },
});

// ---------------------------------------------------------------------------
// Auth endpoints rate limiter - stricter limits
// ---------------------------------------------------------------------------

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler,
  skipSuccessfulRequests: true, // Don't count successful auth attempts
});

// ---------------------------------------------------------------------------
// GraphQL rate limiter - moderate limits (queries can be expensive)
// ---------------------------------------------------------------------------

export const graphqlLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Max 50 GraphQL operations per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler,
});

// ---------------------------------------------------------------------------
// API CRUD rate limiter - standard limits
// ---------------------------------------------------------------------------

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // Max 150 API calls per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler,
});

// ---------------------------------------------------------------------------
// Meta endpoints rate limiter - lenient (mostly read-only schema queries)
// ---------------------------------------------------------------------------

export const metaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Max 200 meta queries per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler,
});
