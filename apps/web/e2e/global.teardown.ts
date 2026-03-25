/**
 * Playwright Global Teardown
 * ===========================
 *
 * Runs once after all tests complete.
 * Use for:
 * - Cleanup test data
 * - Stopping services
 * - Generating reports
 * - Sending notifications
 */

import { test as teardown } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, "auth.json");

/**
 * Cleanup authentication state
 */
teardown("cleanup auth", async () => {
  console.log("🧹 Cleaning up authentication state...");

  if (fs.existsSync(authFile)) {
    fs.unlinkSync(authFile);
    console.log("✅ Auth file removed");
  }
});

/**
 * Cleanup test data
 */
teardown("cleanup test data", async ({ request }) => {
  console.log("🧹 Cleaning up test data...");

  // Skip if API not configured
  if (!process.env.API_URL) {
    console.log("⚠️  Skipping cleanup: API_URL not set");
    return;
  }

  // Example: Delete test data via API
  // const response = await request.delete(`${process.env.API_URL}/test-data/cleanup`)
  //
  // if (response.ok()) {
  //   console.log('✅ Test data cleaned up')
  // } else {
  //   console.error('❌ Failed to cleanup test data')
  // }
});

/**
 * Generate test summary
 */
teardown("generate summary", async () => {
  console.log("📊 Generating test summary...");

  // You can generate custom reports here
  // This is useful for integrating with other tools

  console.log("✅ Test run complete");
});
