/**
 * Express entry point (Production-Hardened)
 * ==========================================
 * Mounts all routes with enterprise security middleware.
 *
 * Security features:
 *  ✓ Rate limiting (per route + global)
 *  ✓ Request logging (Winston)
 *  ✓ Input sanitization (XSS, NoSQL injection, path traversal)
 *  ✓ JWT + API key authentication
 *  ✓ Security headers (Helmet)
 *  ✓ CORS with origin allowlist
 *  ✓ Request compression
 *  ✓ Global error handling
 *
 * Routes:
 *   /meta        → schema registry (RBAC-filtered ModelMeta)
 *   /api         → generic CRUD (driven by schema registry)
 *   /graphql     → GraphQL Yoga (complex queries / dashboard data)
 *   /health      → liveness probe
 */

import express from "express";
import type { RequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

// Config
import config, { validateConfig } from "./config/index.js";
import { checkDatabaseConnection } from "./db/index.js";

// Middleware
import { authMiddleware } from "./middleware/auth.js";
import { tenantContextMiddleware } from "./middleware/tenantContext.js";
import { logger } from "./logging/index.js";
import { httpLogger } from "./middleware/logger.js";
import { sanitizeInput } from "./middleware/sanitize.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import {
  globalLimiter,
  apiLimiter,
  metaLimiter,
  graphqlLimiter,
} from "./middleware/rateLimiter.js";

// Routes
import metaRouter from "./routes/meta.js";
import apiRouter from "./routes/api.js";
import auditRouter from "./routes/audit.js";
import graphRouter from "./routes/graph.js";
import meshRouter from "./routes/mesh.js";
import workflowRouter from "./routes/workflow.js";
import tenantRouter from "./routes/tenant.js";
import expEngineRouter from "./routes/expEngine.js";
import uploadsRouter from "./routes/uploads.js";
import searchRouter from "./routes/search.js";
import salesRouter from "./routes/sales.js";
import { yoga } from "./graphql/server.js";
import { UPLOADS_PUBLIC_DIR, shouldServeLocalUploadsStatic } from "./uploads/storage.js";
import { startUploadRetentionJob } from "./uploads/cleanup.js";

// L7 Enterprise Pillars
import { subscribe as meshSubscribe } from "./mesh/index.js";
import { triggerWorkflows } from "./workflow/index.js";

// DB-backed persistence (Phase 4)
import { initTenantStore, enableTenantPersistence } from "./tenant/index.js";
import {
  flushAndStopAuditPersistence,
  enableAuditPersistence,
} from "./audit/decisionAuditLogger.js";

// ---------------------------------------------------------------------------
// Validate configuration on startup
// ---------------------------------------------------------------------------
validateConfig();

const app = express();
let stopUploadRetention: (() => void) | null = null;

// ---------------------------------------------------------------------------
// Trust proxy (required for rate limiting behind reverse proxy/load balancer)
// ---------------------------------------------------------------------------
if (config.isProd) {
  app.set("trust proxy", 1);
}

// ---------------------------------------------------------------------------
// Security headers (Helmet)
// ---------------------------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: config.isProd,
    crossOriginEmbedderPolicy: config.isProd,
    crossOriginOpenerPolicy: config.isProd,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: config.isProd
      ? {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        }
      : false,
    ieNoOpen: true,
    noSniff: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
  })
);

// ---------------------------------------------------------------------------
// CORS — tighten ALLOWED_ORIGINS in production
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) {
        cb(null, true);
        return;
      }

      if (config.allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        logger.warn({ origin }, "CORS blocked origin");
        cb(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    maxAge: 86400, // 24 hours
  })
);

// ---------------------------------------------------------------------------
// Compression
// ---------------------------------------------------------------------------
if (config.compressionEnabled) {
  app.use(
    compression({
      level: 6,
      threshold: 1024, // Only compress responses > 1KB
      filter: (req: express.Request, res: express.Response) => {
        if (req.headers["x-no-compression"]) {
          return false;
        }
        return compression.filter(req, res);
      },
    })
  );
}

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------
app.use(express.json({ limit: config.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));

// ---------------------------------------------------------------------------
// Request logging (pino-http — attaches req.log to every request)
// ---------------------------------------------------------------------------
app.use(httpLogger);

// ---------------------------------------------------------------------------
// Global rate limiter
// ---------------------------------------------------------------------------
if (config.rateLimitEnabled) {
  app.use(globalLimiter);
}

// ---------------------------------------------------------------------------
// Public uploads static serving (used by file/image field renderers)
// ---------------------------------------------------------------------------
if (shouldServeLocalUploadsStatic()) {
  app.use(
    "/uploads",
    express.static(UPLOADS_PUBLIC_DIR, {
      maxAge: config.isProd ? "7d" : 0,
    })
  );
}

// ---------------------------------------------------------------------------
// Input sanitization (XSS, NoSQL injection, path traversal)
// ---------------------------------------------------------------------------
app.use(sanitizeInput);

// ---------------------------------------------------------------------------
// Authentication — attach SessionContext to every request
// ---------------------------------------------------------------------------
app.use(authMiddleware);

// ---------------------------------------------------------------------------
// Tenant Context — attach ResolutionContext for metadata resolution
// ---------------------------------------------------------------------------
app.use(tenantContextMiddleware);

// ---------------------------------------------------------------------------
// Routes with specific rate limiters
// ---------------------------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

// Meta routes (lenient rate limit — mostly read-only schema queries)
if (config.rateLimitEnabled) {
  app.use("/meta", metaLimiter);
}
app.use("/meta", metaRouter);

// Audit route (before generic CRUD to avoid /:model catch-all)
app.use("/api", auditRouter);

// Enterprise Pillar routes (L7 nervous system)
if (config.rateLimitEnabled) {
  app.use("/api/graph", apiLimiter);
  app.use("/api/mesh", apiLimiter);
  app.use("/api/workflows", apiLimiter);
  app.use("/api/tenants", metaLimiter); // Slightly lighter — mostly metadata ops
  app.use("/api/rules", apiLimiter); // Rule evaluation
  app.use("/api/expressions", apiLimiter); // Expression testing
  app.use("/api/uploads", apiLimiter);
  app.use("/api/sales", apiLimiter);
}
app.use("/api/graph", graphRouter);
app.use("/api/mesh", meshRouter);
app.use("/api/workflows", workflowRouter);
app.use("/api/tenants", tenantRouter);
app.use("/api/rules", expEngineRouter);
app.use("/api/expressions", expEngineRouter);
app.use("/api", uploadsRouter);
app.use("/api/sales", salesRouter);

// Search route (before generic CRUD catch-all)
if (config.rateLimitEnabled) {
  app.use("/api/search", apiLimiter);
}
app.use("/api/search", searchRouter);

// API routes (standard rate limit — CRUD operations)
if (config.rateLimitEnabled) {
  app.use("/api", apiLimiter);
}
app.use("/api", apiRouter);

// GraphQL routes (moderate rate limit — expensive queries)
if (config.rateLimitEnabled) {
  app.use("/graphql", graphqlLimiter);
}
app.use("/graphql", yoga as unknown as RequestHandler);

// ---------------------------------------------------------------------------
// 404 handler (must come before error handler)
// ---------------------------------------------------------------------------
app.use(notFoundHandler);

// ---------------------------------------------------------------------------
// Global error handler (must be last)
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getDbErrorSummary(err: unknown): string {
  if (isRecord(err)) {
    const aggregateErrors = err.aggregateErrors;
    if (Array.isArray(aggregateErrors) && aggregateErrors.length > 0) {
      const first = aggregateErrors[0];
      if (isRecord(first) && typeof first.message === "string") {
        return first.message;
      }
    }

    if (typeof err.message === "string") {
      return err.message;
    }
  }

  return "Unknown database error";
}

/**
 * Initialize the Workflow Mesh Bridge
 * ====================================
 * Auto-trigger workflows when events are published to matching topics.
 * This connects the Real-Time Event Mesh with the Metadata-Driven Workflow Engine.
 */
function initWorkflowMeshBridge() {
  try {
    meshSubscribe(
      "*.*.*",
      (event) => {
        void (async () => {
          try {
            // Automatically trigger workflows matching this event topic
            await triggerWorkflows(event.topic, event.payload as Record<string, unknown>);
          } catch (err) {
            logger.error(
              { error: err instanceof Error ? err.message : String(err), topic: event.topic },
              "[Workflow] Failed to trigger workflows from mesh event"
            );
          }
        })();
      },
      { tenantId: null } // Wildcard subscription across all tenants
    );
    logger.info(
      "[Startup] Workflow Mesh Bridge initialized — workflows now auto-trigger on matching events"
    );
  } catch (err) {
    logger.error(
      { error: err instanceof Error ? err.message : String(err) },
      "[Startup] Failed to initialize Workflow Mesh Bridge"
    );
  }
}

async function startServer() {
  try {
    await checkDatabaseConnection();
    logger.info("[Startup] Database connectivity check passed");

    // Enable DB persistence now that connectivity is confirmed
    enableTenantPersistence();
    enableAuditPersistence();

    // Hydrate in-memory tenant cache from DB
    const stats = await initTenantStore();
    logger.info(
      { tenants: stats.tenants, overrides: stats.overrides, templates: stats.templates },
      "[Startup] Tenant store loaded from database"
    );
  } catch (err) {
    logger.error(
      { error: getDbErrorSummary(err) },
      "[Startup] Database connectivity check failed"
    );
    logger.error(
      "[Startup] API will continue to start, but database-backed routes will return DB_UNAVAILABLE until PostgreSQL is reachable"
    );
  }

  // Initialize enterprise pillars bridges
  initWorkflowMeshBridge();
  stopUploadRetention = startUploadRetentionJob({
    info: (message, meta) => logger.info(meta ?? {}, message),
    error: (message, meta) => logger.error(meta ?? {}, message),
  });

  app.listen(config.port, () => {
    logger.info(
      {
        port: config.port,
        environment: config.nodeEnv,
        endpoints: {
          graphql: `http://localhost:${config.port}/graphql`,
          meta: `http://localhost:${config.port}/meta`,
          api: `http://localhost:${config.port}/api`,
          health: `http://localhost:${config.port}/health`,
        },
      },
      "AFENDA API started"
    );
  });
}

void startServer();

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  stopUploadRetention?.();
  stopUploadRetention = null;
  void flushAndStopAuditPersistence().finally(() => {
    logger.flush();
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  stopUploadRetention?.();
  stopUploadRetention = null;
  void flushAndStopAuditPersistence().finally(() => {
    logger.flush();
    process.exit(0);
  });
});

export { app };
