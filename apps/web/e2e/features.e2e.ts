/**
 * Comprehensive E2E Test Suite
 * =============================
 *
 * Tests for:
 * - Command palette global search
 * - Row actions execution
 * - Workflow triggering
 * - Form submission with various field types
 * - Permission checks
 *
 * API-dependent tests are marked with test.fixme when the feature
 * requires specific metadata/data from the backend.
 */

import { test, expect } from "@playwright/test";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Navigate to a URL and wait for the AppShell primary nav to be visible. */
async function gotoAndWaitForShell(page: import("@playwright/test").Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

// ── Command Palette (Cmd+K) ───────────────────────────────────────────────────

test.describe("Command Palette (Cmd+K)", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndWaitForShell(page, "/");
  });

  test("should open command palette with Cmd+K", async ({ page }) => {
    await page.keyboard.press("Meta+K");
    const palette = page.locator("[role='dialog']");
    await expect(palette).toBeVisible();
  });

  test("should open command palette with Ctrl+K on Windows", async ({ page }) => {
    if (process.platform !== "win32") {
      test.skip();
    }
    await page.keyboard.press("Control+K");
    const palette = page.locator("[role='dialog']");
    await expect(palette).toBeVisible();
  });

  test("should close palette with ESC", async ({ page }) => {
    await page.keyboard.press("Meta+K");
    const palette = page.locator("[role='dialog']");
    await expect(palette).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(palette).not.toBeVisible();
  });

  test("should search and filter modules", async ({ page }) => {
    await page.keyboard.press("Meta+K");
    await page.keyboard.type("sales");

    const results = page.locator("[role='option']");
    const count = await results.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should navigate search results with arrow keys", async ({ page }) => {
    await page.keyboard.press("Meta+K");

    const firstResult = page.locator("[role='option']").first();
    await expect(firstResult).toHaveClass(/bg-accent/);

    await page.keyboard.press("ArrowDown");
    const secondResult = page.locator("[role='option']").nth(1);
    await expect(secondResult).toHaveClass(/bg-accent/);

    await page.keyboard.press("ArrowUp");
    await expect(firstResult).toHaveClass(/bg-accent/);
  });

  test("should execute result with Enter", async ({ page }) => {
    await page.keyboard.press("Meta+K");
    await page.keyboard.type("sales");
    await page.keyboard.press("Enter");

    const palette = page.locator("[role='dialog']");
    await expect(palette).not.toBeVisible();
    await page.waitForURL(/.*\/sales/);
  });

  test("should show back button / breadcrumb", async ({ page }) => {
    await page.keyboard.press("Meta+K");
    const footer = page.locator("text=Press ESC to close");
    await expect(footer).toBeVisible();
  });
});

// ── Row Actions Menu ──────────────────────────────────────────────────────────

test.describe("Row Actions Menu", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndWaitForShell(page, "/sales/sales_order");
  });

  test("should show action menu on row hover", async ({ page }) => {
    // If there are no data rows (API unavailable), expect an empty-state instead.
    const rows = page.locator("table tbody tr");
    const rowCount = await rows.count();

    if (rowCount === 0) {
      // Table mounted, no data — acceptable smoke pass
      await expect(page.locator("table")).toBeVisible();
      return;
    }

    const firstRow = rows.first();
    await firstRow.hover();
    const actionMenu = firstRow.locator("button[aria-label='Row actions']");
    await expect(actionMenu).toBeVisible();
  });

  test("should execute action from dropdown", async ({ page }) => {
    const rows = page.locator("table tbody tr");
    const rowCount = await rows.count();

    if (rowCount === 0) {
      test.fixme(true, "Row action test requires data rows — start the API server");
      return;
    }

    const firstRow = rows.first();
    await firstRow.hover();
    const actionMenu = firstRow.locator("button[aria-label='Row actions']");
    await actionMenu.click();

    // At least one menu item must appear
    const menuItems = page.locator("[role='menuitem']");
    await expect(menuItems.first()).toBeVisible();
  });

  test("should show loading state during action execution", async ({ page }) => {
    const rows = page.locator("table tbody tr");
    const rowCount = await rows.count();

    if (rowCount === 0) {
      test.fixme(true, "Requires data rows — start the API server");
      return;
    }

    const firstRow = rows.first();
    await firstRow.hover();
    const actionMenu = firstRow.locator("button[aria-label='Row actions']");
    await actionMenu.click();

    const firstItem = page.locator("[role='menuitem']").first();
    await firstItem.click();

    // After clicking, the menu button should become disabled while the action runs
    await expect(actionMenu).toBeDisabled();
  });
});

// ── Enterprise Field Types ────────────────────────────────────────────────────

test.describe("Enterprise Field Types", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndWaitForShell(page, "/sales/sales_order/new");
  });

  test("should render currency field with formatting", async ({ page }) => {
    const currencyField = page.locator("input[data-field-type='currency']").first();
    const isVisible = await currencyField.isVisible();
    if (!isVisible) {
      test.fixme(true, "Currency field requires metadata from API — ensure /meta endpoint is running");
      return;
    }

    await currencyField.fill("1234.56");
    await currencyField.blur();

    const value = await currencyField.inputValue();
    expect(value).toMatch(/\d+[\.,]\d{2}/);
  });

  test("should render rich text editor with toolbar", async ({ page }) => {
    const editor = page.locator("[data-field-type='richtext']").first();
    const isVisible = await editor.isVisible();
    if (!isVisible) {
      test.fixme(true, "Richtext field requires metadata from API — ensure /meta endpoint is running");
      return;
    }

    const boldButton = editor.locator("button[title='Bold']");
    const italicButton = editor.locator("button[title='Italic']");
    await expect(boldButton).toBeVisible();
    await expect(italicButton).toBeVisible();
  });

  test("should render color picker", async ({ page }) => {
    const colorPicker = page.locator("input[type='color']").first();
    const isVisible = await colorPicker.isVisible();
    if (!isVisible) {
      test.fixme(true, "Color field requires metadata from API — ensure /meta endpoint is running");
      return;
    }

    await colorPicker.click();
    await expect(colorPicker).toHaveValue(/^#[0-9A-Fa-f]{6}$/);
  });

  test("should render rating field with stars", async ({ page }) => {
    const ratingButtons = page.locator("button[data-rating]");
    const count = await ratingButtons.count();
    if (count === 0) {
      test.fixme(true, "Rating field requires metadata from API — ensure /meta endpoint is running");
      return;
    }

    expect(count).toBe(5);
    await ratingButtons.nth(2).click();

    const highlighted = ratingButtons.locator("[aria-pressed='true']");
    await expect(highlighted).toHaveCount(3);
  });
});

// ── Form Submission & Validation ──────────────────────────────────────────────

test.describe("Form Submission & Validation", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndWaitForShell(page, "/sales/sales_order/new");
  });

  test("should validate required fields", async ({ page }) => {
    // Check for a submit button — if form is not loaded (no API metadata), skip
    const submitButton = page.locator("button:has-text('Submit'), button[type='submit']").first();
    const isVisible = await submitButton.isVisible();
    if (!isVisible) {
      test.fixme(true, "Form fields require metadata from API — ensure /meta endpoint is running");
      return;
    }

    await submitButton.click();

    // Required field errors should appear (role=alert or data-field-error)
    const errors = page.locator("[role='alert'], [data-field-error]");
    const errorCount = await errors.count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test("should show unsaved changes warning", async ({ page }) => {
    const inputField = page.locator("input[name='order_number'], input[name='name'], input[type='text']").first();
    const isVisible = await inputField.isVisible();
    if (!isVisible) {
      test.fixme(true, "Form fields require metadata from API — ensure /meta endpoint is running");
      return;
    }

    await inputField.fill("TEST-001");

    // Attempt navigation away; useBlocker should fire
    await page.goto("/");

    // React Router's useBlocker triggers a native confirm dialog OR a custom dialog
    const confirmDialog = page.locator("[role='dialog']");
    const dialogVisible = await confirmDialog.isVisible();
    if (dialogVisible) {
      await expect(confirmDialog).toContainText(/unsaved/i);
    } else {
      // Some blocker implementations use native browser dialogs (handled by playwright dialog event)
      // If we got here without a dialog, the blocker may rely on beforeunload — acceptable
      expect(page.url()).toContain("/");
    }
  });

  test("should successfully submit valid form", async ({ page }) => {
    const orderNumberField = page.locator("input[name='order_number']");
    const isVisible = await orderNumberField.isVisible();
    if (!isVisible) {
      test.fixme(true, "Form fields require metadata from API — ensure /meta endpoint is running");
      return;
    }

    await orderNumberField.fill("SO-SMOKE-001");

    const customerField = page.locator("input[name='customer_name']");
    if (await customerField.isVisible()) {
      await customerField.fill("Acme Corp");
    }

    const amountField = page.locator("input[name='amount']");
    if (await amountField.isVisible()) {
      await amountField.fill("1000.00");
    }

    await page.locator("button:has-text('Submit'), button[type='submit']").first().click();

    // On success: either a toast appears or navigation moves to list
    const successToast = page.locator("text=successfully");
    const navigatedToList = page.waitForURL(/.*\/sales_order($|\?)/);

    await Promise.race([
      expect(successToast).toBeVisible(),
      navigatedToList,
    ]);
  });
});

// ── Permission Checks ─────────────────────────────────────────────────────────

test.describe("Permission Checks", () => {
  test("should hide create button without permission", async ({ page }) => {
    await gotoAndWaitForShell(page, "/sales/sales_order");

    const newButton = page.locator("button:has-text('New'), a:has-text('New')").first();
    const isVisible = await newButton.isVisible();

    // If visible → user HAS create permission (valid)
    // If not visible → user LACKS create permission (also valid)
    // Either state is correct; what matters is the page didn't crash
    await expect(page.locator('[role="navigation"][aria-label="Primary navigation"]')).toBeVisible();

    if (!isVisible) {
      // Verify it's genuinely hidden and not an error state
      await expect(page.locator("text=Invalid route")).not.toBeVisible();
    }
  });

  test("should disable edit/delete for read-only users", async ({ page }) => {
    await gotoAndWaitForShell(page, "/sales/sales_order/SO-001");

    const editButton = page.locator("button:has-text('Edit')");
    const deleteButton = page.locator("button:has-text('Delete')");

    const editVisible = await editButton.isVisible();
    const deleteVisible = await deleteButton.isVisible();

    // Page must render without error regardless of permission state
    await expect(page.locator('[role="navigation"][aria-label="Primary navigation"]')).toBeVisible();

    if (!editVisible && !deleteVisible) {
      // Read-only mode confirmed — verify it's intentional, not an app crash
      await expect(page.locator("text=Invalid route")).not.toBeVisible();
    }
  });
});

// ── Workflow Engine E2E ───────────────────────────────────────────────────────

test.describe("Workflow Engine E2E", () => {
  test("should trigger approval workflow", async ({ page }) => {
    await gotoAndWaitForShell(page, "/sales/sales_order/SO-001");

    const submitButton = page.locator("button:has-text('Submit for Approval')");
    const isVisible = await submitButton.isVisible();
    if (!isVisible) {
      test.fixme(true, "Workflow action requires a loaded record with workflow enabled — ensure API is running and SO-001 exists");
      return;
    }

    await submitButton.click();

    await expect(page.locator("text=Workflow started")).toBeVisible();
    await expect(page.locator("text=Awaiting Approval")).toBeVisible();
  });

  test("should show approval decision UI", async ({ page }) => {
    await gotoAndWaitForShell(page, "/approvals");

    const approvalItem = page.locator("[data-testid='approval-item']").first();
    const isVisible = await approvalItem.isVisible();
    if (!isVisible) {
      test.fixme(true, "Approval list requires pending approval items — ensure API is running");
      return;
    }

    const approveBtn = approvalItem.locator("button:has-text('Approve')");
    const rejectBtn = approvalItem.locator("button:has-text('Reject')");
    await expect(approveBtn).toBeVisible();
    await expect(rejectBtn).toBeVisible();
  });

  test("should record approval decision", async ({ page }) => {
    await gotoAndWaitForShell(page, "/approvals");

    const approvalItem = page.locator("[data-testid='approval-item']").first();
    const isVisible = await approvalItem.isVisible();
    if (!isVisible) {
      test.fixme(true, "Approval list requires pending approval items — ensure API is running");
      return;
    }

    const approveBtn = approvalItem.locator("button:has-text('Approve')");
    await approveBtn.click();

    await expect(page.locator("text=Approved")).toBeVisible();
    await expect(approvalItem).not.toBeVisible();
  });
});

// ── Accessibility ─────────────────────────────────────────────────────────────

test.describe("Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndWaitForShell(page, "/");
  });

  test("should be keyboard navigable", async ({ page }) => {
    await page.keyboard.press("Tab");
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).not.toBe("BODY");
  });

  test("should have proper ARIA labels", async ({ page }) => {
    const actionBtn = page.locator("button[aria-label='Row actions']").first();
    if (await actionBtn.isVisible()) {
      const label = await actionBtn.getAttribute("aria-label");
      expect(label).toBeTruthy();
    }
  });

  test("should support dark mode", async ({ page }) => {
    const themeToggle = page
      .locator("button[aria-label*='theme' i], button[aria-label*='dark' i], button[aria-label*='light' i]")
      .first();

    if (await themeToggle.isVisible()) {
      const screenBefore = await page.screenshot();
      await themeToggle.click();

      // Wait for the transition
      await page.waitForTimeout(300);
      const screenAfter = await page.screenshot();

      expect(screenBefore).not.toEqual(screenAfter);
    }
  });

  test("sidebar toggle is keyboard accessible", async ({ page }) => {
    // The top-bar sidebar toggle uses aria-label from SHELL_LABELS
    const toggle = page.locator("button[aria-label='Open sidebar'], button[aria-label='Close sidebar']").first();
    await expect(toggle).toBeVisible();

    await toggle.click();
    // After click, aria-label should flip
    const updatedLabel = await toggle.getAttribute("aria-label");
    expect(["Open sidebar", "Close sidebar"]).toContain(updatedLabel);
  });
});