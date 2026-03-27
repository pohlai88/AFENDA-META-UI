import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { queryKeys } from "~/lib/query-keys";

export interface InvariantViolation {
  id: string;
  tenantId: number;
  invariantCode: string;
  entityType: string;
  entityId: string;
  status: "pass" | "fail" | "warning";
  severity: "error" | "warning" | "info";
  expectedValue: string | null;
  actualValue: string | null;
  context: string | null;
  evaluatedAt: string;
}

export interface DomainEventLog {
  id: string;
  tenantId: number;
  eventType: string;
  entityType: string;
  entityId: string;
  payload: string | null;
  triggeredBy: number | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface InvariantStats {
  total: number;
  byStatus: { pass: number; fail: number; warning: number };
  bySeverity: { error: number; warning: number; info: number };
  recentFailures24h: number;
}

export interface OpsFilters {
  page?: number;
  limit?: number;
  status?: string;
  severity?: string;
  invariantCode?: string;
  entityType?: string;
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
}

function toQueryString(filters?: OpsFilters): string {
  if (!filters) return "";

  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function useInvariantViolations(
  filters?: OpsFilters
): UseQueryResult<PaginatedResponse<InvariantViolation>> {
  return useQuery({
    queryKey: queryKeys.ops.violations(filters as unknown as Record<string, unknown> | undefined),
    queryFn: async (): Promise<PaginatedResponse<InvariantViolation>> => {
      const res = await fetch(`/api/ops/invariant-violations${toQueryString(filters)}`);
      if (!res.ok) {
        throw Object.assign(new Error("Failed to fetch invariant violations"), {
          status: res.status,
          statusText: res.statusText,
        });
      }
      return (await res.json()) as PaginatedResponse<InvariantViolation>;
    },
    refetchInterval: 30_000,
  });
}

export function useInvariantStats(): UseQueryResult<InvariantStats> {
  return useQuery({
    queryKey: queryKeys.ops.violationStats(),
    queryFn: async (): Promise<InvariantStats> => {
      const res = await fetch("/api/ops/invariant-violations/stats");
      if (!res.ok) {
        throw Object.assign(new Error("Failed to fetch invariant stats"), {
          status: res.status,
          statusText: res.statusText,
        });
      }
      return (await res.json()) as InvariantStats;
    },
    refetchInterval: 30_000,
  });
}

export function useDomainEvents(
  filters?: OpsFilters
): UseQueryResult<PaginatedResponse<DomainEventLog>> {
  return useQuery({
    queryKey: queryKeys.ops.events(filters as unknown as Record<string, unknown> | undefined),
    queryFn: async (): Promise<PaginatedResponse<DomainEventLog>> => {
      const res = await fetch(`/api/ops/domain-events${toQueryString(filters)}`);
      if (!res.ok) {
        throw Object.assign(new Error("Failed to fetch domain events"), {
          status: res.status,
          statusText: res.statusText,
        });
      }
      return (await res.json()) as PaginatedResponse<DomainEventLog>;
    },
    refetchInterval: 30_000,
  });
}
