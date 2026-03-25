/**
 * MetaForm - Enterprise Edition
 * ==============================
 * Production-grade form renderer with:
 * • react-hook-form for state management
 * • Zod schema auto-generated from MetaField validation rules
 * • shadcn/ui components for consistent styling
 * • Toast notifications for user feedback
 * • Field-level dirty tracking
 * • Optimistic UI updates
 */

import React, { useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ModelMeta, MetaField, MetaGroup, MetaFormView } from "@afenda/meta-types";
import { useMeta } from "~/hooks/useMeta";
import { useModel } from "~/hooks/useModel";
import { Form } from "@afenda/ui";
import { Button } from "@afenda/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@afenda/ui";
import { Skeleton } from "@afenda/ui";
import { toast } from "sonner";
import { PageHeader, PageContainer } from "~/components/layout";
import { FormFieldRenderer } from "./fields/FormFieldRenderer";
import { useFieldConditions, FieldConditionsProvider } from "./conditions";
import { useUnsavedChangesWarning } from "~/hooks/useUnsavedChangesWarning";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FormLifecycleHooks {
  onMetaLoaded?: (meta: ModelMeta) => void;
  beforeSave?: (
    values: Record<string, unknown>,
  ) => Record<string, unknown> | false | Promise<Record<string, unknown> | false>;
  afterSave?: (record: Record<string, unknown>) => void;
  onFieldChange?: (
    name: string,
    value: unknown,
    allValues: Record<string, unknown>,
  ) => void;
  onValidationError?: (errors: Record<string, unknown>) => void;
}

interface MetaFormProps {
  model: string;
  recordId?: string;
  meta?: ModelMeta;
  onSaved?: (savedRecord: Record<string, unknown>) => void;
  onCancel?: () => void;
  embedded?: boolean;
  lifecycle?: FormLifecycleHooks;
}

// ---------------------------------------------------------------------------
// Utilities: Schema Generation
// ---------------------------------------------------------------------------

function generateZodSchema(fields: MetaField[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  fields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny;

    // Base type
    switch (field.type) {
      case "string":
      case "text":
        fieldSchema = z.string();
        break;

      case "email":
        fieldSchema = z.string().email("Invalid email address");
        break;

      case "url":
        fieldSchema = z.string().url("Invalid URL");
        break;

      case "phone":
        fieldSchema = z.string();
        break;

      case "integer":
        fieldSchema = z.number().int();
        break;

      case "float":
      case "currency":
        fieldSchema = z.number();
        break;

      case "boolean":
        fieldSchema = z.boolean();
        break;

      case "date":
      case "datetime":
        fieldSchema = z.string().or(z.date());
        break;

      case "enum":
        if (field.options?.length) {
          const values = field.options.map((opt) => String(opt.value)) as [string, ...string[]];
          fieldSchema = z.enum(values);
        } else {
          fieldSchema = z.string();
        }
        break;

      case "many2one":
        fieldSchema = z.string().or(z.number());
        break;

      case "one2many":
        fieldSchema = z.array(z.record(z.string(), z.unknown()));
        break;

      default:
        fieldSchema = z.unknown();
    }

    // Handle required/optional — fields with requiredIf are always optional
    // in the static schema; dynamic requirement is validated at submit time
    if (!field.required || field.requiredIf) {
      fieldSchema = fieldSchema.optional().nullable();
    }

    shape[field.name] = fieldSchema;
  });

  return z.object(shape);
}

// ---------------------------------------------------------------------------
// Utilities: Dirty-Diff Extraction
// ---------------------------------------------------------------------------

function extractDirtyValues(
  dirtyFields: Record<string, boolean | Record<string, unknown>>,
  allValues: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(dirtyFields)) {
    const dirty = dirtyFields[key];
    if (dirty === true) {
      result[key] = allValues[key];
    } else if (typeof dirty === "object" && dirty !== null) {
      result[key] = extractDirtyValues(
        dirty as Record<string, boolean | Record<string, unknown>>,
        (allValues[key] ?? {}) as Record<string, unknown>,
      );
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function GroupFields({
  group,
  fields,
}: {
  group: MetaGroup;
  fields: MetaField[];
}) {
  const fieldMap = new Map(fields.map((f) => [f.name, f]));

  return (
    <div
      className="grid gap-6"
      style={{
        gridTemplateColumns: `repeat(${group.columns ?? 2}, 1fr)`,
      }}
    >
      {group.fields.map((fname) => {
        const field = fieldMap.get(fname);
        if (!field) return null;
        return <FormFieldRenderer key={fname} field={field} />;
      })}
    </div>
  );
}

function FormGroups({ groups, fields }: { groups: MetaGroup[]; fields: MetaField[] }) {
  return (
    <div className="space-y-6">
      {groups.map((group) => {
        if (group.tabs?.length) {
          return <FormTabs key={group.name} group={group} fields={fields} />;
        }
        return (
          <Card key={group.name}>
            {group.label && (
              <CardHeader>
                <CardTitle>{group.label}</CardTitle>
              </CardHeader>
            )}
            <CardContent className={!group.label ? "pt-6" : ""}>
              <GroupFields group={group} fields={fields} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function FormTabs({ group, fields }: { group: MetaGroup; fields: MetaField[] }) {
  const tabs = group.tabs ?? [];
  
  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs defaultValue={tabs[0]?.name}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.name} value={tab.name}>
                {tab.label ?? tab.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.name} value={tab.name} className="space-y-6 mt-6">
              {tab.groups.map((tGroup) => (
                <div key={tGroup.name}>
                  {tGroup.label && (
                    <h3 className="text-lg font-semibold mb-4">{tGroup.label}</h3>
                  )}
                  <GroupFields group={tGroup} fields={fields} />
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetaForm
// ---------------------------------------------------------------------------

export function MetaFormV2({ 
  model, 
  recordId, 
  meta: staticMeta, 
  onSaved, 
  onCancel,
  embedded = false,
  lifecycle,
}: MetaFormProps) {
  const { data: metaResponse, isLoading: metaLoading, error: metaError } = useMeta(model, { 
    skip: !!staticMeta 
  });
  const { data: record, isLoading: recordLoading } = useModel(model, recordId);
  const { createRecord, updateRecord, isMutating } = useModel(model);

  const meta = staticMeta ?? metaResponse?.meta;
  const formView = meta?.views?.form as MetaFormView | undefined;
  const canUpdate = metaResponse?.permissions.can_update ?? true;
  const canCreate = metaResponse?.permissions.can_create ?? true;
  const isReadonly = recordId ? !canUpdate : !canCreate;

  // Generate Zod schema
  const schema = useMemo(() => {
    if (!meta?.fields) return z.object({});
    return generateZodSchema(meta.fields);
  }, [meta?.fields]);

  // Initialize form
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<Record<string, any>>({
    resolver: zodResolver(schema as any),
    defaultValues: (record as Record<string, unknown>) ?? {},
  });

  // Warn on unsaved changes
  useUnsavedChangesWarning({
    isDirty: form.formState.isDirty,
    enabled: !embedded && !isReadonly, // Only warn for non-embedded, editable forms
    message: "You have unsaved changes. Are you sure you want to leave?",
  });

  // Update form when record loads
  React.useEffect(() => {
    if (record) {
      form.reset(record as Record<string, unknown>);
    }
  }, [record, form]);

  // Compute field conditions from DSL expressions
  const fieldStates = useFieldConditions(meta?.fields ?? [], form.control);

  // Lifecycle: notify when metadata loads
  React.useEffect(() => {
    if (meta) lifecycle?.onMetaLoaded?.(meta);
  }, [meta, lifecycle]);

  // Lifecycle: notify on individual field changes
  React.useEffect(() => {
    if (!lifecycle?.onFieldChange) return;
    const { unsubscribe } = form.watch((values, { name }) => {
      if (name) lifecycle.onFieldChange!(name, values[name], values as Record<string, unknown>);
    });
    return unsubscribe;
  }, [form, lifecycle]);

  // Lifecycle: forward validation errors
  const onFormError = useCallback((errors: Record<string, unknown>) => {
    lifecycle?.onValidationError?.(errors);
  }, [lifecycle]);

  // Handle submit — dirty-diff for updates, full payload for creates
  const onSubmit = useCallback(async (values: Record<string, unknown>) => {
    // Validate dynamically-required fields (requiredIf)
    let hasRequiredErrors = false;
    for (const f of meta?.fields ?? []) {
      const state = fieldStates.get(f.name);
      if (state && state.visible && state.required) {
        const v = values[f.name];
        if (v == null || v === "") {
          form.setError(f.name, { type: "required", message: `${f.label} is required` });
          hasRequiredErrors = true;
        }
      }
    }
    if (hasRequiredErrors) return;

    try {
      let payload = values;

      // Lifecycle: beforeSave — may transform values or cancel
      if (lifecycle?.beforeSave) {
        const result = await lifecycle.beforeSave(payload);
        if (result === false) return;
        if (typeof result === "object" && result !== null) payload = result;
      }

      let saved: Record<string, unknown>;
      
      if (recordId) {
        if (!updateRecord) throw new Error("Update operation unavailable");
        // Dirty-diff: send only changed fields for PATCH
        const dirtyPayload = extractDirtyValues(
          form.formState.dirtyFields as Record<string, boolean | Record<string, unknown>>,
          payload,
        );
        saved = await updateRecord(recordId, dirtyPayload);
        toast.success("Record updated successfully");
      } else {
        if (!createRecord) throw new Error("Create operation unavailable");
        saved = await createRecord(payload);
        toast.success("Record created successfully");
      }

      // Lifecycle: afterSave
      lifecycle?.afterSave?.(saved);
      onSaved?.(saved);
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Failed to save record");
      console.error("Save failed:", err);
    }
  }, [recordId, updateRecord, createRecord, onSaved, meta?.fields, fieldStates, form, lifecycle]);

  // Loading state
  if (metaLoading || recordLoading) {
    if (embedded) return <FormSkeleton />;
    return (
      <PageContainer>
        <PageHeader title="Loading..." />
        <FormSkeleton />
      </PageContainer>
    );
  }

  // Error state
  if (metaError) {
    return (
      <PageContainer>
        <div className="text-destructive">Failed to load form schema.</div>
      </PageContainer>
    );
  }

  // No meta
  if (!meta || !formView) {
    return (
      <PageContainer>
        <div className="text-muted-foreground">No form view configured for "{model}".</div>
      </PageContainer>
    );
  }

  // Dirty tracking for save button
  const dirtyCount = Object.keys(form.formState.dirtyFields).length;
  const isSaving = isMutating || form.formState.isSubmitting;
  const saveDisabled = isSaving || (!!recordId && dirtyCount === 0);
  const saveLabel = isSaving
    ? "Saving..."
    : recordId && dirtyCount > 0
      ? `Save ${dirtyCount} change${dirtyCount !== 1 ? "s" : ""}`
      : recordId
        ? "Save"
        : "Create";

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onFormError)} className="space-y-6">
        <FieldConditionsProvider value={fieldStates}>
          <FormGroups groups={formView.groups} fields={meta.fields} />
        </FieldConditionsProvider>

        {!isReadonly && (
          <div className="flex items-center gap-3 pt-6">
            <Button type="submit" disabled={saveDisabled}>
              {saveLabel}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        )}
      </form>
    </Form>
  );

  if (embedded) {
    return formContent;
  }

  return (
    <PageContainer>
      <PageHeader
        title={recordId ? `Edit ${meta.label}` : `New ${meta.label}`}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: meta.label_plural ?? meta.label, href: `/${model}` },
          { label: recordId ? "Edit" : "New" },
        ]}
        actions={
          onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )
        }
      />
      {formContent}
    </PageContainer>
  );
}
