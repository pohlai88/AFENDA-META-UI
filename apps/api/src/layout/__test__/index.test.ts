import { describe, it, expect, beforeEach } from "vitest";
import {
  registerLayout,
  removeLayout,
  clearLayouts,
  getLayout,
  getAllLayouts,
  resolveLayout,
  validateLayout,
  flattenRenderPlan,
} from "../index.js";
import type { LayoutDefinition, LayoutNode } from "@afenda/meta-types/layout";
// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSectionLayout(overrides: Partial<LayoutDefinition> = {}): LayoutDefinition {
  const root: LayoutNode = {
    type: "section",
    title: "General",
    children: [
      { type: "field", fieldId: "name", span: 2 },
      { type: "field", fieldId: "email" },
    ],
  };

  return {
    id: "layout-1",
    model: "customer",
    name: "Default Customer Form",
    viewType: "form",
    root,
    isDefault: true,
    ...overrides,
  };
}

function makeGridLayout(): LayoutDefinition {
  const root: LayoutNode = {
    type: "grid",
    columns: 3,
    gap: 8,
    children: [
      { type: "field", fieldId: "f1" },
      { type: "field", fieldId: "f2", span: 2 },
    ],
  };
  return {
    id: "layout-grid",
    model: "product",
    name: "Product Grid",
    viewType: "form",
    root,
    isDefault: true,
  };
}

function makeTabLayout(): LayoutDefinition {
  const root: LayoutNode = {
    type: "tabs",
    tabs: [
      {
        label: "Basic",
        children: [{ type: "field", fieldId: "name" }],
      },
      {
        label: "Advanced",
        children: [{ type: "field", fieldId: "code" }],
      },
    ],
  };
  return {
    id: "layout-tabs",
    model: "item",
    name: "Item Tabs",
    viewType: "form",
    root,
    isDefault: true,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("layout engine — registry", () => {
  beforeEach(() => clearLayouts());

  it("registers and retrieves a layout", () => {
    const layout = makeSectionLayout();
    registerLayout(layout);
    expect(getLayout("layout-1")).toEqual(layout);
  });

  it("removes a layout", () => {
    registerLayout(makeSectionLayout());
    expect(removeLayout("layout-1")).toBe(true);
    expect(getLayout("layout-1")).toBeUndefined();
  });

  it("returns undefined for unknown layout", () => {
    expect(getLayout("nope")).toBeUndefined();
  });

  it("getAllLayouts returns all registered", () => {
    registerLayout(makeSectionLayout());
    registerLayout(makeGridLayout());
    expect(getAllLayouts()).toHaveLength(2);
  });
});

describe("layout engine — resolveLayout", () => {
  beforeEach(() => clearLayouts());

  it("resolves default layout for model", () => {
    const layout = makeSectionLayout();
    registerLayout(layout);

    const resolved = resolveLayout({
      model: "customer",
      viewType: "form",
      roles: ["viewer"],
    });

    expect(resolved).not.toBeNull();
    expect(resolved!.layout.id).toBe("layout-1");
    expect(resolved!.referencedFieldIds).toContain("name");
    expect(resolved!.referencedFieldIds).toContain("email");
  });

  it("resolves role-specific layout over default", () => {
    const defaultLayout = makeSectionLayout();
    const adminLayout = makeSectionLayout({
      id: "layout-admin",
      roles: ["admin"],
      isDefault: false,
    });

    registerLayout(defaultLayout);
    registerLayout(adminLayout);

    const resolved = resolveLayout({
      model: "customer",
      viewType: "form",
      roles: ["admin"],
    });

    expect(resolved!.layout.id).toBe("layout-admin");
  });

  it("returns null when no matching layouts exist", () => {
    const resolved = resolveLayout({
      model: "nonexistent",
      viewType: "form",
      roles: [],
    });
    expect(resolved).toBeNull();
  });

  it("falls back to first available layout", () => {
    const layout = makeSectionLayout({ isDefault: false });
    registerLayout(layout);

    const resolved = resolveLayout({
      model: "customer",
      viewType: "form",
      roles: ["viewer"],
    });

    expect(resolved).not.toBeNull();
    expect(resolved!.layout.id).toBe("layout-1");
  });
});

describe("layout engine — validateLayout", () => {
  it("reports unknown field IDs", () => {
    const layout = makeSectionLayout();
    const validFields = new Set(["name"]); // "email" is missing

    const errors = validateLayout(layout, validFields);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.message.includes("email"))).toBe(true);
  });

  it("returns no errors for valid layout", () => {
    const layout = makeSectionLayout();
    const validFields = new Set(["name", "email"]);

    const errors = validateLayout(layout, validFields);
    expect(errors).toHaveLength(0);
  });

  it("reports grid columns out of range", () => {
    const root: LayoutNode = {
      type: "grid",
      columns: 20,
      children: [{ type: "field", fieldId: "f1" }],
    };
    const layout: LayoutDefinition = {
      id: "l1",
      model: "e",
      name: "Bad grid",
      viewType: "form",
      root,
    };

    const errors = validateLayout(layout, new Set(["f1"]));
    expect(errors.some((e) => e.message.includes("columns"))).toBe(true);
  });
});

describe("layout engine — flattenRenderPlan", () => {
  it("flattens a section with fields", () => {
    const layout = makeSectionLayout();
    const plan = flattenRenderPlan(layout.root);

    expect(plan.length).toBeGreaterThanOrEqual(3); // section + 2 fields
    expect(plan[0].type).toBe("section");
    expect(plan.some((item) => item.fieldId === "name")).toBe(true);
    expect(plan.some((item) => item.fieldId === "email")).toBe(true);
  });

  it("flattens tabs structure", () => {
    const layout = makeTabLayout();
    const plan = flattenRenderPlan(layout.root);

    expect(plan[0].type).toBe("tabs");
    expect(plan.some((item) => item.fieldId === "name")).toBe(true);
    expect(plan.some((item) => item.fieldId === "code")).toBe(true);
  });

  it("assigns depth and parentPath", () => {
    const layout = makeSectionLayout();
    const plan = flattenRenderPlan(layout.root);

    const sectionItem = plan.find((item) => item.type === "section");
    expect(sectionItem!.depth).toBe(0);

    const fieldItem = plan.find((item) => item.fieldId === "name");
    expect(fieldItem!.depth).toBe(1);
  });
});
