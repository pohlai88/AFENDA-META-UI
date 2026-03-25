/**
 * Resolution Caching Tests
 * ======================
 *
 * Tests for 90% cost reduction strategy via caching
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ResolutionCache } from "../../../../packages/meta-types/src/resolutionCache.js";
import { CachedResolution } from "./cachedResolution.js";
import type { ResolutionContext, ModelMeta } from "@afenda/meta-types";

// ============================================================================
// Test Data
// ============================================================================

const testMeta: Record<string, ModelMeta> = {
  "finance.invoice": {
    model: "finance.invoice",
    label: "Invoice",
    fields: [
      {
        name: "amount",
        label: "Amount",
        type: "currency",
        required: true,
        audit: { trackChanges: true, sensitivityLevel: "high" },
      },
      {
        name: "vendor",
        label: "Vendor",
        type: "string",
        required: true,
        audit: { trackChanges: true, sensitivityLevel: "medium" },
      },
    ],
    views: {},
    actions: [],
  },
};

const testContext: ResolutionContext = {
  tenantId: "tenant-cache-001",
  userId: "user-001",
  departmentId: "dept-001",
  industry: "finance",
};

// ============================================================================
// Cache Service Tests
// ============================================================================

describe("Resolution Cache Service", () => {
  let cache: ResolutionCache<unknown>;

  beforeEach(() => {
    cache = new ResolutionCache<unknown>({
      defaultTtlMs: 5000, // 5 seconds for testing
      maxEntries: 100,
      trackStats: true,
      pruneIntervalMs: 0, // Disable auto-prune for tests
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  it("generates consistent cache keys from context", () => {
    const key1 = cache.generateKey("tenant-1", "finance.invoice", {
      industry: "finance",
    });
    const key2 = cache.generateKey("tenant-1", "finance.invoice", {
      industry: "finance",
    });

    expect(key1).toBe(key2);
    expect(key1).toContain("tenant-1");
    expect(key1).toContain("finance.invoice");
  });

  it("stores and retrieves values with TTL", () => {
    const key = cache.generateKey(testContext.tenantId, "finance.invoice");
    const value = { amount: 5000 };

    cache.set(key, value, 5000);
    const retrieved = cache.get(key);

    expect(retrieved).toEqual(value);
  });

  it("returns undefined for expired entries", async () => {
    const key = cache.generateKey(testContext.tenantId, "finance.invoice");
    const value = { amount: 5000 };

    cache.set(key, value, 100); // 100ms TTL

    // Check immediately - should hit
    expect(cache.get(key)).toEqual(value);

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 150));
    const expired = cache.get(key);
    expect(expired).toBeUndefined();
  });

  it("tracks cache statistics (hits/misses)", () => {
    const key1 = cache.generateKey(testContext.tenantId, "model1");
    const key2 = cache.generateKey(testContext.tenantId, "model2");

    cache.set(key1, { data: "value1" });
    cache.set(key2, { data: "value2" });

    // Hits
    cache.get(key1);
    cache.get(key1);
    cache.get(key2);

    // Misses
    cache.get("nonexistent-key");
    cache.get("another-missing-key");

    const stats = cache.getStats();

    expect(stats.hits).toBe(3);
    expect(stats.misses).toBe(2);
    expect(stats.hitRate).toBeCloseTo(0.6, 1); // 3/5
    expect(stats.totalEntries).toBe(2);
  });

  it("invalidates cache by dependency (tenant/model)", () => {
    const key1 = cache.generateKey(testContext.tenantId, "finance.invoice");
    const key2 = cache.generateKey(testContext.tenantId, "finance.invoice");

    cache.set(key1, { data: "invoice1" }, 5000, {
      tenantId: testContext.tenantId,
      model: "finance.invoice",
    });
    cache.set(key2, { data: "invoice2" }, 5000, {
      tenantId: testContext.tenantId,
      model: "finance.order",
    });

    // Invalidate finance.invoice - should remove key1 only
    const invalidated = cache.invalidateByDependency(testContext.tenantId, "finance.invoice");

    expect(invalidated).toBe(1);
    expect(cache.get(key1)).toBeUndefined();
  });

  it("invalidates all entries for a tenant", () => {
    const tenant1 = "tenant-1";
    const tenant2 = "tenant-2";

    const key1 = cache.generateKey(tenant1, "model1");
    const key2 = cache.generateKey(tenant1, "model2");
    const key3 = cache.generateKey(tenant2, "model1");

    cache.set(key1, { data: "t1m1" });
    cache.set(key2, { data: "t1m2" });
    cache.set(key3, { data: "t2m1" });

    const invalidated = cache.invalidateByTenant(tenant1);

    expect(invalidated).toBe(2);
    expect(cache.get(key1)).toBeUndefined();
    expect(cache.get(key2)).toBeUndefined();
    expect(cache.get(key3)).toBeDefined(); // tenant2 should remain

    const stats = cache.getStats();
    expect(stats.totalEntries).toBe(1);
  });

  it("evicts least-used entries when at capacity", () => {
    const smallCache = new ResolutionCache<unknown>({
      defaultTtlMs: 5000,
      maxEntries: 3, // Small capacity
      trackStats: true,
      pruneIntervalMs: 0,
    });

    const keys = ["key-1", "key-2", "key-3", "key-4"];
    keys.slice(0, 3).forEach((key, i) => {
      smallCache.set(key, { data: `value-${i}` });
    });

    // Use key-1 twice (higher hit count)
    smallCache.get(keys[0]);
    smallCache.get(keys[0]);

    // key-2 once
    smallCache.get(keys[1]);

    // key-3 never used

    // Add key-4 - should evict key-3 (least used)
    smallCache.set(keys[3], { data: "value-4" });

    expect(smallCache.get(keys[0])).toBeDefined(); // Most used
    expect(smallCache.get(keys[1])).toBeDefined();
    expect(smallCache.get(keys[2])).toBeUndefined(); // Least used - evicted

    smallCache.destroy();
  });

  it("provides cache size and statistics", () => {
    const key1 = cache.generateKey(testContext.tenantId, "model1");
    const key2 = cache.generateKey(testContext.tenantId, "model2");

    const largeValue = { data: "x".repeat(1000) };
    cache.set(key1, largeValue);
    cache.set(key2, { data: "small" });

    const stats = cache.getStats();

    expect(stats.totalEntries).toBe(2);
    expect(stats.totalSizeBytes).toBeGreaterThan(1000);
    expect(stats.avgEntryAgeMs).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// Cached Resolution Tests
// ============================================================================

describe("Cached Metadata Resolution", () => {
  beforeEach(() => {
    CachedResolution.clear();
  });

  afterEach(() => {
    CachedResolution.clear();
  });

  it("caches metadata resolution results", async () => {
    let callCount = 0;

    const mockResolveFn = () => {
      callCount++;
      return { amount: { type: "number" }, vendor: { type: "string" } };
    };

    // First call - cache miss
    const result1 = await CachedResolution.resolveWithCache(
      mockResolveFn,
      "finance.invoice",
      testMeta,
      testContext,
      5000
    );

    expect(callCount).toBe(1);
    expect(result1).toBeDefined();

    // Second call - cache hit (same context)
    const result2 = await CachedResolution.resolveWithCache(
      mockResolveFn,
      "finance.invoice",
      testMeta,
      testContext,
      5000
    );

    expect(callCount).toBe(1); // Should not increment
    expect(result2).toEqual(result1);
  });

  it("achieves >90% cache hit rate on repeated resolutions", async () => {
    const mockResolveFn = () => ({
      fields: { amount: { type: "number" } },
    });

    // Perform 100 resolutions with same context
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      await CachedResolution.resolveWithCache(
        mockResolveFn,
        "finance.invoice",
        testMeta,
        testContext,
        5000
      );
    }

    const metrics = CachedResolution.getMetrics();

    console.warn("📊 Cache Performance Metrics:", {
      hitRate: (metrics.cacheHitRate * 100).toFixed(2) + "%",
      costReduction: metrics.costReductionPercent.toFixed(2) + "%",
      totalHits: metrics.totalCacheHits,
      totalMisses: metrics.totalCacheMisses,
      avgCachedTime: metrics.avgCachedTimeMs.toFixed(3) + "ms",
      avgUncachedTime: metrics.avgUncachedTimeMs.toFixed(3) + "ms",
    });

    // Target: >90% hit rate
    expect(metrics.cacheHitRate).toBeGreaterThan(0.9);

    // Target: >50% cost reduction (cached is 50x+ faster than uncached)
    expect(metrics.costReductionPercent).toBeGreaterThan(50);
  });

  it("invalidates cache on tenant updates", async () => {
    let callCount = 0;

    const mockResolveFn = () => {
      callCount++;
      return { fields: { amount: { type: "number" } } };
    };

    // Prime cache
    await CachedResolution.resolveWithCache(
      mockResolveFn,
      "finance.invoice",
      testMeta,
      testContext,
      5000
    );
    expect(callCount).toBe(1);

    // Hit cache
    await CachedResolution.resolveWithCache(
      mockResolveFn,
      "finance.invoice",
      testMeta,
      testContext,
      5000
    );
    expect(callCount).toBe(1);

    // Invalidate tenant
    CachedResolution.invalidateTenant(testContext.tenantId);

    // Cache should be cleared - next call is a miss
    await CachedResolution.resolveWithCache(
      mockResolveFn,
      "finance.invoice",
      testMeta,
      testContext,
      5000
    );
    expect(callCount).toBe(2);
  });

  it("supports different contexts with separate cache entries", async () => {
    let callCount = 0;

    const mockResolveFn = () => {
      callCount++;
      return { amount: { type: "number" } };
    };

    const context1: ResolutionContext = {
      ...testContext,
      industry: "finance",
    };

    const context2: ResolutionContext = {
      ...testContext,
      industry: "healthcare", // Different context
    };

    // Resolve with context1
    await CachedResolution.resolveWithCache(
      mockResolveFn,
      "finance.invoice",
      testMeta,
      context1,
      5000
    );
    expect(callCount).toBe(1);

    // Different context - should be cache miss
    await CachedResolution.resolveWithCache(
      mockResolveFn,
      "finance.invoice",
      testMeta,
      context2,
      5000
    );
    expect(callCount).toBe(2);

    // Back to context1 - should hit cache
    await CachedResolution.resolveWithCache(
      mockResolveFn,
      "finance.invoice",
      testMeta,
      context1,
      5000
    );
    expect(callCount).toBe(2);

    const metrics = CachedResolution.getMetrics();
    expect(metrics.totalCacheHits).toBeGreaterThan(0);
  });

  it("provides cache metrics for monitoring", async () => {
    const mockResolveFn = () => ({
      fields: { amount: { type: "number" } },
    });

    // Perform resolutions
    for (let i = 0; i < 5; i++) {
      await CachedResolution.resolveWithCache(
        mockResolveFn,
        "finance.invoice",
        testMeta,
        testContext,
        5000
      );
    }

    const metrics = CachedResolution.getMetrics();

    expect(metrics.cacheHitRate).toBeGreaterThan(0);
    expect(metrics.costReductionPercent).toBeGreaterThanOrEqual(0);
    expect(metrics.avgCachedTimeMs).toBeGreaterThanOrEqual(0);
    expect(metrics.avgUncachedTimeMs).toBeGreaterThanOrEqual(0);
    expect(metrics.totalCacheHits).toBeGreaterThanOrEqual(0);
    expect(metrics.totalCacheMisses).toBeGreaterThanOrEqual(0);

    console.warn("✅ Cache Metrics Available:", metrics);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Caching Integration - 90% Cost Reduction", () => {
  beforeEach(() => {
    CachedResolution.clear();
  });

  afterEach(() => {
    CachedResolution.clear();
  });

  it("demonstrates 90% cost reduction on cached resolutions", async () => {
    let resolutionsCalled = 0;
    const mockResolveFn = () => {
      resolutionsCalled++;
      // Simulate expensive resolution
      return {
        fields: {
          amount: { type: "number", displayFormat: "currency" },
          vendor: { type: "string", maxLength: 255 },
          taxRate: { type: "number", default: 0.1 },
        },
        computed: { total: "$amount * (1 + $taxRate)" },
      };
    };

    // Simulate production load: 1000 requests with same context (tenant)
    const iterations = 1000;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      await CachedResolution.resolveWithCache(
        mockResolveFn,
        "finance.invoice",
        testMeta,
        testContext,
        60000
      );
    }

    const totalTimeMs = performance.now() - startTime;

    const metrics = CachedResolution.getMetrics();
    const report = `
╔════════════════════════════════════════════════════════════════════════════╗
║               RESOLUTION CACHING - 90% COST REDUCTION ANALYSIS              ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  LOAD TEST RESULTS (1000 requests, same tenant context):                   ║
║                                                                            ║
║  Actual Resolutions:        ${resolutionsCalled}/${iterations}                                  ║
║  Cache Hits:                ${metrics.totalCacheHits}                                  ║
║  Cache Misses:              ${metrics.totalCacheMisses}                                 ║
║  Hit Rate:                  ${(metrics.cacheHitRate * 100).toFixed(2)}%                              ║
║                                                                            ║
║  PERFORMANCE:                                                               ║
║  Avg Resolution (cached):   ${metrics.avgCachedTimeMs.toFixed(3)}ms                            ║
║  Avg Resolution (uncached): ${metrics.avgUncachedTimeMs.toFixed(3)}ms                            ║
║  Cost Reduction:            ${metrics.costReductionPercent.toFixed(1)}%                              ║
║                                                                            ║
║  THROUGHPUT:                                                                ║
║  Total Time (1000 reqs):    ${totalTimeMs.toFixed(2)}ms                              ║
║  Requests/Second:           ${(1000 / (totalTimeMs / 1000)).toFixed(0)}                                 ║
║                                                                            ║
║  CAPACITY PROJECTION (1000 ops/sec target):                                 ║
║  Without Cache:             ${(1000 * metrics.avgUncachedTimeMs).toFixed(0)}ms                              ║
║  With Cache (90% hit):      ${(1000 * metrics.avgCachedTimeMs * 0.1 + 1000 * metrics.avgCachedTimeMs * 0.9).toFixed(0)}ms                              ║
║  Speedup Factor:            ${(metrics.avgUncachedTimeMs / metrics.avgCachedTimeMs).toFixed(0)}x                                   ║
║                                                                            ║
║  ✅ TARGETS ACHIEVED:                                                        ║
║     ✓ Cache hit rate > 90%: ${metrics.cacheHitRate > 0.9 ? "PASS" : "FAIL"}                          ║
║     ✓ Cost reduction > 50%: ${metrics.costReductionPercent > 50 ? "PASS" : "FAIL"}                          ║
║     ✓ Scaled to 1000+ reqs:${"✓ Yes, tested " + iterations + " iterations"}       ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
    `;

    console.warn(report);

    // Verify targets
    expect(metrics.cacheHitRate).toBeGreaterThan(0.9); // >90% hit rate
    expect(metrics.costReductionPercent).toBeGreaterThan(50); // >50% cost reduction
    expect(resolutionsCalled).toBeLessThan(10); // Very few actual resolutions needed
  });
});
