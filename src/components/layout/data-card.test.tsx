import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { PermissionsProvider } from "~/bootstrap/permissions-context";
import { PERMISSION_ACTIONS } from "~/stores/business";
import authReducer from "~/stores/business/slices/auth-slice";
import permissionsReducer, {
  bootstrapPermissionsSuccess,
} from "~/stores/business/slices/permissions-slice";
import { renderWithProviders, screen } from "~/test/utils";
import { DataCard, PermissionGatedAction } from "./data-card";

function createBusinessStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      permissions: permissionsReducer,
    },
  });
}

describe("DataCard", () => {
  it("prioritizes loading state over error, empty, and children", () => {
    renderWithProviders(
      <DataCard loading error="Failed" empty>
        <div>content</div>
      </DataCard>
    );

    expect(screen.getByRole("status", { name: "Loading content" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("No records to display.")).not.toBeInTheDocument();
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("prioritizes error state over empty and children when not loading", () => {
    renderWithProviders(
      <DataCard error="Request failed" empty>
        <div>content</div>
      </DataCard>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Request failed")).toBeInTheDocument();
    expect(screen.queryByText("No records to display.")).not.toBeInTheDocument();
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("shows empty state over children when loading and error are not active", () => {
    renderWithProviders(
      <DataCard empty>
        <div>content</div>
      </DataCard>
    );

    expect(screen.getByText("No records to display.")).toBeInTheDocument();
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  it("shows children when no state flags are active", () => {
    renderWithProviders(
      <DataCard>
        <div>content</div>
      </DataCard>
    );

    expect(screen.getByText("content")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading content" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("No records to display.")).not.toBeInTheDocument();
  });
});

describe("PermissionGatedAction", () => {
  it("renders children when role and permission both match", () => {
    const store = createBusinessStore();

    store.dispatch(
      bootstrapPermissionsSuccess({
        role: "manager",
        permissions: [{ resource: "sales", actions: [PERMISSION_ACTIONS.READ] }],
      })
    );

    renderWithProviders(
      <Provider store={store}>
        <PermissionsProvider>
          <PermissionGatedAction
            resource="sales"
            action={PERMISSION_ACTIONS.READ}
            allowedRoles={["manager", "admin"]}
          >
            <span>Allowed</span>
          </PermissionGatedAction>
        </PermissionsProvider>
      </Provider>
    );

    expect(screen.getByText("Allowed")).toBeInTheDocument();
  });

  it("renders fallback when role does not match", () => {
    const store = createBusinessStore();

    store.dispatch(
      bootstrapPermissionsSuccess({
        role: "clerk",
        permissions: [{ resource: "sales", actions: [PERMISSION_ACTIONS.READ] }],
      })
    );

    renderWithProviders(
      <Provider store={store}>
        <PermissionsProvider>
          <PermissionGatedAction
            resource="sales"
            action={PERMISSION_ACTIONS.READ}
            allowedRoles={["manager"]}
            fallback={<span>Denied</span>}
          >
            <span>Allowed</span>
          </PermissionGatedAction>
        </PermissionsProvider>
      </Provider>
    );

    expect(screen.queryByText("Allowed")).not.toBeInTheDocument();
    expect(screen.getByText("Denied")).toBeInTheDocument();
  });

  it("renders fallback when permission does not match", () => {
    const store = createBusinessStore();

    store.dispatch(
      bootstrapPermissionsSuccess({
        role: "manager",
        permissions: [{ resource: "sales", actions: [PERMISSION_ACTIONS.READ] }],
      })
    );

    renderWithProviders(
      <Provider store={store}>
        <PermissionsProvider>
          <PermissionGatedAction
            resource="sales"
            action={PERMISSION_ACTIONS.DELETE}
            allowedRoles={["manager"]}
            fallback={<span>Denied</span>}
          >
            <span>Allowed</span>
          </PermissionGatedAction>
        </PermissionsProvider>
      </Provider>
    );

    expect(screen.queryByText("Allowed")).not.toBeInTheDocument();
    expect(screen.getByText("Denied")).toBeInTheDocument();
  });

  it("renders children without permission checks when resource/action are omitted", () => {
    const store = createBusinessStore();

    store.dispatch(
      bootstrapPermissionsSuccess({
        role: "guest",
        permissions: [],
      })
    );

    renderWithProviders(
      <Provider store={store}>
        <PermissionsProvider>
          <PermissionGatedAction>
            <span>Allowed</span>
          </PermissionGatedAction>
        </PermissionsProvider>
      </Provider>
    );

    expect(screen.getByText("Allowed")).toBeInTheDocument();
  });
});
