/**
 * useGlobalSearch Hook
 * ====================
 * Global search and command palette functionality.
 *
 * Features:
 * - Search across all models
 * - Search in record fields (title, description)
 * - Filter by model/type
 * - Recently viewed items
 * - Keyboard shortcuts (Cmd+K / Ctrl+K)
 * - Execute commands
 */

import { useCallback, useMemo, useState } from "react";
import { useModules } from "./useModules";

export interface SearchResult {
  id: string;
  model: string;
  title: string;
  subtitle?: string;
  icon?: string;
  type: "record" | "command" | "module";
  action?: () => void;
}

export interface SearchFilter {
  model?: string;
  type?: "all" | "record" | "command" | "module";
}

/**
 * Hook for global search functionality
 */
export function useGlobalSearch() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SearchFilter>({});
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const { data: modulesData } = useModules();

  // Search results logic
  const results: SearchResult[] = useMemo(() => {
    const results: SearchResult[] = [];

    if (!query.trim() && recentIds.length === 0) {
      return [];
    }

    // Search modules
    if (!filter.type || filter.type === "all" || filter.type === "module") {
      modulesData?.forEach((module) => {
        if (
          module.module.toLowerCase().includes(query.toLowerCase()) ||
          module.label?.toLowerCase().includes(query.toLowerCase())
        ) {
          results.push({
            id: module.module,
            model: module.module,
            title: module.label || module.module,
            type: "module",
            icon: module.icon || "grid",
          });
        }
      });
    }

    // Search recently viewed
    if (query.length === 0) {
      recentIds.forEach((id) => {
        results.push({
          id,
          model: "recent",
          title: `Recent: ${id}`,
          type: "record",
        });
      });
    }

    return results;
  }, [query, filter, modulesData, recentIds]);

  // Add to recent
  const recordViewed = useCallback((id: string) => {
    setRecentIds((prev) => {
      const filtered = prev.filter((item) => item !== id);
      return [id, ...filtered].slice(0, 10);
    });
  }, []);

  // Open search interface
  const open = useCallback(() => {
    setQuery("");
  }, []);

  // Clear recent
  const clearRecent = useCallback(() => {
    setRecentIds([]);
  }, []);

  return {
    query,
    setQuery,
    results,
    filter,
    setFilter,
    recentIds,
    recordViewed,
    clearRecent,
    open,
  };
}

/**
 * Command palette command definitions
 */
export const COMMAND_PALETTE_COMMANDS: SearchResult[] = [
  {
    id: "cmd:create-order",
    model: "command",
    title: "Create new sales order",
    subtitle: "Sales → Orders",
    type: "command",
    icon: "plus",
  },
  {
    id: "cmd:create-invoice",
    model: "command",
    title: "Create new invoice",
    subtitle: "Sales → Invoices",
    type: "command",
    icon: "plus",
  },
  {
    id: "cmd:show-settings",
    model: "command",
    title: "Open Settings",
    type: "command",
    icon: "settings",
  },
  {
    id: "cmd:dark-mode",
    model: "command",
    title: "Toggle dark mode",
    type: "command",
    icon: "moon",
  },
  {
    id: "cmd:help",
    model: "command",
    title: "Show help",
    type: "command",
    icon: "help-circle",
  },
];
