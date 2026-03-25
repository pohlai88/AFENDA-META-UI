import {
  FileText,
  FolderTree,
  ListOrdered,
  Package,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";

function toScopedName(moduleName: string, iconName: string) {
  return `${moduleName}:${iconName}`;
}

const iconRegistry = new Map<string, LucideIcon>([
  ["ShoppingCart", ShoppingCart],
  ["Package", Package],
  ["Users", Users],
  ["FileText", FileText],
  ["FolderTree", FolderTree],
  ["ListOrdered", ListOrdered],
]);

export function registerSidebarIcon(moduleName: string, name: string, icon: LucideIcon): void;
export function registerSidebarIcon(name: string, icon: LucideIcon): void;
export function registerSidebarIcon(
  arg1: string,
  arg2: string | LucideIcon,
  arg3?: LucideIcon
) {
  if (arg3) {
    iconRegistry.set(toScopedName(arg1, arg2 as string), arg3);
    return;
  }

  iconRegistry.set(arg1, arg2 as LucideIcon);
}

export function getSidebarIcon(moduleName: string, iconName?: string): LucideIcon;
export function getSidebarIcon(iconName?: string): LucideIcon;
export function getSidebarIcon(arg1?: string, arg2?: string) {
  const hasModuleScope = typeof arg2 !== "undefined";
  const moduleName = hasModuleScope ? arg1 : undefined;
  const iconName = hasModuleScope ? arg2 : arg1;

  if (!iconName) {
    return FileText;
  }

  if (moduleName) {
    const scopedIcon = iconRegistry.get(toScopedName(moduleName, iconName));
    if (scopedIcon) {
      return scopedIcon;
    }
  }

  return iconRegistry.get(iconName) ?? FileText;
}