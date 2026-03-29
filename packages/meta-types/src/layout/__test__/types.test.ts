/**
 * Layout contract tests.
 *
 * Design intent: recursive layout nodes are shared across UI composition flows.
 * Field references, view targeting, and resolved field extraction must remain stable.
 */
import { describe, expect, it } from "vitest";

import type {
  LayoutCustom,
  LayoutDefinition,
  LayoutField,
  LayoutGrid,
  LayoutNode,
  LayoutSection,
  LayoutTab,
  LayoutTabs,
  LayoutViewType,
  ResolvedLayout,
} from "../types.js";
import type { ConditionExpression } from "../../schema/types.js";

const visibleIf: ConditionExpression = {
  field: "status",
  operator: "eq",
  value: "approved",
};

describe("LayoutField — structural contract", () => {
  it("uses fieldId and optional span", () => {
    const field: LayoutField = {
      type: "field",
      fieldId: "customerId",
      span: 2,
    };
    expect(field.fieldId).toBe("customerId");
    expect(field.span).toBe(2);
  });
});

describe("LayoutCustom — structural contract", () => {
  it("uses component and optional props", () => {
    const custom: LayoutCustom = {
      type: "custom",
      component: "InvoiceTotalsCard",
      props: { compact: true },
    };
    expect(custom.component).toBe("InvoiceTotalsCard");
    expect(custom.props?.["compact"]).toBe(true);
  });
});

describe("LayoutGrid — structural contract", () => {
  it("uses columns, optional gap, and children", () => {
    const grid: LayoutGrid = {
      type: "grid",
      columns: 3,
      gap: 16,
      children: [{ type: "field", fieldId: "invoiceNumber" }],
    };
    expect(grid.columns).toBe(3);
    expect(grid.gap).toBe(16);
    expect(grid.children).toHaveLength(1);
  });
});

describe("LayoutSection — structural contract", () => {
  it("uses optional title and visibility metadata", () => {
    const section: LayoutSection = {
      type: "section",
      title: "Approval",
      collapsible: true,
      defaultCollapsed: false,
      visibleIf,
      children: [{ type: "field", fieldId: "approvedAt" }],
    };
    expect(section.title).toBe("Approval");
    if (section.visibleIf && "field" in section.visibleIf) {
      expect(section.visibleIf.field).toBe("status");
    } else {
      throw new Error("expected a field-based visibleIf condition");
    }
    expect(section.children).toHaveLength(1);
  });

  it("allows title to be omitted", () => {
    const section: LayoutSection = {
      type: "section",
      children: [],
    };
    expect(section.title).toBeUndefined();
  });
});

describe("LayoutTab and LayoutTabs — structural contract", () => {
  it("uses tabs without a tab id field", () => {
    const tab: LayoutTab = {
      label: "Details",
      icon: "file",
      visibleIf,
      children: [{ type: "field", fieldId: "description" }],
    };
    const tabs: LayoutTabs = {
      type: "tabs",
      tabs: [tab],
    };
    expect(tab.label).toBe("Details");
    expect(tabs.tabs).toHaveLength(1);
    expect(tabs.tabs[0]?.children[0]).toEqual({ type: "field", fieldId: "description" });
  });
});

describe("LayoutViewType — exhaustive literal union", () => {
  it("covers all supported view types", () => {
    const viewTypes: LayoutViewType[] = ["form", "list", "kanban", "dashboard", "wizard"];
    expect(viewTypes).toHaveLength(5);
  });
});

describe("LayoutNode — recursive union", () => {
  it("accepts all layout node variants", () => {
    const nodes: LayoutNode[] = [
      { type: "field", fieldId: "invoiceNumber" },
      { type: "custom", component: "InvoiceCard" },
      { type: "grid", columns: 2, children: [] },
      { type: "section", children: [] },
      { type: "tabs", tabs: [] },
    ];
    expect(nodes).toHaveLength(5);
  });
});

describe("LayoutDefinition — structural contract", () => {
  it("uses id, model, name, viewType, and root", () => {
    const layout: LayoutDefinition = {
      id: "invoice-compact-form",
      model: "Invoice",
      name: "Invoice Compact Form",
      viewType: "form",
      root: {
        type: "section",
        title: "Main",
        children: [
          {
            type: "grid",
            columns: 2,
            children: [
              { type: "field", fieldId: "invoiceNumber" },
              { type: "field", fieldId: "customerId" },
            ],
          },
        ],
      },
      scope: "global",
      roles: ["finance.read"],
      isDefault: true,
    };
    expect(layout.id).toBe("invoice-compact-form");
    expect(layout.model).toBe("Invoice");
    expect(layout.name).toBe("Invoice Compact Form");
    expect(layout.viewType).toBe("form");
    expect(layout.isDefault).toBe(true);
  });
});

describe("ResolvedLayout — structural contract", () => {
  it("wraps a layout with referenced field ids", () => {
    const resolved: ResolvedLayout = {
      layout: {
        id: "invoice-list",
        model: "Invoice",
        name: "Invoice List",
        viewType: "list",
        root: { type: "field", fieldId: "invoiceNumber" },
      },
      referencedFieldIds: ["invoiceNumber", "customerId"],
    };
    expect(resolved.layout.model).toBe("Invoice");
    expect(resolved.referencedFieldIds).toContain("customerId");
  });
});
