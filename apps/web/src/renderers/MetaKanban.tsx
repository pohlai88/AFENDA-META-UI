/**
 * MetaKanban
 * ==========
 * Renders records in a kanban board grouping by the column declared in
 * MetaKanbanView.group_by_field (typically a status or stage enum field).
 *
 * Design decisions:
 *  • Columns are derived from the enum options of group_by_field
 *  • Card title = group_by_field.card_title_field (default: "name")
 *  • Drag-and-drop is opt-in: a PATCH is issued when a card is dropped
 *    (uses the HTML5 drag-and-drop API — no external dnd lib required)
 */

import React, { useState, useMemo, useCallback, memo } from "react";
import type { MetaKanbanView, MetaField } from "@afenda/meta-types";
import { useMeta } from "../hooks/useMeta.js";
import { useModelList, useModel } from "../hooks/useModel.js";

function errorMessageFromUnknown(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to update kanban card. Please try again.";
}

interface MetaKanbanProps {
  model: string;
  onCardClick?: (rec: Record<string, unknown>) => void;
  /** Override card rendering for full layout control. */
  renderCard?: (rec: Record<string, unknown>, fields: MetaField[]) => React.ReactNode;
}

export function MetaKanban({ model, onCardClick, renderCard }: MetaKanbanProps) {
  // ============================================================================
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY (Rules of Hooks)
  // ============================================================================
  const { data: metaResponse, isLoading: metaLoading } = useMeta(model);
  const { data, isLoading: listLoading, refetch } = useModelList(model, { limit: 500 });
  const { updateRecord } = useModel(model);
  const [dragging, setDragging] = useState<Record<string, unknown> | null>(null);
  const [keyboardGrabbedId, setKeyboardGrabbedId] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState<string>("");
  // Optimistic moves: recordId → new group value, cleared after server confirms
  const [localOverrides, setLocalOverrides] = useState<Map<string, string>>(new Map());
  const [pendingRecordIds, setPendingRecordIds] = useState<Set<string>>(new Set());
  const [mutationError, setMutationError] = useState<string | null>(null);

  // ============================================================================
  // DERIVED STATE (compute after all hooks)
  // ============================================================================
  const meta = metaResponse?.meta;
  const kanbanView = meta?.views?.kanban as MetaKanbanView | undefined;
  const groupByField = kanbanView?.group_by_field ?? kanbanView?.group_by;
  const groupField = groupByField ? meta?.fields.find((f) => f.name === groupByField) : undefined;
  const titleField = kanbanView?.card_title_field ?? "name";
  const canUpdate = metaResponse?.permissions.can_update ?? true;

  // Memoize columns and records to prevent re-renders
  const columns = useMemo(() => groupField?.options ?? [], [groupField]);
  const columnValues = useMemo(() => columns.map((col) => String(col.value)), [columns]);
  const records = useMemo(() => data?.data ?? [], [data]);

  React.useEffect(() => {
    // Keep optimistic overrides scoped to records that still exist in the latest dataset.
    const existingIds = new Set(records.map((record) => String(record.id ?? "")));
    setLocalOverrides((current) => {
      if (current.size === 0) {
        return current;
      }

      const next = new Map<string, string>();
      for (const [id, value] of current.entries()) {
        if (existingIds.has(id)) {
          next.set(id, value);
        }
      }

      return next;
    });

    setPendingRecordIds((current) => {
      if (current.size === 0) {
        return current;
      }

      const next = new Set<string>();
      for (const id of current.values()) {
        if (existingIds.has(id)) {
          next.add(id);
        }
      }

      return next;
    });
  }, [records]);

  // ============================================================================
  // MEMOIZED VALUES (depends on derived state)
  // ============================================================================
  const { grouped, miscRecords } = useMemo(() => {
    if (!groupByField || columns.length === 0) {
      return { grouped: new Map<string, Record<string, unknown>[]>(), miscRecords: [] as Record<string, unknown>[] };
    }
    const knownKeys = new Set(columns.map((c) => String(c.value)));
    const map = new Map<string, Record<string, unknown>[]>(
      columns.map((c) => [String(c.value), []])
    );
    const misc: Record<string, unknown>[] = [];
    for (const rec of records) {
      const id = String(rec.id ?? "");
      // Apply optimistic override if present, otherwise use the record's own value
      const effectiveGroup = localOverrides.get(id) ?? String(rec[groupByField] ?? "");
      if (knownKeys.has(effectiveGroup)) {
        map.get(effectiveGroup)!.push(rec);
      } else {
        misc.push(rec);
      }
    }
    return { grouped: map, miscRecords: misc };
  }, [records, columns, groupByField, localOverrides]);

  const resolveEffectiveGroupForRecord = useCallback((record: Record<string, unknown>) => {
    if (!groupByField) {
      return "";
    }

    const recordId = String(record.id ?? "");
    return localOverrides.get(recordId) ?? String(record[groupByField] ?? "");
  }, [groupByField, localOverrides]);

  const moveRecordToGroup = useCallback(async (record: Record<string, unknown>, targetGroup: string) => {
    if (!groupByField) return;
    if (!canUpdate) {
      setMutationError("You do not have permission to move cards.");
      return;
    }

    const recordId = String(record.id ?? "");
    if (!recordId) {
      setMutationError("Unable to move card: missing record id.");
      return;
    }

    const previousGroup = resolveEffectiveGroupForRecord(record);
    if (previousGroup === targetGroup) {
      return;
    }

    setLocalOverrides((current) => {
      const next = new Map(current);
      next.set(recordId, targetGroup);
      return next;
    });
    setPendingRecordIds((current) => {
      const next = new Set(current);
      next.add(recordId);
      return next;
    });

    try {
      if (!updateRecord) throw new Error("Update operation unavailable");
      await updateRecord(recordId, {
        [groupByField]: targetGroup,
      });
      setMutationError(null);
      setLocalOverrides((current) => {
        const next = new Map(current);
        next.delete(recordId);
        return next;
      });
      setPendingRecordIds((current) => {
        const next = new Set(current);
        next.delete(recordId);
        return next;
      });
      await refetch();
    } catch (err) {
      console.error("Kanban drop failed:", err);
      setMutationError(errorMessageFromUnknown(err));
      setLocalOverrides((current) => {
        const next = new Map(current);
        if (previousGroup) {
          next.set(recordId, previousGroup);
        } else {
          next.delete(recordId);
        }
        return next;
      });
      setPendingRecordIds((current) => {
        const next = new Set(current);
        next.delete(recordId);
        return next;
      });
    }
  }, [groupByField, canUpdate, resolveEffectiveGroupForRecord, updateRecord, refetch]);

  // ============================================================================
  // CALLBACKS (must be after all other hooks)
  // ============================================================================
  const handleDrop = useCallback(async (targetGroup: string) => {
    if (!dragging || !groupByField) return;
    await moveRecordToGroup(dragging, targetGroup);
    setDragging(null);
  }, [dragging, groupByField, moveRecordToGroup]);

  const handleKeyboardGrabToggle = useCallback((record: Record<string, unknown>) => {
    const recordId = String(record.id ?? "");
    if (!recordId || pendingRecordIds.has(recordId)) {
      return;
    }

    if (keyboardGrabbedId === recordId) {
      setKeyboardGrabbedId(null);
      setLiveMessage("Card dropped.");
      return;
    }

    setKeyboardGrabbedId(recordId);
    setLiveMessage(`Picked up card ${String(record[titleField] ?? recordId)}.`);
  }, [keyboardGrabbedId, pendingRecordIds, titleField]);

  const handleKeyboardCancel = useCallback(() => {
    if (!keyboardGrabbedId) {
      return;
    }

    setKeyboardGrabbedId(null);
    setLiveMessage("Move cancelled.");
  }, [keyboardGrabbedId]);

  const handleKeyboardMove = useCallback(async (record: Record<string, unknown>, direction: -1 | 1) => {
    if (!groupByField || columnValues.length === 0) {
      return;
    }

    const currentGroup = resolveEffectiveGroupForRecord(record);
    const currentIndex = columnValues.indexOf(currentGroup);
    if (currentIndex < 0) {
      setLiveMessage("This card cannot be moved with keyboard from its current column.");
      return;
    }

    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= columnValues.length) {
      setLiveMessage("No adjacent column available.");
      return;
    }

    const targetGroup = columnValues[nextIndex];
    await moveRecordToGroup(record, targetGroup);
    setKeyboardGrabbedId(null);
    setLiveMessage("Card moved.");
  }, [groupByField, columnValues, resolveEffectiveGroupForRecord, moveRecordToGroup]);

  const handleDragStart = useCallback((rec: Record<string, unknown>) => {
    setMutationError(null);
    setKeyboardGrabbedId(null);
    setDragging(rec);
  }, []);

  const handleCardClick = useCallback((rec: Record<string, unknown>) => {
    onCardClick?.(rec);
  }, [onCardClick]);

  // ============================================================================
  // CONDITIONAL RENDERING (after all hooks)
  // ============================================================================
  if (metaLoading || listLoading) {
    return (
      <p role="status" aria-live="polite">
        Loading kanban...
      </p>
    );
  }
  if (!meta || !kanbanView) return <p>No kanban view configured for "{model}".</p>;
  if (!groupByField) return <p>Kanban view is missing group_by_field.</p>;
  if (!groupField) return <p>group_by_field "{groupByField}" not found in schema.</p>;

  return (
    <div>
      {mutationError && (
        <p role="alert" style={{ color: "#b42318", marginBottom: "0.75rem" }}>
          {mutationError}
        </p>
      )}
      {canUpdate && (
        <p style={{ color: "#475467", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
          Keyboard move: focus a card, press Enter or Space to pick it up, use Left/Right arrows to move,
          then Enter/Space to drop or Escape to cancel.
        </p>
      )}
      <p
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {liveMessage}
      </p>

      <div
        role="list"
        aria-label={`${model} kanban board`}
        style={{ display: "flex", gap: "1rem", overflowX: "auto", alignItems: "flex-start" }}
      >
        {columns.map((col, index) => (
          <KanbanColumn
            key={col.value}
            label={col.label}
            labelId={`kanban-col-${String(col.value)}-${index}`}
            records={grouped.get(String(col.value)) ?? []}
            draggingId={dragging ? String(dragging.id ?? "") : null}
            keyboardGrabbedId={keyboardGrabbedId}
            pendingRecordIds={pendingRecordIds}
            titleField={titleField}
            meta={meta.fields}
            cardFields={kanbanView.card_fields ?? []}
            canDrag={canUpdate}
            onCardClick={handleCardClick}
            onDragStart={handleDragStart}
            onDragEnd={() => setDragging(null)}
            onKeyboardGrabToggle={handleKeyboardGrabToggle}
            onKeyboardCancel={handleKeyboardCancel}
            onKeyboardMove={handleKeyboardMove}
            onDrop={() => handleDrop(String(col.value))}
            renderCard={renderCard}
          />
        ))}
        {miscRecords.length > 0 && (
          <KanbanColumn
            key="__misc__"
            label="Uncategorized"
            labelId="kanban-col-misc"
            records={miscRecords}
            draggingId={dragging ? String(dragging.id ?? "") : null}
            keyboardGrabbedId={keyboardGrabbedId}
            pendingRecordIds={pendingRecordIds}
            titleField={titleField}
            meta={meta.fields}
            cardFields={kanbanView.card_fields ?? []}
            canDrag={canUpdate}
            onCardClick={handleCardClick}
            onDragStart={handleDragStart}
            onDragEnd={() => setDragging(null)}
            onKeyboardGrabToggle={handleKeyboardGrabToggle}
            onKeyboardCancel={handleKeyboardCancel}
            onKeyboardMove={handleKeyboardMove}
            onDrop={() => { /* Uncategorized: dropping here has no valid target group */ }}
            renderCard={renderCard}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KanbanColumn
// ---------------------------------------------------------------------------

const KanbanColumn = memo(function KanbanColumn({
  label,
  labelId,
  records,
  draggingId,
  keyboardGrabbedId,
  pendingRecordIds,
  titleField,
  meta: fields,
  cardFields,
  canDrag,
  onCardClick,
  onDragStart,
  onDragEnd,
  onKeyboardGrabToggle,
  onKeyboardCancel,
  onKeyboardMove,
  onDrop,
  renderCard,
}: {
  label: string;
  labelId: string;
  records: Record<string, unknown>[];
  draggingId: string | null;
  keyboardGrabbedId: string | null;
  pendingRecordIds: Set<string>;
  titleField: string;
  meta: MetaField[];
  cardFields: string[];
  canDrag: boolean;
  onCardClick?: (rec: Record<string, unknown>) => void;
  onDragStart: (rec: Record<string, unknown>) => void;
  onDragEnd: () => void;
  onKeyboardGrabToggle: (rec: Record<string, unknown>) => void;
  onKeyboardCancel: () => void;
  onKeyboardMove: (rec: Record<string, unknown>, direction: -1 | 1) => void;
  onDrop: () => void;
  renderCard?: (rec: Record<string, unknown>, fields: MetaField[]) => React.ReactNode;
}) {
  const [dragOver, setDragOver] = useState(false);
  const fieldMap = useMemo(() => new Map(fields.map((f) => [f.name, f])), [fields]);

  return (
    <section
      role="listitem"
      aria-labelledby={labelId}
      aria-dropeffect={dragOver ? "move" : "none"}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); onDrop(); }}
      style={{
        minWidth: 260,
        maxHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        background: dragOver ? "#e8eeff" : "#f4f5f7",
        borderRadius: 6,
        padding: "0.75rem",
        border: dragOver ? "2px dashed #3b5bdb" : "2px solid transparent",
      }}
    >
      <div id={labelId} style={{ fontWeight: 600, marginBottom: "0.75rem", flexShrink: 0, display: "flex", justifyContent: "space-between" }}>
        <span>{label}</span>
        <span style={{ color: "#666", fontSize: "0.8rem" }}>{records.length}</span>
      </div>
      <div role="list" style={{ margin: 0, padding: 0, overflowY: "auto", flex: 1 }}>
        {records.map((rec, i) => {
          const recordId = String(rec.id ?? i);
          const isBeingDragged = draggingId !== null && draggingId === String(rec.id ?? "");
          const isKeyboardGrabbed = keyboardGrabbedId !== null && keyboardGrabbedId === recordId;
          const isPending = pendingRecordIds.has(recordId);

          return (
            <div
              role="listitem"
              aria-grabbed={isBeingDragged || isKeyboardGrabbed}
              aria-busy={isPending}
              key={recordId}
              draggable={canDrag && !isPending}
              onDragStart={() => onDragStart(rec)}
              onDragEnd={onDragEnd}
              onClick={() => onCardClick?.(rec)}
              onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && canDrag && !isPending) {
                  event.preventDefault();
                  onKeyboardGrabToggle(rec);
                  return;
                }

                if (event.key === "Escape" && isKeyboardGrabbed) {
                  event.preventDefault();
                  onKeyboardCancel();
                  return;
                }

                if ((event.key === "ArrowRight" || event.key === "ArrowLeft") && isKeyboardGrabbed) {
                  event.preventDefault();
                  void onKeyboardMove(rec, event.key === "ArrowRight" ? 1 : -1);
                  return;
                }

                if (event.key === "Enter" && onCardClick && !canDrag) {
                  event.preventDefault();
                  onCardClick(rec);
                }
              }}
              tabIndex={onCardClick ? 0 : undefined}
              style={{
                background: "#fff",
                borderRadius: 4,
                padding: "0.75rem",
                marginBottom: "0.5rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                opacity: isPending ? 0.65 : 1,
                cursor: isPending ? "progress" : onCardClick ? "pointer" : "grab",
                transition: "opacity 140ms ease",
                outline: isKeyboardGrabbed ? "2px solid #3b5bdb" : "none",
                outlineOffset: 1,
              }}
            >
              {renderCard ? (
                renderCard(rec, fields)
              ) : (
                <>
                  <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>
                    {String(rec[titleField] ?? rec.id ?? "—")}
                  </div>
                  {cardFields.map((cf) => {
                    const f = fieldMap.get(cf);
                    if (!f || rec[cf] == null) return null;
                    return (
                      <div key={cf} style={{ fontSize: "0.8rem", color: "#555" }}>
                        <strong>{f.label}: </strong>{String(rec[cf])}
                      </div>
                    );
                  })}
                </>
              )}

              {isPending && (
                <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#475467" }}>
                  Updating...
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
});
