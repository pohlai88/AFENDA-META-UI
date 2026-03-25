/**
 * Sidebar Store
 * ==============
 * Zustand store for sidebar visibility state.
 *
 * Features:
 * - Persists state to localStorage
 * - Simple toggle/open/close actions
 * - Type-safe state and actions
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SidebarState {
  isOpen: boolean;
  expandedModules: string[];
  toggle: () => void;
  open: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
  toggleModule: (moduleName: string) => void;
  expandModule: (moduleName: string) => void;
  collapseModule: (moduleName: string) => void;
  setExpandedModules: (modules: string[]) => void;
}

/**
 * Sidebar state store
 *
 * Usage:
 * ```tsx
 * const { isOpen, toggle } = useSidebarStore();
 * ```
 */
export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isOpen: true,
      expandedModules: ["sales"],
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      setOpen: (open: boolean) => set({ isOpen: open }),
      toggleModule: (moduleName: string) =>
        set((state) => ({
          expandedModules: state.expandedModules.includes(moduleName)
            ? state.expandedModules.filter((item) => item !== moduleName)
            : [...state.expandedModules, moduleName],
        })),
      expandModule: (moduleName: string) =>
        set((state) => ({
          expandedModules: state.expandedModules.includes(moduleName)
            ? state.expandedModules
            : [...state.expandedModules, moduleName],
        })),
      collapseModule: (moduleName: string) =>
        set((state) => ({
          expandedModules: state.expandedModules.filter((item) => item !== moduleName),
        })),
      setExpandedModules: (modules: string[]) =>
        set({ expandedModules: Array.from(new Set(modules)) }),
    }),
    {
      name: "afenda-sidebar",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
