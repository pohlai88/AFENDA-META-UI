import React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  defaultAnnouncements,
  defaultScreenReaderInstructions,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type {
  DiscriminatedFieldProps,
  FieldArrayConfig,
  FieldConfig,
  FieldShowIfCondition,
  LeafFieldConfig,
} from "./index.js";
import { isFieldArrayConfig, isFieldGroupConfig } from "./index.js";
import { FieldRenderer } from "./FieldRenderer.js";

interface DynamicArrayFieldProps {
  field: FieldArrayConfig;
  arrayPath: string;
  values: Record<string, unknown>;
  errors: Record<string, string | null>;
  readonly: boolean;
  setValues: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
  validateAll: (nextValues: Record<string, unknown>) => boolean;
  getFieldError: (field: LeafFieldConfig, value: unknown) => string | null;
  createFieldRendererProps: (
    field: LeafFieldConfig,
    rawValue: unknown,
    onValueChange: (value: unknown) => void,
    readonly: boolean,
    invalid: boolean
  ) => DiscriminatedFieldProps;
}

interface SortableArrayItemProps {
  id: string;
  disabled: boolean;
  children: (args: {
    attributes: Record<string, unknown>;
    listeners: Record<string, unknown>;
    setActivatorNodeRef: (element: HTMLElement | null) => void;
    isDragging: boolean;
  }) => React.ReactNode;
}

function SortableArrayItem({ id, disabled, children }: SortableArrayItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({
        attributes: attributes as unknown as Record<string, unknown>,
        listeners: listeners as unknown as Record<string, unknown>,
        setActivatorNodeRef,
        isDragging,
      })}
    </div>
  );
}

function buildErrorPath(...segments: Array<string | number>): string {
  return segments.map(String).join(".");
}

function moveItem<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...arr];
  const [moved] = next.splice(fromIndex, 1);
  if (moved === undefined) {
    return next;
  }

  next.splice(toIndex, 0, moved);
  return next;
}

function buildDndItemId(arrayPath: string, index: number): string {
  return `${arrayPath}::${index}`;
}

function parseDndItemIndex(id: string): number | null {
  const lastSeparator = id.lastIndexOf("::");
  if (lastSeparator === -1) {
    return null;
  }

  const parsed = Number(id.slice(lastSeparator + 2));
  return Number.isInteger(parsed) ? parsed : null;
}

function isConditionSatisfied(
  condition: FieldShowIfCondition,
  values: Record<string, unknown>
): boolean {
  const controllingValue = values[condition.field];

  if (condition.equals !== undefined && controllingValue !== condition.equals) {
    return false;
  }

  if (condition.notEquals !== undefined && controllingValue === condition.notEquals) {
    return false;
  }

  return true;
}

function getArrayValidationError(field: FieldArrayConfig, itemCount: number): string | null {
  if (field.required && itemCount === 0) {
    return "At least one item is required.";
  }

  if (field.minItems !== undefined && itemCount < field.minItems) {
    return `At least ${field.minItems} item(s) are required.`;
  }

  if (field.maxItems !== undefined && itemCount > field.maxItems) {
    return `At most ${field.maxItems} item(s) are allowed.`;
  }

  return null;
}

function getExplicitDefault(field: FieldConfig | LeafFieldConfig): unknown {
  const candidate = field as Record<string, unknown>;

  if (candidate.default !== undefined) {
    return candidate.default;
  }

  if (candidate.defaultValue !== undefined) {
    return candidate.defaultValue;
  }

  if (candidate.default_value !== undefined) {
    return candidate.default_value;
  }

  return undefined;
}

function createDefaultLeafValue(field: LeafFieldConfig): unknown {
  const explicitDefault = getExplicitDefault(field);
  if (explicitDefault !== undefined) {
    return explicitDefault;
  }

  switch (field.type) {
    case "boolean":
      return false;
    case "integer":
    case "float":
    case "currency":
    case "decimal":
    case "date":
    case "datetime":
    case "time":
    case "many2one":
      return null;
    case "one2many":
      return [];
    default:
      return "";
  }
}

function createEmptyArrayItem(fields: FieldConfig[]): Record<string, unknown> {
  const item: Record<string, unknown> = {};

  for (const field of fields) {
    const explicitDefault = getExplicitDefault(field);
    if (explicitDefault !== undefined) {
      item[field.name] = explicitDefault;
      continue;
    }

    if (isFieldGroupConfig(field)) {
      item[field.name] = createEmptyArrayItem(field.fields);
      continue;
    }

    if (isFieldArrayConfig(field)) {
      item[field.name] = [];
      continue;
    }

    item[field.name] = createDefaultLeafValue(field);
  }

  return item;
}

function getArrayDragLabel(field: FieldArrayConfig, index: number): string {
  const itemLabel = field.itemLabel || "Item";
  return `${itemLabel} ${index + 1}`;
}

function getDragInstructionText(field: FieldArrayConfig): string {
  const itemLabel = field.itemLabel || "item";
  return `To reorder ${itemLabel.toLowerCase()}s, press space or enter on the drag handle to pick up, use arrow keys to move, and press space or enter again to drop.`;
}

function toPathSegments(path: string): Array<string | number> {
  return path
    .split(".")
    .map((segment) => (Number.isInteger(Number(segment)) ? Number(segment) : segment));
}

function getValueAtPath(source: unknown, path: string): unknown {
  if (!path) {
    return source;
  }

  return toPathSegments(path).reduce<unknown>((acc, segment) => {
    if (acc == null) {
      return undefined;
    }

    if (typeof segment === "number" && Array.isArray(acc)) {
      return acc[segment];
    }

    if (typeof segment === "string" && typeof acc === "object") {
      return (acc as Record<string, unknown>)[segment];
    }

    return undefined;
  }, source);
}

function setValueAtPath(
  source: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const segments = toPathSegments(path);

  const assign = (node: unknown, index: number): unknown => {
    const segment = segments[index];

    if (index === segments.length - 1) {
      if (typeof segment === "number") {
        const nextArray = Array.isArray(node) ? [...node] : [];
        nextArray[segment] = value;
        return nextArray;
      }

      const nextObject =
        node && typeof node === "object" && !Array.isArray(node)
          ? { ...(node as Record<string, unknown>) }
          : {};
      nextObject[segment] = value;
      return nextObject;
    }

    if (typeof segment === "number") {
      const nextArray = Array.isArray(node) ? [...node] : [];
      nextArray[segment] = assign(nextArray[segment], index + 1);
      return nextArray;
    }

    const nextObject =
      node && typeof node === "object" && !Array.isArray(node)
        ? { ...(node as Record<string, unknown>) }
        : {};
    nextObject[segment] = assign(nextObject[segment], index + 1);
    return nextObject;
  };

  return assign(source, 0) as Record<string, unknown>;
}

export function DynamicArrayField({
  field,
  arrayPath,
  values,
  errors,
  readonly,
  setValues,
  setErrors,
  validateAll,
  getFieldError,
  createFieldRendererProps,
}: DynamicArrayFieldProps) {
  const items = React.useMemo(() => {
    const value = getValueAtPath(values, arrayPath);
    return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  }, [values, arrayPath]);

  const [liveAnnouncement, setLiveAnnouncement] = React.useState<string>("");
  const dragInstructionsId = React.useId();
  const canAdd = !readonly && (!field.maxItems || items.length < field.maxItems);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleArrayItemChange = React.useCallback(
    (itemField: LeafFieldConfig, value: unknown, fieldPath: string, errorKey: string) => {
      setValues((prev) => setValueAtPath(prev, fieldPath, value));

      const nextError = getFieldError(itemField, value);
      setErrors((prev) => ({ ...prev, [errorKey]: nextError }));
    },
    [getFieldError, setErrors, setValues]
  );

  const handleArrayAddItem = React.useCallback(() => {
    if (field.maxItems !== undefined && items.length >= field.maxItems) {
      return;
    }

    const newIndex = items.length;
    const newItem = createEmptyArrayItem(field.fields);
    const nextItems = [...items, newItem];

    setValues((prev) => setValueAtPath(prev, arrayPath, nextItems));

    const collectNewItemErrors = (
      nodes: FieldConfig[],
      source: Record<string, unknown>,
      pathPrefix: string,
      bucket: Record<string, string | null>
    ) => {
      nodes.forEach((node) => {
        if (node.showIf && !isConditionSatisfied(node.showIf, source)) {
          return;
        }

        if (isFieldGroupConfig(node)) {
          const nestedSource =
            source[node.name] && typeof source[node.name] === "object"
              ? (source[node.name] as Record<string, unknown>)
              : {};
          collectNewItemErrors(
            node.fields,
            nestedSource,
            buildErrorPath(pathPrefix, node.name),
            bucket
          );
          return;
        }

        if (isFieldArrayConfig(node)) {
          const nestedKey = buildErrorPath(pathPrefix, node.name);
          const nestedItems = Array.isArray(source[node.name])
            ? (source[node.name] as Record<string, unknown>[])
            : [];
          bucket[nestedKey] = getArrayValidationError(node, nestedItems.length);
          return;
        }

        const key = buildErrorPath(pathPrefix, node.name);
        bucket[key] = getFieldError(node, source[node.name]);
      });
    };

    setErrors((prev) => {
      const next: Record<string, string | null> = {
        ...prev,
        [arrayPath]: getArrayValidationError(field, items.length + 1),
      };

      collectNewItemErrors(field.fields, newItem, buildErrorPath(arrayPath, newIndex), next);
      return next;
    });
  }, [arrayPath, field, getFieldError, items, setErrors, setValues]);

  const handleArrayRemoveItem = React.useCallback(
    (index: number) => {
      if (index < 0 || index >= items.length) {
        return;
      }

      const nextItems = [...items];
      nextItems.splice(index, 1);
      setValues((prev) => setValueAtPath(prev, arrayPath, nextItems));

      const removedPrefix = `${buildErrorPath(arrayPath, index)}.`;
      const escapedPath = arrayPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      setErrors((prev) => {
        const nextEntries = Object.entries(prev)
          .filter(([key]) => !key.startsWith(removedPrefix))
          .map(([key, error]) => {
            const match = key.match(new RegExp(`^${escapedPath}\\.(\\d+)\\.(.+)$`));
            if (!match) {
              return [key, error] as const;
            }

            const itemIndex = Number(match[1]);
            if (itemIndex > index) {
              return [buildErrorPath(arrayPath, itemIndex - 1, match[2]), error] as const;
            }

            return [key, error] as const;
          });

        return {
          ...Object.fromEntries(nextEntries),
          [arrayPath]: getArrayValidationError(field, items.length - 1),
        };
      });
    },
    [arrayPath, field, items, setErrors, setValues]
  );

  const handleArrayMoveItem = React.useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) {
        return;
      }

      const nextItems = moveItem(items, fromIndex, toIndex);
      const nextValues = setValueAtPath(values, arrayPath, nextItems);

      setValues(nextValues);
      validateAll(nextValues);
      const itemLabel = field.itemLabel || "Item";
      setLiveAnnouncement(`Moved ${itemLabel} ${fromIndex + 1} to position ${toIndex + 1}.`);
    },
    [arrayPath, field.itemLabel, items, setValues, validateAll, values]
  );

  const handleArrayReorderShortcut = React.useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, itemIndex: number, itemCount: number) => {
      if (!e.altKey) {
        return;
      }

      if (e.key === "ArrowUp" && itemIndex > 0) {
        e.preventDefault();
        handleArrayMoveItem(itemIndex, itemIndex - 1);
      }

      if (e.key === "ArrowDown" && itemIndex < itemCount - 1) {
        e.preventDefault();
        handleArrayMoveItem(itemIndex, itemIndex + 1);
      }
    },
    [handleArrayMoveItem]
  );

  const handleArrayDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = parseDndItemIndex(String(active.id));
      const newIndex = parseDndItemIndex(String(over.id));
      if (oldIndex == null || newIndex == null) {
        return;
      }

      if (oldIndex < 0 || oldIndex >= items.length || newIndex < 0 || newIndex >= items.length) {
        return;
      }

      const nextItems = arrayMove(items, oldIndex, newIndex);
      const nextValues = setValueAtPath(values, arrayPath, nextItems);

      setValues(nextValues);
      validateAll(nextValues);
    },
    [arrayPath, items, setValues, validateAll, values]
  );

  const dndAccessibility = {
    announcements: {
      ...defaultAnnouncements,
      onDragStart({ active }: { active: { id: string | number } }) {
        const index = parseDndItemIndex(String(active.id));
        if (index == null) {
          return defaultAnnouncements.onDragStart({ active } as never);
        }

        return `Picked up ${getArrayDragLabel(field, index)}.`;
      },
      onDragOver({
        active,
        over,
      }: {
        active: { id: string | number };
        over: { id: string | number } | null;
      }) {
        if (!over) {
          return;
        }

        const fromIndex = parseDndItemIndex(String(active.id));
        const toIndex = parseDndItemIndex(String(over.id));
        if (fromIndex == null || toIndex == null || fromIndex === toIndex) {
          return;
        }

        return `${getArrayDragLabel(field, fromIndex)} moved over position ${toIndex + 1}.`;
      },
      onDragEnd({
        active,
        over,
      }: {
        active: { id: string | number };
        over: { id: string | number } | null;
      }) {
        if (!over) {
          return "Drag ended.";
        }

        const fromIndex = parseDndItemIndex(String(active.id));
        const toIndex = parseDndItemIndex(String(over.id));
        if (fromIndex == null || toIndex == null) {
          return "Item dropped.";
        }

        return `${getArrayDragLabel(field, fromIndex)} dropped at position ${toIndex + 1}.`;
      },
      onDragCancel({ active }: { active: { id: string | number } }) {
        const index = parseDndItemIndex(String(active.id));
        if (index == null) {
          return "Drag cancelled.";
        }

        return `Cancelled dragging ${getArrayDragLabel(field, index)}.`;
      },
    },
    screenReaderInstructions: {
      ...defaultScreenReaderInstructions,
      draggable: getDragInstructionText(field),
    },
  };

  const renderItemNodes = React.useCallback(
    (
      nodes: FieldConfig[],
      itemPath: string,
      scopeValues: Record<string, unknown>
    ): React.ReactNode[] => {
      return nodes.map((itemFieldConfig, nestedIndex) => {
        const nestedKey = `${itemPath}.${itemFieldConfig.name || String(nestedIndex)}`;

        if (itemFieldConfig.showIf && !isConditionSatisfied(itemFieldConfig.showIf, scopeValues)) {
          return null;
        }

        if (isFieldGroupConfig(itemFieldConfig)) {
          const groupPath = buildErrorPath(itemPath, itemFieldConfig.name);
          const groupValues = getValueAtPath(values, groupPath);
          const groupScope =
            groupValues && typeof groupValues === "object"
              ? (groupValues as Record<string, unknown>)
              : {};

          return (
            <fieldset key={nestedKey} className="rounded-md border p-3">
              {itemFieldConfig.label && (
                <legend className="px-1 text-xs font-semibold">{itemFieldConfig.label}</legend>
              )}
              {renderItemNodes(itemFieldConfig.fields, groupPath, groupScope)}
            </fieldset>
          );
        }

        if (isFieldArrayConfig(itemFieldConfig)) {
          return (
            <DynamicArrayField
              key={nestedKey}
              field={itemFieldConfig}
              arrayPath={buildErrorPath(itemPath, itemFieldConfig.name)}
              values={values}
              errors={errors}
              readonly={readonly}
              setValues={setValues}
              setErrors={setErrors}
              validateAll={validateAll}
              getFieldError={getFieldError}
              createFieldRendererProps={createFieldRendererProps}
            />
          );
        }

        const leafFieldPath = buildErrorPath(itemPath, itemFieldConfig.name);
        const itemErrorKey = leafFieldPath;
        const itemValue = getValueAtPath(values, leafFieldPath);
        const rendererProps = createFieldRendererProps(
          itemFieldConfig,
          itemValue,
          (nextValue) =>
            handleArrayItemChange(itemFieldConfig, nextValue, leafFieldPath, itemErrorKey),
          readonly || Boolean(itemFieldConfig.readonly),
          Boolean(errors[itemErrorKey])
        );

        return (
          <div key={nestedKey}>
            <FieldRenderer {...rendererProps} />
            {errors[itemErrorKey] && (
              <p className="mt-1 text-sm text-destructive" role="alert">
                {errors[itemErrorKey]}
              </p>
            )}
          </div>
        );
      });
    },
    [
      createFieldRendererProps,
      errors,
      getFieldError,
      handleArrayItemChange,
      readonly,
      setErrors,
      setValues,
      validateAll,
      values,
    ]
  );

  return (
    <div className="rounded-md border p-4">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </p>

      {field.label && <p className="text-sm font-semibold">{field.label}</p>}

      {!readonly && (
        <p id={dragInstructionsId} className="sr-only">
          {getDragInstructionText(field)}
        </p>
      )}

      {errors[arrayPath] && (
        <p className="mt-1 text-sm text-destructive" role="alert">
          {errors[arrayPath]}
        </p>
      )}

      <div className="mt-3 space-y-3">
        <DndContext
          sensors={dndSensors}
          collisionDetection={closestCenter}
          accessibility={dndAccessibility}
          onDragEnd={handleArrayDragEnd}
        >
          <SortableContext
            items={items.map((_, itemIndex) => buildDndItemId(arrayPath, itemIndex))}
            strategy={verticalListSortingStrategy}
          >
            {items.map((item, itemIndex) => {
              const itemLabel = field.itemLabel || "Item";
              const itemPath = buildErrorPath(arrayPath, itemIndex);
              const itemKey = `${arrayPath}[${itemIndex}]`;
              const sortableId = buildDndItemId(arrayPath, itemIndex);

              return (
                <SortableArrayItem key={itemKey} id={sortableId} disabled={readonly}>
                  {({ attributes, listeners, setActivatorNodeRef, isDragging }) => (
                    <div
                      className={`rounded-md border border-border p-3 ${isDragging ? "ring-2 ring-primary/50" : ""}`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">
                          {itemLabel} {itemIndex + 1}
                        </p>
                        {!readonly && (
                          <div className="flex items-center gap-2">
                            <button
                              ref={setActivatorNodeRef}
                              type="button"
                              aria-label={`Drag to reorder ${itemLabel} ${itemIndex + 1}`}
                              aria-describedby={dragInstructionsId}
                              className={`rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                              {...(attributes as React.ButtonHTMLAttributes<HTMLButtonElement>)}
                              {...(listeners as React.ButtonHTMLAttributes<HTMLButtonElement>)}
                            >
                              <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
                              <span className="sr-only">Drag</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleArrayMoveItem(itemIndex, itemIndex - 1)}
                              onKeyDown={(e) =>
                                handleArrayReorderShortcut(e, itemIndex, items.length)
                              }
                              disabled={itemIndex === 0}
                              aria-label={`Move ${itemLabel} ${itemIndex + 1} up`}
                              aria-keyshortcuts="Alt+ArrowUp"
                              className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Move Up
                            </button>
                            <button
                              type="button"
                              onClick={() => handleArrayMoveItem(itemIndex, itemIndex + 1)}
                              onKeyDown={(e) =>
                                handleArrayReorderShortcut(e, itemIndex, items.length)
                              }
                              disabled={itemIndex === items.length - 1}
                              aria-label={`Move ${itemLabel} ${itemIndex + 1} down`}
                              aria-keyshortcuts="Alt+ArrowDown"
                              className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Move Down
                            </button>
                            <button
                              type="button"
                              onClick={() => handleArrayRemoveItem(itemIndex)}
                              className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>

                      {renderItemNodes(
                        field.fields,
                        itemPath,
                        item && typeof item === "object" ? (item as Record<string, unknown>) : {}
                      )}
                    </div>
                  )}
                </SortableArrayItem>
              );
            })}
          </SortableContext>
        </DndContext>
      </div>

      {!readonly && (
        <button
          type="button"
          onClick={handleArrayAddItem}
          disabled={!canAdd}
          className="mt-3 rounded border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add {field.itemLabel || "Item"}
        </button>
      )}
    </div>
  );
}
