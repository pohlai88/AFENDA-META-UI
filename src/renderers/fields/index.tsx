/**
 * Field component dispatcher
 * ==========================
 * Picks the right input component for a MetaField based on:
 *   1. field.widget (explicit override - takes priority)
 *   2. field.type (default mapping)
 *
 * All field components share the same FieldProps interface so they are
 * trivially swappable.
 */

import React from "react";
import type { MetaField } from "@afenda/meta-types";
import { StringField } from "./StringField.js";
import { BooleanField } from "./BooleanField.js";
import { EnumField } from "./EnumField.js";
import { DateField } from "./DateField.js";
import { RelationField } from "./RelationField.js";
import { One2ManyField } from "./One2ManyField.js";

export interface FieldProps {
  field: MetaField;
  value: unknown;
  onChange?: (val: unknown) => void;
  readonly: boolean;
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function FieldDispatcher(props: FieldProps) {
  const { field } = props;
  const widget = field.widget;

  // Widget hint overrides
  if (widget === "textarea") return <StringField {...props} multiline />;
  if (widget === "password") return <StringField {...props} password />;

  // Type-based dispatch
  switch (field.type) {
    case "string":
    case "text":
    case "email":
    case "url":
    case "phone":
      return <StringField {...props} type={field.type} />;

    case "integer":
    case "float":
    case "currency":
      return <StringField {...props} type="number" />;

    case "boolean":
      return <BooleanField {...props} />;

    case "enum":
      return <EnumField {...props} />;

    case "date":
      return <DateField {...props} dateOnly />;

    case "datetime":
      return <DateField {...props} />;

    case "many2one":
      return <RelationField {...props} />;

    case "one2many":
      return <One2ManyField {...props} />;

    default:
      return <StringField {...props} />;
  }
}

// Re-export all field components for direct use
export { StringField, BooleanField, EnumField, DateField, RelationField, One2ManyField };
