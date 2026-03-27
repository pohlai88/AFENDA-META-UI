import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionsProvider } from "~/bootstrap/permissions-context";
import { act, renderWithProviders, screen, userEvent } from "~/test/utils";
import { waitFor } from "@testing-library/react";
import { PERMISSION_ACTIONS } from "~/stores/business";
import authReducer from "~/stores/business/slices/auth-slice";
import permissionsReducer, {
  bootstrapPermissionsFailure,
  bootstrapPermissionsSuccess,
  setPermissions,
} from "~/stores/business/slices/permissions-slice";
import { useSidebarStore } from "~/stores/ui";
import { Sidebar } from "./sidebar";

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

const mockUseModules = vi.fn();

vi.mock("../../hooks/useModules", () => ({
  useModules: () => mockUseModules(),
  useAccessibleModules: () => {
    const result = mockUseModules();

    return {
      menus: result?.data ?? [],
      isLoading: result?.isLoading ?? false,
      error: result?.error ?? null,
    };
  },
}));

function renderSidebar(initialRoute = "/sales/orders") {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      permissions: permissionsReducer,
    },
  });

  const view = renderWithProviders(
    <Provider store={store}>
      <PermissionsProvider>
        <MemoryRouter initialEntries={[initialRoute]} future={routerFuture}>
          <Sidebar />
        </MemoryRouter>
      </PermissionsProvider>
    </Provider>
  );

  return {
    ...view,
    store,
  };
}

describe("Sidebar", () => {
  function bootstrapPermissions(store: ReturnType<typeof configureStore>) {
    act(() => {
      store.dispatch(
        bootstrapPermissionsSuccess({
          role: "operator",
          permissions: [
            { resource: "orders", actions: [PERMISSION_ACTIONS.READ] },
            { resource: "customers", actions: [PERMISSION_ACTIONS.READ] },
            { resource: "stock_moves", actions: [PERMISSION_ACTIONS.READ] },
          ],
        })
      );
    });
  }

  beforeEach(() => {
    mockUseModules.mockReturnValue({
      data: [
        {
          module: "sales",
          label: "Sales",
          icon: "ShoppingCart",
          models: [
            { name: "orders", label: "Orders", icon: "ListOrdered" },
            { name: "customers", label: "Customers", icon: "Users" },
          ],
        },
        {
          module: "inventory",
          label: "Inventory",
          icon: "Package",
          models: [{ name: "stock_moves", label: "Stock Moves", icon: "FileText" }],
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });

    useSidebarStore.setState({
      isOpen: true,
      expandedModules: ["sales"],
    });
  });

  it("marks active links accessibly and toggles module expansion through the store", async () => {
    const user = userEvent.setup();
    const { store } = renderSidebar();
    bootstrapPermissions(store);

    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute("aria-current", "page");

    const inventoryButton = screen.getByRole("button", { name: /inventory/i });
    expect(inventoryButton).toHaveAttribute("aria-expanded", "false");

    await user.click(inventoryButton);

    expect(inventoryButton).toHaveAttribute("aria-expanded", "true");
    expect(useSidebarStore.getState().expandedModules).toContain("inventory");
    expect(screen.getByRole("link", { name: "Stock Moves" })).toBeInTheDocument();
  });

  it("keeps navigation entries available after permissions bootstrap", () => {
    const { store } = renderSidebar();

    bootstrapPermissions(store);

    act(() => {
      store.dispatch(
        setPermissions([
          { resource: "orders", actions: [PERMISSION_ACTIONS.READ] },
        ])
      );
    });

    expect(screen.getByRole("button", { name: /sales/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Orders" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Customers" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /inventory/i })).toBeInTheDocument();
  });

  it("filters modules and models using the sidebar search input", async () => {
    const user = userEvent.setup();
    const { store } = renderSidebar();
    bootstrapPermissions(store);

    await user.type(screen.getByLabelText(/search modules and models/i), "stock");

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /sales/i })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /inventory/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Stock Moves" })).toBeInTheDocument();
      expect(screen.getByText("Stock", { selector: "mark" })).toBeInTheDocument();
    });
  });

  it("highlights all matching occurrences in labels", async () => {
    const user = userEvent.setup();
    const { store } = renderSidebar();
    bootstrapPermissions(store);

    await user.type(screen.getByLabelText(/search modules and models/i), "s");

    await waitFor(() => {
      const salesButton = screen.getByRole("button", { name: /sales/i });
      expect(salesButton.querySelectorAll("mark")).toHaveLength(2);
    });
  });

  it("auto-expands matched modules during search and restores previous expansion when cleared", async () => {
    const user = userEvent.setup();
    const { store } = renderSidebar();
    bootstrapPermissions(store);

    const inventoryButton = screen.getByRole("button", { name: /inventory/i });

    await user.click(inventoryButton);
    expect(inventoryButton).toHaveAttribute("aria-expanded", "true");
    expect(useSidebarStore.getState().expandedModules).toEqual(["sales", "inventory"]);

    const searchInput = screen.getByLabelText(/search modules and models/i);
    await user.type(searchInput, "stock");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /inventory/i })).toHaveAttribute(
        "aria-expanded",
        "true"
      );
      expect(screen.queryByRole("button", { name: /sales/i })).not.toBeInTheDocument();
      expect(useSidebarStore.getState().expandedModules).toEqual(["inventory"]);
    });

    await user.clear(searchInput);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sales/i })).toHaveAttribute(
        "aria-expanded",
        "true"
      );
      expect(screen.getByRole("button", { name: /inventory/i })).toHaveAttribute(
        "aria-expanded",
        "true"
      );
      expect(useSidebarStore.getState().expandedModules).toEqual(["sales", "inventory"]);
    });
  });

  it("keeps modules hidden while permissions are not bootstrapped", () => {
    renderSidebar();

    expect(screen.getByText("Loading access permissions...")).toBeInTheDocument();
  });

  it("shows bootstrap error state when permission bootstrap fails", () => {
    const { store } = renderSidebar();

    act(() => {
      store.dispatch(bootstrapPermissionsFailure("Network error"));
    });

    expect(screen.getByText("Failed to load access permissions")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("retries permissions bootstrap from the bootstrap error state", async () => {
    const user = userEvent.setup();
    const { store } = renderSidebar();
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

    act(() => {
      store.dispatch(bootstrapPermissionsFailure("Network error"));
    });

    await user.click(screen.getByRole("button", { name: /retry permissions/i }));

    expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
    const firstCall = dispatchEventSpy.mock.calls[0];
    expect(firstCall?.[0].type).toBe("permissions-bootstrap:retry");

    dispatchEventSpy.mockRestore();
  });

  it("shows a module-loading failure state when navigation fetch fails", () => {
    const refetch = vi.fn();

    mockUseModules.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error("boom"),
      refetch,
      isFetching: false,
    });

    const { store } = renderSidebar("/");
    bootstrapPermissions(store);

    expect(refetch).not.toHaveBeenCalled();
    expect(screen.getByText("Failed to load navigation.")).toBeInTheDocument();
  });
});
