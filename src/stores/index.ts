/**
 * Stores Index
 * =============
 * Central export for all state management stores.
 * 
 * Organization:
 * - ui/        → Zustand stores (lightweight UI state)
 * - business/  → Redux stores (business logic, middleware)
 * - server/    → React Query (server state, API data)
 */

// UI Stores (Zustand)
export * from "./ui";

// Business Stores (Redux Toolkit)
export * from "./business";

// Server state is managed via React Query hooks in ~/hooks/
// See: useModules, useMeta, useModel
