/**
 * useGlobalSearch Hook
 * ====================
 * Global search and command palette functionality.
 *
 * Features:
 * - Search across all models via GET /api/search
 * - Search in record fields (title, description)
 * - Filter by model/type
 * - Recently viewed items
 * - Keyboard shortcuts (Cmd+K / Ctrl+K)
 * - Execute commands
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useModules } from "./useModules";

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

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
  const [apiResults, setApiResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { data: modulesData } = useModules();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── API search with debounce ───────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < MIN_QUERY_LENGTH) {
      setApiResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const modelParam = filter.model ? `&models=${encodeURIComponent(filter.model)}` : "";
        const resp = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}${modelParam}&limit=20`
        );
        if (!resp.ok) {
          setApiResults([]);
          return;
        }
        const json = (await resp.json()) as {
          data: Array<{ id: string; model: string; title: string; subtitle?: string }>;
        };
        setApiResults(
          json.data.map((r) => ({
            id: `${r.model}:${r.id}`,
            model: r.model,
            title: r.title,
            subtitle: r.subtitle,
            type: "record" as const,
          }))
        );
      } catch {
        setApiResults([]);
      } finally {
        setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, filter.model]);

  // ── Module search (local) ─────────────────────────────────────────────────
  const moduleResults: SearchResult[] = useMemo(() => {
    if (!query.trim()) return [];
    if (filter.type && filter.type !== "all" && filter.type !== "module") return [];
    return (modulesData ?? [])
      .filter(
        (m) =>
          m.module.toLowerCase().includes(query.toLowerCase()) ||
          m.label?.toLowerCase().includes(query.toLowerCase())
      )
      .map((m) => ({
        id: m.module,
        model: m.module,
        title: m.label || m.module,
        type: "module" as const,
        icon: m.icon || "grid",
      }));
  }, [query, filter.type, modulesData]);

  // ── Combined results ──────────────────────────────────────────────────────
  const results: SearchResult[] = useMemo(() => {
    const combined: SearchResult[] = [];

    // Recently viewed (when no query)
    if (query.length === 0) {
      recentIds.forEach((id) => {
        combined.push({ id, model: "recent", title: `Recent: ${id}`, type: "record" });
      });
      return combined;
    }

    // API results first (actual records)
    combined.push(...apiResults);
    // Then module matches
    combined.push(...moduleResults);

    return combined;
  }, [query, apiResults, moduleResults, recentIds]);

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
    isSearching,
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
