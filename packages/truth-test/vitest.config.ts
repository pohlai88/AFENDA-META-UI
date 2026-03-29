import { defineConfig } from "vitest/config";
import path from "path";
import dotenv from "dotenv";

// Load package-local .env first, then root .env as fallback.
// This guarantees DB vars are available before any module imports.
dotenv.config({ path: path.resolve(__dirname, ".env"), override: false });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: false });

// CRITICAL: Set DATABASE_URL in process.env BEFORE any imports that use @afenda/db
// The @afenda/db module reads DATABASE_URL at import time, not runtime
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

if (process.env.TEST_DATABASE_URL_MIGRATIONS && !process.env.DATABASE_URL_MIGRATIONS) {
  process.env.DATABASE_URL_MIGRATIONS = process.env.TEST_DATABASE_URL_MIGRATIONS;
}

export default defineConfig({
  test: {
    // Global test utilities available without import
    globals: true,
    setupFiles: ["./vitest.setup.ts"],

    // Test isolation
    isolate: true,

    // Timeout for integration tests (may need database operations)
    testTimeout: 10000,
    hookTimeout: 10000,

    // Environment variables for test database
    // NOTE: This doesn't affect imports, see process.env.DATABASE_URL override above
    env: {
      NODE_ENV: "test",
      VITEST: "true",
    },

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "json-summary"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/vitest.setup.ts",
        "**/vitest.config.ts",
        "**/__test__/**",
        "index.ts",
        "types/**",
        "auto/generate-api-snapshot-tests.ts",
        "auto/generate-zod-tests.ts",
        "auto/event-type-registry.ts",
      ],
      // Truth-grade quality thresholds (see METRICS.md)
      thresholds: {
        lines: 80,
        functions: 85,
        branches: 75,
        statements: 80,
      },
      // Include source files for coverage analysis
      include: ["src/**/*.ts"],
    },

    // Scope test discovery to src/ only — prevents duplicate runs from dist/
    include: ["src/**/__test__/**/*.{test,spec}.{ts,js}"],
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
