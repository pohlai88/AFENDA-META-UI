/**
 * @module platform/cache
 * @description Resolution cache type contracts (runtime implementation extracted to consumers).
 * @layer truth-contract
 * @consumers api, web, db
 */

export interface CacheEntry<T> {
  key: string;
  value: T;
  cachedAt: number;
  ttlMs: number;
  hits: number;
  dependencies?: {
    tenantId: string;
    model: string;
    dataSourceId?: string;
  };
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
  totalSizeBytes: number;
  avgEntryAgeMs: number;
  oldestEntryAgeMs: number;
}

export interface ResolutionCacheConfig {
  defaultTtlMs: number;
  maxEntries: number;
  trackStats: boolean;
  pruneIntervalMs: number;
}
