/**
 * @module resolutionCache
 * @description Resolution cache contracts and runtime primitives for deterministic metadata resolution.
 * @layer truth-contract
 * @consumers api, web, db
 */

/**
 * Resolution caching contracts shared across packages.
 *
 * Runtime implementation is hosted in ./runtime/resolution-cache.ts.
 * This file keeps contract interfaces and backward-compatible re-exports.
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

export {
  ResolutionCache,
  ResolutionCacheService,
  getGlobalResolutionCache,
} from "./runtime/resolution-cache.js";
