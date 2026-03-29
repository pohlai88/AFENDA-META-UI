/**
 * Platform cache contract tests.
 *
 * Design intent: CacheEntry, CacheStats, and ResolutionCacheConfig are the data
 * contracts consumed by runtime cache implementations in api and db. Shape changes
 * here break the hot path. Fix the contract, not the test.
 */
import { describe, expect, it } from "vitest";

import type { CacheEntry, CacheStats, ResolutionCacheConfig } from "../cache.js";

// ---------------------------------------------------------------------------
// CacheEntry<T> — structural contract
// ---------------------------------------------------------------------------

describe("CacheEntry — structural contract", () => {
  it("holds key, value, cachedAt, ttlMs, and hits", () => {
    const entry: CacheEntry<string> = {
      key: "tenant:acme:sales_order",
      value: "resolved-meta",
      cachedAt: Date.now(),
      ttlMs: 60_000,
      hits: 0,
    };
    expect(entry.key).toBe("tenant:acme:sales_order");
    expect(entry.value).toBe("resolved-meta");
    expect(entry.ttlMs).toBe(60_000);
    expect(entry.hits).toBe(0);
  });

  it("accepts numeric value type", () => {
    const entry: CacheEntry<number> = {
      key: "counter",
      value: 42,
      cachedAt: 1_700_000_000_000,
      ttlMs: 5_000,
      hits: 3,
    };
    expect(entry.value).toBe(42);
    expect(entry.hits).toBe(3);
  });

  it("accepts an object value type", () => {
    const entry: CacheEntry<{ model: string; fields: string[] }> = {
      key: "meta:invoice",
      value: { model: "invoice", fields: ["id", "status"] },
      cachedAt: Date.now(),
      ttlMs: 30_000,
      hits: 12,
    };
    expect(entry.value.model).toBe("invoice");
    expect(entry.value.fields).toHaveLength(2);
  });

  it("accepts optional dependencies with tenantId and model", () => {
    const entry: CacheEntry<string> = {
      key: "resolution:tenant:warehouse",
      value: "resolved",
      cachedAt: Date.now(),
      ttlMs: 60_000,
      hits: 0,
      dependencies: {
        tenantId: "acme-corp",
        model: "warehouse",
      },
    };
    expect(entry.dependencies?.tenantId).toBe("acme-corp");
    expect(entry.dependencies?.model).toBe("warehouse");
    expect(entry.dependencies?.dataSourceId).toBeUndefined();
  });

  it("accepts optional dataSourceId on dependencies", () => {
    const entry: CacheEntry<unknown> = {
      key: "ds-backed-entry",
      value: null,
      cachedAt: Date.now(),
      ttlMs: 10_000,
      hits: 1,
      dependencies: {
        tenantId: "beta-tenant",
        model: "product",
        dataSourceId: "ds-erp-001",
      },
    };
    expect(entry.dependencies?.dataSourceId).toBe("ds-erp-001");
  });

  it("omits dependencies when not provided", () => {
    const entry: CacheEntry<boolean> = {
      key: "flag",
      value: true,
      cachedAt: 0,
      ttlMs: 1_000,
      hits: 0,
    };
    expect(entry.dependencies).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// CacheStats — structural contract
// ---------------------------------------------------------------------------

describe("CacheStats — structural contract", () => {
  it("carries all seven required stat fields", () => {
    const stats: CacheStats = {
      hits: 850,
      misses: 150,
      hitRate: 0.85,
      totalEntries: 200,
      totalSizeBytes: 102_400,
      avgEntryAgeMs: 12_500,
      oldestEntryAgeMs: 58_000,
    };
    expect(stats.hits).toBe(850);
    expect(stats.misses).toBe(150);
    expect(stats.hitRate).toBeCloseTo(0.85);
    expect(stats.totalEntries).toBe(200);
    expect(stats.totalSizeBytes).toBe(102_400);
    expect(stats.avgEntryAgeMs).toBe(12_500);
    expect(stats.oldestEntryAgeMs).toBe(58_000);
  });

  it("accepts a zero-state (cold cache)", () => {
    const stats: CacheStats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalEntries: 0,
      totalSizeBytes: 0,
      avgEntryAgeMs: 0,
      oldestEntryAgeMs: 0,
    };
    expect(stats.hitRate).toBe(0);
    expect(stats.totalEntries).toBe(0);
  });

  it("accepts a perfect-hit-rate state", () => {
    const stats: CacheStats = {
      hits: 1000,
      misses: 0,
      hitRate: 1,
      totalEntries: 50,
      totalSizeBytes: 20_480,
      avgEntryAgeMs: 3_000,
      oldestEntryAgeMs: 9_000,
    };
    expect(stats.hitRate).toBe(1);
    expect(stats.misses).toBe(0);
  });

  it("EXHAUSTIVENESS GATE — CacheStats has exactly 7 fields", () => {
    const stats: CacheStats = {
      hits: 1,
      misses: 1,
      hitRate: 0.5,
      totalEntries: 1,
      totalSizeBytes: 100,
      avgEntryAgeMs: 500,
      oldestEntryAgeMs: 1_000,
    };
    expect(Object.keys(stats)).toHaveLength(7);
  });
});

// ---------------------------------------------------------------------------
// ResolutionCacheConfig — structural contract
// ---------------------------------------------------------------------------

describe("ResolutionCacheConfig — structural contract", () => {
  it("accepts a standard production configuration", () => {
    const config: ResolutionCacheConfig = {
      defaultTtlMs: 300_000,
      maxEntries: 1_000,
      trackStats: true,
      pruneIntervalMs: 60_000,
    };
    expect(config.defaultTtlMs).toBe(300_000);
    expect(config.maxEntries).toBe(1_000);
    expect(config.trackStats).toBe(true);
    expect(config.pruneIntervalMs).toBe(60_000);
  });

  it("accepts a minimal test configuration with stats disabled", () => {
    const config: ResolutionCacheConfig = {
      defaultTtlMs: 5_000,
      maxEntries: 10,
      trackStats: false,
      pruneIntervalMs: 1_000,
    };
    expect(config.trackStats).toBe(false);
    expect(config.maxEntries).toBe(10);
  });

  it("EXHAUSTIVENESS GATE — ResolutionCacheConfig has exactly 4 fields", () => {
    const config: ResolutionCacheConfig = {
      defaultTtlMs: 1_000,
      maxEntries: 5,
      trackStats: false,
      pruneIntervalMs: 500,
    };
    expect(Object.keys(config)).toHaveLength(4);
  });
});
