import { beforeEach, describe, expect, it } from "vitest";
import { useSidebarStore } from "./sidebar-store";

describe("useSidebarStore", () => {
  beforeEach(() => {
    useSidebarStore.setState({ isOpen: true, expandedModules: ["sales"] });
  });

  it("toggles sidebar state", () => {
    expect(useSidebarStore.getState().isOpen).toBe(true);

    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().isOpen).toBe(false);

    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().isOpen).toBe(true);
  });

  it("opens and closes sidebar", () => {
    useSidebarStore.getState().close();
    expect(useSidebarStore.getState().isOpen).toBe(false);

    useSidebarStore.getState().open();
    expect(useSidebarStore.getState().isOpen).toBe(true);
  });

  it("sets sidebar with explicit value", () => {
    useSidebarStore.getState().setOpen(false);
    expect(useSidebarStore.getState().isOpen).toBe(false);

    useSidebarStore.getState().setOpen(true);
    expect(useSidebarStore.getState().isOpen).toBe(true);
  });

  it("toggles persisted module expansion state", () => {
    expect(useSidebarStore.getState().expandedModules).toEqual(["sales"]);

    useSidebarStore.getState().toggleModule("inventory");
    expect(useSidebarStore.getState().expandedModules).toEqual(["sales", "inventory"]);

    useSidebarStore.getState().toggleModule("sales");
    expect(useSidebarStore.getState().expandedModules).toEqual(["inventory"]);
  });

  it("supports explicit module expansion actions", () => {
    useSidebarStore.getState().expandModule("crm");
    useSidebarStore.getState().expandModule("crm");
    expect(useSidebarStore.getState().expandedModules).toEqual(["sales", "crm"]);

    useSidebarStore.getState().collapseModule("sales");
    expect(useSidebarStore.getState().expandedModules).toEqual(["crm"]);

    useSidebarStore.getState().setExpandedModules(["inventory", "inventory", "accounting"]);
    expect(useSidebarStore.getState().expandedModules).toEqual(["inventory", "accounting"]);
  });
});
