export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  lastAccessed: number;
}

interface PersistedCache<T> {
  entries: Record<string, CacheEntry<T>>;
}

export interface AsyncValidationCacheOptions<T> {
  storageKey: string;
  defaultTtlMs: number;
  maxEntries: number;
  storage?: StorageLike;
  enableMetrics?: boolean;
}

export interface AsyncValidationCacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  expirations: number;
}

function getDefaultStorage(): StorageLike | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function parsePersisted<T>(raw: string | null): Map<string, CacheEntry<T>> {
  if (!raw) {
    return new Map();
  }

  try {
    const parsed = JSON.parse(raw) as PersistedCache<T>;
    const entries = parsed.entries ?? {};
    const map = new Map<string, CacheEntry<T>>();

    Object.entries(entries).forEach(([key, value]) => {
      if (
        value &&
        typeof value === "object" &&
        typeof value.timestamp === "number" &&
        typeof value.lastAccessed === "number"
      ) {
        map.set(key, value);
      }
    });

    return map;
  } catch {
    return new Map();
  }
}

function serializePersisted<T>(map: Map<string, CacheEntry<T>>): string {
  const entries: Record<string, CacheEntry<T>> = {};

  map.forEach((value, key) => {
    entries[key] = value;
  });

  return JSON.stringify({ entries });
}

export function createAsyncValidationCache<T>(options: AsyncValidationCacheOptions<T>) {
  const storage = options.storage ?? getDefaultStorage();
  let isLoaded = false;
  let cache = new Map<string, CacheEntry<T>>();
  const metrics: AsyncValidationCacheMetrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    expirations: 0,
  };

  const trackMetric = (metric: keyof AsyncValidationCacheMetrics, amount: number = 1) => {
    if (!options.enableMetrics || amount <= 0) {
      return;
    }

    metrics[metric] += amount;
  };

  const pruneExpired = (ttlMs: number = options.defaultTtlMs): number => {
    if (cache.size === 0 || ttlMs < 0) {
      return 0;
    }

    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > ttlMs) {
        cache.delete(key);
        removedCount += 1;
      }
    }

    trackMetric("expirations", removedCount);
    return removedCount;
  };

  const ensureLoaded = () => {
    if (isLoaded) {
      return;
    }

    isLoaded = true;

    if (!storage) {
      return;
    }

    cache = parsePersisted<T>(storage.getItem(options.storageKey));

    // Keep loaded cache bounded and drop stale entries from previous sessions.
    const expiredRemoved = pruneExpired();
    pruneLru();

    if (expiredRemoved > 0) {
      persist();
    }
  };

  const persist = () => {
    if (!storage) {
      return;
    }

    pruneExpired();
    pruneLru();

    try {
      storage.setItem(options.storageKey, serializePersisted(cache));
    } catch {
      // Ignore storage errors (quota/security) and keep in-memory cache.
    }
  };

  const pruneLru = () => {
    if (options.maxEntries <= 0) {
      if (cache.size > 0) {
        trackMetric("evictions", cache.size);
        cache.clear();
      }

      return;
    }

    if (cache.size <= options.maxEntries) {
      return;
    }

    const sortedEntries = [...cache.entries()].sort(
      (a, b) => a[1].lastAccessed - b[1].lastAccessed
    );
    const removeCount = cache.size - options.maxEntries;

    for (let index = 0; index < removeCount; index += 1) {
      const entry = sortedEntries[index];
      if (entry) {
        cache.delete(entry[0]);
      }
    }

    trackMetric("evictions", removeCount);
  };

  return {
    get(key: string, ttlMs?: number): T | undefined {
      ensureLoaded();

      const entry = cache.get(key);
      if (!entry) {
        trackMetric("misses");
        return undefined;
      }

      const effectiveTtlMs = ttlMs ?? options.defaultTtlMs;
      if (Date.now() - entry.timestamp > effectiveTtlMs) {
        cache.delete(key);
        trackMetric("expirations");
        trackMetric("misses");
        persist();
        return undefined;
      }

      entry.lastAccessed = Date.now();
      cache.set(key, entry);
      trackMetric("hits");
      return entry.value;
    },

    set(key: string, value: T): void {
      ensureLoaded();

      const now = Date.now();
      cache.set(key, {
        value,
        timestamp: now,
        lastAccessed: now,
      });

      pruneLru();
      persist();
    },

    delete(key: string): boolean {
      ensureLoaded();
      const removed = cache.delete(key);

      if (removed) {
        persist();
      }

      return removed;
    },

    deleteWhere(predicate: (key: string) => boolean): number {
      ensureLoaded();

      let removedCount = 0;
      for (const key of [...cache.keys()]) {
        if (predicate(key) && cache.delete(key)) {
          removedCount += 1;
        }
      }

      if (removedCount > 0) {
        persist();
      }

      return removedCount;
    },

    clear(): void {
      ensureLoaded();
      cache.clear();

      if (storage) {
        try {
          storage.removeItem(options.storageKey);
        } catch {
          // Ignore storage errors.
        }
      }
    },

    size(): number {
      ensureLoaded();
      return cache.size;
    },

    getMetrics(): AsyncValidationCacheMetrics {
      return { ...metrics };
    },

    resetMetrics(): void {
      metrics.hits = 0;
      metrics.misses = 0;
      metrics.evictions = 0;
      metrics.expirations = 0;
    },
  };
}
