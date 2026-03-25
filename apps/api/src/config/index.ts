/**
 * Environment Configuration
 * =========================
 * Centralized config with validation and sensible defaults.
 *
 * SECURITY CHECKLIST:
 *  ✓ JWT_SECRET - MUST be 32+ chars in production
 *  ✓ DATABASE_URL - MUST use SSL in production
 *  ✓ ALLOWED_ORIGINS - Restrict to known domains
 *  ✓ NODE_ENV=production - Disables stack traces, enables optimizations
 */

import dotenv from "dotenv";

dotenv.config();

const isDev = process.env.NODE_ENV !== "production";

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function validateJwtSecret(secret: string): void {
  if (secret === "change-me-in-production") {
    console.warn("⚠️  WARNING: Using default JWT_SECRET. Set JWT_SECRET env var in production!");
  }

  if (!isDev && secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be at least 32 characters in production. Generate with: openssl rand -base64 32"
    );
  }
}

// ---------------------------------------------------------------------------
// Configuration object
// ---------------------------------------------------------------------------

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  isDev,
  isProd: !isDev,

  // Security
  jwtSecret: process.env.JWT_SECRET ?? "change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "24h",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  apiKeyHeader: process.env.API_KEY_HEADER ?? "X-API-Key",

  // CORS
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  // Database
  databaseUrl: requireEnv("DATABASE_URL"),

  // Rate limiting
  rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== "false",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 100),

  // Logging
  logLevel: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),

  // Body parsing
  bodyLimit: process.env.BODY_LIMIT ?? "2mb",

  // Compression
  compressionEnabled: process.env.COMPRESSION_ENABLED !== "false",
} as const;

// ---------------------------------------------------------------------------
// Validate config on startup
// ---------------------------------------------------------------------------

export function validateConfig(): void {
  console.warn("🔐 Validating security configuration...");

  // Validate JWT secret
  validateJwtSecret(config.jwtSecret);

  // Warn about insecure database URLs
  if (config.isProd && config.databaseUrl.includes("localhost")) {
    console.warn("⚠️  WARNING: Using localhost database in production");
  }

  if (config.isProd && !config.databaseUrl.includes("sslmode=require")) {
    console.warn("⚠️  WARNING: Database SSL not enforced. Add ?sslmode=require to DATABASE_URL");
  }

  // Validate CORS origins
  if (config.isProd && config.allowedOrigins.includes("*")) {
    throw new Error(
      "ALLOWED_ORIGINS cannot include wildcard (*) in production. Specify exact domains."
    );
  }

  console.warn("✓ Configuration validated successfully");
  console.warn(`  • Environment: ${config.nodeEnv}`);
  console.warn(`  • Port: ${config.port}`);
  console.warn(`  • CORS Origins: ${config.allowedOrigins.join(", ")}`);
  console.warn(`  • Rate Limiting: ${config.rateLimitEnabled ? "enabled" : "disabled"}`);
  console.warn(`  • Compression: ${config.compressionEnabled ? "enabled" : "disabled"}`);
}

export default config;
