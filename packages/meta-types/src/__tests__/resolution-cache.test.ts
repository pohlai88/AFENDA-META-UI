import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { ResolutionCache } from "../resolutionCache.js";

describe("ResolutionCache", () => {
  const originalNow = Date.now;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Date.now = originalNow;
  });

  it("generates stable keys for equivalent context objects", () => {
    const cache = new ResolutionCache();

    const keyA = cache.generateKey("tenant-a", "model-a", { alpha: 1, beta: 2 });
    const keyB = cache.generateKey("tenant-a", "model-a", { beta: 2, alpha: 1 });

    expect(keyA).toBe(keyB);
  });

  it("gets and sets values", () => {
    const cache = new ResolutionCache<{ value: string }>();
    cache.set("k", { value: "ok" });

    expect(cache.get("k")).toEqual({ value: "ok" });
    expect(cache.getStats().hits).toBe(1);
    expect(cache.getStats().misses).toBe(0);
  });

  it("expires entries by ttl", () => {
    const cache = new ResolutionCache<{ value: number }>();

    vi.spyOn(Date, "now").mockReturnValue(1000);
    cache.set("k", { value: 1 }, 50);

    vi.spyOn(Date, "now").mockReturnValue(1100);
    expect(cache.get("k")).toBeUndefined();
    expect(cache.getStats().misses).toBe(1);
  });

  it("evicts least used entry when max entries reached", () => {
    const cache = new ResolutionCache<{ value: string }>({ maxEntries: 2 });

    cache.set("k1", { value: "one" });
    cache.set("k2", { value: "two" });
    cache.get("k1");

    cache.set("k3", { value: "three" });

    expect(cache.get("k1")).toEqual({ value: "one" });
    expect(cache.get("k2")).toBeUndefined();
    expect(cache.get("k3")).toEqual({ value: "three" });
  });

  it("invalidates by dependency", () => {
    const cache = new ResolutionCache<{ value: string }>();

    cache.set("k1", { value: "one" }, undefined, {
      tenantId: "t1",
      model: "invoice",
    });
    cache.set("k2", { value: "two" }, undefined, {
      tenantId: "t1",
      model: "invoice",
    });
    cache.set("k3", { value: "three" }, undefined, {
      tenantId: "t1",
      model: "order",
    });

    const removed = cache.invalidateByDependency("t1", "invoice");

    expect(removed).toBe(2);
    expect(cache.get("k1")).toBeUndefined();
    expect(cache.get("k2")).toBeUndefined();
    expect(cache.get("k3")).toEqual({ value: "three" });
  });

  it("invalidates by tenant", () => {
    const cache = new ResolutionCache<{ value: string }>();

    cache.set("tenant-a::model::1", { value: "one" });
    cache.set("tenant-a::other::2", { value: "two" });
    cache.set("tenant-b::model::3", { value: "three" });

    const removed = cache.invalidateByTenant("tenant-a");

    expect(removed).toBe(2);
    expect(cache.get("tenant-a::model::1")).toBeUndefined();
    expect(cache.get("tenant-a::other::2")).toBeUndefined();
    expect(cache.get("tenant-b::model::3")).toEqual({ value: "three" });
  });

  it("prunes expired entries", () => {
    const cache = new ResolutionCache<{ value: string }>();

    vi.spyOn(Date, "now").mockReturnValue(1000);
    cache.set("fresh", { value: "fresh" }, 1000);
    cache.set("expired", { value: "expired" }, 10);

    const removed = cache.pruneExpired(1020);

    expect(removed).toBe(1);
    expect(cache.get("fresh")).toEqual({ value: "fresh" });
    expect(cache.get("expired")).toBeUndefined();
  });

  it("returns cache entries sorted by hits and supports filtering", () => {
    const cache = new ResolutionCache<{ value: string }>();

    vi.spyOn(Date, "now").mockReturnValue(1000);
    cache.set("tenant-a::model::1", { value: "one" });
    cache.set("tenant-a::model::2", { value: "two" });
    cache.set("tenant-b::model::3", { value: "three" });

    cache.get("tenant-a::model::1");
    cache.get("tenant-a::model::1");
    cache.get("tenant-a::model::2");

    vi.spyOn(Date, "now").mockReturnValue(1200);
    const tenantEntries = cache.getEntries({ tenantId: "tenant-a", maxAge: 500 });

    expect(tenantEntries).toHaveLength(2);
    expect(tenantEntries[0]?.key).toBe("tenant-a::model::1");
    expect(tenantEntries[0]?.hits).toBe(2);
    expect(tenantEntries[1]?.key).toBe("tenant-a::model::2");
  });

  it("reports stats", () => {
    const cache = new ResolutionCache<{ value: string }>();

    cache.set("k1", { value: "one" });
    cache.set("k2", { value: "two" });

    cache.get("k1");
    cache.get("missing");

    const stats = cache.getStats();

    expect(stats.totalEntries).toBe(2);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
    expect(stats.totalSizeBytes).toBeGreaterThan(0);
  });
});
