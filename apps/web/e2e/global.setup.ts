/**
 * Playwright Global Setup
 * ========================
 *
 * Runs once before all tests.
 * Use for:
 * - Authentication setup
 * - Database seeding
 * - Starting services
 * - Creating test fixtures
 */

import { test as setup, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, "auth.json");

/**
 * Example: Setup authentication state
 *
 * This runs once and saves authentication state to a file.
 * Other tests can reuse this state with: test.use({ storageState: 'e2e/auth.json' })
 */
setup("authenticate", async ({ page }) => {
  // Skip if not configured
  if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
    console.log("⚠️  Skipping authentication setup: TEST_USER_EMAIL or TEST_USER_PASSWORD not set");
    return;
  }

  console.log("🔐 Setting up authentication...");

  // Navigate to login page
  await page.goto("/login");

  // Fill in login form
  await page.fill('[name="email"]', process.env.TEST_USER_EMAIL);
  await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD);

  // Submit form
  await page.click('[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL("/dashboard");

  // Verify authentication succeeded
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

  // Save authentication state
  await page.context().storageState({ path: authFile });

  console.log("✅ Authentication setup complete");
});

/**
 * Example: Database seeding
 *
 * Setup test data that all tests can use
 */
setup("seed database", async ({ request }) => {
  console.log("🌱 Seeding test database...");

  // Skip if API not configured
  if (!process.env.API_URL) {
    console.log("⚠️  Skipping database seed: API_URL not set");
    return;
  }

  // Example: Create test data via API
  // const response = await request.post(`${process.env.API_URL}/test-data/seed`, {
  //   data: {
  //     users: 5,
  //     products: 10,
  //   },
  // })

  // expect(response.ok()).toBeTruthy()

  console.log("✅ Database seeded");
});

/**
 * Example: Service health check
 *
 * Verify required services are running
 */
setup("verify services", async ({ request }) => {
  console.log("🏥 Checking service health...");

  const baseURL = process.env.BASE_URL || "http://localhost:5173";

  try {
    const response = await request.get(baseURL);
    expect(response.ok()).toBeTruthy();
    console.log("✅ Services are healthy");
  } catch (error) {
    console.error("❌ Service health check failed:", error);
    throw error;
  }
});
