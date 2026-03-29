/**
 * @afenda/meta-types — Shared type definitions
 *
 * Re-exports from domain modules.
 * Safe to import from anywhere in the monorepo.
 */

// Core: utility types, JSON types, branded IDs, guard functions (runtime)
export * from "./core/index.js";

// Schema: field types, model meta, views, permissions
export type * from "./schema/index.js";

// RBAC: session context, result types
export type * from "./rbac/index.js";

// Compiler: entity definitions, truth model, state machine, record bridge
export type * from "./compiler/index.js";

// Module: module configuration and registry types
export type * from "./module/index.js";

// Layout: layout definition types
export type * from "./layout/index.js";

// Policy: policy types, invariants, sandbox, mutation policy
export type * from "./policy/index.js";

// Audit: audit types
export type * from "./audit/index.js";

// Events: domain event types
export type * from "./events/index.js";

// Graph: truth graph types
export type * from "./graph/index.js";

// Mesh: event mesh types
export type * from "./mesh/index.js";

// Workflow: workflow definition types
export type * from "./workflow/index.js";

// Platform: tenant, organization, cache types
export type * from "./platform/index.js";

// Inventory: warehouse, stock movement, item types
export type * from "./inventory/index.js";
