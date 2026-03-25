/**
 * Business Stores
 * ================
 * Central export for Redux Toolkit business logic stores.
 * 
 * These stores manage complex business logic that requires
 * middleware (logging, audit, analytics, etc.).
 */

export { store, type RootState, type AppDispatch } from "./store";
export { useAppDispatch, useAppSelector } from "./hooks";
export { PERMISSION_ACTIONS, type PermissionAction } from "./permission-actions";

// Workflow exports
export {
  selectWorkflowInstance,
  selectAllInstances,
  selectInstancesByStatus,
  selectPendingInstances,
  selectCompletedInstances,
  selectPendingApprovals,
  selectApprovalTask,
  selectActiveInstance,
  selectWorkflowIsLoading,
  selectWorkflowError,
  selectWorkflowLastUpdatedAt,
  loadInstancesStart,
  loadInstancesSuccess,
  loadInstancesFailure,
  createInstanceStart,
  createInstanceSuccess,
  createInstanceFailure,
  updateInstanceStart,
  updateInstanceSuccess,
  updateInstanceFailure,
  setActiveInstance,
  clearInstance,
  addApprovalTask,
  removeApprovalTask,
  updateApprovalTask,
  clearApprovalTasks,
  clearError as clearWorkflowError,
  type WorkflowState,
} from "./slices/workflow-slice";

export {
  configureAnalyticsClient,
  flushAnalytics,
  getAnalyticsQueueSize,
  resetAnalyticsClientForTests,
  trackAnalyticsEvent,
  ANALYTICS_PROVIDER_IDS,
  createConsoleAnalyticsAdapter,
  createDatadogAnalyticsAdapter,
  createDefaultAnalyticsProviders,
  createMixpanelAnalyticsAdapter,
  createPostHogAnalyticsAdapter,
} from "./analytics";
export type {
  AnalyticsAction,
  AnalyticsActionMeta,
  AnalyticsClientConfig,
  AnalyticsContext,
  AnalyticsDomain,
  AnalyticsFlushReason,
  AnalyticsMetaConfig,
  AnalyticsOutcome,
  AnalyticsProviderAdapter,
  AnalyticsProviderId,
  AnalyticsTrackControl,
  ErpAnalyticsEvent,
} from "./analytics";

// ERP action creators with analytics metadata
export {
  purchaseOrderApproved,
  purchaseOrderApproveFailed,
  purchaseOrderRejected,
  purchaseOrderRejectFailed,
  purchaseOrderSubmitFailed,
  purchaseOrderSubmitted,
} from "./slices/erp-actions";

// Auth
export {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  clearError,
  selectUser,
  selectIsAuthenticated,
  selectAuthError,
  type User,
  type AuthState,
} from "./slices/auth-slice";

// Permissions
export {
  bootstrapPermissionsStart,
  bootstrapPermissionsSuccess,
  bootstrapPermissionsFailure,
  setPermissions,
  setRole,
  addPermission,
  removePermission,
  clearPermissions,
  selectPermissions,
  selectRole,
  selectPermissionsBootstrapStatus,
  selectPermissionsBootstrapError,
  selectPermissionsAreBootstrapped,
  selectCanAccessResource,
  selectHasAccessToResource,
  type Permission,
  type PermissionsState,
} from "./slices/permissions-slice";
