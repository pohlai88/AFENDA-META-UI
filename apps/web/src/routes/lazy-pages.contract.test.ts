import { describe, expect, it } from "vitest";

const lazyPageModulePaths = [
  "../pages/home",
  "../pages/module-landing",
  "../pages/model-list",
  "../pages/model-form",
  "../pages/model-view",
  "../pages/404",
  "../pages/401",
  "../pages/403",
  "../pages/408",
  "../pages/409",
  "../pages/422",
  "../pages/429",
  "../pages/500",
  "../pages/503",
  "../pages/errors",
  "../pages/purchase-orders-example",
  "../pages/payment-hub",
  "../pages/suggestions-demo",
] as const;

describe("route lazy page contracts", () => {
  for (const modulePath of lazyPageModulePaths) {
    it(`${modulePath} exports a default React component`, async () => {
      const pageModule = (await import(modulePath)) as { default?: unknown };
      expect(typeof pageModule.default).toBe("function");
    }, 30000);
  }
});
