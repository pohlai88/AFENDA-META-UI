/**
 * Tags Field Component
 * ====================
 * Multi-value tag input with create/delete functionality.
 * 
 * Features:
 * - Add tags by typing and pressing Enter
 * - Remove tags by clicking X
 * - Badge-based UI
 * - Comma-separated input support
 * - Duplicate prevention
 */

import React, { useState, useCallback, useRef } from "react";
import { Input } from "~/components/ui/input";
import { Badge } from "@afenda/ui";
import { X } from "lucide-react";
import type { RendererFieldProps } from "./index";
import { FieldWrapper } from "./FieldWrapper";

export function TagsField({ field, value, onChange, readonly }: RendererFieldProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Normalize value to array of strings
  const tags = React.useMemo(() => {
    if (Array.isArray(value)) {
      return value.filter((v): v is string => typeof v === "string");
    }
    if (typeof value === "string" && value.length > 0) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return value.split(",").map((t) => t.trim()).filter(Boolean);
      }
    }
    return [];
  }, [value]);

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim();
      if (!trimmed) return;
      
      // Prevent duplicates
      if (tags.includes(trimmed)) {
        setInputValue("");
        return;
      }

      onChange?.([...tags, trimmed]);
      setInputValue("");
    },
    [tags, onChange]
  );

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange?.(tags.filter((t) => t !== tagToRemove));
    },
    [tags, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTag(inputValue);
      } else if (e.key === "," || e.key === "Tab") {
        e.preventDefault();
        addTag(inputValue);
      } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
        // Remove last tag when backspace is pressed on empty input
        removeTag(tags[tags.length - 1]!);
      }
    },
    [inputValue, tags, addTag, removeTag]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const paste = e.clipboardData.getData("text");
      
      // If paste contains commas, split and add multiple tags
      if (paste.includes(",")) {
        e.preventDefault();
        const newTags = paste
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t && !tags.includes(t));
        
        if (newTags.length > 0) {
          onChange?.([...tags, ...newTags]);
        }
        setInputValue("");
      }
    },
    [tags, onChange]
  );

  if (readonly) {
    return (
      <FieldWrapper field={field}>
        <div className="flex flex-wrap gap-1.5">
          {tags.length === 0 ? (
            <span className="text-sm text-muted-foreground">—</span>
          ) : (
            tags.map((tag, index) => (
              <Badge key={`${tag}-${index}`} variant="secondary">
                {tag}
              </Badge>
            ))
          )}
        </div>
      </FieldWrapper>
    );
  }

  return (
    <FieldWrapper field={field}>
      <div
        className="min-h-[2.5rem] p-1.5 border rounded-md flex flex-wrap gap-1.5 items-center cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, index) => (
          <Badge key={`${tag}-${index}`} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:bg-muted rounded-sm"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={tags.length === 0 ? "Type and press Enter..." : ""}
          className="flex-1 min-w-[120px] border-0 shadow-none focus-visible:ring-0 px-1 h-6"
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Press Enter, Tab, or comma to add tags
      </p>
    </FieldWrapper>
  );
}
