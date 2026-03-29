import React from "react";
import type { MetaField } from "@afenda/meta-types/schema";
import { cn } from "~/lib/utils";

export function getFieldHelpTextId(fieldName: string) {
  return `${fieldName}-help`;
}

export function FieldWrapper({
  field,
  required,
  htmlFor,
  className,
  children,
}: {
  field: MetaField;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const isBooleanField = field.type === "boolean";
  const isRequired = required ?? field.required;
  const helpTextId = field.help_text ? getFieldHelpTextId(field.name) : undefined;

  return (
    <div className={cn("mb-4", className)}>
      {!isBooleanField ? (
        <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-foreground">
          {field.label}
          {isRequired ? <span className="text-destructive"> *</span> : null}
        </label>
      ) : (
        <label htmlFor={htmlFor} className="sr-only">
          {field.label}
        </label>
      )}
      {children}
      {field.help_text && (
        <div id={helpTextId} className="mt-1 text-xs text-muted-foreground">
          {field.help_text}
        </div>
      )}
    </div>
  );
}
