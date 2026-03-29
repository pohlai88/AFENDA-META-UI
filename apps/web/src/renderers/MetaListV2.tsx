import React from "react";
import type { MetaListView } from "@afenda/meta-types/schema";
import { useMeta } from "~/hooks/useMeta";
import { type FilterGroup, useModelList } from "~/hooks/useModel";
import { DataTableFilter } from "~/components/filters/DataTableFilter";
import { RowActionsMenu } from "~/components/RowActionsMenu";
import {
  clearSelection,
  createSelectionScopeHash,
  createSelectionSnapshot,
  isAllPageRowsSelected,
  isRowSelected,
  normalizeSelectionForScope,
  selectAllMatchingQuery,
  togglePageSelection,
  toggleRowSelection,
  type MetaListSelectionSnapshot,
  type MetaListSelectionState,
} from "./meta-list-selection";
import { exportToCsv } from "~/lib/csv-export";
import {
  useRowBulkAction,
  createBulkUpdateAction,
  createBulkDeleteAction,
  type BulkAction,
} from "~/lib/bulk-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@afenda/ui";
import { DownloadIcon, ChevronDownIcon } from "lucide-react";

interface MetaListV2Props {
  model: string;
  onRowClick?: (record: Record<string, unknown>) => void;
  onNew?: () => void;
  embedded?: boolean;
  onSelectionChange?: (selection: MetaListSelectionSnapshot) => void;
}

const PAGE_LIMIT = 20;

function readRowId(row: Record<string, unknown>): string {
  const raw = row.id;
  if (typeof raw === "string" || typeof raw === "number") {
    return String(raw);
  }

  return "";
}

export function MetaListV2({ model, onRowClick, onNew, onSelectionChange }: MetaListV2Props) {
  const [page, setPage] = React.useState(1);
  const [filters, setFilters] = React.useState<FilterGroup>({ logic: "and", conditions: [] });
  const [selection, setSelection] = React.useState<MetaListSelectionState>(clearSelection);

  const { data: metaResponse, isLoading: metaLoading } = useMeta(model);

  const { data: listData, isLoading: listLoading } = useModelList<Record<string, unknown>>(model, {
    page,
    limit: PAGE_LIMIT,
    filters,
  });

  const meta = metaResponse?.meta;
  const permissions = metaResponse?.permissions;
  const listView = meta?.views?.list as MetaListView | undefined;

  const rows = React.useMemo(() => listData?.data ?? [], [listData?.data]);
  const totalRecords = listData?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_LIMIT));
  const pageRowIds = React.useMemo(() => rows.map(readRowId).filter((id) => id.length > 0), [rows]);

  const queryHash = React.useMemo(() => createSelectionScopeHash(model, filters), [filters, model]);

  React.useEffect(() => {
    setSelection((prev) => normalizeSelectionForScope(prev, queryHash));
  }, [queryHash]);

  const snapshot = React.useMemo(
    () => createSelectionSnapshot(selection, pageRowIds, totalRecords, queryHash),
    [pageRowIds, queryHash, selection, totalRecords]
  );

  React.useEffect(() => {
    onSelectionChange?.(snapshot);
  }, [onSelectionChange, snapshot]);

  const allPageSelected = isAllPageRowsSelected(selection, pageRowIds, queryHash);
  const canPromoteToQuerySelection =
    snapshot.mode !== "query" &&
    snapshot.selectedCount > 0 &&
    totalRecords > snapshot.selectedCount;

  const columns = React.useMemo(() => listView?.columns ?? [], [listView?.columns]);
  const fieldByName = new Map((meta?.fields ?? []).map((field) => [field.name, field] as const));

  // Bulk actions
  const { execute: executeBulkAction, isLoading: bulkActionLoading } = useRowBulkAction(
    model,
    snapshot,
    rows
  );

  const bulkActions = React.useMemo<BulkAction[]>(() => {
    const actions: BulkAction[] = [];

    // Example: Bulk update status to "approved"
    // This should be configurable based on model metadata
    const statusField = meta?.fields.find((f) => f.name === "status");
    if (statusField && permissions?.can_update) {
      actions.push(createBulkUpdateAction(model, "status", "approved", "Set status: Approved"));
      actions.push(createBulkUpdateAction(model, "status", "rejected", "Set status: Rejected"));
    }

    // Bulk delete
    if (permissions?.can_delete) {
      actions.push(createBulkDeleteAction(model));
    }

    return actions;
  }, [meta, model, permissions]);

  const handleExport = React.useCallback(() => {
    if (snapshot.selectedCount === 0) {
      return;
    }

    const selectedSet = new Set(snapshot.ids);
    const recordsToExport: Record<string, unknown>[] =
      snapshot.mode === "query"
        ? rows
        : rows.filter((row) => {
            const id = readRowId(row);
            return id && selectedSet.has(id);
          });

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `${model}-export-${timestamp}.csv`;

    exportToCsv(recordsToExport, meta?.fields ?? [], columns, filename);
  }, [snapshot, rows, model, meta, columns]);

  if (metaLoading || listLoading) {
    return <p>Loading...</p>;
  }

  if (!meta || !listView) {
    return <p>No list view for "{model}".</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{meta.label_plural ?? meta.label}</h2>
        {permissions?.can_create && onNew ? (
          <button type="button" onClick={onNew} className="rounded border px-3 py-1 text-sm">
            New
          </button>
        ) : null}
      </div>

      <DataTableFilter
        fields={meta.fields}
        value={filters}
        onChange={(nextFilters) => {
          setFilters(nextFilters);
          setPage(1);
        }}
      />

      {snapshot.selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded border p-2 text-sm">
          <span>
            {snapshot.mode === "query"
              ? `${snapshot.selectedCount} selected across matching records`
              : `${snapshot.selectedCount} selected`}
          </span>

          {canPromoteToQuerySelection ? (
            <button
              type="button"
              onClick={() => setSelection(selectAllMatchingQuery(queryHash))}
              className="rounded border px-2 py-1"
            >
              Select all {totalRecords} matching records
            </button>
          ) : null}

          <button
            type="button"
            className="flex items-center gap-1 rounded border px-2 py-1 hover:bg-accent"
            disabled={snapshot.selectedCount === 0}
            onClick={handleExport}
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            Export selected
          </button>

          {bulkActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded border px-2 py-1 hover:bg-accent"
                  disabled={bulkActionLoading || snapshot.selectedCount === 0}
                >
                  Bulk Actions
                  <ChevronDownIcon className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {bulkActions.map((action, index) => (
                  <React.Fragment key={action.id}>
                    {index > 0 && action.variant === "destructive" && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      onClick={() => executeBulkAction(action)}
                      className={
                        action.variant === "destructive"
                          ? "text-destructive focus:text-destructive"
                          : undefined
                      }
                    >
                      {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                      {action.label}
                    </DropdownMenuItem>
                  </React.Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <button
            type="button"
            onClick={() => setSelection(clearSelection())}
            className="ml-auto rounded border px-2 py-1 text-xs hover:bg-accent"
          >
            Clear selection
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b p-2 text-left">
                <button
                  type="button"
                  role="checkbox"
                  aria-label="Select all rows on this page"
                  aria-checked={allPageSelected}
                  onClick={() => {
                    const nextChecked = !allPageSelected;
                    setSelection((prev) =>
                      togglePageSelection(prev, pageRowIds, nextChecked, queryHash)
                    );
                  }}
                  className="rounded border px-2 py-1 text-xs"
                >
                  {allPageSelected ? "All" : "None"}
                </button>
              </th>
              {columns.map((column) => (
                <th key={column} className="border-b p-2 text-left">
                  {fieldByName.get(column)?.label ?? column}
                </th>
              ))}
              <th className="border-b p-2 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={columns.length + 1}>
                  No records found.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const rowId = readRowId(row);
                const rowSelected = rowId ? isRowSelected(selection, rowId, queryHash) : false;

                return (
                  <tr
                    key={rowId || `row-${index}`}
                    className={onRowClick ? "cursor-pointer" : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    <td className="border-b p-2" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-label={`Select row ${rowId}`}
                        aria-checked={rowSelected}
                        onClick={() => {
                          if (!rowId) {
                            return;
                          }

                          setSelection((prev) =>
                            toggleRowSelection(prev, rowId, !rowSelected, queryHash)
                          );
                        }}
                        className="rounded border px-2 py-1 text-xs"
                      >
                        {rowSelected ? "Selected" : "Select"}
                      </button>
                    </td>

                    {columns.map((column) => (
                      <td key={column} className="border-b p-2">
                        {String(row[column] ?? "-")}
                      </td>
                    ))}

                    <td className="border-b p-2" onClick={(event) => event.stopPropagation()}>
                      <RowActionsMenu
                        model={model}
                        recordId={rowId}
                        record={row}
                        actions={meta?.actions || []}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Go to previous page"
          disabled={page <= 1}
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          className="rounded border px-2 py-1"
        >
          Prev
        </button>

        <span className="text-sm">
          Page {page} / {totalPages}
        </span>

        <button
          type="button"
          aria-label="Go to next page"
          disabled={page >= totalPages}
          onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
          className="rounded border px-2 py-1"
        >
          Next
        </button>
      </div>
    </div>
  );
}
