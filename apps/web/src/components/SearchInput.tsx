import React, { useState } from "react";
import { Autocomplete } from "~/components/Autocomplete";
import { useDebounce } from "~/hooks/useDebounce";
import { useSearch, type SearchRecord } from "~/hooks/useSearch";

export interface SearchInputProps {
  /** API model name, e.g. "partner", "product", "sales_order" */
  model: string;
  /** Called when the user selects a result */
  onSelect: (item: SearchRecord) => void;
  placeholder?: string;
  /** Field used as display label in results (default: "name") */
  displayField?: string;
  /** Field used as the selected value (default: "id") */
  valueField?: string;
  debounceDelay?: number;
}

export function SearchInput({
  model,
  onSelect,
  placeholder,
  displayField = "name",
  valueField = "id",
  debounceDelay = 300,
}: SearchInputProps) {
  const [search, setSearch] = useState("");
  const inputId = React.useId();
  const debouncedSearch = useDebounce(search, debounceDelay);
  const { data: results = [], isLoading, error } = useSearch(model, debouncedSearch);

  return (
    <Autocomplete
      id={`search-input-${model}-${inputId}`}
      label={`Search ${model}`}
      value={null}
      options={results}
      getOptionLabel={(r) => String(r[displayField] ?? r[valueField] ?? "")}
      getOptionValue={(r) => r[valueField]}
      onChange={(item) => {
        onSelect(item);
        setSearch("");
      }}
      placeholder={placeholder ?? `Search ${model}…`}
      loading={isLoading}
      error={error as Error | null}
      search={search}
      onSearchChange={setSearch}
    />
  );
}
