/**
 * @afenda/meta-types — Shared type definitions (pure types, zero runtime)
 *
 * Exports: Schema, RBAC, module, layout, policy, audit, events, sandbox, graph, mesh, workflow, tenant types
 * Safe to import from anywhere in the monorepo.
 */

export type * from "./schema.js";
export type * from "./rbac.js";
export type * from "./module.js";
export type * from "./layout.js";
export type * from "./policy.js";
export * from "./audit.js";
export type * from "./events.js";
export type * from "./entity-def.js";
export type * from "./invariants.js";
export type * from "./sandbox.js";
export * from "./graph.js";
export type * from "./mesh.js";
export type * from "./state-machine.js";
export type * from "./truth-model.js";
export type * from "./workflow.js";
export type * from "./tenant.js";
export * from "./resolutionCache.js";
export * from "./utils.js";
