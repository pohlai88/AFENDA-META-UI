/**
 * @module module
 * @description Module/plugin architecture contracts for models, routes, hooks, actions, widgets, and menus.
 * @layer truth-contract
 * @consumers api, web, db
 */

import type { ModelMeta } from "../schema/types.js";

export interface MetaModule {
  name: string;
  label: string;
  version: string;
  description?: string;
  author?: string;
  depends?: string[];
  category?: "core" | "erp" | "crm" | "inventory" | "finance" | "custom";
  icon?: string;
  config?: ModuleConfig;
  models?: ModelDefinition[];
  routes?: RouteDefinition[];
  hooks?: ModuleHooks;
  actions?: ActionDefinition[];
  widgets?: WidgetDefinition[];
  menus?: MenuDefinition[];
}

export interface ModuleConfig {
  enabled?: boolean;
  settings?: Record<string, unknown>;
  features?: Record<string, boolean>;
}

export interface ModelDefinition {
  name: string;
  label: string;
  meta: ModelMeta;
  visible?: boolean;
  icon?: string;
}

export interface RouteDefinition {
  path: string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  handler: string;
  roles?: string[];
  description?: string;
}

export interface ModuleHooks {
  onLoad?: () => void | Promise<void>;
  onEnable?: () => void | Promise<void>;
  onDisable?: () => void | Promise<void>;
  onUnload?: () => void | Promise<void>;
  beforeCreate?: (model: string, data: Record<string, unknown>) => void | Promise<void>;
  afterCreate?: (model: string, record: Record<string, unknown>) => void | Promise<void>;
  beforeUpdate?: (model: string, id: string, data: Record<string, unknown>) => void | Promise<void>;
  afterUpdate?: (
    model: string,
    id: string,
    record: Record<string, unknown>
  ) => void | Promise<void>;
  beforeDelete?: (model: string, id: string) => void | Promise<void>;
  afterDelete?: (model: string, id: string) => void | Promise<void>;
}

export interface ActionDefinition {
  name: string;
  label: string;
  type: "object" | "list";
  models: string[];
  handler: string;
  roles?: string[];
  icon?: string;
  description?: string;
}

export interface WidgetDefinition {
  name: string;
  label: string;
  component: string;
  size?: "small" | "medium" | "large" | "full";
  roles?: string[];
  description?: string;
}

export interface MenuDefinition {
  name: string;
  label: string;
  icon?: string;
  path?: string;
  children?: MenuDefinition[];
  roles?: string[];
  order?: number;
}

export interface ModuleRegistryResult {
  modules: MetaModule[];
  modelMap: Map<string, string>;
  count: number;
  dependencyGraph: Map<string, string[]>;
}
