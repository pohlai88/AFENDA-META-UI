import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "~/test/utils";
import authReducer from "~/stores/business/slices/auth-slice";
import permissionsReducer, {
  bootstrapPermissionsFailure,
  bootstrapPermissionsSuccess,
} from "~/stores/business/slices/permissions-slice";
import { PERMISSION_ACTIONS } from "~/stores/business";
import type { PermissionAction } from "~/stores/business";
import { PermissionsProvider, useCan, usePermissions } from "./permissions-context";

function createTestStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      permissions: permissionsReducer,
    },
  });
}

function PermissionsProbe() {
  const {
    role,
    isReady,
    bootstrapStatus,
    bootstrapError,
    hasPermission,
    hasAnyPermission,
    retryBootstrap,
  } = usePermissions();

  return (
    <div>
      <p data-testid="role">{role ?? "none"}</p>
      <p data-testid="status">{bootstrapStatus}</p>
      <p data-testid="ready">{String(isReady)}</p>
      <p data-testid="error">{bootstrapError ?? "none"}</p>
      <p data-testid="can-read-sales-orders">{String(hasPermission("sales.orders", "read"))}</p>
      <p data-testid="has-sales-resource">{String(hasAnyPermission("sales"))}</p>
      <button type="button" onClick={retryBootstrap}>
        retry
      </button>
    </div>
  );
}

function UseCanProbe({ resource, action }: { resource: string; action: PermissionAction }) {
  const canAccess = useCan(resource, action);

  return <p data-testid="use-can-result">{String(canAccess)}</p>;
}

describe("PermissionsProvider", () => {
  it("exposes default bootstrap and permission state", () => {
    const store = createTestStore();

    render(
      <Provider store={store}>
        <PermissionsProvider>
          <PermissionsProbe />
        </PermissionsProvider>
      </Provider>
    );

    expect(screen.getByTestId("role")).toHaveTextContent("none");
    expect(screen.getByTestId("status")).toHaveTextContent("idle");
    expect(screen.getByTestId("ready")).toHaveTextContent("false");
    expect(screen.getByTestId("error")).toHaveTextContent("none");
    expect(screen.getByTestId("can-read-sales-orders")).toHaveTextContent("false");
    expect(screen.getByTestId("has-sales-resource")).toHaveTextContent("false");
  });

  it("updates helpers and state after successful bootstrap", () => {
    const store = createTestStore();

    render(
      <Provider store={store}>
        <PermissionsProvider>
          <PermissionsProbe />
        </PermissionsProvider>
      </Provider>
    );

    act(() => {
      store.dispatch(
        bootstrapPermissionsSuccess({
          role: "admin",
          permissions: [
            { resource: "sales", actions: ["read"] },
            { resource: "sales.orders", actions: ["read", "write"] },
          ],
        })
      );
    });

    expect(screen.getByTestId("role")).toHaveTextContent("admin");
    expect(screen.getByTestId("status")).toHaveTextContent("ready");
    expect(screen.getByTestId("ready")).toHaveTextContent("true");
    expect(screen.getByTestId("error")).toHaveTextContent("none");
    expect(screen.getByTestId("can-read-sales-orders")).toHaveTextContent("true");
    expect(screen.getByTestId("has-sales-resource")).toHaveTextContent("true");
  });

  it("grants full access shortcuts for admin role", () => {
    const store = createTestStore();

    render(
      <Provider store={store}>
        <PermissionsProvider>
          <PermissionsProbe />
        </PermissionsProvider>
      </Provider>
    );

    act(() => {
      store.dispatch(
        bootstrapPermissionsSuccess({
          role: "admin",
          permissions: [],
        })
      );
    });

    expect(screen.getByTestId("can-read-sales-orders")).toHaveTextContent("true");
    expect(screen.getByTestId("has-sales-resource")).toHaveTextContent("true");
  });

  it("surfaces bootstrap failure details", () => {
    const store = createTestStore();

    render(
      <Provider store={store}>
        <PermissionsProvider>
          <PermissionsProbe />
        </PermissionsProvider>
      </Provider>
    );

    act(() => {
      store.dispatch(bootstrapPermissionsFailure("Bootstrap request failed"));
    });

    expect(screen.getByTestId("status")).toHaveTextContent("error");
    expect(screen.getByTestId("ready")).toHaveTextContent("false");
    expect(screen.getByTestId("error")).toHaveTextContent("Bootstrap request failed");
    expect(screen.getByTestId("can-read-sales-orders")).toHaveTextContent("false");
  });

  it("useCan returns true when permission exists", () => {
    const store = createTestStore();

    render(
      <Provider store={store}>
        <PermissionsProvider>
          <UseCanProbe resource="sales.orders" action={PERMISSION_ACTIONS.READ} />
        </PermissionsProvider>
      </Provider>
    );

    act(() => {
      store.dispatch(
        bootstrapPermissionsSuccess({
          role: "admin",
          permissions: [{ resource: "sales.orders", actions: [PERMISSION_ACTIONS.READ] }],
        })
      );
    });

    expect(screen.getByTestId("use-can-result")).toHaveTextContent("true");
  });

  it("useCan returns false when permission does not exist", () => {
    const store = createTestStore();

    render(
      <Provider store={store}>
        <PermissionsProvider>
          <UseCanProbe resource="sales.orders" action={PERMISSION_ACTIONS.DELETE} />
        </PermissionsProvider>
      </Provider>
    );

    act(() => {
      store.dispatch(
        bootstrapPermissionsSuccess({
          role: "manager",
          permissions: [{ resource: "sales.orders", actions: [PERMISSION_ACTIONS.READ] }],
        })
      );
    });

    expect(screen.getByTestId("use-can-result")).toHaveTextContent("false");
  });

  it("retryBootstrap dispatches retry event", async () => {
    const store = createTestStore();
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

    render(
      <Provider store={store}>
        <PermissionsProvider>
          <PermissionsProbe />
        </PermissionsProvider>
      </Provider>
    );

    await act(async () => {
      screen.getByRole("button", { name: "retry" }).click();
    });

    expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
    const firstCall = dispatchEventSpy.mock.calls[0];
    expect(firstCall?.[0].type).toBe("permissions-bootstrap:retry");

    dispatchEventSpy.mockRestore();
  });
});
