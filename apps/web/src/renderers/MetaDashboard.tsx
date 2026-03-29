/**
 * MetaDashboard
 * =============
 * Renders a grid of widgets declared in MetaDashboardView.widgets.
 *
 * Supported widget types:
 *  • stat    — single KPI number fetched from /api/:model?aggregate=count|sum|avg
 *  • chart   — renders bar/line/pie charts using Recharts
 *  • list    — embeds a minimal record list (reuses MetaList in compact mode)
 *
 * Widget data is fetched independently so slow widgets don't block fast ones.
 */

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MetaDashboardChartConfig, MetaDashboardChartSeries, MetaDashboardView, MetaDashboardWidget } from "@afenda/meta-types/schema";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMeta } from "../hooks/useMeta.js";

interface MetaDashboardProps {
  model: string;
  columnWidth?: number;
  gap?: string;
}

interface WidgetRendererProps {
  widget: MetaDashboardWidget;
}

type RecordRow = Record<string, unknown>;
type ChartDatum = { name: string; value: number };
type MultiSeriesDatum = Record<string, string | number>;

const CHART_PALETTE = ["#3b5bdb", "#74c0fc", "#9775fa", "#fab005", "#40c057", "#ff922b"];

const widgetRenderers: Record<
  MetaDashboardWidget["type"],
  React.ComponentType<WidgetRendererProps>
> = {
  stat: React.memo(StatWidget),
  chart: React.memo(ChartWidget),
  list: React.memo(ListWidget),
};

export function MetaDashboard({ model, columnWidth = 280, gap = "1rem" }: MetaDashboardProps) {
  const { data: metaResponse, isLoading } = useMeta(model);
  const meta = metaResponse?.meta;
  const dashView = meta?.views?.dashboard as MetaDashboardView | undefined;

  if (isLoading) return <p>Loading…</p>;
  if (!meta || !dashView) return <p>No dashboard view configured for "{model}".</p>;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(180, columnWidth)}px, 1fr))`,
        gap,
      }}
    >
      {dashView.widgets.map((widget) => (
        <DashboardWidget key={widget.id} widget={widget} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual widget renderers
// ---------------------------------------------------------------------------

function DashboardWidget({ widget }: WidgetRendererProps) {
  const Renderer = widgetRenderers[widget.type];
  if (Renderer) {
    return <Renderer widget={widget} />;
  }

  return (
    <WidgetShell title={widget.title}>
      <p style={{ color: "#888", fontSize: "0.85rem" }}>
        Widget type "{String((widget as { type?: string }).type ?? "unknown")}" not yet supported.
      </p>
    </WidgetShell>
  );
}

// ---- Stat Widget -----------------------------------------------------------

function StatWidget({ widget }: WidgetRendererProps) {
  const queryClient = useQueryClient();
  const queryKey = ["dashboard", "stat", widget.id, widget.data_source] as const;

  const { data, isLoading, error } = useQuery<{ value: number }, Error>({
    queryKey,
    queryFn: async () => {
      const url = `/api/${widget.data_source?.model}?aggregate=${widget.data_source?.aggregate ?? "count"}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch stat");

      const payload = (await res.json()) as { value?: unknown };
      return { value: typeof payload.value === "number" ? payload.value : 0 };
    },
    enabled: !!widget.data_source?.model,
    staleTime: 30_000,
  });

  if (!widget.data_source?.model) {
    return (
      <WidgetShell title={widget.title}>
        <WidgetHint text="This widget is missing its data source model." />
      </WidgetShell>
    );
  }

  if (error) {
    return (
      <WidgetShell
        title={widget.title}
        actions={<RefreshButton onClick={() => void queryClient.invalidateQueries({ queryKey })} />}
      >
        <WidgetErrorMessage />
      </WidgetShell>
    );
  }

  return (
    <WidgetShell
      title={widget.title}
      actions={<RefreshButton onClick={() => void queryClient.invalidateQueries({ queryKey })} />}
    >
      {isLoading ? (
        <MetricSkeleton />
      ) : (
        <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "#3b5bdb" }}>
          {data?.value?.toLocaleString() ?? "—"}
        </div>
      )}
      {widget.subtitle && (
        <div style={{ color: "#666", fontSize: "0.85rem", marginTop: "0.25rem" }}>
          {widget.subtitle}
        </div>
      )}
    </WidgetShell>
  );
}

// ---- Chart Widget ----------------------------------------------------------

function ChartWidget({ widget }: WidgetRendererProps) {
  const queryClient = useQueryClient();
  const queryKey = ["dashboard", "chart", widget.id, widget.data_source] as const;

  const { data, isLoading, error } = useQuery<RecordRow[], Error>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/${widget.data_source?.model}?limit=8`);
      if (!res.ok) throw new Error("Failed to fetch chart data");

      const payload = (await res.json()) as { data?: unknown } | unknown[];

      if (Array.isArray(payload)) {
        return payload.filter(isRecordRow);
      }

      if (
        payload &&
        typeof payload === "object" &&
        "data" in payload &&
        Array.isArray((payload as { data?: unknown }).data)
      ) {
        return (payload as { data: unknown[] }).data.filter(isRecordRow);
      }

      return [];
    },
    enabled: !!widget.data_source?.model,
    staleTime: 30_000,
  });

  if (!widget.data_source?.model) {
    return (
      <WidgetShell title={widget.title} style={{ minHeight: 220 }}>
        <WidgetHint text="This widget is missing its data source model." />
      </WidgetShell>
    );
  }

  if (error) {
    return (
      <WidgetShell
        title={widget.title}
        style={{ minHeight: 220 }}
        actions={<RefreshButton onClick={() => void queryClient.invalidateQueries({ queryKey })} />}
      >
        <WidgetErrorMessage />
      </WidgetShell>
    );
  }

  const chartType = widget.chart_type ?? "bar";
  const chartConfig = widget.chart_config;
  const hasSeries = (chartConfig?.series?.length ?? 0) > 0;
  const chartData = toChartData(data ?? [], chartConfig);
  const multiResult = hasSeries ? toMultiSeriesData(data ?? [], chartConfig!) : null;
  const isEmpty = hasSeries ? (multiResult?.data.length ?? 0) === 0 : chartData.length === 0;

  return (
    <WidgetShell
      title={widget.title}
      style={{ minHeight: 220 }}
      actions={<RefreshButton onClick={() => void queryClient.invalidateQueries({ queryKey })} />}
    >
      {isLoading ? (
        <ChartSkeleton />
      ) : isEmpty ? (
        <WidgetHint text="No chartable numeric data found." />
      ) : (
        <div style={{ width: "100%", height: hasSeries ? 220 : 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            {hasSeries && multiResult
              ? renderMultiSeriesChart(
                  chartType === "pie" ? "bar" : chartType,
                  multiResult.data,
                  multiResult.xKey,
                  chartConfig!
                )
              : renderChart(chartType, chartData, chartConfig)}
          </ResponsiveContainer>
        </div>
      )}
    </WidgetShell>
  );
}

function renderChart(
  chartType: "bar" | "line" | "pie",
  chartData: ChartDatum[],
  chartConfig?: MetaDashboardChartConfig
) {
  const showGrid = chartConfig?.show_grid ?? true;
  const primaryColor = chartConfig?.color ?? "#3b5bdb";
  const palette = chartConfig?.palette?.length ? chartConfig.palette : CHART_PALETTE;
  const xAxisLabel = chartConfig?.x_axis_label;
  const yAxisLabel = chartConfig?.y_axis_label;

  if (chartType === "line") {
    return (
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        {showGrid ? (
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" />
        ) : null}
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
          label={
            xAxisLabel ? { value: xAxisLabel, position: "insideBottom", offset: -5 } : undefined
          }
        />
        <YAxis
          tick={{ fontSize: 12 }}
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: "insideLeft" } : undefined}
        />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #dee2e6" }}
          cursor={{ fill: "rgba(59, 91, 219, 0.08)" }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={primaryColor}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    );
  }

  if (chartType === "pie") {
    const outerRadius = chartConfig?.pie_outer_radius ?? 72;

    return (
      <PieChart>
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #dee2e6" }} />
        <Legend verticalAlign="bottom" height={24} />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={outerRadius}
          label
        >
          {chartData.map((_, index) => (
            <Cell key={`pie-segment-${index}`} fill={palette[index % palette.length]} />
          ))}
        </Pie>
      </PieChart>
    );
  }

  return (
    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
      {showGrid ? <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" /> : null}
      <XAxis
        dataKey="name"
        tick={{ fontSize: 12 }}
        label={xAxisLabel ? { value: xAxisLabel, position: "insideBottom", offset: -5 } : undefined}
      />
      <YAxis
        tick={{ fontSize: 12 }}
        label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: "insideLeft" } : undefined}
      />
      <Tooltip
        contentStyle={{ borderRadius: 8, border: "1px solid #dee2e6" }}
        cursor={{ fill: "rgba(59, 91, 219, 0.08)" }}
      />
      <Bar dataKey="value" fill={primaryColor} radius={[4, 4, 0, 0]} />
    </BarChart>
  );
}

function renderMultiSeriesChart(
  chartType: "bar" | "line",
  data: MultiSeriesDatum[],
  xKey: string,
  chartConfig: MetaDashboardChartConfig
) {
  const series = chartConfig.series as MetaDashboardChartSeries[];
  const showGrid = chartConfig.show_grid ?? true;
  const palette = chartConfig.palette?.length ? chartConfig.palette : CHART_PALETTE;
  const xAxisLabel = chartConfig.x_axis_label;
  const yAxisLabel = chartConfig.y_axis_label;
  const isStacking = series.some((s) => s.stacked);
  const margin = { top: 8, right: 8, left: 0, bottom: 24 };

  if (chartType === "line") {
    return (
      <LineChart data={data} margin={margin}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" />}
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 12 }}
          label={
            xAxisLabel ? { value: xAxisLabel, position: "insideBottom", offset: -5 } : undefined
          }
        />
        <YAxis
          tick={{ fontSize: 12 }}
          label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: "insideLeft" } : undefined}
        />
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #dee2e6" }} />
        <Legend verticalAlign="bottom" height={24} />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label ?? s.key}
            stroke={s.color ?? palette[i % palette.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    );
  }

  return (
    <BarChart data={data} margin={margin}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" />}
      <XAxis
        dataKey={xKey}
        tick={{ fontSize: 12 }}
        label={xAxisLabel ? { value: xAxisLabel, position: "insideBottom", offset: -5 } : undefined}
      />
      <YAxis
        tick={{ fontSize: 12 }}
        label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: "insideLeft" } : undefined}
      />
      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #dee2e6" }} />
      <Legend verticalAlign="bottom" height={24} />
      {series.map((s, i) => (
        <Bar
          key={s.key}
          dataKey={s.key}
          name={s.label ?? s.key}
          stackId={isStacking && s.stacked ? "stack" : undefined}
          fill={s.color ?? palette[i % palette.length]}
          radius={isStacking ? 0 : [4, 4, 0, 0]}
        />
      ))}
    </BarChart>
  );
}

// ---- List Widget -----------------------------------------------------------

function ListWidget({ widget }: WidgetRendererProps) {
  const queryClient = useQueryClient();
  const queryKey = ["dashboard", "list", widget.id, widget.data_source] as const;

  const { data, isLoading, error } = useQuery<{ data: RecordRow[] }, Error>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/${widget.data_source?.model}?limit=5`);
      if (!res.ok) throw new Error("Failed to fetch list");

      const payload = (await res.json()) as { data?: unknown };
      const rows =
        payload && typeof payload === "object" && Array.isArray(payload.data)
          ? payload.data.filter(isRecordRow)
          : [];

      return { data: rows };
    },
    enabled: !!widget.data_source?.model,
    staleTime: 30_000,
  });

  if (!widget.data_source?.model) {
    return (
      <WidgetShell title={widget.title}>
        <WidgetHint text="This widget is missing its data source model." />
      </WidgetShell>
    );
  }

  if (error) {
    return (
      <WidgetShell
        title={widget.title}
        actions={<RefreshButton onClick={() => void queryClient.invalidateQueries({ queryKey })} />}
      >
        <WidgetErrorMessage />
      </WidgetShell>
    );
  }

  const rows = data?.data ?? [];

  return (
    <WidgetShell
      title={widget.title}
      actions={<RefreshButton onClick={() => void queryClient.invalidateQueries({ queryKey })} />}
    >
      {isLoading ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <p style={{ color: "#aaa", fontSize: "0.85rem" }}>No records.</p>
      ) : (
        <ul style={{ margin: 0, padding: "0 0 0 1rem" }}>
          {rows.map((r, i) => (
            <li key={String(r.id ?? i)} style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
              {String(r.name ?? r.id ?? `Record ${i + 1}`)}
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  );
}

function isRecordRow(value: unknown): value is RecordRow {
  return typeof value === "object" && value !== null;
}

function toChartData(rows: RecordRow[], chartConfig?: MetaDashboardChartConfig): ChartDatum[] {
  if (rows.length === 0) {
    return [];
  }

  const configuredYKey = chartConfig?.y_key;
  const configuredXKey = chartConfig?.x_key;

  const numericField =
    configuredYKey ??
    rows
      .map((row) => Object.entries(row).find(([, value]) => toNumber(value) !== null)?.[0])
      .find(Boolean);

  if (!numericField) {
    return [];
  }

  const maxPoints = Math.max(1, chartConfig?.max_points ?? 8);

  return rows
    .map((row, index) => {
      const rawValue = toNumber(row[numericField]);
      if (rawValue === null) {
        return null;
      }

      const labelSource = (configuredXKey ? row[configuredXKey] : undefined) ?? row.name ?? row.id;

      const name =
        typeof labelSource === "string" || typeof labelSource === "number"
          ? String(labelSource)
          : `Record ${index + 1}`;

      return { name, value: rawValue };
    })
    .filter((datum): datum is ChartDatum => datum !== null)
    .slice(0, maxPoints);
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toMultiSeriesData(
  rows: RecordRow[],
  chartConfig: MetaDashboardChartConfig
): { data: MultiSeriesDatum[]; xKey: string } {
  const series = chartConfig.series as MetaDashboardChartSeries[];
  const seriesKeySet = new Set(series.map((s) => s.key));
  const maxPoints = Math.max(1, chartConfig.max_points ?? 20);

  const xKey =
    chartConfig.x_key ??
    (rows[0]
      ? Object.keys(rows[0]).find((k) => !seriesKeySet.has(k) && typeof rows[0][k] !== "number")
      : undefined) ??
    "name";

  return {
    xKey,
    data: rows.slice(0, maxPoints).map((row, index) => {
      const labelSource = row[xKey];
      const xValue =
        typeof labelSource === "string" || typeof labelSource === "number"
          ? String(labelSource)
          : `Record ${index + 1}`;

      const datum: MultiSeriesDatum = { [xKey]: xValue };
      for (const s of series) {
        datum[s.key] = toNumber(row[s.key]) ?? 0;
      }
      return datum;
    }),
  };
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

function WidgetShell({
  title,
  children,
  style,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  actions?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 8,
        padding: "1rem 1.25rem",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <h3 style={{ margin: 0, fontWeight: 600, color: "#222", fontSize: "1rem" }}>{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  );
}

function RefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "1px solid #ced4da",
        borderRadius: 6,
        background: "#fff",
        color: "#495057",
        padding: "0.2rem 0.5rem",
        fontSize: "0.75rem",
        cursor: "pointer",
      }}
      aria-label="Refresh widget"
    >
      Refresh
    </button>
  );
}

function WidgetErrorMessage() {
  return (
    <p style={{ color: "#c92a2a", fontSize: "0.85rem", margin: 0 }}>Failed to load widget data.</p>
  );
}

function WidgetHint({ text }: { text: string }) {
  return <p style={{ color: "#868e96", fontSize: "0.85rem", margin: 0 }}>{text}</p>;
}

function SkeletonBlock({ width, height }: { width: string; height: string }) {
  return (
    <div
      style={{
        width,
        height,
        background: "#e9ecef",
        borderRadius: 6,
      }}
    />
  );
}

function MetricSkeleton() {
  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <SkeletonBlock width="50%" height="2.5rem" />
      <SkeletonBlock width="30%" height="0.9rem" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <SkeletonBlock width="90%" height="0.85rem" />
      <SkeletonBlock width="82%" height="0.85rem" />
      <SkeletonBlock width="75%" height="0.85rem" />
      <SkeletonBlock width="88%" height="0.85rem" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", height: 180 }}>
      <SkeletonBlock width="18%" height="40%" />
      <SkeletonBlock width="18%" height="65%" />
      <SkeletonBlock width="18%" height="52%" />
      <SkeletonBlock width="18%" height="78%" />
      <SkeletonBlock width="18%" height="58%" />
    </div>
  );
}
