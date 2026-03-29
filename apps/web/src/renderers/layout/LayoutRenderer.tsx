/**
 * Layout Renderer — React Rendering Pipeline
 * ============================================
 * Transforms a LayoutNode tree into React elements.
 *
 * Pipeline:
 *   Layout Tree → Resolve Visibility → Render Components
 *
 * Performance:
 *   - Mounts tabs on-demand (lazy)
 *   - Memoizes sections with React.memo
 *   - Supports custom component registry for "custom" nodes
 *   - Virtual scrolling for sections with 100+ children
 *   - Cached visibility rule evaluation
 */

import React, { useState, useMemo, useCallback, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { LayoutNode, LayoutSection, LayoutGrid, LayoutTabs, LayoutField, LayoutCustom } from "@afenda/meta-types/layout";
import type { ConditionExpression } from "@afenda/meta-types/schema";
import { evaluateCondition } from "../conditions.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LayoutRenderContext {
  /** Current form values for condition evaluation */
  values: Record<string, unknown>;
  /** Render a single field by its ID */
  renderField: (fieldId: string, span?: number) => React.ReactNode;
  /** Whether the form is in readonly mode */
  readonly?: boolean;
}

/** Registry for custom component renderers */
export type CustomComponentRenderer = (
  props: Record<string, unknown>,
  ctx: LayoutRenderContext
) => React.ReactNode;

const customComponentRegistry = new Map<string, CustomComponentRenderer>();

export function registerCustomComponent(name: string, renderer: CustomComponentRenderer): void {
  customComponentRegistry.set(name, renderer);
}

export function clearCustomComponents(): void {
  customComponentRegistry.clear();
}

// ---------------------------------------------------------------------------
// Visibility check with caching
// ---------------------------------------------------------------------------

// Cache for evaluated visibility rules to prevent repeated DSL evaluations
const visibilityCache = new Map<string, boolean>();

function getCacheKey(rule: ConditionExpression, values: Record<string, unknown>): string {
  return JSON.stringify({ rule, values });
}

function isVisible(
  visibleIf: ConditionExpression | undefined,
  values: Record<string, unknown>
): boolean {
  if (!visibleIf) return true;

  // Check cache first
  const cacheKey = getCacheKey(visibleIf, values);
  if (visibilityCache.has(cacheKey)) {
    return visibilityCache.get(cacheKey)!;
  }

  // Evaluate and cache
  const result = evaluateCondition(visibleIf, values);
  visibilityCache.set(cacheKey, result);

  // Clear cache after 1 second to prevent memory leaks
  setTimeout(() => visibilityCache.delete(cacheKey), 1000);

  return result;
}

// ---------------------------------------------------------------------------
// Section Renderer with optional virtual scrolling
// ---------------------------------------------------------------------------

const USE_NEW_VIRTUALIZER = true;
const VIRTUAL_SCROLL_THRESHOLD = 100;

const SectionRenderer = React.memo(function SectionRenderer({
  node,
  ctx,
}: {
  node: LayoutSection;
  ctx: LayoutRenderContext;
}) {
  const [collapsed, setCollapsed] = useState(node.defaultCollapsed ?? false);
  const parentRef = useRef<HTMLDivElement>(null);

  const useVirtualScrolling = USE_NEW_VIRTUALIZER && node.children.length >= VIRTUAL_SCROLL_THRESHOLD;
  const rowVirtualizer = useVirtualizer({
    count: node.children.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
    enabled: useVirtualScrolling && !collapsed,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();

  if (!isVisible(node.visibleIf, ctx.values)) return null;

  return React.createElement(
    "fieldset",
    {
      className: "layout-section",
      "data-collapsible": node.collapsible ?? false,
    },
    node.title &&
      React.createElement(
        "legend",
        {
          className: "layout-section-title",
          onClick: node.collapsible ? () => setCollapsed((c) => !c) : undefined,
          style: node.collapsible ? { cursor: "pointer" } : undefined,
        },
        node.title,
        node.collapsible &&
          React.createElement("span", { className: "collapse-indicator" }, collapsed ? " ▸" : " ▾")
      ),
    !collapsed &&
      (useVirtualScrolling
        ? // Virtual scrolling for large sections
          React.createElement(
            "div",
            {
              ref: parentRef,
              className: "layout-section-content",
              style: { height: 600, overflowY: "auto" },
            },
            React.createElement(
              "div",
              {
                style: {
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  position: "relative",
                  width: "100%",
                },
              },
              virtualItems.map((virtualItem) =>
                React.createElement(
                  "div",
                  {
                    key: virtualItem.key,
                    style: {
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualItem.start}px)`,
                    },
                  },
                  React.createElement(LayoutNodeRenderer, {
                    node: node.children[virtualItem.index],
                    ctx,
                  })
                )
              )
            )
          )
        : // Standard rendering for normal sections
          React.createElement(
            "div",
            { className: "layout-section-content" },
            node.children.map((child, i) =>
              React.createElement(LayoutNodeRenderer, { key: i, node: child, ctx })
            )
          ))
  );
});

// ---------------------------------------------------------------------------
// Grid Renderer
// ---------------------------------------------------------------------------

const GridRenderer = React.memo(function GridRenderer({
  node,
  ctx,
}: {
  node: LayoutGrid;
  ctx: LayoutRenderContext;
}) {
  return React.createElement(
    "div",
    {
      className: "layout-grid",
      style: {
        display: "grid",
        gridTemplateColumns: `repeat(${node.columns}, 1fr)`,
        gap: node.gap ? `${node.gap}px` : "16px",
      },
    },
    node.children.map((child, i) =>
      React.createElement(LayoutNodeRenderer, { key: i, node: child, ctx })
    )
  );
});

// ---------------------------------------------------------------------------
// Tabs Renderer (mount-on-demand)
// ---------------------------------------------------------------------------

const TabsRenderer = React.memo(function TabsRenderer({
  node,
  ctx,
}: {
  node: LayoutTabs;
  ctx: LayoutRenderContext;
}) {
  const visibleTabs = useMemo(
    () => node.tabs.filter((tab) => isVisible(tab.visibleIf, ctx.values)),
    [node.tabs, ctx.values]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  // Track which tabs have been mounted (for mount-on-demand)
  const [mountedTabs, setMountedTabs] = useState<Set<number>>(() => new Set([0]));

  const handleTabClick = useCallback((index: number) => {
    setActiveIndex(index);
    setMountedTabs((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  if (visibleTabs.length === 0) return null;

  return React.createElement(
    "div",
    { className: "layout-tabs" },
    // Tab headers
    React.createElement(
      "div",
      { className: "layout-tabs-header", role: "tablist" },
      visibleTabs.map((tab, i) =>
        React.createElement(
          "button",
          {
            key: i,
            className: `layout-tab-button${i === activeIndex ? " active" : ""}`,
            role: "tab",
            "aria-selected": i === activeIndex,
            onClick: () => handleTabClick(i),
          },
          tab.icon && React.createElement("span", { className: "tab-icon" }, tab.icon),
          tab.label
        )
      )
    ),
    // Tab panels (mount-on-demand: render only tabs that have been visited)
    visibleTabs.map((tab, i) =>
      mountedTabs.has(i)
        ? React.createElement(
            "div",
            {
              key: i,
              className: "layout-tab-panel",
              role: "tabpanel",
              hidden: i !== activeIndex,
            },
            tab.children.map((child, j) =>
              React.createElement(LayoutNodeRenderer, {
                key: j,
                node: child,
                ctx,
              })
            )
          )
        : null
    )
  );
});

// ---------------------------------------------------------------------------
// Field Renderer
// ---------------------------------------------------------------------------

const FieldNodeRenderer = React.memo(function FieldNodeRenderer({
  node,
  ctx,
}: {
  node: LayoutField;
  ctx: LayoutRenderContext;
}) {
  return React.createElement(
    "div",
    {
      className: "layout-field",
      style: node.span ? { gridColumn: `span ${node.span}` } : undefined,
    },
    ctx.renderField(node.fieldId, node.span)
  );
});

// ---------------------------------------------------------------------------
// Custom Component Renderer
// ---------------------------------------------------------------------------

function CustomRenderer({ node, ctx }: { node: LayoutCustom; ctx: LayoutRenderContext }) {
  const renderer = customComponentRegistry.get(node.component);
  if (!renderer) {
    return React.createElement(
      "div",
      { className: "layout-custom-missing" },
      `Unknown component: ${node.component}`
    );
  }
  return React.createElement(React.Fragment, null, renderer(node.props ?? {}, ctx));
}

// ---------------------------------------------------------------------------
// Recursive Layout Node Renderer
// ---------------------------------------------------------------------------

export function LayoutNodeRenderer({
  node,
  ctx,
}: {
  node: LayoutNode;
  ctx: LayoutRenderContext;
}): React.ReactElement | null {
  switch (node.type) {
    case "section":
      return React.createElement(SectionRenderer, { node, ctx });
    case "grid":
      return React.createElement(GridRenderer, { node, ctx });
    case "tabs":
      return React.createElement(TabsRenderer, { node, ctx });
    case "field":
      return React.createElement(FieldNodeRenderer, { node, ctx });
    case "custom":
      return React.createElement(CustomRenderer, { node, ctx });
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Root Layout Renderer
// ---------------------------------------------------------------------------

export interface LayoutRendererProps {
  root: LayoutNode;
  context: LayoutRenderContext;
  className?: string;
}

export function LayoutRenderer({
  root,
  context,
  className,
}: LayoutRendererProps): React.ReactElement {
  return React.createElement(
    "div",
    { className: className ?? "layout-root" },
    React.createElement(LayoutNodeRenderer, { node: root, ctx: context })
  );
}
