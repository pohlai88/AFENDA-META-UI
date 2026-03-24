/**
 * Sidebar Navigation
 * ===================
 * Auto-generated navigation from registered modules and models.
 * 
 * Features:
 * - Module groups (expandable/collapsible)
 * - Model links with icons
 * - Active state highlighting
 * - Search/filter modules and models
 * - Permission-aware navigation (RBAC bootstrap)
 * 
 * State Management:
 * - Sidebar open/close → Zustand (useSidebarStore)
 * - Collapsible module groups → Zustand (persisted)
 * - Permission bootstrap + filters → Redux permissions slice
 */

import React from "react";
import { Link, matchPath, useLocation } from "react-router-dom";
import { ChevronRight, ChevronDown, FileText, RefreshCw } from "lucide-react";
import { cn } from "@afenda/ui";
import { useModules } from "../../hooks/useModules";
import { useSidebarStore } from "~/stores/ui";
import { PERMISSION_ACTIONS } from "~/stores/business";
import { usePermissions } from "~/bootstrap/permissions-context";
import { getSidebarIcon } from "./sidebar-icons";

function matchesPath(pathname: string, path: string) {
  return pathname === path || Boolean(matchPath(`${path}/*`, pathname));
}

function hasReadAccess(resource: string, permissions: Array<{ resource: string; actions: string[] }>) {
  return permissions.some((permission) => {
    if (permission.resource !== resource) {
      return false;
    }

    return (
      permission.actions.length === 0 ||
      permission.actions.includes(PERMISSION_ACTIONS.READ)
    );
  });
}

function moduleMatchesQuery(
  module: { module: string; label: string; models: Array<{ name: string; label: string }> },
  normalizedQuery: string
) {
  if (
    module.label.toLowerCase().includes(normalizedQuery) ||
    module.module.toLowerCase().includes(normalizedQuery)
  ) {
    return true;
  }

  return module.models.some(
    (model) =>
      model.label.toLowerCase().includes(normalizedQuery) ||
      model.name.toLowerCase().includes(normalizedQuery)
  );
}

function renderHighlightedText(value: string, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return value;
  }

  const normalizedValue = value.toLowerCase();
  if (!normalizedValue.includes(normalizedQuery)) {
    return value;
  }

  const segments: React.ReactNode[] = [];
  let cursor = 0;
  let matchIndex = normalizedValue.indexOf(normalizedQuery, cursor);

  while (matchIndex !== -1) {
    if (matchIndex > cursor) {
      segments.push(value.slice(cursor, matchIndex));
    }

    const matchEnd = matchIndex + normalizedQuery.length;
    segments.push(
      <mark
        key={`${value}-${matchIndex}`}
        className="rounded-sm bg-primary/20 px-0.5 text-foreground"
      >
        {value.slice(matchIndex, matchEnd)}
      </mark>
    );

    cursor = matchEnd;
    matchIndex = normalizedValue.indexOf(normalizedQuery, cursor);
  }

  if (cursor < value.length) {
    segments.push(value.slice(cursor));
  }

  return <>{segments}</>;
}

export function Sidebar() {
  const location = useLocation();
  const {
    data: menus,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useModules();
  const expandedModules = useSidebarStore((state) => state.expandedModules);
  const toggleModule = useSidebarStore((state) => state.toggleModule);
  const setExpandedModules = useSidebarStore((state) => state.setExpandedModules);
  const { permissions, bootstrapStatus, bootstrapError, retryBootstrap } = usePermissions();
  const [searchQuery, setSearchQuery] = React.useState("");
  const preSearchExpandedModulesRef = React.useRef<string[] | null>(null);

  const visibleMenus = React.useMemo(() => {
    if (!menus) {
      return [];
    }

    if (bootstrapStatus !== "ready") {
      return [];
    }

    if (permissions.length === 0) {
      return [];
    }

    return menus
      .map((module) => {
        const moduleHasAccess = hasReadAccess(module.module, permissions);
        const hasModelScopedPermissions = permissions.some((permission) =>
          permission.resource.startsWith(`${module.module}.`)
        );
        const visibleModels = module.models.filter((model) => {
          const modelResource = `${module.module}.${model.name}`;
          return (
            hasReadAccess(modelResource, permissions) ||
            (moduleHasAccess && !hasModelScopedPermissions)
          );
        });

        if (!moduleHasAccess && visibleModels.length === 0) {
          return null;
        }

        return {
          ...module,
          models: visibleModels,
        };
      })
      .filter((module): module is NonNullable<typeof module> => module !== null);
  }, [bootstrapStatus, menus, permissions]);

  const filteredMenus = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return visibleMenus;
    }

    return visibleMenus
      .map((module) => {
        const moduleMatch = moduleMatchesQuery(module, normalizedQuery);

        if (moduleMatch) {
          return module;
        }

        const matchedModels = module.models.filter((model) => {
          return (
            model.label.toLowerCase().includes(normalizedQuery) ||
            model.name.toLowerCase().includes(normalizedQuery)
          );
        });

        if (matchedModels.length === 0) {
          return null;
        }

        return {
          ...module,
          models: matchedModels,
        };
      })
      .filter((module): module is NonNullable<typeof module> => module !== null);
  }, [searchQuery, visibleMenus]);

  const handleSearchChange = React.useCallback(
    (nextQuery: string) => {
      const normalizedNextQuery = nextQuery.trim().toLowerCase();
      const normalizedCurrentQuery = searchQuery.trim().toLowerCase();

      if (normalizedNextQuery && !normalizedCurrentQuery) {
        preSearchExpandedModulesRef.current = expandedModules;
      }

      setSearchQuery(nextQuery);

      if (!normalizedNextQuery) {
        if (preSearchExpandedModulesRef.current) {
          setExpandedModules(preSearchExpandedModulesRef.current);
          preSearchExpandedModulesRef.current = null;
        }
        return;
      }

      const matchedModuleNames = visibleMenus
        .filter((module) => moduleMatchesQuery(module, normalizedNextQuery))
        .map((module) => module.module);

      setExpandedModules(matchedModuleNames);
    },
    [expandedModules, searchQuery, setExpandedModules, visibleMenus]
  );

  const isModuleExpanded = React.useCallback(
    (moduleName: string) => expandedModules.includes(moduleName),
    [expandedModules]
  );

  const isActive = (path: string) => {
    return matchesPath(location.pathname, path);
  };

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
      <nav className="flex-1 overflow-y-auto p-2">
        {/* Home Link */}
        <Link
          to="/"
          aria-current={location.pathname === "/" ? "page" : undefined}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            location.pathname === "/"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
        >
          <FileText className="w-4 h-4" />
          Dashboard
        </Link>

        <div className="h-px bg-border my-2" />

        <div className="px-2 pb-2">
          <label htmlFor="sidebar-search" className="sr-only">
            Search modules and models
          </label>
          <input
            id="sidebar-search"
            value={searchQuery}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search modules..."
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            Loading modules...
          </div>
        )}

        {(bootstrapStatus === "idle" ||
          bootstrapStatus === "loading") && (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            Loading access permissions...
          </div>
        )}

        {bootstrapStatus === "error" && (
          <div className="space-y-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-3 text-sm">
            <p className="text-destructive">Failed to load access permissions</p>
            {bootstrapError ? (
              <p className="text-xs text-muted-foreground">{bootstrapError}</p>
            ) : null}
            <button
              type="button"
              onClick={retryBootstrap}
              className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry permissions
            </button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="space-y-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-3 text-sm">
            <p className="text-destructive">Failed to load modules</p>
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
              Retry
            </button>
          </div>
        )}

        {/* Module Groups */}
        {filteredMenus.map((module) => {
          const ModuleIcon = getSidebarIcon(module.module, module.icon);
          const isExpanded = isModuleExpanded(module.module);
          const isModuleActive = isActive(`/${module.module}`);
          const regionId = `sidebar-group-${module.module}`;

          return (
            <div key={module.module} className="mb-1">
              {/* Module Header */}
              <button
                type="button"
                onClick={() => toggleModule(module.module)}
                aria-expanded={isExpanded}
                aria-controls={regionId}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isModuleActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <ModuleIcon className="w-4 h-4" />
                  {renderHighlightedText(module.label, searchQuery)}
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Model Links */}
              <div
                id={regionId}
                className={cn(
                  "grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out",
                  isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="min-h-0">
                  <div className="ml-6 mt-1 space-y-1 pb-1">
                  {module.models.map((model) => {
                    const ModelIcon = getSidebarIcon(module.module, model.icon);
                    const modelPath = `/${module.module}/${model.name}`;
                    const isModelActive = isActive(modelPath);

                    return (
                      <Link
                        key={model.name}
                        to={modelPath}
                        aria-current={isModelActive ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                          isModelActive
                            ? "bg-accent text-accent-foreground font-medium"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        )}
                      >
                        <ModelIcon className="w-3.5 h-3.5" />
                        {renderHighlightedText(model.label, searchQuery)}
                      </Link>
                    );
                  })}
                </div>
                </div>
              </div>
            </div>
          );
        })}

        {!isLoading && bootstrapStatus === "ready" && filteredMenus.length === 0 && (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            {searchQuery.trim().length > 0
              ? "No modules match your search"
              : "No modules available for your role"}
          </div>
        )}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          v0.1.0 • Enterprise Edition
        </p>
      </div>
    </div>
  );
}
