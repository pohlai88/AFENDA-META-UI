import type { ResolutionContext } from "@afenda/meta-types";
import { ResolutionCacheService } from "@afenda/meta-types";
import { randomUUID } from "crypto";
import { logDecisionAudit } from "../audit/decisionAuditLogger.js";

export interface CacheMetrics {
  cacheHitRate: number;
  costReductionPercent: number;
  avgCachedTimeMs: number;
  avgUncachedTimeMs: number;
  totalCacheHits: number;
  totalCacheMisses: number;
}

function cacheContextFromResolutionContext(context: ResolutionContext): Record<string, unknown> {
  return {
    industry: context.industry ?? null,
    departmentId: context.departmentId ?? null,
    userId: context.userId ?? null,
  };
}

export class CachedResolutionService {
  private cachedDurations: number[] = [];
  private uncachedDurations: number[] = [];

  resolveWithCache(
    resolveMetadataFn: (
      model: string,
      globalMeta: Record<string, unknown>,
      context: ResolutionContext
    ) => Record<string, unknown>,
    model: string,
    globalMeta: Record<string, unknown>,
    context: ResolutionContext,
    ttlMs = 60000
  ): Record<string, unknown> {
    const cacheKey = ResolutionCacheService.generateKey(
      context.tenantId,
      model,
      cacheContextFromResolutionContext(context)
    );
    const requestId = randomUUID();
    const startedAt = performance.now();
    const cached = ResolutionCacheService.get(cacheKey);

    if (cached) {
      const durationMs = performance.now() - startedAt;
      this.cachedDurations.push(durationMs);

      logDecisionAudit({
        id: requestId,
        timestamp: new Date().toISOString(),
        tenantId: context.tenantId,
        userId: context.userId,
        eventType: "metadata_resolved",
        scope: `${model}.cache_hit`,
        context: { model },
        decision: {
          input: {
            model,
            cacheKey,
            tenantId: context.tenantId,
          },
          output: {
            cached: true,
            cacheKey,
          },
          reasoning: "Resolved metadata served from cache",
        },
        durationMs,
        status: "success",
      });

      return cached;
    }

    const resolveStartedAt = performance.now();
    const resolved = resolveMetadataFn(model, globalMeta, context);
    const durationMs = performance.now() - resolveStartedAt;
    this.uncachedDurations.push(durationMs);

    ResolutionCacheService.set(cacheKey, resolved, ttlMs, {
      tenantId: context.tenantId,
      model,
      dataSourceId: "tenant-metadata",
    });

    logDecisionAudit({
      id: requestId,
      timestamp: new Date().toISOString(),
      tenantId: context.tenantId,
      userId: context.userId,
      eventType: "metadata_resolved",
      scope: `${model}.cache_miss`,
      context: { model },
      decision: {
        input: {
          model,
          cacheKey,
          tenantId: context.tenantId,
        },
        output: {
          cached: false,
          cacheKey,
        },
        reasoning: "Resolved metadata computed and inserted into cache",
      },
      durationMs,
      status: "success",
    });

    return resolved;
  }

  getMetrics(): CacheMetrics {
    const stats = ResolutionCacheService.getStats();
    const avgCachedTimeMs =
      this.cachedDurations.length === 0
        ? 0
        : this.cachedDurations.reduce((sum, value) => sum + value, 0) / this.cachedDurations.length;
    const avgUncachedTimeMs =
      this.uncachedDurations.length === 0
        ? 0
        : this.uncachedDurations.reduce((sum, value) => sum + value, 0) /
          this.uncachedDurations.length;
    const costReductionPercent =
      avgUncachedTimeMs === 0
        ? 0
        : ((avgUncachedTimeMs - avgCachedTimeMs) / avgUncachedTimeMs) * 100;

    return {
      cacheHitRate: stats.hitRate,
      costReductionPercent: Math.max(0, Math.min(100, costReductionPercent)),
      avgCachedTimeMs,
      avgUncachedTimeMs,
      totalCacheHits: stats.hits,
      totalCacheMisses: stats.misses,
    };
  }

  invalidateTenant(tenantId: string): number {
    return ResolutionCacheService.invalidateByTenant(tenantId);
  }

  invalidateModel(tenantId: string, model: string): number {
    return ResolutionCacheService.invalidateByDependency(tenantId, model);
  }

  clear(): void {
    ResolutionCacheService.clear();
    this.cachedDurations = [];
    this.uncachedDurations = [];
  }

  getCacheEntries(filter?: { tenantId?: string; maxAge?: number }) {
    return ResolutionCacheService.getEntries(filter);
  }
}

const service = new CachedResolutionService();

export function getCachedResolutionService(): CachedResolutionService {
  return service;
}

export const CachedResolution = {
  resolveWithCache: service.resolveWithCache.bind(service),
  getMetrics: service.getMetrics.bind(service),
  invalidateTenant: service.invalidateTenant.bind(service),
  invalidateModel: service.invalidateModel.bind(service),
  clear: service.clear.bind(service),
  getCacheEntries: service.getCacheEntries.bind(service),
};
