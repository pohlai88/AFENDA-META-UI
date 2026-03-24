import { Users, Package } from "lucide-react";
import { describe, expect, it } from "vitest";
import { getSidebarIcon, registerSidebarIcon } from "./sidebar-icons";

describe("sidebar-icons", () => {
  it("uses scoped icon registration before global fallback", () => {
    registerSidebarIcon("sales", "CustomIcon", Users);
    registerSidebarIcon("CustomIcon", Package);

    expect(getSidebarIcon("sales", "CustomIcon")).toBe(Users);
    expect(getSidebarIcon("inventory", "CustomIcon")).toBe(Package);
  });

  it("keeps backward-compatible global lookup", () => {
    registerSidebarIcon("LegacyIcon", Users);

    expect(getSidebarIcon("LegacyIcon")).toBe(Users);
  });
});
