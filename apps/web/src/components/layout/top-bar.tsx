/**
 * Top Bar
 * ========
 * Application header with breadcrumb navigation, search, user menu, and theme toggle.
 * 
 * State Management:
 * - Sidebar state → Zustand (useSidebarStore)
 * - Notifications → Zustand (useNotificationStore)
 * - User/Auth → Redux (useAppSelector) - optional, falls back to default
 * - Theme → Context (useTheme)
 */

import React from "react";
import { useLocation, Link } from "react-router-dom";
import { PanelLeft, PanelLeftClose, Search, Bell, User, ChevronRight } from "lucide-react";
import { Button } from "@afenda/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@afenda/ui";
import { Moon, Sun } from "lucide-react";
import { SHELL_IDS, SHELL_LABELS, SHELL_LAYOUT } from "./shell-config";
import { useTheme } from "~/components/theme-provider";
import { useSidebarStore, useNotificationStore } from "~/stores/ui";
import { useAppSelector } from "~/stores/business";

// TopBar now manages its own state via stores - no props needed!
function Breadcrumb() {
  const location = useLocation();
  const segments = React.useMemo(
    () => location.pathname.split("/").filter(Boolean),
    [location.pathname]
  );

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center">
        {segments.length === 0 ? (
          <li className="text-sm font-medium">Dashboard</li>
        ) : (
          segments.map((segment, index) => {
            const path = `/${segments.slice(0, index + 1).join("/")}`;
            const label = segment
              .split(/[-_]/)
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
            const isLast = index === segments.length - 1;

            return (
              <li key={path} className="flex items-center">
                {index > 0 && (
                  <span className="text-muted-foreground mx-2" aria-hidden="true">
                    <ChevronRight className="h-3 w-3" />
                  </span>
                )}
                {isLast ? (
                  <span className="text-sm font-medium" aria-current="page">{label}</span>
                ) : (
                  <Link
                    to={path}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {label}
                  </Link>
                )}
              </li>
            );
          })
        )}
      </ol>
    </nav>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}

function UserMenu() {
  // Try to get user from Redux auth store, fallback to default
  const authUser = useAppSelector((state) => state.auth.user);
  
  const defaultUser = {
    name: "Admin User",
    email: "admin@afenda.io",
    role: "Administrator"
  };

  const currentUser = authUser || defaultUser;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="User menu">
          <User className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{currentUser.name}</p>
          <p className="text-xs text-muted-foreground">{currentUser.email}</p>
          {currentUser.role && (
            <p className="text-xs text-muted-foreground mt-0.5">{currentUser.role}</p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive">
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TopBar() {
  // Get state from stores
  const { isOpen: sidebarOpen, toggle: toggleSidebar } = useSidebarStore();
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  return (
    <header role="banner" className={SHELL_LAYOUT.topBar}>
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-controls={SHELL_IDS.sidebar}
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? SHELL_LABELS.sidebarClose : SHELL_LABELS.sidebarOpen}
          title={sidebarOpen ? SHELL_LABELS.sidebarClose : SHELL_LABELS.sidebarOpen}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </Button>

        <Breadcrumb />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Search (future: open command palette) */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Search"
          title="Search (Cmd+K)"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          title="Notifications"
          className="relative"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" aria-hidden="true" />
          )}
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
