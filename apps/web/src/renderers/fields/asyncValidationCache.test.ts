import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAsyncValidationCache, type StorageLike } from "./asyncValidationCache";

class MemoryStorage implements StorageLike {
  private state = new Map<string, string>();

  getItem(key: string): string | null {
    return this.state.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.state.set(key, value);
  }

  removeItem(key: string): void {
    this.state.delete(key);
  }
}

function buildScopedCacheKey(scope: string, fieldName: string, value: unknown) {
  return `${scope}::${fieldName}:${String(value)}`;
}

describe("asyncValidationCache", () => {
  const ttlMs = 5 * 60 * 1000;
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns cache miss when key is absent", () => {
    const cache = createAsyncValidationCache<string>({
      storage,
      storageKey: "field-cache",
      defaultTtlMs: ttlMs,
      maxEntries: 10,
    });

    expect(cache.get("unknown")).toBeUndefined();
  });

  it("returns cached value for cache hit within ttl", () => {
    const cache = createAsyncValidationCache<string>({
      storage,
      storageKey: "field-cache",
      defaultTtlMs: ttlMs,
      maxEntries: 10,
    });

    cache.set("username::alex", "Username is taken");

    expect(cache.get("username::alex")).toBe("Username is taken");
  });

  it("evicts expired cache entries", () => {
    const cache = createAsyncValidationCache<string>({
      storage,
      storageKey: "field-cache",
      defaultTtlMs: ttlMs,
      maxEntries: 10,
    });

    cache.set("username::alex", "Username is taken");
    vi.advanceTimersByTime(ttlMs + 1);

    expect(cache.get("username::alex")).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  it("enforces lru cap and evicts least recently used entries", () => {
    const cache = createAsyncValidationCache<string>({
      storage,
      storageKey: "field-cache",
      defaultTtlMs: ttlMs,
      maxEntries: 2,
    });

    cache.set("k1", "v1");
    vi.advanceTimersByTime(1);
    cache.set("k2", "v2");

    // Touch k1 so k2 becomes the least recently used.
    vi.advanceTimersByTime(1);
    expect(cache.get("k1")).toBe("v1");

    vi.advanceTimersByTime(1);
    cache.set("k3", "v3");

    expect(cache.get("k2")).toBeUndefined();
    expect(cache.get("k1")).toBe("v1");
    expect(cache.get("k3")).toBe("v3");
    expect(cache.size()).toBe(2);
  });

  it("persists cache across instances with the same storage key", () => {
    const first = createAsyncValidationCache<{ message: string | null; path: string }>({
      storage,
      storageKey: "form-cache",
      defaultTtlMs: ttlMs,
      maxEntries: 10,
    });

    first.set("form-rule::range", {
      message: "Date range is not allowed",
      path: "endDate",
    });

    const second = createAsyncValidationCache<{ message: string | null; path: string }>({
      storage,
      storageKey: "form-cache",
      defaultTtlMs: ttlMs,
      maxEntries: 10,
    });

    expect(second.get("form-rule::range")).toEqual({
      message: "Date range is not allowed",
      path: "endDate",
    });
  });

  it("isolates cached values by scope key", () => {
    const cache = createAsyncValidationCache<string | null>({
      storage,
      storageKey: "field-cache",
      defaultTtlMs: ttlMs,
      maxEntries: 10,
    });

    const userOneKey = buildScopedCacheKey("user-1", "username", "alex");
    const userTwoKey = buildScopedCacheKey("user-2", "username", "alex");

    cache.set(userOneKey, "taken");
    cache.set(userTwoKey, null);

    expect(cache.get(userOneKey)).toBe("taken");
    expect(cache.get(userTwoKey)).toBeNull();
  });

  it("deletes a specific key and persists removal", () => {
    const first = createAsyncValidationCache<string>({
      storage,
      storageKey: "field-cache",
      defaultTtlMs: ttlMs,
      maxEntries: 10,
    });

    first.set("k1", "v1");
    expect(first.delete("k1")).toBe(true);
    expect(first.get("k1")).toBeUndefined();

    const second = createAsyncValidationCache<string>({
      storage,
      storageKey: "field-cache",
      defaultTtlMs: ttlMs,
      maxEntries: 10,
    });

    expect(second.get("k1")).toBeUndefined();
  });

  it("deletes entries by predicate", () => {
    const cache = createAsyncValidationCache<string>({
      storage,
      storageKey: "field-cache",
      defaultTtlMs: ttlMs,
      maxEntries: 10,
    });

    cache.set("user:1::username::alex", "taken");
    cache.set("user:1::email::a@b.com", "taken");
    cache.set("user:2::username::alex", "taken");

    const removed = cache.deleteWhere((key) => key.startsWith("user:1::"));

    expect(removed).toBe(2);
    expect(cache.get("user:1::username::alex")).toBeUndefined();
    expect(cache.get("user:1::email::a@b.com")).toBeUndefined();
    expect(cache.get("user:2::username::alex")).toBe("taken");
  });

  it("tracks cache metrics when enabled", () => {
    const cache = createAsyncValidationCache<string>({
      storage,
      storageKey: "field-cache",
      defaultTtlMs: ttlMs,
      maxEntries: 1,
      enableMetrics: true,
    });

    cache.set("k1", "v1");

    expect(cache.get("k1")).toBe("v1"); // hit
    expect(cache.get("missing")).toBeUndefined(); // miss

    cache.set("k2", "v2"); // LRU eviction of k1

    vi.advanceTimersByTime(ttlMs + 1);
    expect(cache.get("k2")).toBeUndefined(); // expiration + miss

    const metrics = cache.getMetrics();
    expect(metrics.hits).toBeGreaterThanOrEqual(1);
    expect(metrics.misses).toBeGreaterThanOrEqual(2);
    expect(metrics.expirations).toBeGreaterThanOrEqual(1);
    expect(metrics.evictions).toBeGreaterThanOrEqual(1);
  });

  it("resets cache metrics", () => {
    const cache = createAsyncValidationCache<string>({
      storage,
      storageKey: "field-cache",
      defaultTtlMs: ttlMs,
      maxEntries: 10,
      enableMetrics: true,
    });

    cache.set("k1", "v1");
    expect(cache.get("k1")).toBe("v1");
    expect(cache.get("missing")).toBeUndefined();

    cache.resetMetrics();

    expect(cache.getMetrics()).toEqual({
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0,
    });
  });
});
