import { beforeEach, describe, expect, it, vi } from "vitest";
import authReducer, {
  clearError,
  loginFailure,
  loginStart,
  loginSuccess,
  logout,
  selectAuthError,
  selectIsAuthenticated,
  selectUser,
  updateUser,
  type AuthState,
} from "./auth-slice";

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

describe("auth-slice", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles loginStart", () => {
    const state = authReducer(initialState, loginStart());
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
  });

  it("handles loginSuccess", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    const state = authReducer(
      initialState,
      loginSuccess({
        user: { id: "u1", name: "Admin", email: "admin@afenda.io", role: "admin" },
        token: "token-123",
      })
    );

    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe("admin@afenda.io");
    expect(state.token).toBe("token-123");
    expect(setItemSpy).toHaveBeenCalledWith("afenda-token", "token-123");
  });

  it("handles loginFailure and clearError", () => {
    const failed = authReducer(initialState, loginFailure("Invalid credentials"));
    expect(failed.error).toBe("Invalid credentials");
    expect(failed.isLoading).toBe(false);

    const cleared = authReducer(failed, clearError());
    expect(cleared.error).toBeNull();
  });

  it("handles updateUser and logout", () => {
    const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem");

    const loggedIn = authReducer(
      initialState,
      loginSuccess({
        user: { id: "u1", name: "Admin", email: "admin@afenda.io", role: "admin" },
        token: "token-123",
      })
    );

    const updated = authReducer(loggedIn, updateUser({ name: "Admin Updated" }));
    expect(updated.user?.name).toBe("Admin Updated");

    const loggedOut = authReducer(updated, logout());
    expect(loggedOut.isAuthenticated).toBe(false);
    expect(loggedOut.user).toBeNull();
    expect(removeItemSpy).toHaveBeenCalledWith("afenda-token");
  });

  it("selectors return expected values", () => {
    const state = {
      auth: {
        ...initialState,
        isAuthenticated: true,
        user: { id: "u1", name: "Admin", email: "admin@afenda.io", role: "admin" },
        error: "err",
      },
    };

    expect(selectUser(state)).toEqual(state.auth.user);
    expect(selectIsAuthenticated(state)).toBe(true);
    expect(selectAuthError(state)).toBe("err");
  });
});
