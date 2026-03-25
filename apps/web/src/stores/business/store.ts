/**
 * Redux Store
 * ============
 * Root Redux store configuration with middleware.
 * 
 * Features:
 * - Combines all slices
 * - Configures middleware (audit, analytics)
 * - DevTools integration
 */

import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/auth-slice";
import permissionsReducer from "./slices/permissions-slice";
import workflowReducer from "./slices/workflow-slice";
import { auditLogger } from "./middleware/audit-logger";
import { analytics } from "./middleware/analytics";
import { getAppConfig } from "~/lib/app-config";

const appConfig = getAppConfig();

/**
 * Root Redux store
 * 
 * Usage:
 * ```tsx
 * import { store } from "~/stores/business/store";
 * <Provider store={store}>
 *   <App />
 * </Provider>
 * ```
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    permissions: permissionsReducer,
    workflow: workflowReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serializable check
        ignoredActions: ["auth/loginSuccess"],
        // Ignore these field paths in state
        ignoredActionPaths: ["payload.timestamp"],
        ignoredPaths: ["auth.user.createdAt", "workflow.instances"],
      },
    })
      .concat(auditLogger)
      .concat(analytics),
  devTools: appConfig.isDev,
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
