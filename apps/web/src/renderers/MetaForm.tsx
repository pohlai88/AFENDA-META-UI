/**
 * MetaForm
 * ========
 * Renders a ModelMeta form view.
 *
 * Rendering strategy:
 *  • Walk MetaFormView.groups → MetaGroup
 *  • If a group has `tabs`, render a tab container first, then each tab's groups
 *  • Each group renders a CSS grid (columns prop) of MetaField entries
 *  • Delegates actual field UI to <FieldRenderer> which picks the right widget
 *
 * The component is "smart" — it fetches its own MetaResponse via `useMeta`.
 * Pass `meta` directly to bypass the fetch (e.g. for storybook / testing).
 */

import React, { useState } from "react";
import type { FieldType, MetaField, ModelMeta, MetaGroup, MetaFormView } from "@afenda/meta-types/schema";
import { useMeta } from "../hooks/useMeta.js";
import { useModel } from "../hooks/useModel.js";
import { FieldRenderer } from "./fields/index.js";
import type { DiscriminatedFieldProps } from "./fields/index.js";
import { logger } from '../lib/logger';
const log = logger.child({ module: 'MetaForm' });


type MetaFieldOfType<T extends FieldType> = Omit<MetaField, "type"> & { type: T };

function errorMessageFromUnknown(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to save this record. Please try again.";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetaFormProps {
  /** Model identifier, e.g. "sales_order" */
  model: string;
  /** Record id — undefined means "create new" */
  recordId?: string;
  /** Override the fetched meta (testing / storybook) */
  meta?: ModelMeta;
  /** Called after successful save */
  onSaved?: (savedRecord: Record<string, unknown>) => void;
  onCancel?: () => void;
}

function createFieldRendererProps(
  field: ModelMeta["fields"][number],
  rawValue: unknown,
  onValueChange: (value: unknown) => void,
  readonly: boolean
): DiscriminatedFieldProps {
  switch (field.type) {
    case "boolean":
      return {
        field: field as MetaFieldOfType<"boolean">,
        value: typeof rawValue === "boolean" ? rawValue : Boolean(rawValue),
        onChange: (value: boolean) => onValueChange(value),
        readonly,
      };

    case "integer":
    case "float":
    case "currency":
    case "decimal":
      return {
        field: field as MetaFieldOfType<"integer" | "float" | "currency" | "decimal">,
        value: typeof rawValue === "number" || rawValue == null ? rawValue : Number(rawValue),
        onChange: (value: number | null) => onValueChange(value),
        readonly,
      } as DiscriminatedFieldProps;

    case "date":
    case "datetime":
    case "time":
      return {
        field: field as MetaFieldOfType<"date" | "datetime" | "time">,
        value:
          rawValue == null || typeof rawValue === "string" || rawValue instanceof Date
            ? rawValue
            : String(rawValue),
        onChange: (value: string | Date | null) => onValueChange(value),
        readonly,
      } as DiscriminatedFieldProps;

    case "many2one":
      return {
        field: field as MetaFieldOfType<"many2one">,
        value:
          rawValue == null || typeof rawValue === "string" || typeof rawValue === "number"
            ? rawValue
            : String(rawValue),
        onChange: (value: string | number | null) => onValueChange(value),
        readonly,
      };

    case "one2many":
      return {
        field: field as MetaFieldOfType<"one2many">,
        value: Array.isArray(rawValue) ? rawValue : [],
        onChange: (value: Record<string, unknown>[]) => onValueChange(value),
        readonly,
      };

    default:
      return {
        field: field as DiscriminatedFieldProps["field"],
        value: rawValue,
        onChange: (value) => onValueChange(value),
        readonly,
      } as DiscriminatedFieldProps;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GroupGrid({
  group,
  fields,
  values,
  onChange,
  readonly,
}: {
  group: MetaGroup;
  fields: ModelMeta["fields"];
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  readonly: boolean;
}) {
  const fieldMap = new Map(fields.map((f) => [f.name, f]));
  return (
    <fieldset
      style={{ border: "1px solid #ddd", borderRadius: 4, padding: "1rem", marginBottom: "1rem" }}
    >
      {group.label && (
        <legend style={{ fontWeight: 600, padding: "0 0.5rem" }}>{group.label}</legend>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${group.columns ?? 2}, 1fr)`,
          gap: "1rem",
        }}
      >
        {group.fields.map((fname) => {
          const field = fieldMap.get(fname);
          if (!field) return null;
          const rendererProps = createFieldRendererProps(
            field,
            values[fname],
            (nextValue) => onChange(fname, nextValue),
            readonly || !!field.readonly
          );
          return <FieldRenderer key={fname} {...rendererProps} />;
        })}
      </div>
    </fieldset>
  );
}

function renderGroups(
  groups: MetaGroup[],
  fields: ModelMeta["fields"],
  values: Record<string, unknown>,
  onChange: (name: string, value: unknown) => void,
  readonly: boolean
) {
  return groups.map((group) => {
    if (group.tabs?.length) {
      return (
        <TabbedGroup
          key={group.name}
          group={group}
          fields={fields}
          values={values}
          onChange={onChange}
          readonly={readonly}
        />
      );
    }
    return (
      <GroupGrid
        key={group.name}
        group={group}
        fields={fields}
        values={values}
        onChange={onChange}
        readonly={readonly}
      />
    );
  });
}

function TabbedGroup({
  group,
  fields,
  values,
  onChange,
  readonly,
}: {
  group: MetaGroup;
  fields: ModelMeta["fields"];
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  readonly: boolean;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const tabs = group.tabs ?? [];
  const tabListId = `meta-tablist-${group.name}`;

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 4, marginBottom: "1rem" }}>
      <div
        id={tabListId}
        role="tablist"
        aria-label={group.label ?? group.name}
        style={{ display: "flex", borderBottom: "1px solid #ddd" }}
      >
        {tabs.map((tab, i) =>
          (() => {
            const isActive = activeTab === i;
            const tabId = `${tabListId}-tab-${i}`;
            const panelId = `${tabListId}-panel-${i}`;
            return (
              <button
                key={tab.name}
                id={tabId}
                type="button"
                onClick={() => setActiveTab(i)}
                role="tab"
                aria-selected={isActive}
                aria-controls={panelId}
                tabIndex={isActive ? 0 : -1}
                style={{
                  padding: "0.5rem 1rem",
                  background: isActive ? "#f0f4ff" : "transparent",
                  border: "none",
                  borderBottom: isActive ? "2px solid #3b5bdb" : "none",
                  cursor: "pointer",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {tab.label ?? tab.name}
              </button>
            );
          })()
        )}
      </div>
      <div
        id={`${tabListId}-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`${tabListId}-tab-${activeTab}`}
        style={{ padding: "1rem" }}
      >
        {tabs[activeTab]?.groups.map((tg) => (
          <GroupGrid
            key={tg.name}
            group={tg}
            fields={fields}
            values={values}
            onChange={onChange}
            readonly={readonly}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetaForm
// ---------------------------------------------------------------------------

export function MetaForm({ model, recordId, meta: staticMeta, onSaved, onCancel }: MetaFormProps) {
  const {
    data: metaResponse,
    isLoading: metaLoading,
    error: metaError,
  } = useMeta(model, { skip: !!staticMeta });
  const { data: record, isLoading: recordLoading } = useModel(model, recordId);
  const { createRecord, updateRecord, isMutating } = useModel(model);

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [initialized, setInitialized] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const meta = staticMeta ?? metaResponse?.meta;
  const formView = meta?.views?.form as MetaFormView | undefined;
  const permissions = metaResponse?.permissions;
  const isReadonly = recordId
    ? !(permissions?.can_update ?? true)
    : !(permissions?.can_create ?? true);

  React.useEffect(() => {
    setValues({});
    setInitialized(false);
    setSaveError(null);
  }, [model, recordId]);

  // Seed form values from fetched record
  React.useEffect(() => {
    if (!recordId) {
      if (!initialized) {
        setInitialized(true);
      }
      return;
    }

    if (record && !initialized) {
      setValues(record as Record<string, unknown>);
      setInitialized(true);
    }
  }, [record, initialized, recordId]);

  const handleChange = (name: string, value: unknown) => {
    setSaveError(null);
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    try {
      let saved: Record<string, unknown>;
      if (recordId) {
        if (!updateRecord) throw new Error("Update operation unavailable");
        saved = await updateRecord(recordId, values);
      } else {
        if (!createRecord) throw new Error("Create operation unavailable");
        saved = await createRecord(values);
      }
      onSaved?.(saved as Record<string, unknown>);
    } catch (err) {
      log.error("Save failed:", err);
      setSaveError(errorMessageFromUnknown(err));
    }
  };

  if (metaLoading || recordLoading) {
    return (
      <p role="status" aria-live="polite">
        Loading form...
      </p>
    );
  }
  if (metaError) return <p style={{ color: "red" }}>Failed to load form schema.</p>;
  if (!meta || !formView) return <p>No form view configured for "{model}".</p>;

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ marginBottom: "1rem" }}>
        {recordId ? `Edit ${meta.label}` : `New ${meta.label}`}
      </h2>

      {saveError && (
        <p role="alert" style={{ color: "#b42318", marginBottom: "1rem" }}>
          {saveError}
        </p>
      )}

      {renderGroups(formView.groups, meta.fields, values, handleChange, isReadonly)}

      {!isReadonly && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
          <button
            type="submit"
            disabled={isMutating}
            style={{
              padding: "0.5rem 1.5rem",
              background: "#3b5bdb",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {isMutating ? "Saving…" : "Save"}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} style={{ padding: "0.5rem 1.5rem" }}>
              Cancel
            </button>
          )}
        </div>
      )}
    </form>
  );
}
