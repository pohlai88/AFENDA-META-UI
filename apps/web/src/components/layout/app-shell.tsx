/**
 * App Shell
 * ==========
 * Main application layout with collapsible sidebar, top bar, and content area.
 *
 * Features:
 * - Collapsible sidebar with module/model navigation
 * - Top bar with breadcrumb, user menu, theme toggle
 * - Responsive design (mobile-friendly)
 * - Sidebar state managed by Zustand store (auto-persisted)
 *
 * State Management:
 * - Sidebar → Zustand (useSidebarStore)
 */

import React, { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { CommandPalette } from "~/components/command-palette";
import { SHELL_IDS, SHELL_LABELS, SHELL_LAYOUT } from "./shell-config";
import { cn } from "~/lib/utils";
import { ErrorBoundaryClass } from "~/components/error-boundary";
import { OfflineBanner } from "~/components/offline-banner";
import { PageSkeleton } from "~/components/ui/page-skeleton";
import { useAppDispatch } from "~/stores/business";
import { useNotificationStore, useSidebarStore } from "~/stores/ui";

export function AppShell() {
  // Get sidebar state from Zustand store (auto-persisted to localStorage)
  const isOpen = useSidebarStore((state) => state.isOpen);
  const closeSidebar = useSidebarStore((state) => state.close);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const dispatch = useAppDispatch();

  // Command palette state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);

  // Skip mount to avoid creating a toast/audit event for hydrated initial state.
  const hasHydratedRef = React.useRef(false);

  React.useEffect(() => {
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }

    dispatch({
      type: "ui/sidebarToggle",
      payload: {
        open: isOpen,
        source: "app-shell",
        timestamp: new Date().toISOString(),
      },
    });

    addNotification({
      title: isOpen ? "Navigation opened" : "Navigation collapsed",
      message: isOpen ? "Sidebar navigation is now visible." : "Sidebar navigation is now hidden.",
      type: "info",
    });
  }, [addNotification, dispatch, isOpen]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSidebar();
      }
    };

    window.addEventListener("keydown", onEscape);

    return () => {
      window.removeEventListener("keydown", onEscape);
    };
  }, [closeSidebar, isOpen]);

  React.useEffect(() => {
    if (!isOpen || !window.matchMedia("(max-width: 767px)").matches) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <div className="flex h-screen bg-background">
      {isOpen && (
        <button
          type="button"
          aria-label={SHELL_LABELS.sidebarClose}
          onClick={closeSidebar}
          className={SHELL_LAYOUT.sidebarOverlay}
        />
      )}

      {/* Sidebar */}
      <aside
        id={SHELL_IDS.sidebar}
        role="navigation"
        aria-label={SHELL_LABELS.sidebarPrimaryNavigation}
        aria-expanded={isOpen}
        aria-hidden={!isOpen}
        className={cn(
          SHELL_LAYOUT.sidebarBase,
          isOpen ? SHELL_LAYOUT.sidebarOpen : SHELL_LAYOUT.sidebarClosed,
          SHELL_LAYOUT.sidebarDesktop
        )}
      >
        {isOpen && <Sidebar />}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar />
        <OfflineBanner />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <Suspense fallback={<PageSkeleton />}>
            <ErrorBoundaryClass>
              <Outlet />
            </ErrorBoundaryClass>
          </Suspense>
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette open={isCommandPaletteOpen} onOpenChange={setIsCommandPaletteOpen} />
    </div>
  );
}

export default AppShell;
