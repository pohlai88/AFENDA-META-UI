/**
 * Module architecture contract tests.
 *
 * Design intent: module registration shapes are runtime contracts shared by plugin,
 * routing, UI composition, and lifecycle hook orchestration.
 */
import { describe, expect, it } from "vitest";

import type {
  ActionDefinition,
  MenuDefinition,
  MetaModule,
  ModelDefinition,
  ModuleHooks,
  ModuleRegistryResult,
  RouteDefinition,
  WidgetDefinition,
} from "../types.js";
import type { ModelMeta } from "../../schema/types.js";

const exampleModelMeta: ModelMeta = {
  model: "Invoice",
  label: "Invoice",
  label_plural: "Invoices",
  fields: [],
  views: {},
  actions: [],
};

describe("ModelDefinition — structural contract", () => {
  it("requires name, label, and meta", () => {
    const definition: ModelDefinition = {
      name: "Invoice",
      label: "Invoice",
      meta: exampleModelMeta,
      visible: true,
      icon: "receipt",
    };
    expect(definition.name).toBe("Invoice");
    expect(definition.meta.model).toBe("Invoice");
  });
});

describe("RouteDefinition — structural contract", () => {
  it("uses path, method, handler, and optional roles/description", () => {
    const route: RouteDefinition = {
      path: "/api/invoices",
      method: "GET",
      handler: "invoice.list",
      roles: ["finance.read"],
      description: "List invoices",
    };
    expect(route.method).toBe("GET");
    expect(route.handler).toBe("invoice.list");
  });
});

describe("ActionDefinition — structural contract", () => {
  it("uses name, label, type, models, and handler", () => {
    const action: ActionDefinition = {
      name: "approveInvoice",
      label: "Approve Invoice",
      type: "object",
      models: ["Invoice"],
      handler: "invoice.approve",
      roles: ["finance.approve"],
      icon: "check",
      description: "Approve a pending invoice",
    };
    expect(action.type).toBe("object");
    expect(action.models).toEqual(["Invoice"]);
  });
});

describe("WidgetDefinition — structural contract", () => {
  it("uses name, label, component, and optional size", () => {
    const widget: WidgetDefinition = {
      name: "invoiceAging",
      label: "Invoice Aging",
      component: "InvoiceAgingWidget",
      size: "large",
      roles: ["finance.read"],
      description: "Shows invoice aging buckets",
    };
    expect(widget.component).toBe("InvoiceAgingWidget");
    expect(widget.size).toBe("large");
  });
});

describe("MenuDefinition — structural contract", () => {
  it("uses name, label, optional path, and nested children", () => {
    const menu: MenuDefinition = {
      name: "finance",
      label: "Finance",
      path: "/finance",
      icon: "wallet",
      order: 10,
      children: [
        {
          name: "invoices",
          label: "Invoices",
          path: "/finance/invoices",
        },
      ],
    };
    expect(menu.children).toHaveLength(1);
    expect(menu.children?.[0]?.path).toBe("/finance/invoices");
  });
});

describe("ModuleHooks — structural contract", () => {
  it("supports lifecycle and CRUD hooks", async () => {
    const calls: string[] = [];
    const hooks: ModuleHooks = {
      onLoad: async () => {
        calls.push("load");
      },
      onEnable: async () => {
        calls.push("enable");
      },
      beforeCreate: async (model, data) => {
        calls.push(`${model}:${String(data["id"])}`);
      },
      afterDelete: async (model, id) => {
        calls.push(`deleted:${model}:${id}`);
      },
    };

    await hooks.onLoad?.();
    await hooks.onEnable?.();
    await hooks.beforeCreate?.("Invoice", { id: "inv-001" });
    await hooks.afterDelete?.("Invoice", "inv-001");

    expect(calls).toEqual(["load", "enable", "Invoice:inv-001", "deleted:Invoice:inv-001"]);
  });
});

describe("MetaModule — structural contract", () => {
  it("accepts a fully populated module definition", () => {
    const route: RouteDefinition = {
      path: "/api/invoices",
      method: "GET",
      handler: "invoice.list",
    };
    const action: ActionDefinition = {
      name: "approveInvoice",
      label: "Approve Invoice",
      type: "object",
      models: ["Invoice"],
      handler: "invoice.approve",
    };
    const widget: WidgetDefinition = {
      name: "invoiceAging",
      label: "Invoice Aging",
      component: "InvoiceAgingWidget",
      size: "medium",
    };
    const menu: MenuDefinition = {
      name: "finance",
      label: "Finance",
      path: "/finance",
    };

    const moduleDef: MetaModule = {
      name: "finance-core",
      label: "Finance Core",
      version: "1.0.0",
      description: "Core finance capabilities",
      author: "AFENDA",
      depends: ["core"],
      category: "finance",
      icon: "wallet",
      config: {
        enabled: true,
        settings: { currency: "USD" },
        features: { approvals: true },
      },
      models: [
        {
          name: "Invoice",
          label: "Invoice",
          meta: exampleModelMeta,
        },
      ],
      routes: [route],
      hooks: {},
      actions: [action],
      widgets: [widget],
      menus: [menu],
    };

    expect(moduleDef.name).toBe("finance-core");
    expect(moduleDef.models).toHaveLength(1);
    expect(moduleDef.routes?.[0]?.path).toBe("/api/invoices");
    expect(moduleDef.category).toBe("finance");
  });
});

describe("ModuleRegistryResult — structural contract", () => {
  it("returns modules, model map, count, and dependency graph", () => {
    const moduleDef: MetaModule = {
      name: "finance-core",
      label: "Finance Core",
      version: "1.0.0",
    };

    const registry: ModuleRegistryResult = {
      modules: [moduleDef],
      modelMap: new Map([["Invoice", "finance-core"]]),
      count: 1,
      dependencyGraph: new Map([["finance-core", ["core"]]]),
    };

    expect(registry.modules).toHaveLength(1);
    expect(registry.modelMap.get("Invoice")).toBe("finance-core");
    expect(registry.count).toBe(1);
    expect(registry.dependencyGraph.get("finance-core")).toEqual(["core"]);
  });
});
