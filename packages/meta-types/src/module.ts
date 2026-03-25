/**
 * Module System Types
 * ===================
 *
 * Defines the plugin architecture for AFENDA META UI.
 * Modules are self-contained packages that register:
 * - Models (database schemas)
 * - Routes (API endpoints)
 * - Hooks (lifecycle events)
 * - Actions (custom operations)
 * - Widgets (dashboard components)
 */

import type { ModelMeta } from "./schema.js";

// ---------------------------------------------------------------------------
// Module Definition
// ---------------------------------------------------------------------------

/**
 * A module is a self-contained feature package
 */
export interface MetaModule {
  /** Unique module identifier (lowercase, no spaces) */
  name: string;

  /** Human-readable module name */
  label: string;

  /** Module version (semver) */
  version: string;

  /** Module description */
  description?: string;

  /** Module author/vendor */
  author?: string;

  /** Module dependencies (other module names) */
  depends?: string[];

  /** Module category for UI organization */
  category?: "core" | "erp" | "crm" | "inventory" | "finance" | "custom";

  /** Icon name (lucide-react icon) */
  icon?: string;

  /** Module configuration */
  config?: ModuleConfig;

  /** Models provided by this module */
  models?: ModelDefinition[];

  /** API routes provided by this module */
  routes?: RouteDefinition[];

  /** Lifecycle hooks */
  hooks?: ModuleHooks;

  /** Custom actions */
  actions?: ActionDefinition[];

  /** Dashboard widgets */
  widgets?: WidgetDefinition[];

  /** Menu entries for navigation */
  menus?: MenuDefinition[];
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface ModuleConfig {
  /** Whether module is enabled */
  enabled?: boolean;

  /** Module-specific settings */
  settings?: Record<string, unknown>;

  /** Feature flags for the module */
  features?: Record<string, boolean>;
}

// ---------------------------------------------------------------------------
// Model Definition
// ---------------------------------------------------------------------------

export interface ModelDefinition {
  /** Model name (snake_case) */
  name: string;

  /** Human-readable label */
  label: string;

  /** Model metadata */
  meta: ModelMeta;

  /** Whether model is visible in UI */
  visible?: boolean;

  /** Model icon */
  icon?: string;
}

// ---------------------------------------------------------------------------
// Route Definition
// ---------------------------------------------------------------------------

export interface RouteDefinition {
  /** Route path (e.g., /api/custom-endpoint) */
  path: string;

  /** HTTP method */
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

  /** Route handler function name or reference */
  handler: string;

  /** Required roles to access route */
  roles?: string[];

  /** Route description */
  description?: string;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export interface ModuleHooks {
  /** Called when module is loaded */
  onLoad?: () => void | Promise<void>;

  /** Called when module is enabled */
  onEnable?: () => void | Promise<void>;

  /** Called when module is disabled */
  onDisable?: () => void | Promise<void>;

  /** Called before module is unloaded */
  onUnload?: () => void | Promise<void>;

  /** Called before a record is created */
  beforeCreate?: (model: string, data: Record<string, unknown>) => void | Promise<void>;

  /** Called after a record is created */
  afterCreate?: (model: string, record: Record<string, unknown>) => void | Promise<void>;

  /** Called before a record is updated */
  beforeUpdate?: (model: string, id: string, data: Record<string, unknown>) => void | Promise<void>;

  /** Called after a record is updated */
  afterUpdate?: (
    model: string,
    id: string,
    record: Record<string, unknown>
  ) => void | Promise<void>;

  /** Called before a record is deleted */
  beforeDelete?: (model: string, id: string) => void | Promise<void>;

  /** Called after a record is deleted */
  afterDelete?: (model: string, id: string) => void | Promise<void>;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface ActionDefinition {
  /** Action identifier */
  name: string;

  /** Human-readable label */
  label: string;

  /** Action type */
  type: "object" | "list";

  /** Models this action applies to */
  models: string[];

  /** Action handler */
  handler: string;

  /** Required roles */
  roles?: string[];

  /** Action icon */
  icon?: string;

  /** Action description */
  description?: string;
}

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------

export interface WidgetDefinition {
  /** Widget identifier */
  name: string;

  /** Human-readable label */
  label: string;

  /** Widget component path/name */
  component: string;

  /** Widget size (grid columns) */
  size?: "small" | "medium" | "large" | "full";

  /** Required roles to view widget */
  roles?: string[];

  /** Widget description */
  description?: string;
}

// ---------------------------------------------------------------------------
// Menus
// ---------------------------------------------------------------------------

export interface MenuDefinition {
  /** Menu item identifier */
  name: string;

  /** Human-readable label */
  label: string;

  /** Menu icon */
  icon?: string;

  /** Link path */
  path?: string;

  /** Submenu items */
  children?: MenuDefinition[];

  /** Required roles */
  roles?: string[];

  /** Sort order */
  order?: number;
}

// ---------------------------------------------------------------------------
// Module Registry Result
// ---------------------------------------------------------------------------

export interface ModuleRegistryResult {
  /** All registered modules */
  modules: MetaModule[];

  /** Map of model name → module name */
  modelMap: Map<string, string>;

  /** Loaded modules count */
  count: number;

  /** Module dependency graph (for load order) */
  dependencyGraph: Map<string, string[]>;
}
