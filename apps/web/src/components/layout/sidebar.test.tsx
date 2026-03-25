import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionsProvider } from "~/bootstrap/permissions-context";
import { act, renderWithProviders, screen, userEvent } from "~/test/utils";
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
          role: "admin",
          permissions: [
            { resource: "sales", actions: [PERMISSION_ACTIONS.READ] },
            { resource: "sales.orders", actions: [PERMISSION_ACTIONS.READ] },
            { resource: "sales.customers", actions: [PERMISSION_ACTIONS.READ] },
            { resource: "inventory", actions: [PERMISSION_ACTIONS.READ] },
            { resource: "inventory.stock_moves", actions: [PERMISSION_ACTIONS.READ] },
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

    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute(
      "aria-current",
      "page"
    );

    const inventoryButton = screen.getByRole("button", { name: /inventory/i });
    expect(inventoryButton).toHaveAttribute("aria-expanded", "false");

    await user.click(inventoryButton);

    expect(inventoryButton).toHaveAttribute("aria-expanded", "true");
    expect(useSidebarStore.getState().expandedModules).toContain("inventory");
    expect(screen.getByRole("link", { name: "Stock Moves" })).toBeInTheDocument();
  });

  it("filters navigation entries based on read permissions when permissions are present", () => {
    const { store } = renderSidebar();

    bootstrapPermissions(store);

    act(() => {
      store.dispatch(
        setPermissions([
          { resource: "sales", actions: [PERMISSION_ACTIONS.READ] },
          { resource: "sales.orders", actions: [PERMISSION_ACTIONS.READ] },
        ])
      );
    });

    expect(screen.getByRole("button", { name: /sales/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Orders" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Customers" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /inventory/i })).not.toBeInTheDocument();
  });

  it("filters modules and models using the sidebar search input", async () => {
    const user = userEvent.setup();
    const { store } = renderSidebar();
    bootstrapPermissions(store);

    await user.type(screen.getByLabelText(/search modules and models/i), "stock");

    expect(screen.queryByRole("button", { name: /sales/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /inventory/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Stock Moves" })).toBeInTheDocument();
    expect(screen.getByText("Stock", { selector: "mark" })).toBeInTheDocument();
  });

  it("highlights all matching occurrences in labels", async () => {
    const user = userEvent.setup();
    const { store } = renderSidebar();
    bootstrapPermissions(store);

    await user.type(screen.getByLabelText(/search modules and models/i), "s");

    const salesButton = screen.getByRole("button", { name: /sales/i });
    expect(salesButton.querySelectorAll("mark")).toHaveLength(2);
  });

  it("auto-expands matched modules during search and restores previous expansion when cleared", async () => {
    const user = userEvent.setup();
    const { store } = renderSidebar();
    bootstrapPermissions(store);

    const inventoryButton = screen.getByRole("button", { name: /inventory/i });

    await user.click(inventoryButton);
    expect(inventoryButton).toHaveAttribute("aria-expanded", "true");
    expect(useSidebarStore.getState().expandedModules).toEqual([
      "sales",
      "inventory",
    ]);

    const searchInput = screen.getByLabelText(/search modules and models/i);
    await user.type(searchInput, "stock");

    expect(screen.getByRole("button", { name: /inventory/i })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.queryByRole("button", { name: /sales/i })).not.toBeInTheDocument();
    expect(useSidebarStore.getState().expandedModules).toEqual(["inventory"]);

    await user.clear(searchInput);

    expect(screen.getByRole("button", { name: /sales/i })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("button", { name: /inventory/i })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(useSidebarStore.getState().expandedModules).toEqual([
      "sales",
      "inventory",
    ]);
  });

  it("keeps modules hidden while permissions are not bootstrapped", () => {
    renderSidebar();

    expect(screen.getByText("Loading access permissions...")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sales/i })).not.toBeInTheDocument();
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

  it("shows retry controls when module loading fails", async () => {
    const refetch = vi.fn();
    const user = userEvent.setup();

    mockUseModules.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error("boom"),
      refetch,
      isFetching: false,
    });

    const { store } = renderSidebar("/");
    bootstrapPermissions(store);

    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});