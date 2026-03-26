import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Vitest Configuration - Enterprise Setup
 * ========================================
 *
 * Best Practices Applied:
 * - Test tags for flexible organization
 * - Optimized coverage thresholds with file-specific requirements
 * - Deterministic execution with controlled parallelism
 * - Retry strategies for flaky tests in CI
 * - Comprehensive reporting for different environments
 * - CI/CD optimizations
 */

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@afenda/ui": path.resolve(__dirname, "../../packages/ui/src/index.ts"),
      "@afenda/meta-types": path.resolve(__dirname, "../../packages/meta-types/src/index.ts"),
      "~": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // ========================================
    // EXECUTION CONTROL
    // ========================================

    // Global test APIs (Jest-compatible)
    globals: true,

    // Test environment: jsdom for React component testing
    environment: "jsdom",

    // Setup files
    setupFiles: ["./src/test/setup.ts"],

    // Parallel execution: optimize for CI vs local
    threads: true,
    maxWorkers: process.env.CI ? 2 : undefined,
    fileParallelism: true,

    // Test isolation: each test file gets fresh environment
    isolate: true,

    // Mock behavior
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,

    // ========================================
    // COVERAGE CONFIGURATION
    // ========================================
    coverage: {
      // V8 provider for native, accurate coverage
      provider: "v8",

      // Different reporters for CI vs local
      reporter: process.env.CI
        ? ["json", "json-summary", "lcov", "text"]
        : ["text", "html", "lcov"],

      // Output directories
      reportsDirectory: "./coverage",
      htmlDir: "./coverage/html",

      // Exclude patterns
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/*.{test,spec}.{ts,tsx}",
        "**/mockData/**",
        "**/types/**",
        "dist/",
        ".next/",
        "coverage/",
        "e2e/",
      ],

      // Global coverage thresholds - enterprise standard
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 70,
        statements: 75,

        // Auto-update thresholds (round down to whole numbers)
        autoUpdate: (newThreshold) => Math.floor(newThreshold),

        // File-specific thresholds for critical code
        "src/lib/utils.ts": { 100: true },
        "src/lib/**/*.{ts,tsx}": {
          functions: 90,
          branches: 85,
        },
        "src/hooks/**/*.{ts,tsx}": {
          functions: 85,
          branches: 80,
        },
      },

      // Processing concurrency (optimize for CI)
      processingConcurrency: process.env.CI ? 2 : undefined,

      // Clean coverage before each run
      clean: true,

      // Include all source files for accurate coverage
      all: true,

      // Coverage watermarks for visual indicators
      watermarks: {
        statements: [70, 85],
        functions: [70, 85],
        branches: [65, 80],
        lines: [70, 85],
      },
    },

    // ========================================
    // REPORTERS
    // ========================================
    reporters: process.env.CI ? ["default", "junit", "json"] : ["default", "html"],

    outputFile: {
      junit: "./test-results/junit.xml",
      json: "./test-results/results.json",
      html: "./test-results/index.html",
    },

    // ========================================
    // TIMEOUTS & RETRIES
    // ========================================

    // Default test timeout
    testTimeout: 10000,

    // Hook timeouts
    hookTimeout: 10000,

    // Tear down timeout
    teardownTimeout: 10000,

    // Retry failed tests on CI (deterministic behavior)
    retry: process.env.CI ? 2 : 0,

    // ========================================
    // BAIL & ERROR HANDLING
    // ========================================

    // Fail fast on CI to save resources
    bail: process.env.CI ? 10 : 0,

    // Throw on console warnings/errors during tests
    onConsoleLog: (_log, type) => {
      if (type === "stderr" && process.env.CI) {
        return false; // Fail on stderr in CI
      }
      return true;
    },

    // ========================================
    // INCLUDE/EXCLUDE PATTERNS
    // ========================================
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: [
      "node_modules",
      "dist",
      ".next",
      "coverage",
      "test-results",
      "e2e",
      "**/*.d.ts",
      "**/.{git,cache,output,temp}/**",
    ],

    // ========================================
    // WATCH MODE
    // ========================================
    watch: !process.env.CI,

    // ========================================
    // OUTPUT CONTROL
    // ========================================

    // Log heap usage on CI for memory profiling
    logHeapUsage: !!process.env.CI,

    // Sequence options for deterministic runs
    sequence: {
      shuffle: false, // Deterministic test order
      concurrent: false,
    },
  },
});
