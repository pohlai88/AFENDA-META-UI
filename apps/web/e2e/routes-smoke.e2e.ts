/**
/**
 * Route Smoke Tests
 * ==================
 * Verifies every declared route in src/routes/index.tsx renders without
 * crashing. Mocks all backend endpoints so no API server is needed.
 *
 * Run locally:   pnpm --filter web e2e:chromium -- routes-smoke.e2e.ts
 * Run all:       pnpm --filter web e2e
 *
 * NOTE: waitForLoadState("networkidle") is intentionally NOT used — Vite's
 * HMR WebSocket keeps a persistent connection open, so "networkidle" never
 * resolves locally. All waiting is done via toBeVisible() retry-assertions.
 */

import { test, expect } from "@playwright/test";

// ── Shared helper ───────────────────────────────────────────────────────────

/** Waits for the AppShell sidebar navigation to be visible. */
async function expectAppShell(page: import("@playwright/test").Page) {
  await expect(
    page.locator('[role="navigation"][aria-label="Primary navigation"]')
  ).toBeVisible();
}

// ── Global API mocking — run without a live backend ──────────────────────────

/**
 * Mock the permissions bootstrap and all meta/api endpoints so the app can
 * render the shell without needing a running API server.
 *
 * Handler registration order matters: Playwright uses the FIRST matching
 * handler. Register specific paths before the catch-all `**\/meta\/**`.
 */
test.beforeEach(async ({ page }) => {
  // 1. Permissions bootstrap — prevents "Bootstrap failed: 502 Bad Gateway"
  await page.route("**/meta/bootstrap", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ role: "admin", permissions: [] }),
    });
  });

  // 2. Sidebar module menus — return empty list so AppShell renders cleanly
  await page.route("**/meta/menus", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ menus: [] }),
    });
  });

  // 3. Catch-all for remaining /meta/* calls (model schemas, etc.)
  await page.route("**/meta/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  // 4. REST API data calls — return empty collections
  await page.route("**/api/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0 }),
    });
  });

  // 5. GraphQL — return empty data so components don't crash on undefined
  await page.route("**/graphql", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: {} }),
    });
  });
});

// ── Static shell pages ────────────────────────────────────────────────────────
// These pages are purely client-rendered; no API data is needed to check
// that the AppShell and page heading render correctly.

test.describe("Static pages — AppShell routes", () => {
  test("/ — Dashboard home renders AppShell and heading", async ({ page }) => {
    await page.goto("/");
    await expectAppShell(page);
    await expect(page.getByRole("heading", { name: /Dashboard/i })).toBeVisible();
  });

  test("/examples/purchase-orders — renders AppShell and heading", async ({ page }) => {
    await page.goto("/examples/purchase-orders");
    await expectAppShell(page);
    await expect(page.getByRole("heading", { name: /Purchase Orders/i })).toBeVisible();
  });

  test("/payment-hub — renders AppShell and heading", async ({ page }) => {
    await page.goto("/payment-hub");
    await expectAppShell(page);
    await expect(page.getByRole("heading", { name: /Payment Hub/i })).toBeVisible();
  });

  test("/demo/suggestions — renders AppShell and heading", async ({ page }) => {
    await page.goto("/demo/suggestions");
    await expectAppShell(page);
    await expect(page.getByRole("heading", { name: /Personalized Suggestions/i })).toBeVisible();
  });
});

// ── Dynamic / parametric routes ───────────────────────────────────────────────
// The models and records don't exist in the mock backend so content may be in
// a loading/empty state — we only verify the AppShell renders without crashing.

test.describe("Dynamic routes — AppShell + layout", () => {
  test("/:module — /sales module landing renders AppShell", async ({ page }) => {
    await page.goto("/sales");
    await expectAppShell(page);
  });

  test("/:module/:model — /sales/sales_order renders AppShell", async ({ page }) => {
    await page.goto("/sales/sales_order");
    await expectAppShell(page);
    await expect(page.locator("text=Invalid route")).not.toBeVisible();
  });

  test("/:module/:model/new — create form renders AppShell", async ({ page }) => {
    await page.goto("/sales/sales_order/new");
    await expectAppShell(page);
    await expect(page.locator("text=Invalid route")).not.toBeVisible();
  });

  test("/:module/:model/:id — edit form renders AppShell", async ({ page }) => {
    await page.goto("/sales/sales_order/SO-001");
    await expectAppShell(page);
    await expect(page.locator("text=Invalid route")).not.toBeVisible();
  });

  test("/:module/:model/:id/:view — view page renders AppShell", async ({ page }) => {
    await page.goto("/sales/sales_order/SO-001/kanban");
    await expectAppShell(page);
    await expect(page.locator("text=Invalid route")).not.toBeVisible();
  });
});

// ── Error catalog ─────────────────────────────────────────────────────────────
// /errors is an AppShell-wrapped management page (not a standalone error page).

test.describe("/errors — error catalog page", () => {
  test("/errors renders ERP error catalog inside AppShell", async ({ page }) => {
    await page.goto("/errors");
    await expectAppShell(page);
    await expect(page.getByRole("heading", { name: /ERP Error Catalog/i })).toBeVisible();
  });
});

// ── Individual error pages ────────────────────────────────────────────────────
// These routes render standalone pages (no AppShell sidebar).

const errorPages = [
  { path: "/errors/401", code: "401" },
  { path: "/errors/403", code: "403" },
  { path: "/errors/408", code: "408" },
  { path: "/errors/409", code: "409" },
  { path: "/errors/422", code: "422" },
  { path: "/errors/429", code: "429" },
  { path: "/errors/500", code: "500" },
  { path: "/errors/503", code: "503" },
] as const;

test.describe("Individual error pages — standalone layout", () => {
  for (const { path, code } of errorPages) {
    test(`${path} — shows ${code} without AppShell`, async ({ page }) => {
      await page.goto(path);
      // Error code prominently displayed (e.g. <CardTitle>401</CardTitle>)
      await expect(page.locator(`text=${code}`).first()).toBeVisible();
      // Sidebar navigation is NOT present on standalone error pages
      await expect(
        page.locator('[role="navigation"][aria-label="Primary navigation"]')
      ).not.toBeVisible();
    });
  }
});

// ── 404 handling ──────────────────────────────────────────────────────────────

test.describe("404 handling", () => {
  test("/404 — direct route shows not found page", async ({ page }) => {
    await page.goto("/404");
    await expect(page.locator("text=404").first()).toBeVisible();
    await expect(page.locator("text=Page not found")).toBeVisible();
  });

  test("/* — unknown path shows 404 page", async ({ page }) => {
    await page.goto("/this-path-does-not-exist-xyz");
    await expect(page.locator("text=404").first()).toBeVisible();
    await expect(page.locator("text=Page not found")).toBeVisible();
  });
});

// ── Short-code redirects (/401 → /errors/401 etc.) ───────────────────────────

const shortCodeRedirects = [
  { from: "/401", to: "/errors/401" },
  { from: "/403", to: "/errors/403" },
  { from: "/408", to: "/errors/408" },
  { from: "/409", to: "/errors/409" },
  { from: "/422", to: "/errors/422" },
  { from: "/429", to: "/errors/429" },
  { from: "/500", to: "/errors/500" },
  { from: "/503", to: "/errors/503" },
] as const;

test.describe("Short-code redirects — /NNN → /errors/NNN", () => {
  for (const { from, to } of shortCodeRedirects) {
    test(`${from} redirects to ${to}`, async ({ page }) => {
      await page.goto(from);
      // React Router performs a client-side Navigate redirect; toHaveURL retries
      await expect(page).toHaveURL(new RegExp(to.replace(/\//g, "\\/")));
    });
  }
});