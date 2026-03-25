import React from "react";
import ReactDOM from "react-dom/client";
import { Provider as ReduxProvider } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { store } from "./stores/business/store";
import { queryClient } from "./lib/query-client.js";
import { ThemeProvider } from "./components/theme-provider";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster } from "./components/ui/sonner";
import { NotificationToastBridge } from "./components/layout/notification-toast-bridge";
import { PermissionsBootstrap } from "./bootstrap/permissions-bootstrap";
import { PermissionsProvider } from "./bootstrap/permissions-context";
import { PermissionsErrorBoundary } from "./bootstrap/permissions-error-boundary";
import { registerAppQueryErrorOverrides } from "./bootstrap/query-error-overrides";
import { bootstrapAnalytics } from "./bootstrap/analytics-bootstrap";
import { getAppConfig } from "./lib/app-config";
import App from "./App.js";
import "./index.css";

// ───────────────────────────────────────────────────────────────────────
// Dynamic Import Error Handler
// Catches chunk load failures in production (stale builds, network issues)
// Recommended by Vite industry best practices: https://vite.dev/guide/build
// ───────────────────────────────────────────────────────────────────────
window.addEventListener("vite:preloadError", (event) => {
  // Allow custom handling (e.g., show user-friendly error, auto-refresh)
  console.error("Failed to load application chunk:", event.payload);

  // Strategy: Prompt user to refresh (prevents infinite loops)
  if (!sessionStorage.getItem("vite-chunk-error-handled")) {
    sessionStorage.setItem("vite-chunk-error-handled", "1");
    if (
      confirm("A new version of the application is available. Reload to get the latest version?")
    ) {
      window.location.reload();
    }
  }
});

registerAppQueryErrorOverrides();
bootstrapAnalytics();

const appConfig = getAppConfig();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ReduxProvider store={store}>
      <ThemeProvider defaultTheme="system">
        <QueryClientProvider client={queryClient}>
          <PermissionsBootstrap>
            <PermissionsProvider>
              <PermissionsErrorBoundary>
                <TooltipProvider>
                  <App />
                  <Toaster />
                  <NotificationToastBridge />
                  {appConfig.isDev && <ReactQueryDevtools initialIsOpen={false} />}
                </TooltipProvider>
              </PermissionsErrorBoundary>
            </PermissionsProvider>
          </PermissionsBootstrap>
        </QueryClientProvider>
      </ThemeProvider>
    </ReduxProvider>
  </React.StrictMode>
);
