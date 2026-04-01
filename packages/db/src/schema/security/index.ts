// ============================================================================
// SECURITY DOMAIN — Public barrel (`security` pgSchema)
// ============================================================================
// Tables (6): users, roles, user_roles, permissions, role_permissions, user_permissions.
// Docs: README.md, ARCHITECTURE.md, security-docs/README.md (hub), SCHEMA_LOCKDOWN.md.
//
// Layers (export order):
//   1. Infrastructure — schema namespace, enums, shared Zod, relations catalog
//   2. Policy — pure permission precedence (no SQL)
//   3. Tables — dependency order: users → roles → user_roles → permissions (+ junctions in module)
//   4. Wire — namespaced Zod bundle for JSON/API (optional ergonomic import)
//
// Serialization: use `*SelectSchema` or `securityWire.*.select` for outbound JSON; insert/update
// schemas for validated writes. RLS: `tenantIsolationPolicies` + session GUCs at runtime.
// ============================================================================

// --- Infrastructure ----------------------------------------------------------
export * from "./_schema.js";
export * from "./_enums.js";
export * from "./_zodShared.js";
export * from "./_relations.js";

// --- Policy (pure) -----------------------------------------------------------
export * from "./permission-precedence.js";

// --- Tables (FK order) -------------------------------------------------------
export * from "./users.js";
export * from "./roles.js";
export * from "./userRoles.js";
export * from "./permissions.js";

// --- Wire (Zod bundle) -------------------------------------------------------
export { securityWire, type SecurityWire } from "./wire.js";
