import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAppConfig,
  parseAnalyticsBatchSize,
  parseAnalyticsFlushIntervalMs,
  parseAnalyticsProviders,
  parseNotificationToastDedupeMs,
  parsePermissionsBootstrapEndpoint,
} from "./app-config";

describe("parseNotificationToastDedupeMs", () => {
  it("uses default value when env value is undefined", () => {
    expect(parseNotificationToastDedupeMs(undefined)).toBe(2500);
  });

  it("uses default value for invalid env input", () => {
    expect(parseNotificationToastDedupeMs("not-a-number")).toBe(2500);
  });

  it("clamps values to supported bounds", () => {
    expect(parseNotificationToastDedupeMs("-10")).toBe(0);
    expect(parseNotificationToastDedupeMs("61000")).toBe(60000);
    expect(parseNotificationToastDedupeMs("1800")).toBe(1800);
  });

  it("uses default for empty string", () => {
    expect(parseNotificationToastDedupeMs("")).toBe(2500);
  });

  it("accepts exact boundary values without clamping", () => {
    expect(parseNotificationToastDedupeMs("0")).toBe(0);
    expect(parseNotificationToastDedupeMs("60000")).toBe(60000);
  });

  it("uses default for strings with mixed numeric/non-numeric content", () => {
    // Number("500ms") is NaN — stricter than parseInt which would silently return 500
    expect(parseNotificationToastDedupeMs("500ms")).toBe(2500);
    expect(parseNotificationToastDedupeMs("abc123")).toBe(2500);
  });

  it("accepts scientific notation as a valid numeric string", () => {
    expect(parseNotificationToastDedupeMs("1e3")).toBe(1000);
  });
});

describe("getAppConfig", () => {
  it("maps env values into runtime app config", () => {
    const config = getAppConfig({
      DEV: true,
      MODE: "development",
      VITE_NOTIFICATION_TOAST_DEDUPE_MS: "4200",
      VITE_PERMISSIONS_BOOTSTRAP_ENDPOINT: "/meta/bootstrap",
      VITE_ANALYTICS_PROVIDERS: "console,posthog",
      VITE_ANALYTICS_BATCH_SIZE: "15",
      VITE_ANALYTICS_FLUSH_INTERVAL_MS: "2500",
    });

    expect(config.isDev).toBe(true);
    expect(config.isTest).toBe(false);
    expect(config.notificationToastDedupeMs).toBe(4200);
    expect(config.permissionsBootstrapEndpoint).toBe("/meta/bootstrap");
    expect(config.analyticsProviders).toEqual(["console", "posthog"]);
    expect(config.analyticsBatchSize).toBe(15);
    expect(config.analyticsFlushIntervalMs).toBe(2500);
  });

  it("defaults isDev to false when not provided", () => {
    const config = getAppConfig({});

    expect(config.isDev).toBe(false);
    expect(config.isTest).toBe(false);
    expect(config.permissionsBootstrapEndpoint).toBe("/meta/bootstrap");
  });

  it("applies all defaults when env is empty", () => {
    const config = getAppConfig({});
    expect(config.notificationToastDedupeMs).toBe(2500);
    expect(config.permissionsBootstrapEndpoint).toBe("/meta/bootstrap");
    expect(config.analyticsProviders).toEqual([]);
    expect(config.analyticsBatchSize).toBe(20);
    expect(config.analyticsFlushIntervalMs).toBe(5000);
  });

  describe("dev warnings", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("emits a console.warn in dev mode when dedupe ms is invalid", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      getAppConfig({ DEV: true, VITE_NOTIFICATION_TOAST_DEDUPE_MS: "not-a-number" });
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("VITE_NOTIFICATION_TOAST_DEDUPE_MS")
      );
    });

    it("does not warn in production mode for invalid dedupe ms", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      getAppConfig({ DEV: false, VITE_NOTIFICATION_TOAST_DEDUPE_MS: "not-a-number" });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("does not warn when a valid dedupe ms is provided in dev mode", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      getAppConfig({ DEV: true, VITE_NOTIFICATION_TOAST_DEDUPE_MS: "3000" });
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("does not warn when dedupe ms is omitted entirely", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      getAppConfig({ DEV: true });
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});

describe("parsePermissionsBootstrapEndpoint", () => {
  it("uses default endpoint when env value is undefined or empty", () => {
    expect(parsePermissionsBootstrapEndpoint(undefined)).toBe("/meta/bootstrap");
    expect(parsePermissionsBootstrapEndpoint("   ")).toBe("/meta/bootstrap");
  });

  it("returns trimmed endpoint when provided", () => {
    expect(parsePermissionsBootstrapEndpoint("  /meta/bootstrap/v2  ")).toBe("/meta/bootstrap/v2");
  });

  it("uses default for empty string", () => {
    expect(parsePermissionsBootstrapEndpoint("")).toBe("/meta/bootstrap");
  });

  it("preserves non-default paths as-is after trimming", () => {
    expect(parsePermissionsBootstrapEndpoint("/api/v2/permissions")).toBe("/api/v2/permissions");
  });
});

describe("analytics config parsing", () => {
  it("defaults analytics providers based on environment", () => {
    expect(parseAnalyticsProviders(undefined, { isDev: true, isTest: false })).toEqual(["console"]);
    expect(parseAnalyticsProviders(undefined, { isDev: false, isTest: false })).toEqual([]);
    expect(parseAnalyticsProviders(undefined, { isDev: true, isTest: true })).toEqual([]);
  });

  it("filters invalid analytics providers and de-duplicates valid ones", () => {
    expect(parseAnalyticsProviders("console,posthog,invalid,console,mixpanel")).toEqual([
      "console",
      "posthog",
      "mixpanel",
    ]);
  });

  it("clamps analytics batch size and flush interval", () => {
    expect(parseAnalyticsBatchSize(undefined)).toBe(20);
    expect(parseAnalyticsBatchSize("0")).toBe(1);
    expect(parseAnalyticsBatchSize("400")).toBe(100);
    expect(parseAnalyticsFlushIntervalMs(undefined)).toBe(5000);
    expect(parseAnalyticsFlushIntervalMs("100")).toBe(250);
    expect(parseAnalyticsFlushIntervalMs("90000")).toBe(60000);
  });

  it("marks test mode from MODE", () => {
    const config = getAppConfig({ MODE: "test", DEV: true });

    expect(config.isTest).toBe(true);
    expect(config.analyticsProviders).toEqual([]);
  });
});
