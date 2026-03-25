/**
 * Sidebar Navigation
 * ===================
 * Sidebar shell that renders product branding + navigation tree.
 *
 * Navigation items are delegated to `SidebarNav`, which consumes
 * `useAccessibleModules` and renders RBAC-filtered module links.
 */

import { Link } from "react-router-dom";
import { SidebarNav } from "./sidebar-nav";

export function Sidebar() {
  return (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">A</span>
          </div>
          <div>
            <h2 className="font-semibold text-sm text-foreground">AFENDA</h2>
            <p className="text-xs text-muted-foreground">Meta-UI Platform</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-2">
        <SidebarNav />
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">v0.1.0 • Enterprise Edition</p>
      </div>
    </div>
  );
}
