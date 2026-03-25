import React from "react";
import { Loader2 } from "lucide-react";
import { Input } from "~/components/ui/input";
import { useDebounce } from "~/hooks/useDebounce";
import { useSearch, type SearchRecord } from "~/hooks/useSearch";
import { cn } from "~/lib/utils";

export interface SearchDropdownProps {
  model: string;
  onSelect: (item: SearchRecord) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
  minQueryLength?: number;
  noResultsText?: string;
  getOptionLabel?: (item: SearchRecord) => string;
  getOptionValue?: (item: SearchRecord) => string;
}

function defaultOptionLabel(item: SearchRecord): string {
  const label = item.name ?? item.label ?? item.code ?? item.id;
  if (typeof label === "string" && label.trim()) {
    return label;
  }

  return "Unnamed";
}

function defaultOptionValue(item: SearchRecord): string {
  const value = item.id ?? item.code ?? item.name;
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return `${Math.random().toString(36).slice(2, 8)}`;
}

export function SearchDropdown({
  model,
  onSelect,
  placeholder,
  className,
  debounceMs = 300,
  minQueryLength = 2,
  noResultsText = "No results found",
  getOptionLabel = defaultOptionLabel,
  getOptionValue = defaultOptionValue,
}: SearchDropdownProps) {
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(-1);
  const inputId = React.useId();

  const debouncedQuery = useDebounce(query, debounceMs);
  const normalizedQuery = debouncedQuery.trim();
  const effectiveQuery = normalizedQuery.length >= minQueryLength ? normalizedQuery : "";

  const { data: results = [], isLoading } = useSearch(model, effectiveQuery);

  React.useEffect(() => {
    setHighlightIndex(-1);
  }, [effectiveQuery, results.length]);

  const handleSelect = (item: SearchRecord) => {
    onSelect(item);
    setQuery("");
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((prev) => (prev - 1 + results.length) % results.length);
      return;
    }

    if (event.key === "Enter" && highlightIndex >= 0) {
      event.preventDefault();
      handleSelect(results[highlightIndex]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      setHighlightIndex(-1);
    }
  };

  const shouldShowDropdown =
    isOpen &&
    normalizedQuery.length >= minQueryLength &&
    (isLoading || results.length > 0 || !isLoading);

  return (
    <div className={cn("relative", className)}>
      <Input
        id={`search-dropdown-${inputId}`}
        value={query}
        placeholder={placeholder ?? `Search ${model}...`}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          // Delay allows click events on options to fire before closing.
          window.setTimeout(() => setIsOpen(false), 120);
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={shouldShowDropdown}
        aria-autocomplete="list"
        aria-controls={`search-dropdown-results-${inputId}`}
        aria-activedescendant={
          highlightIndex >= 0 ? `search-dropdown-item-${inputId}-${highlightIndex}` : undefined
        }
      />

      {shouldShowDropdown && (
        <div
          id={`search-dropdown-results-${inputId}`}
          role="listbox"
          className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover p-1 shadow-md"
        >
          {isLoading ? (
            <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="px-2 py-2 text-xs text-muted-foreground">{noResultsText}</div>
          ) : (
            <ul className="space-y-0.5">
              {results.map((item, index) => {
                const isActive = index === highlightIndex;
                return (
                  <li key={`${getOptionValue(item)}-${index}`}>
                    <button
                      id={`search-dropdown-item-${inputId}-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={cn(
                        "w-full rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground hover:bg-accent/70"
                      )}
                      onMouseEnter={() => setHighlightIndex(index)}
                      onClick={() => handleSelect(item)}
                    >
                      {getOptionLabel(item)}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
