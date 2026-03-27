import type { CacheEntry, CacheStats, ResolutionCacheConfig } from "../resolutionCache.js";

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return "[" + value.map((item) => stableSerialize(item)).join(",") + "]";
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return (
    "{" +
    keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(",") +
    "}"
  );
}

function hashString(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export class ResolutionCache<T = Record<string, unknown>> {
  private cache = new Map<string, CacheEntry<T>>();
  private dependencyIndex = new Map<string, Set<string>>();
  private hits = 0;
  private misses = 0;
  private readonly config: Required<ResolutionCacheConfig>;

  constructor(config: Partial<ResolutionCacheConfig> = {}) {
    this.config = {
      defaultTtlMs: config.defaultTtlMs ?? 60000,
      maxEntries: config.maxEntries ?? 10000,
      trackStats: config.trackStats ?? true,
      pruneIntervalMs: config.pruneIntervalMs ?? 0,
    };
  }

  generateKey(tenantId: string, model: string, context?: Record<string, unknown>): string {
    const contextHash = context ? hashString(stableSerialize(context)) : "default";
    return `${tenantId}::${model}::${contextHash}`;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses += 1;
      return undefined;
    }

    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.deleteEntry(key);
      this.misses += 1;
      return undefined;
    }

    entry.hits += 1;
    this.hits += 1;
    return entry.value;
  }

  set(
    key: string,
    value: T,
    ttlMs: number = this.config.defaultTtlMs,
    dependencies?: CacheEntry<T>["dependencies"]
  ): void {
    if (!this.cache.has(key) && this.cache.size >= this.config.maxEntries) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      key,
      value,
      cachedAt: Date.now(),
      ttlMs,
      hits: 0,
      dependencies,
    });

    if (dependencies) {
      const dependencyKey = `${dependencies.tenantId}::${dependencies.model}`;
      const keys = this.dependencyIndex.get(dependencyKey) ?? new Set<string>();
      keys.add(key);
      this.dependencyIndex.set(dependencyKey, keys);
    }
  }

  invalidateByDependency(tenantId: string, model: string): number {
    const dependencyKey = `${tenantId}::${model}`;
    const keys = this.dependencyIndex.get(dependencyKey);

    if (!keys) {
      return 0;
    }

    let removed = 0;
    for (const key of keys) {
      if (this.cache.has(key)) {
        this.deleteEntry(key);
        removed += 1;
      }
    }

    this.dependencyIndex.delete(dependencyKey);
    return removed;
  }

  invalidateByTenant(tenantId: string): number {
    const keysToDelete: string[] = [];

    this.cache.forEach((_entry, key) => {
      if (key.startsWith(`${tenantId}::`)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.deleteEntry(key));
    return keysToDelete.length;
  }

  pruneExpired(now: number = Date.now()): number {
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.cachedAt > entry.ttlMs) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.deleteEntry(key));
    return keysToDelete.length;
  }

  clear(): void {
    this.cache.clear();
    this.dependencyIndex.clear();
    this.hits = 0;
    this.misses = 0;
  }

  destroy(): void {
    this.clear();
  }

  getEntries(filter?: { tenantId?: string; maxAge?: number }): Array<{
    key: string;
    ageMs: number;
    hits: number;
    sizeBytes: number;
  }> {
    const now = Date.now();
    const entries: Array<{
      key: string;
      ageMs: number;
      hits: number;
      sizeBytes: number;
    }> = [];

    this.cache.forEach((entry, key) => {
      const ageMs = now - entry.cachedAt;

      if (filter?.tenantId && !key.startsWith(`${filter.tenantId}::`)) {
        return;
      }

      if (filter?.maxAge !== undefined && ageMs > filter.maxAge) {
        return;
      }

      entries.push({
        key,
        ageMs,
        hits: entry.hits,
        sizeBytes: JSON.stringify(entry.value).length,
      });
    });

    return entries.sort((left, right) => right.hits - left.hits);
  }

  getStats(): CacheStats {
    const ages: number[] = [];
    let totalSizeBytes = 0;
    const now = Date.now();

    this.cache.forEach((entry) => {
      ages.push(now - entry.cachedAt);
      totalSizeBytes += JSON.stringify(entry.value).length;
    });

    const requests = this.hits + this.misses;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: requests === 0 ? 0 : this.hits / requests,
      totalEntries: this.cache.size,
      totalSizeBytes,
      avgEntryAgeMs: ages.length === 0 ? 0 : ages.reduce((sum, age) => sum + age, 0) / ages.length,
      oldestEntryAgeMs: ages.length === 0 ? 0 : Math.max(...ages),
    };
  }

  private evictLeastUsed(): void {
    let candidateKey: string | null = null;
    let lowestHits = Number.POSITIVE_INFINITY;

    this.cache.forEach((entry, key) => {
      if (entry.hits < lowestHits) {
        lowestHits = entry.hits;
        candidateKey = key;
      }
    });

    if (candidateKey) {
      this.deleteEntry(candidateKey);
    }
  }

  private deleteEntry(key: string): void {
    this.cache.delete(key);
    this.dependencyIndex.forEach((keys, dependencyKey) => {
      keys.delete(key);
      if (keys.size === 0) {
        this.dependencyIndex.delete(dependencyKey);
      }
    });
  }
}

const globalResolutionCache = new ResolutionCache<Record<string, unknown>>();

export function getGlobalResolutionCache(): ResolutionCache<Record<string, unknown>> {
  return globalResolutionCache;
}

export const ResolutionCacheService = {
  get(key: string) {
    return globalResolutionCache.get(key);
  },
  set(
    key: string,
    value: Record<string, unknown>,
    ttlMs?: number,
    dependencies?: CacheEntry<Record<string, unknown>>["dependencies"]
  ) {
    globalResolutionCache.set(key, value, ttlMs, dependencies);
  },
  generateKey(tenantId: string, model: string, context?: Record<string, unknown>) {
    return globalResolutionCache.generateKey(tenantId, model, context);
  },
  invalidateByDependency(tenantId: string, model: string) {
    return globalResolutionCache.invalidateByDependency(tenantId, model);
  },
  invalidateByTenant(tenantId: string) {
    return globalResolutionCache.invalidateByTenant(tenantId);
  },
  getStats() {
    return globalResolutionCache.getStats();
  },
  clear() {
    globalResolutionCache.clear();
  },
  destroy() {
    globalResolutionCache.destroy();
  },
  getEntries(filter?: { tenantId?: string; maxAge?: number }) {
    return globalResolutionCache.getEntries(filter);
  },
};
