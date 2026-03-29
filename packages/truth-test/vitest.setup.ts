/**
 * Vitest Setup - Truth Test Harness Integration
 * ==============================================
 * Register global truth harness for test environment.
 *
 * **Usage:**
 * Configure vitest.config.ts:
 *
 * ```typescript
 * export default defineConfig({
 *   test: {
 *     setupFiles: ["./vitest.setup.ts"],
 *     globals: true
 *   }
 * });
 * ```
 *
 * Then in tests:
 *
 * ```typescript
 * test("my truth test", () => {
 *   const harness = global.__TRUTH__;
 *   // Use harness...
 * });
 * ```
 */

import { beforeEach } from "vitest";
import { createTruthHarness } from "./src/index.js";
import type { TruthHarness } from "./src/types/test-harness.js";

/**
 * Extend global namespace with truth harness.
 */
declare global {
  // eslint-disable-line no-var
  var __TRUTH__: TruthHarness | null;
}

/**
 * Create a new truth harness before each test.
 *
 * **Isolation:** Each test gets a fresh harness with clean state.
 *
 * **DB Guard:** If no database is available (pure-logic tests), harness is null.
 * Auto-generated tests and condition evaluator tests do not use the harness.
 */
beforeEach(() => {
  try {
    global.__TRUTH__ = createTruthHarness({
      tenantId: "1", // Numeric string for database compatibility
      userId: 1,
      clock: () => new Date("2026-03-28T00:00:00Z"), // Deterministic timestamp
    });
  } catch {
    // No database available — pure-logic tests (auto-generated, evaluate-condition)
    // run fine without a harness. Integration tests will fail if they need __TRUTH__.
    global.__TRUTH__ = null;
  }
});

/**
 * NOTE: We don't call reset() in afterEach because:
 * 1. The shared test database makes reset() slow (truncates 100+ tables)
 * 2. Tests should be isolated by using unique test data
 * 3. To clean up the test database, run: node tools/scripts/cleanup-test-db.mjs
 *
 * If you need cleanup for a specific test, call harness.reset() manually.
 */
