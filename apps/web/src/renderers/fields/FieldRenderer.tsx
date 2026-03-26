import React from "react";
import type { DiscriminatedFieldProps } from "./index.js";
import { StringField } from "./StringField.js";
import { BooleanField } from "./BooleanField.js";
import { EnumField } from "./EnumField.js";
import { DateField } from "./DateField.js";
import { RelationField } from "./RelationField.js";
import { One2ManyField } from "./One2ManyField.js";
import { CurrencyField } from "./CurrencyField.js";
import { TagsField } from "./TagsField.js";
import { JsonField } from "./JsonField.js";
import { ColorField } from "./ColorField.js";
import { RatingField } from "./RatingField.js";
import { FileField } from "./FileField.js";
import { ImageField } from "./ImageField.js";
import { PhoneField } from "./PhoneField.js";
import { AddressField } from "./AddressField.js";
import { SignatureField } from "./SignatureField.js";

type FieldWidgetComponent = React.ComponentType<DiscriminatedFieldProps>;

const widgetRegistry = new Map<string, FieldWidgetComponent>();

export function registerWidget(name: string, component: FieldWidgetComponent): void {
  widgetRegistry.set(name, component);
}

export function unregisterWidget(name: string): void {
  widgetRegistry.delete(name);
}

export function FieldRenderer(props: DiscriminatedFieldProps) {
  const { field, value, onChange, readonly = false, invalid } = props;

  if (field.widget) {
    const customWidget = widgetRegistry.get(field.widget);
    if (customWidget) {
      return React.createElement(customWidget, props);
    }
  }

  // Widget hint overrides for textual fields.
  if (field.widget === "textarea") {
    return (
      <StringField
        field={field}
        value={value}
        onChange={(next) => onChange?.(next as never)}
        readonly={readonly}
        multiline
      />
    );
  }

  if (field.widget === "password") {
    return (
      <StringField
        field={field}
        value={value}
        onChange={(next) => onChange?.(next as never)}
        readonly={readonly}
        password
      />
    );
  }

  switch (field.type) {
    case "string":
    case "text":
    case "email":
    case "url":
      return (
        <StringField
          field={field}
          value={value}
          onChange={(next) => onChange?.(next as never)}
          readonly={readonly}
          type={field.type}
        />
      );

    case "phone":
      return (
        <PhoneField
          field={field}
          value={value}
          onChange={(next) => onChange?.(next as never)}
          readonly={readonly}
        />
      );

    case "address":
      return (
        <AddressField
          field={field}
          value={value}
          onChange={(next) => onChange?.(next as never)}
          readonly={readonly}
        />
      );

    case "signature":
      return (
        <SignatureField
          field={field}
          value={value}
          onChange={(next) => onChange?.(next as never)}
          readonly={readonly}
        />
      );

    case "integer":
    case "float":
      return (
        <StringField
          field={field}
          value={value}
          onChange={(next) => onChange?.(next as never)}
          readonly={readonly}
          type="number"
        />
      );

    case "currency":
      return (
        <CurrencyField
          field={field}
          value={value}
          onChange={(next) => onChange?.(next as never)}
          readonly={readonly}
        />
      );

    case "tags":
      return (
        <TagsField
          field={field}
          value={value}
          onChange={(next) => onChange?.(next as never)}
          readonly={readonly}
        />
      );

    case "json":
      return (
        <JsonField
          field={field}
          value={value}
          onChange={(next) => onChange?.(next as never)}
          readonly={readonly}
        />
      );

    case "color":
      return (
        <ColorField
          field={field}
          value={value}
          onChange={(next) => onChange?.(next as never)}
          readonly={readonly}
        />
      );

    case "rating":
      return (
        <RatingField
          field={field}
          value={value}
          onChange={(next) => onChange?.(next as never)}
          readonly={readonly}
        />
      );

    case "file":
      return (
        <FileField
          field={field}
          value={value}
          onChange={(next) => onChange?.(next as never)}
          readonly={readonly}
        />
      );

    case "image":
      return (
        <ImageField
          field={field}
          value={value}
          onChange={(next) => onChange?.(next as never)}
          readonly={readonly}
        />
      );

    case "boolean":
      return (
        <BooleanField
          field={field}
          value={typeof value === "boolean" ? value : Boolean(value)}
          onChange={(checked) => onChange?.(checked as never)}
          readonly={readonly}
        />
      );

    case "enum":
      return (
        <EnumField
          field={field}
          value={value}
          onChange={(next) => onChange?.(next as never)}
          readonly={readonly}
          invalid={invalid}
        />
      );

    case "date":
      return (
        <DateField
          field={field}
          value={value}
          onChange={(next) => onChange?.(next as never)}
          readonly={readonly}
          dateOnly
        />
      );

    case "datetime":
      return (
        <DateField
          field={field}
          value={value}
          onChange={(next) => onChange?.(next as never)}
          readonly={readonly}
        />
      );

    case "many2one":
      return (
        <RelationField
          field={field}
          value={value}
          onChange={(next) => onChange?.(next as never)}
          readonly={readonly}
        />
      );

    case "one2many":
      return (
        <One2ManyField
          field={field}
          value={value}
          onChange={(next) => onChange?.(next as never)}
          readonly={readonly}
        />
      );

    default:
      return (
        <StringField
          field={field}
          value={value}
          onChange={(next) => onChange?.(next as never)}
          readonly={readonly}
        />
      );
  }
}
