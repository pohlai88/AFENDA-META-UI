/**
 * Command Palette Component
 * =========================
 * Global search and command palette UI.
 *
 * Keyboard shortcut: Cmd+K (macOS) / Ctrl+K (Windows/Linux)
 *
 * Features:
 * - Search across models
 * - Quick commands
 * - Navigation
 * - Recently viewed
 */

import React, { useEffect } from "react";
import {
  useGlobalSearch,
  COMMAND_PALETTE_COMMANDS,
  type SearchResult,
} from "~/hooks/useGlobalSearch";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { SearchIcon, CommandIcon, ArrowRightIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ open: controlledOpen, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(controlledOpen ?? false);
  const { query, setQuery, results, recordViewed } = useGlobalSearch();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sync controlled open state
  useEffect(() => {
    if (controlledOpen !== undefined) {
      setIsOpen(controlledOpen);
    }
  }, [controlledOpen]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(!isOpen);
        onOpenChange?.(!isOpen);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        onOpenChange?.(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onOpenChange]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allResults = [...results, ...COMMAND_PALETTE_COMMANDS];
  const displayResults = allResults.slice(0, 10);

  const handleSelect = (result: SearchResult) => {
    if (result.type === "module") {
      navigate(`/${result.id}`);
    } else if (result.id.startsWith("cmd:")) {
      // Command execution would go here
    } else {
      recordViewed(result.id);
    }
    setIsOpen(false);
    onOpenChange?.(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => {
          setIsOpen(false);
          onOpenChange?.(false);
        }}
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-1/3 z-50 w-full max-w-2xl -translate-x-1/2 rounded-lg border bg-background shadow-lg">
        {/* Search input */}
        <div className="border-b p-3">
          <div className="flex items-center gap-2">
            <SearchIcon className="h-5 w-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models, commands..."
              className="border-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Results */}
        {displayResults.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No results found
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {displayResults.map((result, index) => (
              <button
                key={`${result.id}-${index}`}
                onClick={() => handleSelect(result)}
                className={cn(
                  "w-full px-4 py-2 text-left hover:bg-accent",
                  "flex items-center justify-between gap-2 transition-colors",
                  index === 0 && "bg-accent"
                )}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{result.title}</div>
                  {result.subtitle && (
                    <div className="text-xs text-muted-foreground">{result.subtitle}</div>
                  )}
                </div>
                <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Press ESC to close</span>
            <div className="flex items-center gap-1">
              <CommandIcon className="h-3 w-3" />
              <span>K</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
