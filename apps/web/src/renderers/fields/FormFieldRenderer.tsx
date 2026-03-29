/**
 * FormFieldRenderer
 * =================
 * Wraps field components with react-hook-form Controller + shadcn Form components
 */

import React, { memo } from "react";
import { useFormContext, type ControllerRenderProps } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import type { MetaField } from "@afenda/meta-types/schema";
import { useComputedFieldState } from "../conditions";
import { useDebounce } from "~/hooks/useDebounce";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@afenda/ui";
import { Calendar } from "@afenda/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@afenda/ui";
import { Button } from "@afenda/ui";
import { Badge } from "@afenda/ui";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { One2ManyField } from "./One2ManyField";
import {
  CalendarIcon,
  StarIcon,
  X,
  BoldIcon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  LinkIcon,
  Undo2Icon,
  Redo2Icon,
  CheckIcon,
  ChevronsUpDownIcon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "~/lib/utils";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

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
          <FormLabel
            htmlFor={controlId}
            className={field.type === "boolean" ? "sr-only" : undefined}
          >
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

    case "currency":
      return (
        <CurrencyInput
          id={controlId}
          value={formField.value as number | null}
          onChange={formField.onChange}
          disabled={field.readonly}
          required={field.required}
          describedBy={describedBy}
          hasError={hasError}
        />
      );

    case "tags":
      return (
        <TagsInput
          id={controlId}
          value={formField.value}
          onChange={formField.onChange}
          disabled={field.readonly}
          required={field.required}
          describedBy={describedBy}
          label={field.label}
        />
      );

    case "json":
      return (
        <JsonInput
          id={controlId}
          value={formField.value}
          onChange={formField.onChange}
          disabled={field.readonly}
          required={field.required}
          describedBy={describedBy}
          hasError={hasError}
        />
      );

    case "color":
      return (
        <ColorInput
          id={controlId}
          value={formField.value as string}
          onChange={formField.onChange}
          disabled={field.readonly}
          required={field.required}
          describedBy={describedBy}
        />
      );

    case "rating":
      return (
        <RatingInput
          id={controlId}
          value={formField.value as number}
          onChange={formField.onChange}
          disabled={field.readonly}
          required={field.required}
          describedBy={describedBy}
        />
      );

    case "richtext":
      return (
        <RichTextInput
          id={controlId}
          value={formField.value as string}
          onChange={formField.onChange}
          disabled={field.readonly}
          placeholder={`Enter ${field.label.toLowerCase()}...`}
          describedBy={describedBy}
          hasError={hasError}
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
          value={
            formField.value == null || formField.value === "" ? undefined : String(formField.value)
          }
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
              {parsedValueDate ? format(parsedValueDate, "PPP") : <span>Pick a date</span>}
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
      return (
        <ManyToOneInput
          field={field}
          id={controlId}
          value={formField.value}
          onChange={formField.onChange}
          disabled={field.readonly}
          required={field.required}
          describedBy={describedBy}
          hasError={hasError}
        />
      );

    case "many2many":
      return (
        <ManyToManyInput
          field={field}
          id={controlId}
          value={formField.value}
          onChange={formField.onChange}
          disabled={field.readonly}
          required={field.required}
          describedBy={describedBy}
          hasError={hasError}
        />
      );

    case "file":
      return (
        <FileUploadInput
          id={controlId}
          value={formField.value}
          onChange={formField.onChange}
          disabled={field.readonly}
          required={field.required}
          describedBy={describedBy}
          hasError={hasError}
        />
      );

    case "image":
      return (
        <ImageUploadInput
          id={controlId}
          label={field.label}
          value={formField.value}
          onChange={formField.onChange}
          disabled={field.readonly}
          required={field.required}
          describedBy={describedBy}
          hasError={hasError}
        />
      );

    case "one2many":
      return (
        <One2ManyField
          field={field}
          value={formField.value}
          onChange={formField.onChange}
          readonly={Boolean(field.readonly)}
          invalid={hasError}
          embedded
        />
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

// ---------------------------------------------------------------------------
// Inline input sub-components (no FieldWrapper — labels handled by FormItem)
// ---------------------------------------------------------------------------

function RichTextInput({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  describedBy,
  hasError,
}: {
  id: string;
  value: string | undefined;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  describedBy?: string;
  hasError?: boolean;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder ?? "Enter text..." }),
    ],
    content: value ?? "",
    editable: !disabled,
    onUpdate({ editor: e }) {
      onChange(e.getHTML());
    },
  });

  const addLink = () => {
    if (!editor) return;
    const url = window.prompt("Enter URL");
    if (url) editor.chain().focus().toggleLink({ href: url }).run();
  };

  if (disabled) {
    return (
      <div
        id={id}
        className={cn(
          "prose prose-sm max-w-none p-3 rounded-md bg-muted min-h-[4rem]",
          hasError && "border border-destructive"
        )}
        dangerouslySetInnerHTML={{ __html: value ?? "" }}
        aria-describedby={describedBy}
        aria-readonly="true"
      />
    );
  }

  const btn = (
    onClick: () => void,
    title: string,
    active: boolean | undefined,
    icon: React.ReactNode
  ) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      aria-pressed={active}
      className={cn(
        "p-1.5 rounded text-sm hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring",
        active ? "bg-muted text-foreground" : "text-muted-foreground"
      )}
    >
      {icon}
    </button>
  );

  return (
    <div
      className={cn(
        "rounded-md border focus-within:ring-2 focus-within:ring-ring overflow-hidden",
        hasError && "border-destructive"
      )}
      aria-describedby={describedBy}
      aria-invalid={hasError || undefined}
    >
      <div className="flex items-center gap-0.5 p-1 border-b bg-muted/30">
        {btn(
          () => editor?.chain().focus().toggleBold().run(),
          "Bold",
          editor?.isActive("bold"),
          <BoldIcon className="h-4 w-4" />
        )}
        {btn(
          () => editor?.chain().focus().toggleItalic().run(),
          "Italic",
          editor?.isActive("italic"),
          <ItalicIcon className="h-4 w-4" />
        )}
        <div className="w-px h-4 bg-border mx-1" />
        {btn(
          () => editor?.chain().focus().toggleBulletList().run(),
          "Bullet List",
          editor?.isActive("bulletList"),
          <ListIcon className="h-4 w-4" />
        )}
        {btn(
          () => editor?.chain().focus().toggleOrderedList().run(),
          "Numbered List",
          editor?.isActive("orderedList"),
          <ListOrderedIcon className="h-4 w-4" />
        )}
        <div className="w-px h-4 bg-border mx-1" />
        {btn(addLink, "Insert Link", editor?.isActive("link"), <LinkIcon className="h-4 w-4" />)}
        <div className="flex-1" />
        {btn(
          () => editor?.chain().focus().undo().run(),
          "Undo",
          false,
          <Undo2Icon className="h-4 w-4" />
        )}
        {btn(
          () => editor?.chain().focus().redo().run(),
          "Redo",
          false,
          <Redo2Icon className="h-4 w-4" />
        )}
      </div>
      <EditorContent
        id={id}
        editor={editor}
        className="prose prose-sm max-w-none p-3 min-h-[8rem] [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[7rem]"
      />
    </div>
  );
}

function CurrencyInput({
  id,
  value,
  onChange,
  disabled,
  required,
  describedBy,
  hasError,
}: {
  id: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  disabled?: boolean;
  required?: boolean;
  describedBy?: string;
  hasError?: boolean;
}) {
  const [focused, setFocused] = React.useState(false);
  const numericValue = typeof value === "number" ? value : null;
  const displayValue = focused
    ? (numericValue?.toString() ?? "")
    : numericValue != null
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(numericValue)
      : "";
  return (
    <Input
      id={id}
      type="number"
      value={focused ? (numericValue?.toString() ?? "") : displayValue}
      onChange={(e) => onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder="0.00"
      disabled={disabled}
      required={required}
      step="0.01"
      aria-required={required || undefined}
      aria-readonly={disabled || undefined}
      aria-describedby={describedBy}
      aria-invalid={hasError || undefined}
    />
  );
}

function TagsInput({
  id,
  value,
  onChange,
  disabled,
  required,
  describedBy,
  label,
}: {
  id: string;
  value: unknown;
  onChange: (v: string[]) => void;
  disabled?: boolean;
  required?: boolean;
  describedBy?: string;
  label?: string;
}) {
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const tags: string[] = React.useMemo(() => {
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
    if (typeof value === "string" && value) {
      try {
        return JSON.parse(value) as string[];
      } catch {
        return value
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }
    return [];
  }, [value]);

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (!t || tags.includes(t)) {
      setInputValue("");
      return;
    }
    onChange([...tags, t]);
    setInputValue("");
  };

  const removeTag = (t: string) => onChange(tags.filter((tag) => tag !== t));

  if (disabled) {
    return (
      <div
        id={id}
        className="flex flex-wrap gap-1.5 py-2"
        aria-required={required || undefined}
        aria-describedby={describedBy}
      >
        {tags.length === 0 ? (
          <span className="text-sm text-muted-foreground">—</span>
        ) : (
          tags.map((t, i) => (
            <Badge key={`${t}-${i}`} variant="secondary">
              {t}
            </Badge>
          ))
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        className="min-h-[2.5rem] p-1.5 border rounded-md flex flex-wrap gap-1.5 items-center cursor-text focus-within:ring-1 focus-within:ring-ring"
        onClick={() => inputRef.current?.focus()}
        aria-required={required || undefined}
        aria-describedby={describedBy}
      >
        {tags.map((t, i) => (
          <Badge key={`${t}-${i}`} variant="secondary" className="gap-1">
            {t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              className="hover:bg-muted rounded-sm"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
              e.preventDefault();
              addTag(inputValue);
            } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0)
              removeTag(tags[tags.length - 1]!);
          }}
          onPaste={(e) => {
            const paste = e.clipboardData.getData("text");
            if (paste.includes(",")) {
              e.preventDefault();
              const newTags = paste
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t && !tags.includes(t));
              if (newTags.length > 0) onChange([...tags, ...newTags]);
              setInputValue("");
            }
          }}
          placeholder={tags.length === 0 ? `Add ${label?.toLowerCase() ?? "tag"}...` : ""}
          className="flex-1 min-w-[120px] border-0 shadow-none outline-none bg-transparent text-sm px-1 h-6"
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">Press Enter, Tab, or comma to add</p>
    </div>
  );
}

function JsonInput({
  id,
  value,
  onChange,
  disabled,
  required,
  describedBy,
  hasError,
}: {
  id: string;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
  required?: boolean;
  describedBy?: string;
  hasError?: boolean;
}) {
  const [rawText, setRawText] = React.useState(() => {
    try {
      return value != null ? JSON.stringify(value, null, 2) : "";
    } catch {
      return "";
    }
  });
  const [parseError, setParseError] = React.useState<string | null>(null);

  const handleChange = (text: string) => {
    setRawText(text);
    if (text.trim() === "") {
      setParseError(null);
      onChange(null);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      setParseError(null);
      onChange(parsed);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  return (
    <div>
      <Textarea
        id={id}
        value={rawText}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="{}"
        disabled={disabled}
        rows={5}
        className={cn("font-mono text-sm", parseError && "border-destructive")}
        required={required}
        aria-required={required || undefined}
        aria-readonly={disabled || undefined}
        aria-describedby={describedBy}
        aria-invalid={hasError || !!parseError || undefined}
      />
      {parseError && <p className="text-xs text-destructive mt-1">{parseError}</p>}
    </div>
  );
}

function ColorInput({
  id,
  value,
  onChange,
  disabled,
  required,
  describedBy,
}: {
  id: string;
  value: string | undefined;
  onChange: (v: string) => void;
  disabled?: boolean;
  required?: boolean;
  describedBy?: string;
}) {
  const color = value ?? "#000000";
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        aria-required={required || undefined}
        aria-readonly={disabled || undefined}
        aria-describedby={describedBy}
        className="w-10 h-10 rounded border cursor-pointer disabled:cursor-not-allowed"
      />
      <Input
        value={color}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        disabled={disabled}
        className="w-32 font-mono text-sm"
        aria-label="Hex color value"
      />
    </div>
  );
}

function RatingInput({
  id,
  value,
  onChange,
  disabled,
  required,
  describedBy,
}: {
  id: string;
  value: number | undefined;
  onChange: (v: number) => void;
  disabled?: boolean;
  required?: boolean;
  describedBy?: string;
}) {
  const max = 5;
  const current = typeof value === "number" ? value : 0;
  return (
    <div
      id={id}
      className="flex gap-1"
      role="radiogroup"
      aria-required={required || undefined}
      aria-describedby={describedBy}
    >
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !disabled && onChange(star)}
          disabled={disabled}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
          aria-pressed={current >= star}
          className={cn(
            "p-0.5 rounded transition-colors",
            !disabled && "hover:text-yellow-400 cursor-pointer",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          <StarIcon
            className={cn(
              "h-6 w-6",
              current >= star ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  );
}

type RelationRecord = Record<string, unknown>;

function relationValueEquals(a: unknown, b: unknown): boolean {
  if (a == null || b == null) {
    return a == null && b == null;
  }
  return String(a) === String(b);
}

function useRelationOptions(field: MetaField, search: string, rawValue?: unknown) {
  const relation = field.relation;
  const valueField = relation?.value_field ?? "id";
  const debouncedSearch = useDebounce(search, 250);
  const currentValues = React.useMemo(() => {
    if (Array.isArray(rawValue)) {
      return rawValue.filter(
        (item): item is string | number => typeof item === "string" || typeof item === "number"
      );
    }
    if (typeof rawValue === "string" || typeof rawValue === "number") {
      return [rawValue];
    }
    return [];
  }, [rawValue]);

  const listQuery = useQuery({
    queryKey: ["relation-options", relation?.model ?? "", debouncedSearch],
    enabled: Boolean(relation?.model),
    staleTime: 30_000,
    queryFn: async (): Promise<RelationRecord[]> => {
      if (!relation?.model) {
        return [];
      }

      const params = new URLSearchParams({ limit: "20" });
      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }

      const response = await fetch(`/api/${relation.model}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${relation.model} options`);
      }

      const payload = (await response.json()) as { data?: RelationRecord[] };
      return payload.data ?? [];
    },
  });

  const selectedQuery = useQuery({
    queryKey: ["relation-selected", relation?.model ?? "", ...currentValues.map(String)],
    enabled: Boolean(relation?.model) && currentValues.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<RelationRecord[]> => {
      if (!relation?.model || currentValues.length === 0) {
        return [];
      }

      const records = await Promise.all(
        currentValues.map(async (value) => {
          const response = await fetch(`/api/${relation.model}/${value}`);
          if (!response.ok) {
            return null;
          }
          const payload = (await response.json()) as { data?: RelationRecord };
          return payload.data ?? null;
        })
      );

      return records.filter((record): record is RelationRecord => Boolean(record));
    },
  });

  const options = React.useMemo(() => {
    const merged = new Map<string, RelationRecord>();
    for (const record of [...(selectedQuery.data ?? []), ...(listQuery.data ?? [])]) {
      const key = String(record[valueField] ?? "");
      if (key) {
        merged.set(key, record);
      }
    }
    return Array.from(merged.values());
  }, [listQuery.data, selectedQuery.data, valueField]);

  return {
    options,
    isLoading: listQuery.isLoading || selectedQuery.isLoading,
    error: listQuery.error ?? selectedQuery.error,
  };
}

function getRelationRecordLabel(
  field: MetaField,
  record: RelationRecord | undefined,
  fallback?: unknown
) {
  if (!record) {
    return fallback == null || fallback === "" ? "" : String(fallback);
  }

  const displayField = field.relation?.display_field ?? "name";
  const valueField = field.relation?.value_field ?? "id";
  return String(record[displayField] ?? record[valueField] ?? fallback ?? "");
}

function ManyToOneInput({
  field,
  id,
  value,
  onChange,
  disabled,
  required,
  describedBy,
  hasError,
}: {
  field: MetaField;
  id: string;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  required?: boolean;
  describedBy?: string;
  hasError?: boolean;
}) {
  const relation = field.relation;
  const valueField = relation?.value_field ?? "id";
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const { options, isLoading } = useRelationOptions(field, search, value);
  const selected = React.useMemo(
    () => options.find((record) => relationValueEquals(record[valueField], value)),
    [options, value, valueField]
  );
  const selectedLabel = getRelationRecordLabel(field, selected, value);

  if (!relation) {
    return <div className="text-sm text-destructive">Missing relation config</div>;
  }

  if (disabled) {
    return (
      <div
        id={id}
        className={cn(
          "min-h-10 rounded-md border bg-muted px-3 py-2 text-sm",
          hasError && "border-destructive"
        )}
        aria-describedby={describedBy}
        aria-readonly="true"
      >
        {selectedLabel || "-"}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between font-normal",
            !selectedLabel && "text-muted-foreground",
            hasError && "border-destructive"
          )}
          aria-required={required || undefined}
          aria-describedby={describedBy}
          aria-invalid={hasError || undefined}
        >
          <span className="truncate">
            {selectedLabel || `Select ${field.label.toLowerCase()}...`}
          </span>
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={`Search ${relation.model}...`}
          />
          <CommandList>
            <CommandEmpty>{isLoading ? "Loading..." : "No results found."}</CommandEmpty>
            <CommandGroup>
              {!required && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange(null);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  Clear selection
                </CommandItem>
              )}
              {options.map((record) => {
                const optionValue = record[valueField];
                const optionLabel = getRelationRecordLabel(field, record, optionValue);
                const checked = relationValueEquals(optionValue, value);
                return (
                  <CommandItem
                    key={String(optionValue)}
                    value={`${optionLabel} ${String(optionValue ?? "")}`}
                    onSelect={() => {
                      onChange(optionValue ?? null);
                      setSearch("");
                      setOpen(false);
                    }}
                    data-checked={checked}
                  >
                    <span className="truncate">{optionLabel}</span>
                    {checked && <CheckIcon className="ml-auto h-4 w-4" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ManyToManyInput({
  field,
  id,
  value,
  onChange,
  disabled,
  required,
  describedBy,
  hasError,
}: {
  field: MetaField;
  id: string;
  value: unknown;
  onChange: (value: unknown[]) => void;
  disabled?: boolean;
  required?: boolean;
  describedBy?: string;
  hasError?: boolean;
}) {
  const relation = field.relation;
  const valueField = relation?.value_field ?? "id";
  const selectedValues = React.useMemo(
    () =>
      (Array.isArray(value) ? value : []).filter(
        (item): item is string | number => typeof item === "string" || typeof item === "number"
      ),
    [value]
  );
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const { options, isLoading } = useRelationOptions(field, search, selectedValues);
  const selectedRecords = React.useMemo(
    () =>
      options.filter((record) =>
        selectedValues.some((selectedValue) =>
          relationValueEquals(selectedValue, record[valueField])
        )
      ),
    [options, selectedValues, valueField]
  );

  if (!relation) {
    return <div className="text-sm text-destructive">Missing relation config</div>;
  }

  const toggleValue = (nextValue: string | number | null | undefined) => {
    if (nextValue == null) {
      return;
    }
    const exists = selectedValues.some((selectedValue) =>
      relationValueEquals(selectedValue, nextValue)
    );
    onChange(
      exists
        ? selectedValues.filter((item) => !relationValueEquals(item, nextValue))
        : [...selectedValues, nextValue]
    );
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal",
              selectedValues.length === 0 && "text-muted-foreground",
              hasError && "border-destructive"
            )}
            aria-required={required || undefined}
            aria-describedby={describedBy}
            aria-invalid={hasError || undefined}
          >
            <span className="truncate">
              {selectedValues.length > 0
                ? `${selectedValues.length} selected`
                : `Select ${field.label.toLowerCase()}...`}
            </span>
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder={`Search ${relation.model}...`}
            />
            <CommandList>
              <CommandEmpty>{isLoading ? "Loading..." : "No results found."}</CommandEmpty>
              <CommandGroup>
                {options.map((record) => {
                  const optionValue = record[valueField] as string | number | undefined;
                  const optionLabel = getRelationRecordLabel(field, record, optionValue);
                  const checked = optionValue != null && selectedValues.includes(optionValue);
                  return (
                    <CommandItem
                      key={String(optionValue)}
                      value={`${optionLabel} ${String(optionValue ?? "")}`}
                      onSelect={() => toggleValue(optionValue)}
                      data-checked={checked}
                    >
                      <span className="truncate">{optionLabel}</span>
                      {checked && <CheckIcon className="ml-auto h-4 w-4" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedValues.map((selectedValue) => {
            const selectedRecord = selectedRecords.find(
              (record) => record[valueField] === selectedValue
            );
            const label = getRelationRecordLabel(field, selectedRecord, selectedValue);
            return (
              <Badge key={String(selectedValue)} variant="secondary" className="gap-1">
                {label}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => toggleValue(selectedValue)}
                    className="rounded-sm hover:bg-muted"
                    aria-label={`Remove ${label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

type UploadedAsset = {
  url: string;
};

function isFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function getFileName(value: unknown): string {
  if (isFile(value)) {
    return value.name;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    const parts = trimmed.split("/");
    return parts[parts.length - 1] ?? trimmed;
  }
  return "";
}

async function uploadAsset(file: File, kind: "file" | "image"): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/uploads?kind=${kind}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload ${kind}`);
  }

  const payload = (await response.json()) as UploadedAsset;
  return payload.url;
}

function FileUploadInput({
  id,
  value,
  onChange,
  disabled,
  required,
  describedBy,
  hasError,
}: {
  id: string;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  required?: boolean;
  describedBy?: string;
  hasError?: boolean;
}) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileName = getFileName(value);

  const handleFileSelect = async (file: File | null) => {
    if (!file) {
      onChange(null);
      setUploadError(null);
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const uploadedUrl = await uploadAsset(file, "file");
      onChange(uploadedUrl);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Input
        id={id}
        type="file"
        disabled={disabled || isUploading}
        required={required}
        aria-required={required || undefined}
        aria-readonly={disabled || undefined}
        aria-describedby={describedBy}
        aria-invalid={hasError || undefined}
        onChange={(event) => {
          const selectedFile = event.target.files?.[0] ?? null;
          void handleFileSelect(selectedFile);
        }}
      />
      {isUploading && <p className="text-xs text-muted-foreground">Uploading file...</p>}
      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
      {fileName && (
        <div className="flex items-center gap-2 text-sm">
          {typeof value === "string" ? (
            <a href={value} target="_blank" rel="noreferrer" className="text-primary underline">
              {fileName}
            </a>
          ) : (
            <span className="text-muted-foreground truncate">{fileName}</span>
          )}
          {!disabled && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ImageUploadInput({
  id,
  label,
  value,
  onChange,
  disabled,
  required,
  describedBy,
  hasError,
}: {
  id: string;
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  required?: boolean;
  describedBy?: string;
  hasError?: boolean;
}) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof value === "string" && value.trim()) {
      setLocalPreviewUrl(value);
      return;
    }

    if (isFile(value)) {
      const objectUrl = URL.createObjectURL(value);
      setLocalPreviewUrl(objectUrl);
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }

    setLocalPreviewUrl(null);
  }, [value]);

  const handleFileSelect = async (file: File | null) => {
    if (!file) {
      onChange(null);
      setUploadError(null);
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const uploadedUrl = await uploadAsset(file, "image");
      onChange(uploadedUrl);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Input
        id={id}
        type="file"
        accept="image/*"
        disabled={disabled || isUploading}
        required={required}
        aria-required={required || undefined}
        aria-readonly={disabled || undefined}
        aria-describedby={describedBy}
        aria-invalid={hasError || undefined}
        onChange={(event) => {
          const selectedFile = event.target.files?.[0] ?? null;
          void handleFileSelect(selectedFile);
        }}
      />
      {isUploading && <p className="text-xs text-muted-foreground">Uploading image...</p>}
      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
      {localPreviewUrl && (
        <div className="space-y-2">
          <img src={localPreviewUrl} alt={label} className="h-24 w-24 rounded-md border object-cover" />
          {!disabled && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
