/**
 * Permissions Slice
 * ==================
 * Redux slice for user permissions and RBAC management.
 * 
 * Features:
 * - Role-based access control
 * - Permission checks
 * - Module access control
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface Permission {
  resource: string; // e.g., "sales", "inventory", "accounting"
  actions: string[]; // e.g., ["read", "write", "delete"]
}

interface PermissionsState {
  permissions: Permission[];
  role: string | null;
  isLoading: boolean;
  bootstrapStatus: "idle" | "loading" | "ready" | "error";
  bootstrapError: string | null;
}

const initialState: PermissionsState = {
  permissions: [],
  role: null,
  isLoading: false,
  bootstrapStatus: "idle",
  bootstrapError: null,
};

/**
 * Permissions slice
 * 
 * Usage:
 * ```tsx
 * const canEdit = useSelector(selectCanAccessResource("sales", "write"));
 * dispatch(setPermissions(permissions));
 * ```
 */
const permissionsSlice = createSlice({
  name: "permissions",
  initialState,
  reducers: {
    bootstrapPermissionsStart(state) {
      state.isLoading = true;
      state.bootstrapStatus = "loading";
      state.bootstrapError = null;
    },
    bootstrapPermissionsSuccess(
      state,
      action: PayloadAction<{ permissions: Permission[]; role: string | null }>
    ) {
      state.permissions = action.payload.permissions;
      state.role = action.payload.role;
      state.isLoading = false;
      state.bootstrapStatus = "ready";
      state.bootstrapError = null;
    },
    bootstrapPermissionsFailure(state, action: PayloadAction<string>) {
      state.permissions = [];
      state.role = null;
      state.isLoading = false;
      state.bootstrapStatus = "error";
      state.bootstrapError = action.payload;
    },
    setPermissions(state, action: PayloadAction<Permission[]>) {
      state.permissions = action.payload;
    },
    setRole(state, action: PayloadAction<string>) {
      state.role = action.payload;
    },
    addPermission(state, action: PayloadAction<Permission>) {
      const existing = state.permissions.find(
        (p) => p.resource === action.payload.resource
      );
      if (existing) {
        // Merge actions
        existing.actions = Array.from(
          new Set([...existing.actions, ...action.payload.actions])
        );
      } else {
        state.permissions.push(action.payload);
      }
    },
    removePermission(state, action: PayloadAction<string>) {
      state.permissions = state.permissions.filter(
        (p) => p.resource !== action.payload
      );
    },
    clearPermissions(state) {
      state.permissions = [];
      state.role = null;
      state.bootstrapStatus = "idle";
      state.bootstrapError = null;
    },
  },
});

export const {
  bootstrapPermissionsStart,
  bootstrapPermissionsSuccess,
  bootstrapPermissionsFailure,
  setPermissions,
  setRole,
  addPermission,
  removePermission,
  clearPermissions,
} = permissionsSlice.actions;

export default permissionsSlice.reducer;

// Selectors
export const selectPermissions = (state: { permissions: PermissionsState }) =>
  state.permissions.permissions;

export const selectRole = (state: { permissions: PermissionsState }) =>
  state.permissions.role;

export const selectPermissionsBootstrapStatus = (
  state: { permissions: PermissionsState }
) => state.permissions.bootstrapStatus;

export const selectPermissionsBootstrapError = (
  state: { permissions: PermissionsState }
) => state.permissions.bootstrapError;

export const selectPermissionsAreBootstrapped = (
  state: { permissions: PermissionsState }
) => state.permissions.bootstrapStatus === "ready";

/**
 * Check if user has permission for a resource and action
 */
export const selectCanAccessResource = (resource: string, action: string) => (
  state: { permissions: PermissionsState }
) => {
  const permission = state.permissions.permissions.find(
    (p) => p.resource === resource
  );
  return permission ? permission.actions.includes(action) : false;
};

/**
 * Check if user has any permission for a resource
 */
export const selectHasAccessToResource = (resource: string) => (
  state: { permissions: PermissionsState }
) => {
  return state.permissions.permissions.some((p) => p.resource === resource);
};

// Export types
export type { Permission, PermissionsState };
