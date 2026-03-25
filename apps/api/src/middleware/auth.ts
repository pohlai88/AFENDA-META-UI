/**
 * JWT Authentication Middleware (Enhanced)
 * =========================================
 * Verifies the Bearer token attached to every request, inflates a
 * SessionContext, and attaches it to `req.session`.
 *
 * Token shape (claims):
 *   { sub: string, roles: string[], lang?: string, iat, exp, type?: "access" | "refresh" }
 *
 * Security features:
 *  • Access + Refresh token support
 *  • API key authentication for service-to-service communication
 *  • Configurable token expiry
 *  • Graceful degradation to anonymous viewer for public endpoints
 *
 * Uses `jose` for pure-JS verification (no native bindings needed).
 */

import type { Request, Response, NextFunction } from "express";
import { jwtVerify, SignJWT, type JWTPayload } from "jose";
import type { SessionContext } from "@afenda/meta-types";
import { UnauthorizedError } from "./errorHandler.js";
import config from "../config/index.js";

const JWT_SECRET = new TextEncoder().encode(config.jwtSecret);

interface AfendaClaims extends JWTPayload {
  roles?: string[];
  lang?: string;
  type?: "access" | "refresh";
}

// In production, store API keys in database with hashing
// For now, allow configuration via env var
const VALID_API_KEYS = new Set((process.env.API_KEYS ?? "").split(",").filter(Boolean));

// ---------------------------------------------------------------------------
// JWT Verification
// ---------------------------------------------------------------------------

async function verifyAccessToken(token: string): Promise<SessionContext> {
  try {
    const { payload } = await jwtVerify<AfendaClaims>(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });

    // Ensure it's an access token (not refresh)
    if (payload.type === "refresh") {
      throw new UnauthorizedError("Refresh token cannot be used for API access");
    }

    return {
      uid: payload.sub ?? "unknown",
      roles: payload.roles ?? ["viewer"],
      lang: payload.lang ?? "en",
    };
  } catch (err) {
    throw new UnauthorizedError("Invalid or expired token");
  }
}

// ---------------------------------------------------------------------------
// API Key Verification
// ---------------------------------------------------------------------------

function verifyApiKey(key: string): SessionContext | null {
  if (VALID_API_KEYS.has(key)) {
    return {
      uid: "service-account",
      roles: ["admin"], // API keys have admin access
      lang: "en",
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main Auth Middleware
// ---------------------------------------------------------------------------

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check for API key first (service-to-service auth)
    const apiKey = req.headers[config.apiKeyHeader.toLowerCase()] as string | undefined;
    if (apiKey) {
      const session = verifyApiKey(apiKey);
      if (session) {
        (req as Request & { session: SessionContext }).session = session;
        next();
        return;
      }
      throw new UnauthorizedError("Invalid API key");
    }

    // Check for Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      // Public meta endpoints may allow unauthenticated access with viewer role
      (req as Request & { session: SessionContext }).session = {
        uid: "anonymous",
        roles: ["viewer"],
        lang: "en",
      };
      next();
      return;
    }

    const token = authHeader.slice(7);
    const session = await verifyAccessToken(token);

    (req as Request & { session: SessionContext }).session = session;
    next();
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Require Authentication Helper
// ---------------------------------------------------------------------------

/**
 * Middleware that requires authenticated user (not anonymous)
 * Use after authMiddleware for protected routes
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = (req as Request & { session: SessionContext }).session;

  if (!session || session.uid === "anonymous") {
    throw new UnauthorizedError("Authentication required");
  }

  next();
}

// ---------------------------------------------------------------------------
// Role Check Helper
// ---------------------------------------------------------------------------

/**
 * Middleware factory that requires specific role(s)
 * Use after authMiddleware for role-protected routes
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const session = (req as Request & { session: SessionContext }).session;

    if (!session || session.uid === "anonymous") {
      throw new UnauthorizedError("Authentication required");
    }

    const hasRole = allowedRoles.some((role) => session.roles.includes(role));

    if (!hasRole) {
      throw new UnauthorizedError(`Forbidden: requires one of [${allowedRoles.join(", ")}]`);
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// Token Generation Utilities
// ---------------------------------------------------------------------------

/**
 * Generate access token (short-lived, for API access)
 */
export async function generateAccessToken(
  userId: string,
  roles: string[],
  lang = "en"
): Promise<string> {
  return new SignJWT({
    roles,
    lang,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(config.jwtExpiresIn)
    .sign(JWT_SECRET);
}

/**
 * Generate refresh token (long-lived, for obtaining new access tokens)
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  return new SignJWT({
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(config.jwtRefreshExpiresIn)
    .sign(JWT_SECRET);
}

/**
 * Verify refresh token and return userId
 */
export async function verifyRefreshToken(token: string): Promise<string> {
  try {
    const { payload } = await jwtVerify<AfendaClaims>(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (payload.type !== "refresh") {
      throw new Error("Not a refresh token");
    }

    return payload.sub ?? "";
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }
}
