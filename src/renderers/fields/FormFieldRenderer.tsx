/**
 * FormFieldRenderer
 * =================
 * Wraps field components with react-hook-form Controller + shadcn Form components
 */

import React, { memo } from "react";
import { useFormContext, type ControllerRenderProps } from "react-hook-form";
import type { MetaField } from "@afenda/meta-types";
import { useComputedFieldState } from "../conditions";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@afenda/ui";
import { Input } from "@afenda/ui";
import { Textarea } from "@afenda/ui";
import { Checkbox } from "@afenda/ui";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@afenda/ui";
import { Calendar } from "@afenda/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@afenda/ui";
import { Button } from "@afenda/ui";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "~/lib/utils";

const OPTIONAL_ENUM_CLEAR_VALUE = "__none__";

interface FormFieldRendererProps {
  field: MetaField;
}

function FormFieldRendererComponent({ field: rawField }: FormFieldRendererProps) {
  const computed = useComputedFieldState(rawField.name);
  const form = useFormContext();
  const inputId = React.useId();

  // Condition DSL: hide field when visibleIf evaluates to false
  if (computed && !computed.visible) return null;

  // Merge dynamic conditions with static field properties
  const field: MetaField = computed
    ? { ...rawField, required: computed.required, readonly: computed.readonly || rawField.readonly }
    : rawField;

  const controlId = `form-field-${field.name}-${inputId}`;
  const helpTextId = field.help_text ? `${controlId}-help` : undefined;
  const errorId = `${controlId}-error`;

  return (
    <FormField
      control={form.control}
      name={field.name}
      render={({ field: formField, fieldState }) => (
        <FormItem>
          <FormLabel htmlFor={controlId} className={field.type === "boolean" ? "sr-only" : undefined}>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <FieldInput
              field={field}
              formField={formField}
              controlId={controlId}
              helpTextId={helpTextId}
              errorId={errorId}
              hasError={Boolean(fieldState.error)}
            />
          </FormControl>
          {field.help_text && <FormDescription id={helpTextId}>{field.help_text}</FormDescription>}
          <FormMessage id={errorId} />
        </FormItem>
      )}
    />
  );
}

// Memoize to avoid re-rendering when field props haven't changed
export const FormFieldRenderer = memo(FormFieldRendererComponent, (prev, next) => {
  // Compare field identity - prevents re-render if field reference is stable
  return prev.field === next.field;
});

// DO NOT memoize FieldInput - it's inside a Controller render prop that already
// optimizes re-renders, and it receives a ref from react-hook-form via {...formField}
function FieldInput({ 
  field, 
  formField,
  controlId,
  helpTextId,
  errorId,
  hasError,
}: { 
  field: MetaField; 
  formField: ControllerRenderProps;
  controlId: string;
  helpTextId?: string;
  errorId: string;
  hasError: boolean;
}) {
  const describedBy = [helpTextId, errorId].filter(Boolean).join(" ") || undefined;
  const parsedValueDate =
    formField.value == null
      ? undefined
      : (() => {
          const date = new Date(formField.value);
          return Number.isNaN(date.getTime()) ? undefined : date;
        })();

  const updateDatePortion = (nextDate: Date | undefined) => {
    if (!nextDate) {
      formField.onChange(null);
      return;
    }

    if (field.type === "datetime" && parsedValueDate) {
      nextDate.setHours(
        parsedValueDate.getHours(),
        parsedValueDate.getMinutes(),
        parsedValueDate.getSeconds(),
        parsedValueDate.getMilliseconds()
      );
    }

    formField.onChange(nextDate.toISOString());
  };

  const updateTimePortion = (timeValue: string) => {
    if (!timeValue) {
      return;
    }

    const [hours, minutes] = timeValue.split(":").map(Number);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return;
    }

    const nextDate = parsedValueDate ? new Date(parsedValueDate) : new Date();
    nextDate.setHours(hours, minutes, 0, 0);
    formField.onChange(nextDate.toISOString());
  };

  const timeValue = parsedValueDate ? format(parsedValueDate, "HH:mm") : "";

  // Widget overrides
  if (field.widget === "textarea") {
    return (
      <Textarea
        {...formField}
        id={controlId}
        value={formField.value ?? ""}
        placeholder={`Enter ${field.label.toLowerCase()}...`}
        disabled={field.readonly}
        rows={4}
        required={field.required}
        aria-required={field.required || undefined}
        aria-readonly={field.readonly || undefined}
        aria-describedby={describedBy}
        aria-invalid={hasError || undefined}
      />
    );
  }

  if (field.widget === "password") {
    return (
      <Input
        type="password"
        {...formField}
        id={controlId}
        value={formField.value ?? ""}
        placeholder={`Enter ${field.label.toLowerCase()}...`}
        disabled={field.readonly}
        required={field.required}
        aria-required={field.required || undefined}
        aria-readonly={field.readonly || undefined}
        aria-describedby={describedBy}
        aria-invalid={hasError || undefined}
      />
    );
  }

  // Type-based rendering
  switch (field.type) {
    case "string":
    case "text":
      return (
        <Input
          {...formField}
          id={controlId}
          value={formField.value ?? ""}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
          disabled={field.readonly}
          required={field.required}
          aria-required={field.required || undefined}
          aria-readonly={field.readonly || undefined}
          aria-describedby={describedBy}
          aria-invalid={hasError || undefined}
        />
      );

    case "email":
      return (
        <Input
          type="email"
          {...formField}
          id={controlId}
          value={formField.value ?? ""}
          placeholder="example@domain.com"
          disabled={field.readonly}
          required={field.required}
          aria-required={field.required || undefined}
          aria-readonly={field.readonly || undefined}
          aria-describedby={describedBy}
          aria-invalid={hasError || undefined}
        />
      );

    case "url":
      return (
        <Input
          type="url"
          {...formField}
          id={controlId}
          value={formField.value ?? ""}
          placeholder="https://example.com"
          disabled={field.readonly}
          required={field.required}
          aria-required={field.required || undefined}
          aria-readonly={field.readonly || undefined}
          aria-describedby={describedBy}
          aria-invalid={hasError || undefined}
        />
      );

    case "phone":
      return (
        <Input
          type="tel"
          {...formField}
          id={controlId}
          value={formField.value ?? ""}
          placeholder="+1 (555) 123-4567"
          disabled={field.readonly}
          required={field.required}
          aria-required={field.required || undefined}
          aria-readonly={field.readonly || undefined}
          aria-describedby={describedBy}
          aria-invalid={hasError || undefined}
        />
      );

    case "integer":
    case "float":
    case "currency":
      return (
        <Input
          type="number"
          {...formField}
          id={controlId}
          value={formField.value ?? ""}
          placeholder="0"
          disabled={field.readonly}
          required={field.required}
          aria-required={field.required || undefined}
          aria-readonly={field.readonly || undefined}
          aria-describedby={describedBy}
          aria-invalid={hasError || undefined}
          step={field.type === "integer" ? "1" : "0.01"}
          onChange={(e) => {
            const val = e.target.value;
            formField.onChange(val === "" ? null : Number(val));
          }}
        />
      );

    case "boolean":
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={controlId}
            checked={Boolean(formField.value)}
            onCheckedChange={formField.onChange}
            disabled={field.readonly}
            required={field.required}
            aria-required={field.required || undefined}
            aria-readonly={field.readonly || undefined}
            aria-describedby={describedBy}
            aria-invalid={hasError || undefined}
          />
          <label
            htmlFor={controlId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {field.label}
          </label>
        </div>
      );

    case "enum":
      return (
        <Select
          value={formField.value == null || formField.value === "" ? undefined : String(formField.value)}
          onValueChange={(value) => {
            formField.onChange(value === OPTIONAL_ENUM_CLEAR_VALUE ? null : value);
          }}
          disabled={field.readonly}
        >
          <SelectTrigger
            id={controlId}
            aria-required={field.required || undefined}
            aria-readonly={field.readonly || undefined}
            aria-describedby={describedBy}
            aria-invalid={hasError || undefined}
          >
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
          </SelectTrigger>
          <SelectContent>
            {!field.required && (
              <SelectItem value={OPTIONAL_ENUM_CLEAR_VALUE}>- Select -</SelectItem>
            )}
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "date":
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id={controlId}
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !formField.value && "text-muted-foreground"
              )}
              disabled={field.readonly}
              aria-required={field.required || undefined}
              aria-readonly={field.readonly || undefined}
              aria-describedby={describedBy}
              aria-invalid={hasError || undefined}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {parsedValueDate ? (
                format(parsedValueDate, "PPP")
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={parsedValueDate}
              onSelect={updateDatePortion}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      );

    case "datetime":
      return (
        <div className="space-y-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id={controlId}
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formField.value && "text-muted-foreground"
                )}
                disabled={field.readonly}
                aria-required={field.required || undefined}
                aria-readonly={field.readonly || undefined}
                aria-describedby={describedBy}
                aria-invalid={hasError || undefined}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {parsedValueDate ? (
                  format(parsedValueDate, "PPP p")
                ) : (
                  <span>Pick a date & time</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parsedValueDate}
                onSelect={updateDatePortion}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Input
            id={`${controlId}-time`}
            type="time"
            value={timeValue}
            onChange={(e) => updateTimePortion(e.target.value)}
            disabled={field.readonly}
            required={field.required}
            aria-label={`${field.label} time`}
            aria-required={field.required || undefined}
            aria-readonly={field.readonly || undefined}
            aria-describedby={describedBy}
            aria-invalid={hasError || undefined}
          />
        </div>
      );

    case "many2one":
      // TODO: Implement relation field with search/autocomplete
      return (
        <Input
          {...formField}
          id={controlId}
          value={formField.value ?? ""}
          placeholder={`Select ${field.label.toLowerCase()}...`}
          disabled={field.readonly}
          required={field.required}
          aria-required={field.required || undefined}
          aria-readonly={field.readonly || undefined}
          aria-describedby={describedBy}
          aria-invalid={hasError || undefined}
        />
      );

    case "one2many":
      // TODO: Implement nested table/dialog editor
      return (
        <div className="text-sm text-muted-foreground">
          One2Many editor (coming soon)
        </div>
      );

    default:
      return (
        <Input
          {...formField}
          id={controlId}
          value={formField.value ?? ""}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
          disabled={field.readonly}
          required={field.required}
          aria-required={field.required || undefined}
          aria-readonly={field.readonly || undefined}
          aria-describedby={describedBy}
          aria-invalid={hasError || undefined}
        />
      );
  }
}
