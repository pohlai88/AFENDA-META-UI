import React, { useEffect, useRef, useState } from "react";
export interface AutocompleteProps<T> {
  /** Id for the listbox element itself; auto-generated if omitted. */
  id?: string;
  /** Accessible label for the listbox (e.g. "Select customer"). */
  label?: string;
  /** Currently selected option's value (compared via getOptionValue). */
  value: unknown;
  options: T[];
  getOptionLabel: (option: T) => string;
  getOptionValue: (option: T) => unknown;
  onChange: (option: T) => void;
  placeholder?: string;
  readonly?: boolean;
  loading?: boolean;
  error?: Error | null;
  /** Controlled search text — leave unset to use internal state. */
  search?: string;
  onSearchChange?: (text: string) => void;
}

export function Autocomplete<T>({
  id,
  label,
  value,
  options,
  getOptionLabel,
  getOptionValue,
  onChange,
  placeholder = "Search…",
  readonly = false,
  loading = false,
  error = null,
  search: externalSearch,
  onSearchChange,
}: AutocompleteProps<T>) {
  // ---------------------------------------------------------------------------
  // State — internal search is used when the caller does not control it.
  // ---------------------------------------------------------------------------
  const [internalSearch, setInternalSearch] = useState("");
  const isControlled = externalSearch !== undefined;
  const search = isControlled ? externalSearch : internalSearch;

  const setSearch = (text: string) => {
    if (!isControlled) setInternalSearch(text);
    onSearchChange?.(text);
  };

  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputId = React.useId();
  const listboxId = id ?? `autocomplete-listbox-${inputId}`;
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Reset highlight when search changes.
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [search]);

  // Scroll highlighted option into view.
  useEffect(() => {
    if (highlightedIndex >= 0) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [highlightedIndex]);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const selected = options.find((o) => getOptionValue(o) === value);
  const isListOpen = search.length > 0;
  const activeDescendantId =
    highlightedIndex >= 0 && highlightedIndex < options.length
      ? `${listboxId}-option-${highlightedIndex}`
      : undefined;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const selectOption = (option: T) => {
    onChange(option);
    setSearch("");
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isListOpen || options.length === 0) {
      if (event.key === "Escape") setSearch("");
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
        break;
      case "Enter":
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          event.preventDefault();
          selectOption(options[highlightedIndex]);
        }
        break;
      case "Escape":
        event.preventDefault();
        setSearch("");
        setHighlightedIndex(-1);
        break;
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (readonly) {
    return (
      <div style={{ padding: "0.4rem 0.6rem", background: "#f8f8f8", borderRadius: 4 }}>
        {selected ? getOptionLabel(selected) : "—"}
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        role="combobox"
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={isListOpen}
        aria-activedescendant={activeDescendantId}
        style={{
          width: "100%",
          padding: "0.4rem 0.6rem",
          border: "1px solid #ccc",
          borderRadius: 4,
          fontSize: "0.9rem",
        }}
      />

      {isListOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={label ?? "Options"}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #ccc",
            borderTop: "none",
            borderRadius: "0 0 4px 4px",
            maxHeight: 200,
            overflowY: "auto",
            zIndex: 10,
          }}
        >
          {loading ? (
            <div style={{ padding: "0.5rem", color: "#888" }}>Loading…</div>
          ) : error ? (
            <div style={{ padding: "0.5rem", color: "#c00" }}>Failed to load options</div>
          ) : options.length === 0 ? (
            <div style={{ padding: "0.5rem", color: "#888" }}>No results found</div>
          ) : (
            options.map((o, index) => (
              <div
                ref={(el) => { optionRefs.current[index] = el; }}
                id={`${listboxId}-option-${index}`}
                role="option"
                aria-selected={value === getOptionValue(o) || highlightedIndex === index}
                key={String(getOptionValue(o))}
                onClick={() => selectOption(o)}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseLeave={() => setHighlightedIndex(-1)}
                style={{
                  padding: "0.5rem 0.75rem",
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                  background: highlightedIndex === index ? "#f0f4ff" : "#fff",
                }}
              >
                {getOptionLabel(o)}
              </div>
            ))
          )}
        </div>
      )}

      {selected && (
        <div style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "#666" }}>
          Selected: {getOptionLabel(selected)}
        </div>
      )}
    </div>
  );
}
