import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { waitFor } from "@testing-library/react";

import { render, screen, user } from "~/test/utils";
import type { FilterGroup } from "~/hooks/useModel";

import { MetaListV2 } from "../MetaListV2";

const useMetaMock = vi.fn();
const useModelListMock = vi.fn();

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

vi.mock("~/hooks/useMeta", () => ({
  useMeta: (...args: unknown[]) => useMetaMock(...args),
}));

vi.mock("~/hooks/useModel", async () => {
  const actual = await vi.importActual<typeof import("~/hooks/useModel")>("~/hooks/useModel");

  return {
    ...actual,
    useModelList: (...args: unknown[]) => useModelListMock(...args),
  };
});

vi.mock("~/bootstrap/permissions-context", () => ({
  useCan: () => true,
}));

vi.mock("~/components/filters/DataTableFilter", () => ({
  DataTableFilter: ({ onChange }: { onChange: (filters: FilterGroup) => void }) => (
    <button
      type="button"
      onClick={() =>
        onChange({
          logic: "and",
          conditions: [{ field: "status", op: "eq", value: "approved" }],
        })
      }
    >
      apply-filter
    </button>
  ),
}));

const metaResponse = {
  meta: {
    label: "Purchase Order",
    label_plural: "Purchase Orders",
    fields: [
      { name: "id", label: "ID", type: "string", sortable: true },
      { name: "name", label: "Name", type: "string", sortable: true },
      {
        name: "status",
        label: "Status",
        type: "enum",
        sortable: true,
        options: [
          { value: "submitted", label: "Submitted" },
          { value: "approved", label: "Approved" },
        ],
      },
    ],
    views: {
      list: {
        type: "list",
        columns: ["id", "name", "status"],
      },
    },
  },
  permissions: {
    can_create: false,
    can_read: true,
    can_update: true,
  },
};

function buildPageData(page: number, filters?: FilterGroup) {
  const filtered = filters?.conditions.length;

  if (filtered) {
    return {
      data: [{ id: "PO-2", name: "Approved order", status: "approved" }],
      meta: {
        page,
        limit: 20,
        total: 1,
        filters,
        sort: [],
      },
    };
  }

  const pages: Record<number, Array<Record<string, unknown>>> = {
    1: [
      { id: "PO-1", name: "Order 1", status: "submitted" },
      { id: "PO-2", name: "Order 2", status: "approved" },
    ],
    2: [
      { id: "PO-3", name: "Order 3", status: "submitted" },
      { id: "PO-4", name: "Order 4", status: "approved" },
    ],
  };

  return {
    data: pages[page] ?? [],
    meta: {
      page,
      limit: 20,
      total: 40,
      filters,
      sort: [],
    },
  };
}

function renderMetaList(props: React.ComponentProps<typeof MetaListV2>) {
  return render(
    <MemoryRouter future={routerFuture}>
      <MetaListV2 {...props} />
    </MemoryRouter>
  );
}

describe("MetaListV2", () => {
  beforeEach(() => {
    useMetaMock.mockReset();
    useModelListMock.mockReset();
    useMetaMock.mockReturnValue({
      data: metaResponse,
      isLoading: false,
    });
    useModelListMock.mockImplementation(
      (_model: string, options?: { page?: number; filters?: FilterGroup }) => ({
        data: buildPageData(options?.page ?? 1, options?.filters),
        isLoading: false,
      })
    );
  });

  it("supports select-page, select-all-query, and preserves selection on pagination", async () => {
    const onSelectionChange = vi.fn();

    renderMetaList({ model: "purchase-orders", onSelectionChange });

    await user.click(screen.getByLabelText("Select all rows on this page"));

    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select all 40 matching records" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Select all 40 matching records" }));

    expect(screen.getByText("40 selected across matching records")).toBeInTheDocument();
    expect(onSelectionChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: "query",
        selectedCount: 40,
        queryHash: expect.any(String),
      })
    );

    await user.click(screen.getByLabelText("Go to next page"));

    await waitFor(async () => {
      const rowCheckbox = screen.getByLabelText("Select row PO-3");
      expect(
        rowCheckbox.getAttribute("data-state") ?? rowCheckbox.getAttribute("aria-checked")
      ).toBeTruthy();
    });
  });

  it("clears query-wide selection when the filter scope changes", async () => {
    renderMetaList({ model: "purchase-orders" });

    await user.click(screen.getByLabelText("Select all rows on this page"));
    await user.click(screen.getByRole("button", { name: "Select all 40 matching records" }));

    expect(screen.getByRole("button", { name: "Export selected" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "apply-filter" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Export selected" })).not.toBeInTheDocument();
    });
  });

  it("permission-gates status transition actions independently from export", async () => {
    useMetaMock.mockReturnValue({
      data: {
        ...metaResponse,
        permissions: {
          ...metaResponse.permissions,
          can_update: false,
        },
      },
      isLoading: false,
    });

    renderMetaList({ model: "purchase-orders" });

    await user.click(screen.getByLabelText("Select row PO-1"));

    expect(screen.getByRole("button", { name: "Export selected" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Bulk Actions" })).not.toBeInTheDocument();
  });
});
