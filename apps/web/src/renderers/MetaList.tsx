/**
 * MetaList
 * ========
 * Renders a paginated, sortable list view driven by MetaListView configuration.
 *
 * Features:
 *  • Columns declared in MetaListView.columns — only requested fields rendered
 *  • Click column header to sort (toggles asc/desc if already sorted)
 *  • Pagination controls at bottom
 *  • "New" button shown if can_create
 *  • Row click → passes record to onRowClick callback
 */

import React, { useState } from "react";
import type { MetaListView, MetaField } from "@afenda/meta-types/schema";
import { useMeta } from "../hooks/useMeta.js";
import { useModelList } from "../hooks/useModel.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetaListProps {
  model: string;
  onRowClick?: (rec: Record<string, unknown>) => void;
  onNew?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCell(value: unknown, field: MetaField): string {
  if (value == null) return "—";
  if (field.type === "boolean") return value ? "Yes" : "No";
  if (field.type === "date" && typeof value === "string") {
    return new Date(value).toLocaleDateString();
  }
  if (field.type === "datetime" && typeof value === "string") {
    return new Date(value).toLocaleString();
  }
  if (field.type === "enum" && field.options) {
    const opt = field.options.find((o) => o.value === value);
    return opt?.label ?? String(value);
  }
  return String(value);
}

// ---------------------------------------------------------------------------
// MetaList
// ---------------------------------------------------------------------------

export function MetaList({ model, onRowClick, onNew }: MetaListProps) {
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const { data: metaResponse, isLoading: metaLoading } = useMeta(model);
  const meta = metaResponse?.meta;
  const listView = meta?.views?.list as MetaListView | undefined;

  const { data, isLoading: listLoading } = useModelList(model, {
    page,
    limit: 50,
    orderBy: sortField ?? undefined,
    orderDir: sortDir,
  });

  const handleSort = (col: string) => {
    if (sortField === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(col);
      setSortDir("asc");
    }
    setPage(1);
  };

  if (metaLoading || listLoading) return <p>Loading…</p>;
  if (!meta || !listView) return <p>No list view for "{model}".</p>;

  const fieldMap = new Map(meta.fields.map((f) => [f.name, f]));
  const columns = listView.columns;
  const rows: Record<string, unknown>[] = data?.data ?? [];
  const totalPages = Math.ceil((data?.meta?.total ?? 0) / 50);

  const canCreate = metaResponse?.permissions.can_create ?? false;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2>{meta.label_plural ?? meta.label}</h2>
        {canCreate && onNew && (
          <button
            onClick={onNew}
            style={{
              padding: "0.4rem 1rem",
              background: "#3b5bdb",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            + New
          </button>
        )}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead>
            <tr>
              {columns.map((col) => {
                const field = fieldMap.get(col);
                const isSorted = sortField === col;
                return (
                  <th
                    key={col}
                    onClick={() => field?.sortable !== false && handleSort(col)}
                    style={{
                      textAlign: "left",
                      padding: "0.5rem 0.75rem",
                      borderBottom: "2px solid #ddd",
                      cursor: field?.sortable !== false ? "pointer" : "default",
                      userSelect: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {field?.label ?? col}
                    {isSorted && (
                      <span style={{ marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{ textAlign: "center", padding: "2rem", color: "#888" }}
                >
                  No records found.
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr
                key={String(row.id ?? i)}
                onClick={() => onRowClick?.(row)}
                style={{
                  cursor: onRowClick ? "pointer" : "default",
                  background: i % 2 === 0 ? "#fff" : "#f9f9f9",
                }}
              >
                {columns.map((col) => {
                  const field = fieldMap.get(col);
                  return (
                    <td
                      key={col}
                      style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #eee" }}
                    >
                      {field ? formatCell(row[col], field) : String(row[col] ?? "—")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", alignItems: "center" }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            ← Prev
          </button>
          <span>
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
