export const SHELL_IDS = {
  sidebar: "app-sidebar",
} as const;

export const SHELL_LABELS = {
  sidebarPrimaryNavigation: "Primary navigation",
  sidebarOpen: "Open sidebar",
  sidebarClose: "Close sidebar",
} as const;

export const SHELL_LAYOUT = {
  topBar: "h-14 border-b border-border bg-card px-4 flex items-center justify-between gap-4",
  sidebarOverlay: "fixed inset-0 z-30 bg-black/40 md:hidden",
  sidebarBase:
    "fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-card transform transition-all duration-300 ease-in-out overflow-hidden",
  sidebarOpen: "translate-x-0 md:w-64",
  sidebarClosed: "-translate-x-full md:w-0",
  sidebarDesktop: "md:static md:translate-x-0 md:z-auto",
} as const;
