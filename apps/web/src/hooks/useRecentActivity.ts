import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "~/lib/query-keys";

interface ListResponse {
  data?: Array<Record<string, unknown>>;
}

export interface ActivityItemData {
  type: "Sales Order" | "Partner" | "Product";
  message: string;
  time: string;
}

interface ActivityItemInternal extends ActivityItemData {
  timestampMs: number;
}

function toDateValue(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getActivityTimestamp(row: Record<string, unknown>): Date | null {
  return (
    toDateValue(row.updated_at) ||
    toDateValue(row.updatedAt) ||
    toDateValue(row.created_at) ||
    toDateValue(row.createdAt)
  );
}

function formatRelativeTime(date: Date | null, now: Date = new Date()): string {
  if (!date) {
    return "Recently";
  }

  const diffMs = Math.max(now.getTime() - date.getTime(), 0);
  const minutes = Math.floor(diffMs / (60 * 1000));

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString();
}

function toDisplayValue(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return fallback;
}

function mapSalesOrderActivity(row: Record<string, unknown>): ActivityItemData {
  const code = toDisplayValue(row.code ?? row.name ?? row.id, "Sales order");
  return {
    type: "Sales Order",
    message: `${code} updated`,
    time: formatRelativeTime(getActivityTimestamp(row)),
  };
}

function mapPartnerActivity(row: Record<string, unknown>): ActivityItemData {
  const name = toDisplayValue(row.name ?? row.code ?? row.id, "Partner");
  return {
    type: "Partner",
    message: `${name} updated`,
    time: formatRelativeTime(getActivityTimestamp(row)),
  };
}

function mapProductActivity(row: Record<string, unknown>): ActivityItemData {
  const name = toDisplayValue(row.name ?? row.code ?? row.id, "Product");
  return {
    type: "Product",
    message: `${name} updated`,
    time: formatRelativeTime(getActivityTimestamp(row)),
  };
}

function toActivityItemInternal(
  row: Record<string, unknown>,
  mapper: (row: Record<string, unknown>) => ActivityItemData
): ActivityItemInternal {
  const mapped = mapper(row);
  const timestamp = getActivityTimestamp(row);

  return {
    ...mapped,
    timestampMs: timestamp?.getTime() ?? 0,
  };
}

async function fetchRecentForModel(model: string): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(`/api/${model}?page=1&limit=3&orderBy=id&orderDir=desc`);

  if (!res.ok) {
    throw Object.assign(new Error(`Failed to fetch recent ${model}`), {
      status: res.status,
      statusText: res.statusText,
    });
  }

  const payload = (await res.json()) as ListResponse;
  return payload.data ?? [];
}

export function useRecentActivity() {
  return useQuery<ActivityItemData[]>({
    queryKey: queryKeys.dashboard.list("home", "recent-activity"),
    queryFn: async () => {
      const results = await Promise.allSettled([
        fetchRecentForModel("sales_order"),
        fetchRecentForModel("partner"),
        fetchRecentForModel("product"),
      ]);

      const [salesOrders, partners, products] = results.map((result) =>
        result.status === "fulfilled" ? result.value : []
      );

      const internalItems: ActivityItemInternal[] = [
        ...salesOrders.map((row) => toActivityItemInternal(row, mapSalesOrderActivity)),
        ...partners.map((row) => toActivityItemInternal(row, mapPartnerActivity)),
        ...products.map((row) => toActivityItemInternal(row, mapProductActivity)),
      ];

      internalItems.sort((a, b) => b.timestampMs - a.timestampMs);

      return internalItems.slice(0, 6).map(({ timestampMs: _timestampMs, ...item }) => item);
    },
    staleTime: 30 * 1000,
    retry: 1,
  });
}
