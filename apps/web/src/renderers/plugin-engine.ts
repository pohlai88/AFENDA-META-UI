/**
 * UI Engine Plugin Architecture
 * ==============================
 * Extensibility layer that turns the UI into an operating system.
 * Modules plug in like VS Code extensions.
 */

import type { JsonValue, JsonObject } from "@afenda/meta-types/core";
import type { RendererModule } from "./types/contracts";
import { logger } from '../lib/logger';
const log = logger.child({ module: 'plugin-engine' });


/**
 * Plugin types
 */
export type PluginType =
  | "renderer"
  | "validator"
  | "layout"
  | "action"
  | "datasource"
  | "theme"
  | "policy"
  | "analytics";

/**
 * Plugin lifecycle hooks
 */
export interface PluginLifecycle {
  /** Called when plugin is loaded */
  onLoad?(): void | Promise<void>;
  /** Called when plugin is activated */
  onActivate?(): void | Promise<void>;
  /** Called when plugin is deactivated */
  onDeactivate?(): void | Promise<void>;
  /** Called when plugin is unloaded */
  onUnload?(): void | Promise<void>;
}

/**
 * Plugin dependency
 */
export interface PluginDependency {
  /** Plugin ID or package */
  id: string;
  /** Version requirement (semver) */
  version?: string;
  /** Is this dependency optional? */
  optional?: boolean;
}

/**
 * Base plugin interface
 */
export interface UIPlugin extends PluginLifecycle {
  /** Unique plugin ID */
  id: string;
  /** Plugin version (semver) */
  version: string;
  /** Plugin type */
  type: PluginType;
  /** Human-readable name */
  name: string;
  /** Plugin description */
  description: string;
  /** Plugin author */
  author?: string;
  /** Dependencies */
  dependencies?: PluginDependency[];
  /** Install plugin into engine */
  install(engine: UIEngine): void;
}

/**
 * Renderer plugin
 */
export interface RendererPlugin extends UIPlugin {
  type: "renderer";
  /** Renderer type */
  rendererType: string;
  /** Loader function */
  loader: () => Promise<RendererModule>;
}

/**
 * Validator plugin
 */
export interface ValidatorPlugin extends UIPlugin {
  type: "validator";
  /** Validation rules: value is the field value, context is the surrounding form data */
  rules: Record<string, (value: JsonValue, context: JsonObject) => boolean | Promise<boolean>>;
}

/**
 * Action plugin
 */
export interface ActionPlugin extends UIPlugin {
  type: "action";
  /** Action handlers — context is the JSON-safe action payload */
  actions: Record<string, (context: JsonObject) => void | Promise<void>>;
}

/**
 * Analytics plugin
 */
export interface AnalyticsPlugin extends UIPlugin {
  type: "analytics";
  /** Track event with optional JSON-safe properties */
  track(event: string, properties?: JsonObject): void;
}

/**
 * Plugin registry
 */
class PluginRegistry {
  private plugins = new Map<string, UIPlugin>();
  private activePlugins = new Set<string>();

  /**
   * Register a plugin
   */
  register(plugin: UIPlugin): void {
    if (this.plugins.has(plugin.id)) {
      log.warn(`[Plugins] Plugin already registered: ${plugin.id}`);
      return;
    }

    this.plugins.set(plugin.id, plugin);
    log.info(`[Plugins] Registered: ${plugin.id} v${plugin.version}`);
  }

  /**
   * Get a plugin by ID
   */
  get(id: string): UIPlugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * Get all plugins of a type
   */
  getByType(type: PluginType): UIPlugin[] {
    return Array.from(this.plugins.values()).filter((p) => p.type === type);
  }

  /**
   * Check if plugin is active
   */
  isActive(id: string): boolean {
    return this.activePlugins.has(id);
  }

  /**
   * Mark plugin as active
   */
  activate(id: string): void {
    this.activePlugins.add(id);
  }

  /**
   * Mark plugin as inactive
   */
  deactivate(id: string): void {
    this.activePlugins.delete(id);
  }

  /**
   * List all registered plugins
   */
  list(): UIPlugin[] {
    return Array.from(this.plugins.values());
  }
}

/**
 * Dependency resolution
 */
function resolveDependencies(plugins: UIPlugin[]): UIPlugin[] {
  const resolved: UIPlugin[] = [];
  const visited = new Set<string>();

  function visit(plugin: UIPlugin) {
    if (visited.has(plugin.id)) return;
    visited.add(plugin.id);

    // Visit dependencies first
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        const depPlugin = plugins.find((p) => p.id === dep.id);
        if (!depPlugin && !dep.optional) {
          throw new Error(`Missing required dependency: ${dep.id} for plugin ${plugin.id}`);
        }
        if (depPlugin) {
          visit(depPlugin);
        }
      }
    }

    resolved.push(plugin);
  }

  for (const plugin of plugins) {
    visit(plugin);
  }

  return resolved;
}

/**
 * UI Engine
 */
export class UIEngine {
  private registry = new PluginRegistry();
  private initialized = false;

  /**
   * Use a plugin
   */
  use(plugin: UIPlugin): this {
    if (this.initialized) {
      throw new Error("Cannot add plugins after engine is initialized");
    }

    this.registry.register(plugin);
    return this;
  }

  /**
   * Initialize engine and activate all plugins
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      log.warn("[Engine] Already initialized");
      return;
    }

    log.info("[Engine] Initializing...");

    const plugins = this.registry.list();

    // Resolve dependency order
    const ordered = resolveDependencies(plugins);

    // Load plugins
    for (const plugin of ordered) {
      await plugin.onLoad?.();
      log.info(`[Engine] Loaded: ${plugin.id}`);
    }

    // Install plugins
    for (const plugin of ordered) {
      plugin.install(this);
      log.info(`[Engine] Installed: ${plugin.id}`);
    }

    // Activate plugins
    for (const plugin of ordered) {
      await plugin.onActivate?.();
      this.registry.activate(plugin.id);
      log.info(`[Engine] Activated: ${plugin.id}`);
    }

    this.initialized = true;
    log.info(`[Engine] Initialized with ${plugins.length} plugins`);
  }

  /**
   * Get plugin by ID
   */
  getPlugin<T extends UIPlugin = UIPlugin>(id: string): T | undefined {
    return this.registry.get(id) as T | undefined;
  }

  /**
   * Get plugins by type
   */
  getPluginsByType<T extends UIPlugin = UIPlugin>(type: PluginType): T[] {
    return this.registry.getByType(type) as T[];
  }

  /**
   * Check if plugin is active
   */
  isPluginActive(id: string): boolean {
    return this.registry.isActive(id);
  }

  /**
   * Execute action from action plugin
   */
  async executeAction(actionId: string, context: JsonObject): Promise<void> {
    const [pluginId, action] = actionId.split(".");
    const plugin = this.getPlugin<ActionPlugin>(pluginId);

    if (!plugin || plugin.type !== "action") {
      throw new Error(`Action plugin not found: ${pluginId}`);
    }

    const handler = plugin.actions[action];
    if (!handler) {
      throw new Error(`Action not found: ${actionId}`);
    }

    await handler(context);
  }

  /**
   * Track analytics event
   */
  track(event: string, properties?: JsonObject): void {
    const analyticsPlugins = this.getPluginsByType<AnalyticsPlugin>("analytics");
    for (const plugin of analyticsPlugins) {
      plugin.track(event, properties);
    }
  }
}

/**
 * Global engine instance
 */
export const engine = new UIEngine();
