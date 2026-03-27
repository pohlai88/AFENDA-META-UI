/**
 * Query Key Factory
 * ==================
 * Centralized, typed query keys for React Query cache management.
 *
 * Benefits:
 * - Type-safe query keys prevent cache mismatches
 * - Consistent structure across all queries
 * - Easy bulk invalidation (e.g., queryClient.invalidateQueries({ queryKey: queryKeys.models._def }))
 * - Better IntelliSense support
 *
 * Pattern:
 * - Top-level: domain (meta, models, modules, dashboard)
 * - Second-level: operation (list, detail, all)
 * - Remaining levels: parameters
 */

import type { FilterGroup } from "~/hooks/useModel";

interface ModelListKeyOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: "asc" | "desc";
  filters?: FilterGroup;
}

function stableSerializeQueryKeyOptions(options?: ModelListKeyOptions): string {
  if (!options) {
    return "{}";
  }

  // Ensure deterministic cache keys across object creation order differences.
  const sortedEntries = Object.entries(options)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  return JSON.stringify(Object.fromEntries(sortedEntries));
}

/**
 * Query key factory providing structured cache keys
 */
export const queryKeys = {
  /**
   * Model metadata (schemas, permissions, views)
   */
  meta: {
    _def: ["meta"] as const,
    byModel: (model: string) => [...queryKeys.meta._def, model] as const,
  },

  /**
   * Model data (CRUD operations)
   */
  models: {
    _def: ["model"] as const,
    lists: (model: string) => [...queryKeys.models._def, model, "list"] as const,
    list: (model: string, options?: ModelListKeyOptions) =>
      [...queryKeys.models.lists(model), stableSerializeQueryKeyOptions(options)] as const,
    details: (model: string) => [...queryKeys.models._def, model] as const,
    detail: (model: string, recordId: string) =>
      [...queryKeys.models.details(model), recordId] as const,
  },

  /**
   * Module registry (menus, navigation)
   */
  modules: {
    _def: ["modules"] as const,
    menus: () => [...queryKeys.modules._def, "menus"] as const,
  },

  /**
   * Dashboard widgets (stats, lists, charts)
   */
  dashboard: {
    _def: ["dashboard"] as const,
    stat: (widgetId: string, dataSource: string) =>
      [...queryKeys.dashboard._def, "stat", widgetId, dataSource] as const,
    list: (widgetId: string, dataSource: string) =>
      [...queryKeys.dashboard._def, "list", widgetId, dataSource] as const,
  },

  /**
   * Relation fields (many2one, one2many lookups)
   */
  relations: {
    _def: ["relation"] as const,
    search: (model: string, search: string) =>
      [...queryKeys.relations._def, model, search] as const,
  },

  /**
   * Purchase orders (ERP workflow example)
   */
  purchaseOrders: {
    _def: ["purchaseOrders"] as const,
    list: () => [...queryKeys.purchaseOrders._def, "list"] as const,
  },

  /**
   * Sandbox simulation actions
   */
  sandbox: {
    _def: ["sandbox"] as const,
    simulate: () => [...queryKeys.sandbox._def, "simulate"] as const,
    blastRadius: () => [...queryKeys.sandbox._def, "blast-radius"] as const,
    batch: () => [...queryKeys.sandbox._def, "batch"] as const,
  },

  /**
   * Operations telemetry (invariants + domain events)
   */
  ops: {
    _def: ["ops"] as const,
    violations: (filters?: Record<string, unknown>) =>
      [...queryKeys.ops._def, "invariant-violations", JSON.stringify(filters ?? {})] as const,
    violationStats: () => [...queryKeys.ops._def, "invariant-violations", "stats"] as const,
    events: (filters?: Record<string, unknown>) =>
      [...queryKeys.ops._def, "domain-events", JSON.stringify(filters ?? {})] as const,
  },
} as const;
