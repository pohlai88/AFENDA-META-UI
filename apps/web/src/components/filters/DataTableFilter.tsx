/**
 * DataTableFilter
 * ===============
 * Reusable filter component for data tables
 * Supports various field types with appropriate filter UIs
 */

import React from "react";
import type { MetaField } from "@afenda/meta-types";
import type { FilterCondition, FilterGroup } from "~/hooks/useModel";
import {
  buildConditionSummary,
  filterEnumOptions,
  getEnumInValues,
  getDisplayValue,
  getOperatorsForField,
  getValueInputKind,
  needsValue,
  parseConditionValue,
  selectVisibleEnumInValues,
  toggleEnumInValue,
} from "./filter-config";
import { 
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Badge,
} from "@afenda/ui";
import { Check, Filter, X, Plus } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DataTableFilterProps {
  fields: MetaField[];
  value: FilterGroup;
  onChange: (newValue: FilterGroup) => void;
}

// ---------------------------------------------------------------------------
// FilterConditionRow
// ---------------------------------------------------------------------------

interface FilterConditionRowProps {
  fields: MetaField[];
  condition: FilterCondition;
  onChange: (newCondition: FilterCondition) => void;
  onRemove: () => void;
}

interface EnumMultiSelectInputProps {
  options: NonNullable<MetaField["options"]>;
  value: unknown;
  onChange: (next: string[]) => void;
}

const EnumMultiSelectInput = React.memo(function EnumMultiSelectInput({
  options,
  value,
  onChange,
}: EnumMultiSelectInputProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const selectedValues = React.useMemo(() => getEnumInValues(value), [value]);
  const filteredOptions = React.useMemo(
    () => filterEnumOptions(options, query),
    [options, query]
  );
  const optionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  React.useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  React.useEffect(() => {
    if (filteredOptions.length === 0) {
      setHighlightedIndex(0);
      return;
    }

    if (highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(filteredOptions.length - 1);
    }
  }, [filteredOptions, highlightedIndex]);

  React.useEffect(() => {
    const target = optionRefs.current[highlightedIndex];
    if (open && target) {
      target.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, open]);

  const handleSelectAllVisible = React.useCallback(() => {
    const visibleValues = filteredOptions.map((option) => String(option.value));
    onChange(selectVisibleEnumInValues(selectedValues, visibleValues));
  }, [filteredOptions, onChange, selectedValues]);

  const handleToggleHighlighted = React.useCallback(() => {
    const highlightedOption = filteredOptions[highlightedIndex];
    if (!highlightedOption) {
      return;
    }

    onChange(toggleEnumInValue(selectedValues, String(highlightedOption.value)));
  }, [filteredOptions, highlightedIndex, onChange, selectedValues]);

  const handleInputKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        handleSelectAllVisible();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (filteredOptions.length === 0) {
          return;
        }

        setHighlightedIndex((current) => (current + 1) % filteredOptions.length);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (filteredOptions.length === 0) {
          return;
        }

        setHighlightedIndex((current) =>
          current === 0 ? filteredOptions.length - 1 : current - 1
        );
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        handleToggleHighlighted();
      }
    },
    [filteredOptions.length, handleSelectAllVisible, handleToggleHighlighted]
  );

  const selectedLabel =
    selectedValues.length === 0
      ? "Select values"
      : selectedValues.length === 1
      ? options.find((opt) => String(opt.value) === selectedValues[0])?.label ?? selectedValues[0]
      : `${selectedValues.length} selected`;

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setQuery("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="min-w-[12rem] flex-1 justify-between text-left font-normal"
        >
          <span className="truncate">{selectedLabel}</span>
          {selectedValues.length > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5">
              {selectedValues.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(20rem,80vw)] p-2" align="start">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Search values..."
          aria-label="Search filter values"
          className="mb-2"
        />
        <div className="max-h-56 space-y-1 overflow-y-auto" role="listbox" aria-label="Filter values">
          {filteredOptions.map((opt, index) => {
            const optionValue = String(opt.value);
            const isSelected = selectedValues.includes(optionValue);
            const isHighlighted = filteredOptions[highlightedIndex]?.value === opt.value;

            return (
              <button
                key={optionValue}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                type="button"
                onClick={() => onChange(toggleEnumInValue(selectedValues, optionValue))}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent ${isHighlighted ? "bg-accent" : ""}`}
                aria-pressed={isSelected}
                aria-selected={isHighlighted}
                role="option"
              >
                <span className="truncate">{opt.label}</span>
                <Check className={`h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`} />
              </button>
            );
          })}
          {filteredOptions.length === 0 && (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              No matching values
            </p>
          )}
        </div>
        {selectedValues.length > 0 && (
          <div className="mt-2 border-t border-border pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange([])}
            >
              Clear selection
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
});

const FilterConditionRow = React.memo(function FilterConditionRow({
  fields,
  condition,
  onChange,
  onRemove,
}: FilterConditionRowProps) {
  const selectedField = fields.find((f) => f.name === condition.field);
  const operators = getOperatorsForField(selectedField);
  const showValueInput = needsValue(condition.op);
  const inputKind = selectedField ? getValueInputKind(selectedField, condition.op) : "none";

  const handleFieldChange = React.useCallback(
    (fieldName: string) => {
      const nextField = fields.find((field) => field.name === fieldName);
      const nextOperators = getOperatorsForField(nextField);
      const nextOp = nextOperators[0]?.value ?? "eq";

      onChange({
        ...condition,
        field: fieldName,
        op: nextOp,
        value: undefined,
      });
    },
    [condition, fields, onChange]
  );

  const handleOperatorChange = React.useCallback(
    (operator: string) => {
      const op = operator as FilterCondition["op"];
      onChange({
        ...condition,
        op,
        value: needsValue(op) ? condition.value : undefined,
      });
    },
    [condition, onChange]
  );

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      {/* Field selector */}
      <Select
        value={condition.field}
        onValueChange={handleFieldChange}
      >
        <SelectTrigger className="min-w-[12rem] flex-1 md:w-44 md:flex-none">
          <SelectValue placeholder="Select field" />
        </SelectTrigger>
        <SelectContent>
          {fields.map((field) => (
            <SelectItem key={field.name} value={field.name}>
              {field.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator selector */}
      <Select
        value={condition.op}
        onValueChange={handleOperatorChange}
      >
        <SelectTrigger className="min-w-[12rem] flex-1 md:w-52 md:flex-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input (conditional) */}
      {showValueInput && selectedField && (
        <>
          {inputKind === "boolean" ? (
            <Select
              value={String(condition.value ?? "true")}
              onValueChange={(val) => onChange({ ...condition, value: val === "true" })}
            >
              <SelectTrigger className="min-w-[10rem] flex-1 md:w-40 md:flex-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          ) : inputKind === "enum-multi" && selectedField.options ? (
              <EnumMultiSelectInput
                options={selectedField.options}
                value={condition.value}
                onChange={(nextValues) =>
                  onChange({
                    ...condition,
                    value: nextValues,
                  })
                }
              />
          ) : inputKind === "enum-single" && selectedField.options ? (
              <Select
                value={String(condition.value ?? "")}
                onValueChange={(val) => onChange({ ...condition, value: val })}
              >
                <SelectTrigger className="min-w-[12rem] flex-1">
                  <SelectValue placeholder="Select value" />
                </SelectTrigger>
                <SelectContent>
                  {selectedField.options.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          ) : (
            <Input
              type={inputKind === "number" ? "number" : "text"}
              placeholder={condition.op === "like" || condition.op === "ilike" ? "Search..." : "Value"}
              value={getDisplayValue(condition)}
              onChange={(e) => {
                onChange({
                  ...condition,
                  value: parseConditionValue(selectedField, condition.op, e.target.value),
                });
              }}
              className="min-w-[12rem] flex-1"
            />
          )}
        </>
      )}

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
});

// ---------------------------------------------------------------------------
// DataTableFilter
// ---------------------------------------------------------------------------

export function DataTableFilter({ fields, value, onChange }: DataTableFilterProps) {
  const [open, setOpen] = React.useState(false);
  const activeFiltersCount = value.conditions.length;
  const filterSummaries = React.useMemo(
    () => value.conditions.map((condition) => buildConditionSummary(condition, fields)),
    [fields, value.conditions]
  );

  const handleAddCondition = () => {
    const firstField = fields[0];
    if (!firstField) return;

    const firstOperator = getOperatorsForField(firstField)[0]?.value ?? "eq";

    onChange({
      ...value,
      conditions: [
        ...value.conditions,
        { field: firstField.name, op: firstOperator, value: undefined },
      ],
    });
  };

  const handleUpdateCondition = (index: number, condition: FilterCondition) => {
    const newConditions = [...value.conditions];
    newConditions[index] = condition;
    onChange({ ...value, conditions: newConditions });
  };

  const handleRemoveCondition = (index: number) => {
    onChange({
      ...value,
      conditions: value.conditions.filter((_, i) => i !== index),
    });
  };

  const handleClearAll = () => {
    onChange({ ...value, conditions: [] });
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Filter className="mr-2 h-4 w-4" />
            Filter
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(90vw,720px)]" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Filters</h4>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                >
                  Clear all
                </Button>
              )}
            </div>

            {value.conditions.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No filters applied
              </div>
            ) : (
              <div>
                {value.conditions.map((condition, index) => (
                  <FilterConditionRow
                    key={index}
                    fields={fields}
                    condition={condition}
                    onChange={(cond) => handleUpdateCondition(index, cond)}
                    onRemove={() => handleRemoveCondition(index)}
                  />
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddCondition}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add filter
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Active filters summary">
          {filterSummaries.slice(0, 3).map((summary, index) => (
            <Badge key={`${summary}-${index}`} variant="outline" className="max-w-full truncate">
              {summary}
            </Badge>
          ))}
          {activeFiltersCount > 3 && (
            <Badge variant="secondary">+{activeFiltersCount - 3} more</Badge>
          )}
        </div>
      )}
    </div>
  );
}
