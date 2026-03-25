/**
 * Example Playwright E2E Test
 * ============================
 *
 * Demonstrates best practices for E2E testing:
 * - Page object pattern
 * - Test fixtures for isolation
 * - Proper assertions
 * - Error handling
 */

import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should load successfully", async ({ page }) => {
    // Navigate to the homepage
    await page.goto("/");

    // Wait for the page to be fully loaded
    await page.waitForLoadState("networkidle");

    // Assert the title
    await expect(page).toHaveTitle(/AFENDA/);

    // Verify the page loaded successfully
    await expect(page.locator("body")).toBeVisible();
  });

  test("should be responsive", async ({ page }) => {
    await page.goto("/");

    // Test different viewport sizes
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile
    await expect(page.locator("body")).toBeVisible();

    await page.setViewportSize({ width: 768, height: 1024 }); // Tablet
    await expect(page.locator("body")).toBeVisible();

    await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Setup: navigate to homepage before each test
    await page.goto("/");
  });

  test("should navigate between pages", async ({ page }) => {
    // Example: test navigation (adjust selectors based on your app)

    // Verify we're on the homepage
    await expect(page).toHaveURL("/");

    // Add your navigation tests here once routes are implemented
  });
});

// Example of using test tags for organization
test.describe("@smoke @critical", () => {
  test("critical user flow", async ({ page }) => {
    // Your critical path tests here
    await page.goto("/");
    await expect(page).toHaveTitle(/AFENDA/);
  });
});

// Example of handling authentication
test.describe("Authenticated Features", () => {
  test.use({ storageState: "e2e/auth.json" }); // Reuse auth state

  test.skip("should access protected route", async ({ page }) => {
    // Skip until auth is implemented
    await page.goto("/dashboard");

    // Verify authenticated content
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });
});

// Example of serial tests (dependent tests)
test.describe.serial("Data Flow", () => {
  test("step 1: create item", async ({ page }) => {
    // Create test data
  });

  test("step 2: verify item exists", async ({ page }) => {
    // Verify created data
  });

  test("step 3: delete item", async ({ page }) => {
    // Cleanup
  });
});
