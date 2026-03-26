import React from "react";
import type { RendererFieldProps } from "./index.js";
import { FieldWrapper } from "./FieldWrapper.js";

type AddressValue = {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

function normalizeAddress(value: unknown): AddressValue {
  if (typeof value === "string" && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value) as AddressValue;
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return { street: value };
    }
  }

  if (typeof value === "object" && value !== null) {
    return value as AddressValue;
  }

  return {};
}

export function AddressField({ field, value, onChange, readonly }: RendererFieldProps) {
  const address = normalizeAddress(value);

  const setPart = (key: keyof AddressValue, nextValue: string) => {
    onChange?.({ ...address, [key]: nextValue });
  };

  return (
    <FieldWrapper field={field} required={field.required}>
      <div style={gridStyle}>
        <input
          type="text"
          placeholder="Street"
          value={address.street ?? ""}
          onChange={(event) => setPart("street", event.target.value)}
          disabled={readonly}
          style={inputStyle(readonly)}
        />
        <input
          type="text"
          placeholder="City"
          value={address.city ?? ""}
          onChange={(event) => setPart("city", event.target.value)}
          disabled={readonly}
          style={inputStyle(readonly)}
        />
        <input
          type="text"
          placeholder="State / Province"
          value={address.state ?? ""}
          onChange={(event) => setPart("state", event.target.value)}
          disabled={readonly}
          style={inputStyle(readonly)}
        />
        <input
          type="text"
          placeholder="Postal code"
          value={address.postalCode ?? ""}
          onChange={(event) => setPart("postalCode", event.target.value)}
          disabled={readonly}
          style={inputStyle(readonly)}
        />
        <input
          type="text"
          placeholder="Country"
          value={address.country ?? ""}
          onChange={(event) => setPart("country", event.target.value)}
          disabled={readonly}
          style={inputStyle(readonly)}
        />
      </div>
    </FieldWrapper>
  );
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gap: "0.5rem",
};

function inputStyle(readonly: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "0.4rem 0.6rem",
    border: `1px solid ${readonly ? "#e0e0e0" : "#ccc"}`,
    borderRadius: 4,
    fontSize: "0.9rem",
    background: readonly ? "#f8f8f8" : "#fff",
    color: readonly ? "#666" : undefined,
    boxSizing: "border-box",
  };
}
