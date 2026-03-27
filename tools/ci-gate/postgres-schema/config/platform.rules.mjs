/**
 * Engine v2 — Platform Domain Pack
 * ==================================
 * Adds advisory guardrails for core/security tables outside sales domain.
 *
 * NOTE:
 * This first cut is intentionally warn-only (audit spreads) to avoid parser
 * false negatives across non-sales schema styles. Structural error rules can
 * be layered in incrementally per table after extractor hardening.
 */

import { allAuditRules } from "../rules/audit.mjs";

const PLATFORM_TABLES = [
  "tenants",
  "app_modules",
  "users",
  "roles",
  "permissions",
  "role_permissions",
  "user_permissions",
  "user_roles",
];

const SOFT_DELETE_EXEMPT = new Set(["user_roles"]);
const auditRules = PLATFORM_TABLES.flatMap((table) =>
  allAuditRules(table, { skipSoftDelete: SOFT_DELETE_EXEMPT.has(table) })
);

export const platformRules = [...auditRules];
