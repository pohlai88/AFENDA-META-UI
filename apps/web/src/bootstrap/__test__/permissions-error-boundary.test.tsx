import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { act, render, screen, userEvent } from "~/test/utils";
import authReducer from "~/stores/business/slices/auth-slice";
import permissionsReducer, {
  bootstrapPermissionsFailure,
  bootstrapPermissionsSuccess,
} from "~/stores/business/slices/permissions-slice";
import { PermissionsProvider } from "../permissions-context";
import { PermissionsErrorBoundary } from "../permissions-error-boundary";

const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

function createTestStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      permissions: permissionsReducer,
    },
  });
}

describe("PermissionsErrorBoundary", () => {
  it("renders children when permissions bootstrap is not in error state", () => {
    const store = createTestStore();

    render(
      <Provider store={store}>
        <MemoryRouter future={routerFuture}>
          <PermissionsProvider>
            <PermissionsErrorBoundary>
              <div>child-content</div>
            </PermissionsErrorBoundary>
          </PermissionsProvider>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText("child-content")).toBeInTheDocument();
  });

  it("renders ErrorCard and retries permissions bootstrap from error state", async () => {
    const user = userEvent.setup();
    const store = createTestStore();
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");

    render(
      <Provider store={store}>
        <MemoryRouter future={routerFuture}>
          <PermissionsProvider>
            <PermissionsErrorBoundary>
              <div>child-content</div>
            </PermissionsErrorBoundary>
          </PermissionsProvider>
        </MemoryRouter>
      </Provider>
    );

    act(() => {
      store.dispatch(bootstrapPermissionsFailure("Network error"));
    });

    expect(screen.getByText("Permissions Error")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
    expect(screen.queryByText("child-content")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
    const firstCall = dispatchEventSpy.mock.calls[0];
    expect(firstCall?.[0].type).toBe("permissions-bootstrap:retry");

    dispatchEventSpy.mockRestore();
  });

  it("returns to children after bootstrap success", () => {
    const store = createTestStore();

    render(
      <Provider store={store}>
        <MemoryRouter future={routerFuture}>
          <PermissionsProvider>
            <PermissionsErrorBoundary>
              <div>child-content</div>
            </PermissionsErrorBoundary>
          </PermissionsProvider>
        </MemoryRouter>
      </Provider>
    );

    act(() => {
      store.dispatch(bootstrapPermissionsFailure("Network error"));
    });

    expect(screen.getByText("Permissions Error")).toBeInTheDocument();

    act(() => {
      store.dispatch(
        bootstrapPermissionsSuccess({
          role: "manager",
          permissions: [],
        })
      );
    });

    expect(screen.getByText("child-content")).toBeInTheDocument();
  });
});
