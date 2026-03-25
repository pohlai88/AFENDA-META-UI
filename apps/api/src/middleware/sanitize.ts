/**
 * Input Sanitization Middleware
 * ==============================
 * Protects against injection attacks by sanitizing user input.
 *
 * Security measures:
 *  • NoSQL injection prevention (mongo-sanitize)
 *  • XSS prevention (strips dangerous HTML/JS)
 *  • SQL injection prevention (parameterized queries via Drizzle)
 *  • Path traversal prevention
 *
 * Applied to:
 *  • req.body
 *  • req.query
 *  • req.params
 */

import mongoSanitize from "express-mongo-sanitize";
import type { Request, Response, NextFunction } from "express";

// ---------------------------------------------------------------------------
// MongoDB/NoSQL injection sanitizer
// ---------------------------------------------------------------------------

export const sanitizeNoSQL = mongoSanitize({
  replaceWith: "_", // Replace $ and . with underscore
  onSanitize: ({ req, key }) => {
    console.warn(`[SECURITY] Sanitized NoSQL injection attempt in ${key}`, {
      ip: req.ip,
      url: req.url,
    });
  },
});

// ---------------------------------------------------------------------------
// XSS sanitizer - strips dangerous HTML/script tags
// ---------------------------------------------------------------------------

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi, // onload=, onclick=, etc.
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
];

function sanitizeXSS(value: unknown): unknown {
  if (typeof value === "string") {
    let clean = value;
    for (const pattern of XSS_PATTERNS) {
      clean = clean.replace(pattern, "");
    }
    return clean;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeXSS);
  }

  if (value && typeof value === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      cleaned[key] = sanitizeXSS(val);
    }
    return cleaned;
  }

  return value;
}

export function xssSanitizer(req: Request, _res: Response, next: NextFunction) {
  if (req.body) {
    req.body = sanitizeXSS(req.body);
  }

  if (req.query) {
    req.query = sanitizeXSS(req.query) as typeof req.query;
  }

  if (req.params) {
    req.params = sanitizeXSS(req.params) as typeof req.params;
  }

  next();
}

// ---------------------------------------------------------------------------
// Path traversal sanitizer - prevents ../../../etc/passwd attacks
// ---------------------------------------------------------------------------

const PATH_TRAVERSAL_PATTERN = /\.\.[/\\]/g;

export function pathTraversalSanitizer(req: Request, res: Response, next: NextFunction) {
  // Check params for path traversal attempts
  for (const [key, value] of Object.entries(req.params)) {
    if (typeof value === "string" && PATH_TRAVERSAL_PATTERN.test(value)) {
      console.warn(`[SECURITY] Path traversal attempt blocked in param ${key}`, {
        value,
        ip: req.ip,
        url: req.url,
      });

      res.status(400).json({
        error: "Invalid request",
        message: "Path traversal detected",
      });
      return;
    }
  }

  // Check query params
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === "string" && PATH_TRAVERSAL_PATTERN.test(value)) {
      console.warn(`[SECURITY] Path traversal attempt blocked in query ${key}`, {
        value,
        ip: req.ip,
        url: req.url,
      });

      res.status(400).json({
        error: "Invalid request",
        message: "Path traversal detected",
      });
      return;
    }
  }

  next();
}

// ---------------------------------------------------------------------------
// Combined sanitizer - applies all sanitization steps
// ---------------------------------------------------------------------------

export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // First apply NoSQL sanitizer (it's a middleware function)
  sanitizeNoSQL(req, res, (err: unknown) => {
    if (err) {
      next(err);
      return;
    }

    // Then apply XSS sanitizer
    xssSanitizer(req, res, (xssErr: unknown) => {
      if (xssErr) {
        next(xssErr);
        return;
      }

      // Finally apply path traversal sanitizer
      pathTraversalSanitizer(req, res, next);
    });
  });
}
