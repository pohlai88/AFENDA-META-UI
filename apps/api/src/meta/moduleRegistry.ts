/**
 * Module Registry
 * ===============
 *
 * Discovers, loads, and manages application modules.
 *
 * Features:
 * - Automatic module discovery from /modules directory
 * - Dependency resolution and load ordering
 * - Enable/disable modules via configuration
 * - Model → Module mapping
 * - Menu generation from module definitions
 *
 * Usage:
 * ```ts
 * import { moduleRegistry } from './meta/moduleRegistry';
 *
 * // Get all modules
 * const modules = moduleRegistry.getAll();
 *
 * // Get module by name
 * const salesModule = moduleRegistry.get('sales');
 *
 * // Get module providing a model
 * const module = moduleRegistry.getModuleForModel('partner');
 * ```
 */

import { readdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { MetaModule, ModuleRegistryResult } from "@afenda/meta-types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Module Registry Class
// ---------------------------------------------------------------------------

class ModuleRegistry {
  private modules: Map<string, MetaModule> = new Map();
  private modelMap: Map<string, string> = new Map(); // model → module
  private initialized = false;

  /**
   * Initialize the module registry by scanning the modules directory
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.warn("[ModuleRegistry] Initializing...");

    const modulesDir = join(__dirname, "../modules");

    try {
      // Scan modules directory
      const entries = await readdir(modulesDir, { withFileTypes: true });
      const moduleNames = entries.filter((e) => e.isDirectory()).map((e) => e.name);

      console.warn(
        `[ModuleRegistry] Found ${moduleNames.length} module(s): ${moduleNames.join(", ")}`
      );

      // Load each module
      for (const moduleName of moduleNames) {
        await this.loadModule(moduleName);
      }

      // Resolve dependencies and determine load order
      this.resolveDependencies();

      this.initialized = true;
      console.warn(`[ModuleRegistry] Initialized with ${this.modules.size} module(s)`);
    } catch (error) {
      console.error("[ModuleRegistry] Failed to initialize:", error);
      // Continue with empty registry rather than crashing
    }
  }

  /**
   * Load a single module from the modules directory
   */
  private async loadModule(moduleName: string): Promise<void> {
    try {
      const modulePath = `../modules/${moduleName}/index.js`;
      const moduleExports = await import(modulePath);

      // Module should export a default or named export called "module"
      const moduleDefinition: MetaModule = moduleExports.default || moduleExports.module;

      if (!moduleDefinition) {
        console.warn(`[ModuleRegistry] Module "${moduleName}" does not export a module definition`);
        return;
      }

      // Check if module is enabled (default: true)
      const enabled = moduleDefinition.config?.enabled !== false;

      if (!enabled) {
        console.warn(`[ModuleRegistry] Module "${moduleName}" is disabled`);
        return;
      }

      // Register the module
      this.modules.set(moduleName, moduleDefinition);

      // Build model → module mapping
      if (moduleDefinition.models) {
        for (const model of moduleDefinition.models) {
          this.modelMap.set(model.name, moduleName);
        }
      }

      console.warn(`[ModuleRegistry] Loaded module: ${moduleName}`);

      // Call onLoad hook if present
      if (moduleDefinition.hooks?.onLoad) {
        await moduleDefinition.hooks.onLoad();
      }
    } catch (error) {
      console.error(`[ModuleRegistry] Failed to load module "${moduleName}":`, error);
    }
  }

  /**
   * Resolve module dependencies and determine load order
   * Uses topological sort to ensure dependencies are loaded first
   */
  private resolveDependencies(): void {
    // Build dependency graph
    const graph = new Map<string, string[]>();

    for (const [moduleName, module] of this.modules) {
      graph.set(moduleName, module.depends || []);
    }

    // Topological sort (simplified - doesn't detect cycles)
    const visited = new Set<string>();
    const loadOrder: string[] = [];

    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);

      const deps = graph.get(name) || [];
      for (const dep of deps) {
        if (this.modules.has(dep)) {
          visit(dep);
        } else {
          console.warn(
            `[ModuleRegistry] Module "${name}" depends on "${dep}", but "${dep}" is not loaded`
          );
        }
      }

      loadOrder.push(name);
    };

    for (const moduleName of this.modules.keys()) {
      visit(moduleName);
    }

    console.warn(`[ModuleRegistry] Load order: ${loadOrder.join(" → ")}`);
  }

  /**
   * Get all registered modules
   */
  getAll(): MetaModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get a module by name
   */
  get(name: string): MetaModule | undefined {
    return this.modules.get(name);
  }

  /**
   * Get the module that provides a specific model
   */
  getModuleForModel(modelName: string): MetaModule | undefined {
    const moduleName = this.modelMap.get(modelName);
    return moduleName ? this.modules.get(moduleName) : undefined;
  }

  /**
   * Get all models across all modules
   */
  getAllModels(): string[] {
    return Array.from(this.modelMap.keys());
  }

  /**
   * Check if a module is registered
   */
  has(name: string): boolean {
    return this.modules.has(name);
  }

  /**
   * Get registry statistics
   */
  getStats(): ModuleRegistryResult {
    const dependencyGraph = new Map<string, string[]>();

    for (const [name, module] of this.modules) {
      dependencyGraph.set(name, module.depends || []);
    }

    return {
      modules: this.getAll(),
      modelMap: new Map(this.modelMap),
      count: this.modules.size,
      dependencyGraph,
    };
  }

  /**
   * Get module navigation menus (for sidebar)
   */
  getMenus(): Array<{
    module: string;
    label: string;
    icon?: string;
    models: Array<{ name: string; label: string; icon?: string }>;
  }> {
    const menus: Array<{
      module: string;
      label: string;
      icon?: string;
      models: Array<{ name: string; label: string; icon?: string }>;
    }> = [];

    for (const module of this.modules.values()) {
      if (!module.models || module.models.length === 0) continue;

      // Get visible models
      const visibleModels = module.models
        .filter((m) => m.visible !== false)
        .map((m) => ({
          name: m.name,
          label: m.label,
          icon: m.icon,
        }));

      if (visibleModels.length > 0) {
        menus.push({
          module: module.name,
          label: module.label,
          icon: module.icon,
          models: visibleModels,
        });
      }
    }

    return menus;
  }
}

// ---------------------------------------------------------------------------
// Singleton Instance
// ---------------------------------------------------------------------------

export const moduleRegistry = new ModuleRegistry();

// Auto-initialize on first import
moduleRegistry.initialize().catch((err) => {
  console.error("[ModuleRegistry] Auto-initialization failed:", err);
});
