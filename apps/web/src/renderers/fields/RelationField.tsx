import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RendererFieldProps } from "./index.js";
import { FieldWrapper } from "./FieldWrapper.js";
import { useDebounce } from "~/hooks/useDebounce";
import { Autocomplete } from "~/components/Autocomplete";

export function RelationField({ field, value, onChange, readonly }: RendererFieldProps) {
  const [search, setSearch] = useState("");
  const inputId = React.useId();
  const debouncedSearch = useDebounce(search, 300);
  const rel = field.relation;
  const valueField = rel?.value_field ?? "id";
  const displayField = rel?.display_field ?? "name";

  const {
    data: records,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["relation", rel?.model || "", debouncedSearch],
    queryFn: async () => {
      if (!rel?.model) return [];
      const url = `/api/${rel.model}?limit=20${debouncedSearch ? `&search=${debouncedSearch}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${rel.model}`);
      const d = (await res.json()) as { data: Record<string, unknown>[] };
      return d.data;
    },
    staleTime: 30_000,
    enabled: !!rel?.model,
  });

  if (!rel) return <p style={{ color: "red" }}>Missing relation config</p>;

  return (
    <FieldWrapper field={field} required={field.required}>
      <Autocomplete
        id={`relation-listbox-${field.name}-${inputId}`}
        label={`Select ${rel.model}`}
        value={value}
        options={records ?? []}
        getOptionLabel={(r) => String(r[displayField] ?? r[valueField])}
        getOptionValue={(r) => r[valueField]}
        onChange={(r) => onChange?.(r[valueField])}
        placeholder={`Search ${rel.model}…`}
        readonly={readonly}
        loading={isLoading}
        error={error}
        search={search}
        onSearchChange={setSearch}
      />
    </FieldWrapper>
  );
}
