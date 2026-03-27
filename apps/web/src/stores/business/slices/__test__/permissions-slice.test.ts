import { describe, expect, it } from "vitest";
import { PERMISSION_ACTIONS } from "~/stores/business";
import permissionsReducer, {
  bootstrapPermissionsFailure,
  bootstrapPermissionsStart,
  bootstrapPermissionsSuccess,
  addPermission,
  clearPermissions,
  removePermission,
  selectCanAccessResource,
  selectHasAccessToResource,
  selectPermissions,
  selectPermissionsAreBootstrapped,
  selectPermissionsBootstrapError,
  selectPermissionsBootstrapStatus,
  selectRole,
  setPermissions,
  setRole,
  type PermissionsState,
} from "../permissions-slice";

const initialState: PermissionsState = {
  permissions: [],
  role: null,
  isLoading: false,
  bootstrapStatus: "idle",
  bootstrapError: null,
};

describe("permissions-slice", () => {
  it("tracks bootstrap lifecycle", () => {
    const loading = permissionsReducer(initialState, bootstrapPermissionsStart());
    expect(loading.bootstrapStatus).toBe("loading");
    expect(loading.isLoading).toBe(true);

    const success = permissionsReducer(
      loading,
      bootstrapPermissionsSuccess({
        role: "manager",
        permissions: [{ resource: "sales", actions: [PERMISSION_ACTIONS.READ] }],
      })
    );
    expect(success.bootstrapStatus).toBe("ready");
    expect(success.isLoading).toBe(false);
    expect(success.role).toBe("manager");
    expect(success.permissions).toHaveLength(1);

    const failed = permissionsReducer(success, bootstrapPermissionsFailure("timeout"));
    expect(failed.bootstrapStatus).toBe("error");
    expect(failed.bootstrapError).toBe("timeout");
    expect(failed.permissions).toEqual([]);
  });

  it("sets permissions and role", () => {
    const withPermissions = permissionsReducer(
      initialState,
      setPermissions([{ resource: "sales", actions: [PERMISSION_ACTIONS.READ] }])
    );
    expect(withPermissions.permissions).toHaveLength(1);

    const withRole = permissionsReducer(withPermissions, setRole("manager"));
    expect(withRole.role).toBe("manager");
  });

  it("adds and merges permission actions", () => {
    const first = permissionsReducer(
      initialState,
      addPermission({ resource: "inventory", actions: [PERMISSION_ACTIONS.READ] })
    );
    const merged = permissionsReducer(
      first,
      addPermission({ resource: "inventory", actions: [PERMISSION_ACTIONS.WRITE] })
    );

    expect(merged.permissions).toHaveLength(1);
    expect([...merged.permissions[0].actions].sort()).toEqual([
      PERMISSION_ACTIONS.READ,
      PERMISSION_ACTIONS.WRITE,
    ]);
  });

  it("removes and clears permissions", () => {
    const withData = permissionsReducer(
      initialState,
      setPermissions([
        { resource: "sales", actions: [PERMISSION_ACTIONS.READ] },
        { resource: "crm", actions: [PERMISSION_ACTIONS.READ] },
      ])
    );

    const removed = permissionsReducer(withData, removePermission("crm"));
    expect(removed.permissions).toHaveLength(1);
    expect(removed.permissions[0].resource).toBe("sales");

    const cleared = permissionsReducer(removed, clearPermissions());
    expect(cleared.permissions).toHaveLength(0);
    expect(cleared.role).toBeNull();
  });

  it("selectors return expected values", () => {
    const state: { permissions: PermissionsState } = {
      permissions: {
        permissions: [
          {
            resource: "sales",
            actions: [PERMISSION_ACTIONS.READ, PERMISSION_ACTIONS.WRITE],
          },
        ],
        role: "admin",
        isLoading: false,
        bootstrapStatus: "ready",
        bootstrapError: null,
      },
    };

    expect(selectPermissions(state)).toHaveLength(1);
    expect(selectRole(state)).toBe("admin");
    expect(selectCanAccessResource("sales", PERMISSION_ACTIONS.WRITE)(state)).toBe(true);
    expect(selectCanAccessResource("sales", PERMISSION_ACTIONS.DELETE)(state)).toBe(false);
    expect(selectHasAccessToResource("sales")(state)).toBe(true);
    expect(selectHasAccessToResource("hr")(state)).toBe(false);
    expect(selectPermissionsBootstrapStatus(state)).toBe("ready");
    expect(selectPermissionsBootstrapError(state)).toBeNull();
    expect(selectPermissionsAreBootstrapped(state)).toBe(true);
  });
});
