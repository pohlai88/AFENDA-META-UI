/**
 * MetaListV2 - Enterprise Edition
 * ================================
 * Production-grade data table with:
 * • @tanstack/react-table for column management, sorting, filtering
 * • shadcn/ui Table components
 * • Column visibility toggle
 * • Server-side pagination & sorting
 * • Loading skeletons & empty states
 * • Row selection and bulk actions
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  type CellContext,
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type HeaderContext,
  type RowSelectionState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { useQueryClient } from "@tanstack/react-query";
import type { MetaListView, MetaField } from "@afenda/meta-types";
import type { PermissionAction } from "~/stores/business";
import { useMeta } from "~/hooks/useMeta";
import {
  buildModelListSearchParams,
  type FilterGroup,
  type ListOptions,
  type ListResponse,
  useModelList,
} from "~/hooks/useModel";
import { useCan } from "~/bootstrap/permissions-context";
import { emitAuditLog } from "~/api/audit-log";
import { queryKeys } from "~/lib/query-keys";
import { PERMISSION_ACTIONS } from "~/stores/business";
import {
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@afenda/ui";
import { Button, Separator } from "@afenda/ui";
import { Skeleton } from "@afenda/ui";
import { PageHeader, PageContainer, DataCard } from "~/components/layout";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@afenda/ui";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Settings2,
  Plus,
} from "lucide-react";
import { Badge } from "@afenda/ui";
import { DataTableFilter } from "~/components/filters/DataTableFilter";
import { toast } from "sonner";
import {
  clearSelection,
  createBulkSelectionPayload,
  createSelectionScopeHash,
  createSelectionSnapshot,
  EMPTY_SELECTION_STATE,
  getSelectionCount,
  isAllPageRowsSelected,
  isRowSelected,
  isSomePageRowsSelected,
  normalizeSelectionForScope,
  planStatusTransition,
  selectAllMatchingQuery,
  togglePageSelection,
  toggleRowSelection,
  type MetaListBulkSelectionPayload,
  type MetaListSelectionSnapshot,
  type MetaListSelectionState,
} from "./meta-list-selection";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetaListV2Props {
  model: string;
  onRowClick?: (rec: Record<string, unknown>) => void;
  onNew?: () => void;
  embedded?: boolean;
  rowSelectionState?: MetaListSelectionState;
  onSelectionChange?: (selection: MetaListSelectionSnapshot) => void;
  bulkActions?: MetaListBulkAction[];
}

export interface MetaListBulkActionContext {
  model: string;
  selection: MetaListBulkSelectionPayload;
  clearSelection: () => void;
  getSelectedRecords: () => Promise<Array<Record<string, unknown>>>;
}

export interface MetaListBulkAction {
  key: string;
  label: string;
  requiredPermission?: PermissionAction;
  hidden?: boolean | ((context: MetaListBulkActionContext) => boolean);
  disabled?: boolean | ((context: MetaListBulkActionContext) => boolean);
  onExecute: (context: MetaListBulkActionContext) => Promise<void> | void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCellValue(value: unknown, field: MetaField): React.ReactNode {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  
  switch (field.type) {
    case "boolean":
      return value ? (
        <Badge variant="secondary">Yes</Badge>
      ) : (
        <Badge variant="outline">No</Badge>
      );
    
    case "date":
      if (typeof value === "string") {
        return new Date(value).toLocaleDateString();
      }
      break;
    
    case "datetime":
      if (typeof value === "string") {
        return new Date(value).toLocaleString();
      }
      break;
    
    case "enum":
      if (field.options) {
        const opt = field.options.find((o) => o.value === value);
        if (opt) {
          return (
            <Badge variant="secondary" style={{ backgroundColor: opt.color }}>
              {opt.label}
            </Badge>
          );
        }
      }
      break;
    
    case "currency":
      if (typeof value === "number") {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value);
      }
      break;
  }
  
  return String(value);
}

function getRecordId(record: Record<string, unknown>): string | null {
  const rowId = record.id;

  if (typeof rowId === "string" || typeof rowId === "number") {
    return String(rowId);
  }

  return null;
}

async function fetchModelListPage(
  model: string,
  options: ListOptions
): Promise<ListResponse<Record<string, unknown>>> {
  const params = buildModelListSearchParams(options);
  const response = await fetch(`/api/${model}?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${model} list`);
  }

  return (await response.json()) as ListResponse<Record<string, unknown>>;
}

async function fetchModelRecord(model: string, id: string): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/${model}/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${model}/${id}`);
  }

  const payload = (await response.json()) as { data?: Record<string, unknown> };

  return payload.data ?? {};
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(objectUrl);
}

// Generate columns from MetaListView
function generateColumns(
  columnNames: string[],
  fieldMap: Map<string, MetaField>,
  onRowClick?: (rec: Record<string, unknown>) => void,
  selectionColumn?: ColumnDef<Record<string, unknown>>
): ColumnDef<Record<string, unknown>>[] {
  const dataColumns = columnNames.map((colName) => {
    const field = fieldMap.get(colName);
    
    return {
      accessorKey: colName,
      header: ({ column }: HeaderContext<Record<string, unknown>, unknown>) => {
        const isSorted = column.getIsSorted();
        const canSort = field?.sortable !== false;
        
        if (!canSort) {
          return <div>{field?.label ?? colName}</div>;
        }
        
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4 h-8"
          >
            {field?.label ?? colName}
            {isSorted === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : isSorted === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        );
      },
      cell: ({ row, getValue }: CellContext<Record<string, unknown>, unknown>) => {
        const value = getValue();
        const formatted = field ? formatCellValue(value, field) : String(value ?? "—");
        
        return (
          <div 
            className={onRowClick ? "cursor-pointer" : ""}
            onClick={(e) => {
              e.stopPropagation();
              onRowClick?.(row.original);
            }}
          >
            {formatted}
          </div>
        );
      },
    };
  });

  return selectionColumn ? [selectionColumn, ...dataColumns] : dataColumns;
}

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function TableSkeleton({ columns }: { columns: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onNew, canCreate }: { onNew?: () => void; canCreate: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Settings2 className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No records found</h3>
      <p className="text-sm text-muted-foreground mb-6">
        {canCreate ? "Get started by creating your first record." : "There are no records to display."}
      </p>
      {canCreate && onNew && (
        <Button onClick={onNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create Record
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetaListV2
// ---------------------------------------------------------------------------

export function MetaListV2({ 
  model, 
  onRowClick, 
  onNew, 
  embedded = false,
  rowSelectionState,
  onSelectionChange,
  bulkActions = []
}: MetaListV2Props) {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [filters, setFilters] = React.useState<FilterGroup>({ logic: "and", conditions: [] });
  const [internalSelection, setInternalSelection] = useState<MetaListSelectionState>(EMPTY_SELECTION_STATE);
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null);
  
  const pageSize = 20;

  // Fetch metadata
  const { data: metaResponse, isLoading: metaLoading } = useMeta(model);
  const meta = metaResponse?.meta;
  const listView = meta?.views?.list as MetaListView | undefined;
  const permissions = metaResponse?.permissions;
  const canRead = useCan(model, PERMISSION_ACTIONS.READ);
  const canWrite = useCan(model, PERMISSION_ACTIONS.WRITE);

  // Derive sort params for API
  const sortField = sorting[0]?.id;
  const sortDir = sorting[0]?.desc ? "desc" : "asc";
  const effectiveCanRead = (permissions?.can_read ?? true) && canRead;
  const effectiveCanWrite = (permissions?.can_update ?? false) && canWrite;
  const currentQueryHash = useMemo(
    () => createSelectionScopeHash(model, filters.conditions.length > 0 ? filters : undefined),
    [filters, model]
  );
  const selection = useMemo(
    () => normalizeSelectionForScope(rowSelectionState ?? internalSelection, currentQueryHash),
    [currentQueryHash, internalSelection, rowSelectionState]
  );

  // Fetch data with filters
  const { data, isLoading: listLoading } = useModelList(model, {
    page,
    limit: pageSize,
    orderBy: sortField,
    orderDir: sortDir as "asc" | "desc",
    filters: filters.conditions.length > 0 ? filters : undefined,
  });

  const rows = data?.data ?? [];
  const totalRecords = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const pageRowIds = useMemo(
    () => rows.map((row) => getRecordId(row)).filter((rowId): rowId is string => Boolean(rowId)),
    [rows]
  );
  const selectionSnapshot = useMemo(
    () => createSelectionSnapshot(selection, pageRowIds, totalRecords, currentQueryHash),
    [currentQueryHash, pageRowIds, selection, totalRecords]
  );
  const allPageRowsSelected = useMemo(
    () => isAllPageRowsSelected(selection, pageRowIds, currentQueryHash),
    [currentQueryHash, pageRowIds, selection]
  );
  const somePageRowsSelected = useMemo(
    () => isSomePageRowsSelected(selection, pageRowIds, currentQueryHash),
    [currentQueryHash, pageRowIds, selection]
  );
  const pageRowSelection = useMemo<RowSelectionState>(
    () => Object.fromEntries(pageRowIds.filter((rowId) => isRowSelected(selection, rowId, currentQueryHash)).map((rowId) => [rowId, true])),
    [currentQueryHash, pageRowIds, selection]
  );
  const selectedCount = selectionSnapshot.selectedCount;
  const statusField = useMemo(
    () => meta?.fields.find((field) => field.name === "status" && field.type === "enum"),
    [meta?.fields]
  );

  const setSelectionState = useCallback(
    (nextSelection: MetaListSelectionState) => {
      if (rowSelectionState === undefined) {
        setInternalSelection(nextSelection);
      }
    },
    [rowSelectionState]
  );

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    if (rowSelectionState === undefined && selection.mode === "query" && selection.queryHash !== currentQueryHash) {
      setInternalSelection(clearSelection());
    }
  }, [currentQueryHash, rowSelectionState, selection.mode, selection.queryHash]);

  useEffect(() => {
    onSelectionChange?.(selectionSnapshot);
  }, [onSelectionChange, selectionSnapshot]);

  // Build columns
  const fieldMap = useMemo(
    () => new Map(meta?.fields.map((f) => [f.name, f]) ?? []),
    [meta?.fields]
  );

  const handleRowClick = useCallback(
    (record: Record<string, unknown>) => {
      onRowClick?.(record);
    },
    [onRowClick]
  );

  const handleFiltersChange = useCallback(
    (newFilters: FilterGroup) => {
      setFilters(newFilters);
    },
    []
  );

  const handleTogglePageSelection = useCallback(
    (checked: boolean) => {
      setSelectionState(togglePageSelection(selection, pageRowIds, checked, currentQueryHash));
    },
    [currentQueryHash, pageRowIds, selection, setSelectionState]
  );

  const handleSelectAllMatching = useCallback(() => {
    setSelectionState(selectAllMatchingQuery(currentQueryHash));
  }, [currentQueryHash, setSelectionState]);

  const handleClearSelection = useCallback(() => {
    setSelectionState(clearSelection());
  }, [setSelectionState]);

  const selectionColumn = useMemo<ColumnDef<Record<string, unknown>>>(
    () => ({
      id: "__select__",
      enableHiding: false,
      enableSorting: false,
      header: () => (
        <Checkbox
          aria-label="Select all rows on this page"
          checked={allPageRowsSelected ? true : somePageRowsSelected ? "indeterminate" : false}
          onCheckedChange={(checked) => handleTogglePageSelection(checked === true)}
        />
      ),
      cell: ({ row }) => {
        const rowId = getRecordId(row.original);
        if (!rowId) {
          return null;
        }

        return (
          <Checkbox
            aria-label={`Select row ${rowId}`}
            checked={isRowSelected(selection, rowId, currentQueryHash)}
            onCheckedChange={(checked) => {
              setSelectionState(toggleRowSelection(selection, rowId, checked === true, currentQueryHash));
            }}
            onClick={(event) => event.stopPropagation()}
          />
        );
      },
      size: 40,
    }),
    [
      allPageRowsSelected,
      currentQueryHash,
      handleTogglePageSelection,
      selection,
      setSelectionState,
      somePageRowsSelected,
    ]
  );

  const fetchAllMatchingRows = useCallback(async () => {
    const collectedRows: Array<Record<string, unknown>> = [];
    let nextPage = 1;
    let lastPage = 1;

    do {
      const pageResponse = await fetchModelListPage(model, {
        page: nextPage,
        limit: pageSize,
        orderBy: sortField,
        orderDir: sortDir as "asc" | "desc",
        filters: filters.conditions.length > 0 ? filters : undefined,
      });

      collectedRows.push(...pageResponse.data);
      lastPage = Math.ceil(pageResponse.meta.total / pageResponse.meta.limit) || 1;
      nextPage += 1;
    } while (nextPage <= lastPage);

    return collectedRows;
  }, [filters, model, pageSize, sortDir, sortField]);

  const getSelectedRecords = useCallback(async () => {
    if (selection.mode === "query") {
      const matchingRows = await fetchAllMatchingRows();

      return matchingRows.filter((record) => {
        const rowId = getRecordId(record);
        return rowId ? !selection.excludedIds.includes(rowId) : false;
      });
    }

    const pageRecordMap = new Map(
      rows
        .map((record) => {
          const rowId = getRecordId(record);
          return rowId ? [rowId, record] : null;
        })
        .filter((entry): entry is [string, Record<string, unknown>] => Boolean(entry))
    );

    const selectedRecords: Array<Record<string, unknown>> = [];
    const missingIds: string[] = [];

    for (const rowId of selection.ids) {
      const record = pageRecordMap.get(rowId);
      if (record) {
        selectedRecords.push(record);
      } else {
        missingIds.push(rowId);
      }
    }

    if (missingIds.length > 0) {
      const fetchedRecords = await Promise.all(missingIds.map((rowId) => fetchModelRecord(model, rowId)));
      selectedRecords.push(...fetchedRecords);
    }

    return selectedRecords;
  }, [fetchAllMatchingRows, model, rows, selection.excludedIds, selection.ids, selection.mode]);

  const bulkActionContext = useMemo<MetaListBulkActionContext>(
    () => ({
      model,
      selection: createBulkSelectionPayload(selectionSnapshot),
      clearSelection: handleClearSelection,
      getSelectedRecords,
    }),
    [getSelectedRecords, handleClearSelection, model, selectionSnapshot]
  );

  const executeBulkAction = useCallback(
    async (action: MetaListBulkAction) => {
      if (action.requiredPermission === PERMISSION_ACTIONS.WRITE && !effectiveCanWrite) {
        toast.error("You do not have permission to update these records.");
        return;
      }

      if (action.requiredPermission === PERMISSION_ACTIONS.READ && !effectiveCanRead) {
        toast.error("You do not have permission to export these records.");
        return;
      }

      setActiveActionKey(action.key);

      try {
        await action.onExecute(bulkActionContext);
      } finally {
        setActiveActionKey(null);
      }
    },
    [bulkActionContext, effectiveCanRead, effectiveCanWrite]
  );

  const defaultBulkActions = useMemo<MetaListBulkAction[]>(() => {
    const actions: MetaListBulkAction[] = [
      {
        key: "export",
        label: "Export selected",
        requiredPermission: PERMISSION_ACTIONS.READ,
        disabled: ({ selection: selectionPayload }) => selectionPayload.selectedCount === 0,
        onExecute: async ({ selection: selectionPayload, getSelectedRecords }) => {
          const selectedRecords = await getSelectedRecords();
          const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
          downloadJson(`${model}-selection-${timestamp}.json`, {
            selection: selectionPayload,
            records: selectedRecords,
          });
          await emitAuditLog({
            action: "metaList.bulk.export",
            outcome: "success",
            entityId: model,
            metadata: {
              selection: selectionPayload,
              exportedCount: selectedRecords.length,
            },
          });
          toast.success(`Exported ${selectedRecords.length} records`);
        },
      },
    ];

    if (statusField?.options?.length) {
      for (const option of statusField.options) {
        actions.push({
          key: `status-${String(option.value)}`,
          label: `Set status: ${option.label}`,
          requiredPermission: PERMISSION_ACTIONS.WRITE,
          disabled: ({ selection: selectionPayload }) => selectionPayload.selectedCount === 0,
          onExecute: async ({ selection: selectionPayload, clearSelection: clearRuntimeSelection, getSelectedRecords }) => {
            const selectedRecords = await getSelectedRecords();
            const targetStatus = String(option.value);
            const plan = planStatusTransition(selectedRecords, targetStatus);

            if (plan.idsToUpdate.length === 0) {
              toast.success(`All selected records already have status ${option.label}`);
              await emitAuditLog({
                action: "metaList.bulk.statusTransition",
                outcome: "success",
                entityId: model,
                metadata: {
                  selection: selectionPayload,
                  targetStatus,
                  updatedIds: [],
                  skippedIds: plan.skippedIds,
                },
              });
              return;
            }

            const results = await Promise.allSettled(
              plan.idsToUpdate.map((rowId) =>
                fetch(`/api/${model}/${rowId}`, {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ status: targetStatus }),
                })
              )
            );

            const failedIds = plan.idsToUpdate.filter((_, index) => {
              const result = results[index];
              return result.status === "rejected" || !result.value.ok;
            });
            const updatedIds = plan.idsToUpdate.filter((rowId) => !failedIds.includes(rowId));

            await queryClient.invalidateQueries({ queryKey: queryKeys.models.lists(model) });

            if (failedIds.length > 0) {
              await emitAuditLog({
                action: "metaList.bulk.statusTransition",
                outcome: "error",
                entityId: model,
                message: `Failed to update ${failedIds.length} records`,
                metadata: {
                  selection: selectionPayload,
                  targetStatus,
                  updatedIds,
                  failedIds,
                  skippedIds: plan.skippedIds,
                },
              });
              toast.error(`Updated ${updatedIds.length} records. ${failedIds.length} failed.`);
              return;
            }

            await emitAuditLog({
              action: "metaList.bulk.statusTransition",
              outcome: "success",
              entityId: model,
              metadata: {
                selection: selectionPayload,
                targetStatus,
                updatedIds,
                skippedIds: plan.skippedIds,
              },
            });
            clearRuntimeSelection();
            toast.success(`Updated ${updatedIds.length} records to ${option.label}`);
          },
        });
      }
    }

    return actions;
  }, [model, queryClient, statusField?.options]);

  const visibleBulkActions = useMemo(
    () => [...defaultBulkActions, ...bulkActions].filter((action) => {
      const hidden = typeof action.hidden === "function" ? action.hidden(bulkActionContext) : action.hidden;
      return !hidden;
    }),
    [bulkActionContext, bulkActions, defaultBulkActions]
  );

  const columns = useMemo(
    () => {
      if (!listView) return [];
      return generateColumns(listView.columns, fieldMap, handleRowClick, selectionColumn);
    },
    [fieldMap, handleRowClick, listView, selectionColumn]
  );

  // Initialize table
  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (original, index) => getRecordId(original) ?? String(index),
    state: {
      sorting,
      columnVisibility,
      rowSelection: pageRowSelection,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    manualSorting: true,
    manualPagination: true,
    pageCount: totalPages,
  });

  // Loading state
  if (metaLoading || (listLoading && page === 1)) {
    if (embedded) return <TableSkeleton columns={listView?.columns.length ?? 3} />;
    return (
      <PageContainer>
        <PageHeader title="Loading..." />
        <DataCard>
          <TableSkeleton columns={listView?.columns.length ?? 3} />
        </DataCard>
      </PageContainer>
    );
  }

  // No meta
  if (!meta || !listView) {
    return (
      <PageContainer>
        <div className="text-muted-foreground">No list view configured for "{model}".</div>
      </PageContainer>
    );
  }

  const canCreate = permissions?.can_create ?? false;
  const selectionLabel = filters.conditions.length > 0 ? "matching filters" : "matching records";

  const tableContent = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DataTableFilter
            fields={meta?.fields ?? []}
            value={filters}
            onChange={handleFiltersChange}
          />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {table.getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  const field = fieldMap.get(column.id);
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {field?.label ?? column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="text-sm text-muted-foreground">
            {totalRecords} {totalRecords === 1 ? "record" : "records"}
          </div>
        </div>

        {canCreate && onNew && (
          <Button onClick={onNew}>
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="mb-4 rounded-md border bg-muted/30 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="text-sm font-medium">
                {selectedCount} selected
                {selection.mode === "query" ? ` across ${selectionLabel}` : ""}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {selection.mode === "explicit" && allPageRowsSelected && totalRecords > pageRowIds.length && (
                  <Button variant="link" className="h-auto px-0" onClick={handleSelectAllMatching}>
                    Select all {totalRecords} {selectionLabel}
                  </Button>
                )}
                {selection.mode === "query" && (
                  <span>All {getSelectionCount(selection, totalRecords, currentQueryHash)} {selectionLabel} are selected.</span>
                )}
                <Button variant="link" className="h-auto px-0" onClick={handleClearSelection}>
                  Clear selection
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {visibleBulkActions.map((action, index) => {
                const disabled = typeof action.disabled === "function"
                  ? action.disabled(bulkActionContext)
                  : action.disabled;
                const permissionDenied =
                  (action.requiredPermission === PERMISSION_ACTIONS.READ && !effectiveCanRead) ||
                  (action.requiredPermission === PERMISSION_ACTIONS.WRITE && !effectiveCanWrite);

                return (
                  <React.Fragment key={action.key}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={Boolean(disabled) || permissionDenied || activeActionKey !== null}
                      onClick={() => void executeBulkAction(action)}
                    >
                      {action.label}
                    </Button>
                    {index < visibleBulkActions.length - 1 && <Separator orientation="vertical" className="hidden h-6 lg:block" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-64 text-center">
                  <EmptyState onNew={onNew} canCreate={canCreate} />
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={onRowClick ? "cursor-pointer" : ""}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(1)}
              disabled={page === 1}
              aria-label="Go to first page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Go to previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Go to next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              aria-label="Go to last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) {
    return tableContent;
  }

  return (
    <PageContainer>
      <PageHeader
        title={meta.label_plural ?? meta.label}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: meta.label_plural ?? meta.label },
        ]}
      />
      <DataCard>{tableContent}</DataCard>
    </PageContainer>
  );
}
