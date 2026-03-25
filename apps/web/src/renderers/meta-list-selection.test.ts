import { describe, expect, it } from "vitest";

import {
  clearSelection,
  createBulkSelectionPayload,
  createSelectionScopeHash,
  createSelectionSnapshot,
  planStatusTransition,
  selectAllMatchingQuery,
  togglePageSelection,
  toggleRowSelection,
} from "./meta-list-selection";

describe("meta-list-selection", () => {
  it("tracks explicit selection across page transitions", () => {
    const queryHash = createSelectionScopeHash("purchase-orders");
    const pageOneSelection = togglePageSelection(clearSelection(), ["PO-1", "PO-2"], true, queryHash);
    const pageOneSnapshot = createSelectionSnapshot(pageOneSelection, ["PO-1", "PO-2"], 4, queryHash);

    expect(pageOneSnapshot.selectedCount).toBe(2);
    expect(pageOneSnapshot.ids).toEqual(["PO-1", "PO-2"]);

    const pageTwoSnapshot = createSelectionSnapshot(pageOneSelection, ["PO-3", "PO-4"], 4, queryHash);

    expect(pageTwoSnapshot.selectedCount).toBe(2);
    expect(pageTwoSnapshot.pageSelectedIds).toEqual([]);
  });

  it("keeps query-wide selection across pagination and clears deselected rows", () => {
    const queryHash = createSelectionScopeHash("purchase-orders", {
      logic: "and",
      conditions: [{ field: "status", op: "eq", value: "submitted" }],
    });
    const querySelection = selectAllMatchingQuery(queryHash);
    const deselected = toggleRowSelection(querySelection, "PO-2", false, queryHash);
    const snapshot = createSelectionSnapshot(deselected, ["PO-1", "PO-2"], 8, queryHash);

    expect(snapshot.selectedCount).toBe(7);
    expect(snapshot.pageSelectedIds).toEqual(["PO-1"]);
    expect(createBulkSelectionPayload(snapshot)).toEqual({
      selectionMode: "query",
      queryHash,
      ids: [],
      excludedIds: ["PO-2"],
      selectedCount: 7,
    });
  });

  it("resets query-wide selection when the filter scope changes", () => {
    const initialHash = createSelectionScopeHash("purchase-orders");
    const filteredHash = createSelectionScopeHash("purchase-orders", {
      logic: "and",
      conditions: [{ field: "status", op: "eq", value: "approved" }],
    });
    const selection = selectAllMatchingQuery(initialHash);
    const snapshot = createSelectionSnapshot(selection, ["PO-1"], 1, filteredHash);

    expect(snapshot.selectedCount).toBe(0);
    expect(snapshot.mode).toBe("explicit");
    expect(snapshot.ids).toEqual([]);
  });

  it("builds an idempotent status transition plan", () => {
    const plan = planStatusTransition(
      [
        { id: "PO-1", status: "approved" },
        { id: "PO-2", status: "submitted" },
        { id: "PO-3", status: "approved" },
      ],
      "approved"
    );

    expect(plan.idsToUpdate).toEqual(["PO-2"]);
    expect(plan.skippedIds).toEqual(["PO-1", "PO-3"]);
  });
});