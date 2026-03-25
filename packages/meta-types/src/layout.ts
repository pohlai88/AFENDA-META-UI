/**
 * Layout Engine Types
 * ===================
 * Recursive composable tree that decouples field placement from field definition.
 *
 * Key difference from MetaFormView (groups + tabs):
 *   MetaFormView is a flat "field list in groups" structure.
 *   LayoutNode is a recursive tree:  sections, grids, tabs, fields, and custom
 *   widgets can nest arbitrarily, enabling rich ERP-grade form layouts.
 *
 * Both systems coexist — MetaFormView for simple metadata-driven screens,
 * LayoutNode for complex screens that need precise control.
 */

import type { ConditionExpression } from "./schema.js";

// ---------------------------------------------------------------------------
// Layout Primitives
// ---------------------------------------------------------------------------

export interface LayoutSection {
  type: "section";
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  visibleIf?: ConditionExpression;
  children: LayoutNode[];
}

export interface LayoutGrid {
  type: "grid";
  columns: number;
  gap?: number;
  children: LayoutNode[];
}

export interface LayoutTab {
  label: string;
  icon?: string;
  visibleIf?: ConditionExpression;
  children: LayoutNode[];
}

export interface LayoutTabs {
  type: "tabs";
  tabs: LayoutTab[];
}

export interface LayoutField {
  type: "field";
  /** References MetaField.name (or MetaField.id when available) */
  fieldId: string;
  /** Column span override (1-based, relative to parent grid columns) */
  span?: number;
}

export interface LayoutCustom {
  type: "custom";
  /** Registered component identifier */
  component: string;
  props?: Record<string, unknown>;
}

/** Recursive layout tree node */
export type LayoutNode = LayoutSection | LayoutGrid | LayoutTabs | LayoutField | LayoutCustom;

// ---------------------------------------------------------------------------
// Layout Definition — stored/served alongside ModelMeta
// ---------------------------------------------------------------------------

export type LayoutViewType = "form" | "list" | "kanban" | "dashboard" | "wizard";

export interface LayoutDefinition {
  /** Unique layout identity */
  id: string;
  /** Model this layout applies to */
  model: string;
  /** Human-readable layout name (e.g. "Invoice – Compact Form") */
  name: string;
  /** Which view type this layout targets */
  viewType: LayoutViewType;
  /** Root of the layout tree */
  root: LayoutNode;
  /** Optional tenant-aware scope (e.g. "global", "tenant:acme", "user:alice") */
  scope?: string;
  /** Restrict layout to specific roles (empty = everyone) */
  roles?: string[];
  /** Whether this is the default layout for the model+viewType */
  isDefault?: boolean;
}

// ---------------------------------------------------------------------------
// Layout Resolution
// ---------------------------------------------------------------------------

/** Result of selecting the best layout for a given context */
export interface ResolvedLayout {
  layout: LayoutDefinition;
  /** Field IDs referenced by the layout tree */
  referencedFieldIds: string[];
}
