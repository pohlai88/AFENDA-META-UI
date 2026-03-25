import type { FilterGroup } from "~/hooks/useModel";

export type MetaListSelectionMode = "explicit" | "query";

export interface MetaListSelectionState {
  mode: MetaListSelectionMode;
  ids: string[];
  excludedIds: string[];
  queryHash: string | null;
}

export interface MetaListSelectionSnapshot extends MetaListSelectionState {
  selectedCount: number;
  pageSelectedIds: string[];
}

export interface MetaListBulkSelectionPayload {
  selectionMode: MetaListSelectionMode;
  queryHash: string | null;
  ids: string[];
  excludedIds: string[];
  selectedCount: number;
}

export const EMPTY_SELECTION_STATE: MetaListSelectionState = {
  mode: "explicit",
  ids: [],
  excludedIds: [],
  queryHash: null,
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function createSelectionScopeHash(model: string, filters?: FilterGroup): string {
  return stableSerialize({
    model,
    filters: filters?.conditions.length ? filters : null,
  });
}

export function clearSelection(): MetaListSelectionState {
  return EMPTY_SELECTION_STATE;
}

export function normalizeSelectionForScope(
  selection: MetaListSelectionState,
  queryHash: string
): MetaListSelectionState {
  if (selection.mode === "query" && selection.queryHash !== queryHash) {
    return clearSelection();
  }

  return selection;
}

export function isRowSelected(
  selection: MetaListSelectionState,
  rowId: string,
  queryHash: string
): boolean {
  const normalized = normalizeSelectionForScope(selection, queryHash);

  if (normalized.mode === "query") {
    return !normalized.excludedIds.includes(rowId);
  }

  return normalized.ids.includes(rowId);
}

export function toggleRowSelection(
  selection: MetaListSelectionState,
  rowId: string,
  checked: boolean,
  queryHash: string
): MetaListSelectionState {
  const normalized = normalizeSelectionForScope(selection, queryHash);

  if (normalized.mode === "query") {
    return {
      ...normalized,
      excludedIds: checked
        ? normalized.excludedIds.filter((id) => id !== rowId)
        : unique([...normalized.excludedIds, rowId]),
    };
  }

  return {
    ...normalized,
    ids: checked ? unique([...normalized.ids, rowId]) : normalized.ids.filter((id) => id !== rowId),
  };
}

export function togglePageSelection(
  selection: MetaListSelectionState,
  pageRowIds: string[],
  checked: boolean,
  queryHash: string
): MetaListSelectionState {
  const normalized = normalizeSelectionForScope(selection, queryHash);

  if (normalized.mode === "query") {
    const excludedSet = new Set(normalized.excludedIds);

    for (const rowId of pageRowIds) {
      if (checked) {
        excludedSet.delete(rowId);
      } else {
        excludedSet.add(rowId);
      }
    }

    return {
      ...normalized,
      excludedIds: Array.from(excludedSet),
    };
  }

  const selectedSet = new Set(normalized.ids);

  for (const rowId of pageRowIds) {
    if (checked) {
      selectedSet.add(rowId);
    } else {
      selectedSet.delete(rowId);
    }
  }

  return {
    ...normalized,
    ids: Array.from(selectedSet),
  };
}

export function selectAllMatchingQuery(queryHash: string): MetaListSelectionState {
  return {
    mode: "query",
    ids: [],
    excludedIds: [],
    queryHash,
  };
}

export function getSelectionCount(
  selection: MetaListSelectionState,
  totalRecords: number,
  queryHash: string
): number {
  const normalized = normalizeSelectionForScope(selection, queryHash);

  if (normalized.mode === "query") {
    return Math.max(totalRecords - normalized.excludedIds.length, 0);
  }

  return normalized.ids.length;
}

export function getPageSelectedIds(
  selection: MetaListSelectionState,
  pageRowIds: string[],
  queryHash: string
): string[] {
  return pageRowIds.filter((rowId) => isRowSelected(selection, rowId, queryHash));
}

export function isAllPageRowsSelected(
  selection: MetaListSelectionState,
  pageRowIds: string[],
  queryHash: string
): boolean {
  return (
    pageRowIds.length > 0 &&
    getPageSelectedIds(selection, pageRowIds, queryHash).length === pageRowIds.length
  );
}

export function isSomePageRowsSelected(
  selection: MetaListSelectionState,
  pageRowIds: string[],
  queryHash: string
): boolean {
  const pageSelectedIds = getPageSelectedIds(selection, pageRowIds, queryHash);

  return pageSelectedIds.length > 0 && pageSelectedIds.length < pageRowIds.length;
}

export function createSelectionSnapshot(
  selection: MetaListSelectionState,
  pageRowIds: string[],
  totalRecords: number,
  queryHash: string
): MetaListSelectionSnapshot {
  const normalized = normalizeSelectionForScope(selection, queryHash);

  return {
    ...normalized,
    selectedCount: getSelectionCount(normalized, totalRecords, queryHash),
    pageSelectedIds: getPageSelectedIds(normalized, pageRowIds, queryHash),
  };
}

export function createBulkSelectionPayload(
  snapshot: MetaListSelectionSnapshot
): MetaListBulkSelectionPayload {
  return {
    selectionMode: snapshot.mode,
    queryHash: snapshot.queryHash,
    ids: snapshot.ids,
    excludedIds: snapshot.excludedIds,
    selectedCount: snapshot.selectedCount,
  };
}

export function planStatusTransition(
  records: Array<Record<string, unknown>>,
  targetStatus: string
): { idsToUpdate: string[]; skippedIds: string[] } {
  return records.reduce<{ idsToUpdate: string[]; skippedIds: string[] }>(
    (plan, record) => {
      const rowId = record.id;

      if (typeof rowId !== "string" && typeof rowId !== "number") {
        return plan;
      }

      const normalizedId = String(rowId);

      if (record.status === targetStatus) {
        plan.skippedIds.push(normalizedId);
        return plan;
      }

      plan.idsToUpdate.push(normalizedId);
      return plan;
    },
    { idsToUpdate: [] as string[], skippedIds: [] as string[] }
  );
}
