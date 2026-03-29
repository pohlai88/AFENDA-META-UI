/**
 * One2Many Field Editor
 * ======================
 *
 * Manages one-to-many relationships with embedded editing:
 * • Compact table view of related records
 * • Add button → Dialog with MetaForm
 * • Edit button → Dialog with prefilled MetaForm
 * • Delete button → confirmation dialog
 * • Updates parent form array value
 */

import React, { useState } from "react";
import type { RendererFieldProps } from "./index.js";
import { FieldWrapper } from "./FieldWrapper.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "@afenda/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@afenda/ui";
import { Badge } from "@afenda/ui";
import { PlusIcon, PencilIcon, TrashIcon } from "lucide-react";
import { useMeta } from "~/hooks/useMeta";
import { FormFieldRenderer } from "./FormFieldRenderer";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { MetaField } from "@afenda/meta-types/schema";
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RelatedRecord {
  id?: string | number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateZodSchema(fields: MetaField[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  fields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny;

    switch (field.type) {
      case "string":
      case "text":
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
      default:
        fieldSchema = z.any();
    }

    if (!field.required) {
      fieldSchema = fieldSchema.optional().nullable();
    }

    shape[field.name] = fieldSchema;
  });

  return z.object(shape);
}

function formatCellValue(value: unknown, field: MetaField): React.ReactNode {
  if (value == null) return <span className="text-muted-foreground">—</span>;

  switch (field.type) {
    case "boolean":
      return value ? <Badge variant="secondary">Yes</Badge> : <Badge variant="outline">No</Badge>;
    case "date":
      if (typeof value === "string") {
        return new Date(value).toLocaleDateString();
      }
      break;
    case "datetime":
      if (typeof value === "string") {
        return new Date(value).toLocaleString();
      }
      break;
    case "currency":
      if (typeof value === "number") {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value);
      }
      break;
  }

  return String(value);
}

// ---------------------------------------------------------------------------
// Record Form Dialog
// ---------------------------------------------------------------------------

interface RecordFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (rec: RelatedRecord) => void;
  model: string;
  initialValues?: RelatedRecord;
  title: string;
}

function RecordFormDialog({
  open,
  onClose,
  onSave,
  model,
  initialValues,
  title,
}: RecordFormDialogProps) {
  const { data: metaResponse, isLoading } = useMeta(model);
  const meta = metaResponse?.meta;

  const schema = React.useMemo(() => {
    if (!meta?.fields) return z.object({});
    return generateZodSchema(meta.fields);
  }, [meta]);

  const methods = useForm<Record<string, unknown>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- react-hook-form v5 compatibility
    resolver: zodResolver(schema as any),
    defaultValues: initialValues || {},
  });

  const handleSubmit = (data: Record<string, unknown>) => {
    onSave({ ...initialValues, ...data });
    onClose();
    methods.reset();
  };

  if (isLoading || !meta) {
    return null;
  }

  // Get writable fields (exclude readonly and id)
  const writableFields = meta.fields.filter((f: MetaField) => !f.readonly && f.name !== "id");

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {writableFields.map((field: MetaField) => (
                <div key={field.name} className={field.type === "text" ? "col-span-2" : ""}>
                  <FormFieldRenderer field={field} />
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function One2ManyField({
  field,
  value,
  onChange,
  readonly,
  embedded = false,
}: RendererFieldProps & { embedded?: boolean }) {
  // ============================================================================
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY (Rules of Hooks)
  // ============================================================================
  const rel = field.relation;
  const records = Array.isArray(value) ? value : [];

  // Always call hooks (even if rel is undefined)
  const { data: relatedMetaResponse } = useMeta(rel?.model || "");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RelatedRecord | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<RelatedRecord | null>(null);

  const relatedMeta = relatedMetaResponse?.meta;

  // Get display columns (first 3-4 fields)
  const displayFields = React.useMemo(() => {
    if (!relatedMeta?.fields) return [];
    return relatedMeta.fields.filter((f: MetaField) => !["id"].includes(f.name)).slice(0, 4);
  }, [relatedMeta]);

  // Unused but keeping structure for future field rendering
  // const fieldMap = React.useMemo(() => {
  //   if (!relatedMeta?.fields) return new Map();
  //   return new Map(relatedMeta.fields.map((f: MetaField) => [f.name, f]));
  // }, [relatedMeta]);

  // ============================================================================
  // CONDITIONAL RENDERING (after all hooks)
  // ============================================================================
  if (!rel) {
    const missingRelationContent = (
      <p className="text-sm text-destructive">Missing relation config</p>
    );
    return embedded ? (
      missingRelationContent
    ) : (
      <FieldWrapper field={field}>{missingRelationContent}</FieldWrapper>
    );
  }

  const handleAdd = () => {
    setEditingRecord(undefined);
    setFormDialogOpen(true);
  };

  const handleEdit = (record: RelatedRecord) => {
    setEditingRecord(record);
    setFormDialogOpen(true);
  };

  const handleSave = (record: RelatedRecord) => {
    if (editingRecord) {
      // Update existing record
      const updatedRecords = records.map((r: RelatedRecord) => (r === editingRecord ? record : r));
      onChange?.(updatedRecords);
    } else {
      // Add new record
      onChange?.([...records, { ...record, id: `temp_${Date.now()}` }]);
    }
    setFormDialogOpen(false);
    setEditingRecord(undefined);
  };

  const handleDeleteConfirm = () => {
    if (recordToDelete) {
      const updatedRecords = records.filter((r: RelatedRecord) => r !== recordToDelete);
      onChange?.(updatedRecords);
      setRecordToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleDeleteClick = (record: RelatedRecord) => {
    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  };

  const content = (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {records.length} {records.length === 1 ? "record" : "records"}
          </span>
          {!readonly && (
            <Button type="button" size="sm" variant="outline" onClick={handleAdd}>
              <PlusIcon className="h-4 w-4 mr-1" />
              Add {relatedMeta?.label || rel.model}
            </Button>
          )}
        </div>

        {/* Records Table */}
        {records.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {displayFields.map((field: MetaField) => (
                    <TableHead key={field.name}>{field.label}</TableHead>
                  ))}
                  {!readonly && <TableHead className="w-24">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record: RelatedRecord, index: number) => (
                  <TableRow key={record.id || index}>
                    {displayFields.map((field: MetaField) => (
                      <TableCell key={field.name}>
                        {formatCellValue(record[field.name], field)}
                      </TableCell>
                    ))}
                    {!readonly && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => handleEdit(record)}
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(record)}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="border rounded-md p-8 text-center text-sm text-muted-foreground">
            No {relatedMeta?.label || rel.model} records yet.
            {!readonly && " Click Add to create one."}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      {relatedMeta && (
        <RecordFormDialog
          open={formDialogOpen}
          onClose={() => {
            setFormDialogOpen(false);
            setEditingRecord(undefined);
          }}
          onSave={handleSave}
          model={rel.model}
          initialValues={editingRecord}
          title={
            editingRecord
              ? `Edit ${relatedMeta.label || rel.model}`
              : `New ${relatedMeta.label || rel.model}`
          }
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return embedded ? content : <FieldWrapper field={field}>{content}</FieldWrapper>;
}
