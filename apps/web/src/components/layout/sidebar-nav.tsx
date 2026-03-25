import React from "react";
import { Link, matchPath, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, FileText, RefreshCw } from "lucide-react";
import { cn } from "@afenda/ui";
import { Input } from "~/components/ui/input";
import { useDebounce } from "~/hooks/useDebounce";
import { useAccessibleModules } from "~/hooks/useModules";
import { usePermissions } from "~/bootstrap/permissions-context";
import { useSidebarStore } from "~/stores/ui";
import { getSidebarIcon } from "~/components/layout/sidebar-icons";

function isPathActive(pathname: string, path: string) {
  return pathname === path || Boolean(matchPath(`${path}/*`, pathname));
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

export function SidebarNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { menus, isLoading, error } = useAccessibleModules();
  const { bootstrapStatus, bootstrapError, retryBootstrap } = usePermissions();
  const expandedModules = useSidebarStore((state) => state.expandedModules);
  const toggleModule = useSidebarStore((state) => state.toggleModule);
  const setExpandedModules = useSidebarStore((state) => state.setExpandedModules);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebounce(query, 200);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const preSearchExpandedModulesRef = React.useRef<string[] | null>(null);

  const filteredMenus = React.useMemo(() => {
    const normalized = debouncedQuery.trim().toLowerCase();
    if (!normalized) return menus;

    return menus
      .map((menu) => {
        const moduleMatches =
          menu.label.toLowerCase().includes(normalized) ||
          menu.module.toLowerCase().includes(normalized);

        if (moduleMatches) return menu;

        const matchedModels = menu.models.filter(
          (model) =>
            model.label.toLowerCase().includes(normalized) ||
            model.name.toLowerCase().includes(normalized)
        );

        if (matchedModels.length === 0) return null;
        return { ...menu, models: matchedModels };
      })
      .filter((menu): menu is NonNullable<typeof menu> => menu !== null);
  }, [debouncedQuery, menus]);

  const searchableResults = React.useMemo(
    () =>
      filteredMenus.flatMap((menu) =>
        menu.models.map((model) => ({
          key: `${menu.module}:${model.name}`,
          path: `/${menu.module}/${model.name}`,
          label: model.label,
        }))
      ),
    [filteredMenus]
  );

  React.useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedQuery]);

  React.useEffect(() => {
    const normalized = debouncedQuery.trim();

    if (!normalized) {
      if (preSearchExpandedModulesRef.current) {
        setExpandedModules(preSearchExpandedModulesRef.current);
        preSearchExpandedModulesRef.current = null;
      }
      return;
    }

    if (!preSearchExpandedModulesRef.current) {
      preSearchExpandedModulesRef.current = expandedModules;
    }

    setExpandedModules(filteredMenus.map((menu) => menu.module));
  }, [debouncedQuery, expandedModules, filteredMenus, setExpandedModules]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/") {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isEditableTarget =
        target?.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT";

      if (isEditableTarget) {
        return;
      }

      event.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchableResults.length === 0) {
      if (event.key === "Escape") {
        setQuery("");
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % searchableResults.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + searchableResults.length) % searchableResults.length);
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0 && activeIndex < searchableResults.length) {
      event.preventDefault();
      navigate(searchableResults[activeIndex].path);
      setQuery("");
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setQuery("");
      setActiveIndex(-1);
    }
  };

  return (
    <nav className="space-y-1" aria-label="Module navigation">
      <div className="px-2 pb-2">
        <label htmlFor="sidebar-search" className="sr-only">
          Search modules and models
        </label>
        <Input
          id="sidebar-search"
          ref={searchInputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search modules..."
          className="h-9"
          aria-label="Search modules and models"
        />
      </div>

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

      {isLoading && (
        <div className="space-y-2 px-2 py-2" aria-live="polite" aria-busy="true">
          <div className="h-7 rounded bg-muted animate-pulse" />
          <div className="h-7 rounded bg-muted animate-pulse" />
          <div className="h-7 rounded bg-muted animate-pulse" />
        </div>
      )}

      {(bootstrapStatus === "idle" || bootstrapStatus === "loading") && (
        <p className="px-3 py-2 text-xs text-muted-foreground">Loading access permissions...</p>
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

      {error && (
        <p className="px-3 py-2 text-xs text-destructive">Failed to load navigation.</p>
      )}

      {!isLoading && !error &&
        filteredMenus.map((menu) => {
          const isExpanded = expandedModules.includes(menu.module);
          const modulePath = `/${menu.module}`;
          const isModuleActive = isPathActive(location.pathname, modulePath);
          const ModuleIcon = getSidebarIcon(menu.module, menu.icon);

          return (
            <div key={menu.module} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleModule(menu.module)}
                aria-expanded={isExpanded}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  isModuleActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <ModuleIcon className="w-4 h-4" />
                <span className="flex-1 text-left">{renderHighlightedText(menu.label, debouncedQuery)}</span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {isExpanded && menu.models.length > 0 && (
                <div className="ml-4 space-y-1 border-l border-border pl-2">
                  {menu.models.map((model) => {
                    const modelPath = `/${menu.module}/${model.name}`;
                    const isModelActive = isPathActive(location.pathname, modelPath);
                    const ModelIcon = getSidebarIcon(menu.module, model.icon);
                    const isKeyboardActive =
                      activeIndex >= 0 &&
                      activeIndex < searchableResults.length &&
                      searchableResults[activeIndex]?.path === modelPath;

                    return (
                      <Link
                        key={model.name}
                        to={modelPath}
                        aria-current={isModelActive ? "page" : undefined}
                        aria-selected={isKeyboardActive}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                          isKeyboardActive && "ring-1 ring-ring/60",
                          isModelActive
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                        )}
                      >
                        <ModelIcon className="w-3.5 h-3.5" />
                        {renderHighlightedText(model.label, debouncedQuery)}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

      {!isLoading && bootstrapStatus === "ready" && !error && filteredMenus.length === 0 && (
        <p className="px-3 py-2 text-xs text-muted-foreground">No matching modules.</p>
      )}

      {!isLoading && bootstrapStatus === "ready" && !error && !debouncedQuery.trim() && menus.length === 0 && (
        <p className="px-3 py-2 text-xs text-muted-foreground">No modules available for your role.</p>
      )}
    </nav>
  );
}
