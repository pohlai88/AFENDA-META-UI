/**
 * Engine v2 — Meta Domain Pack
 * ==============================
 * Covers metadata/control-plane tables used by the runtime engine.
 *
 * NOTE:
 * Initial rollout is warn-only (audit spreads) to onboard meta tables into
 * the V2 pack set without introducing parser-related false failures.
 */

import { allAuditRules } from "../rules/audit.mjs";

const META_TABLES = [
  "schema_registry",
  "entities",
  "fields",
  "layouts",
  "policies",
  "audit_logs",
  "events",
  "tenant_definitions",
  "metadata_overrides",
  "industry_templates",
  "decision_audit_entries",
  "decision_audit_chains",
];

// Most meta tables do not use shared audit spreads; keep checks advisory-only.
const SOFT_DELETE_EXEMPT = new Set(META_TABLES);
const auditRules = META_TABLES.flatMap((table) =>
  allAuditRules(table, { skipSoftDelete: SOFT_DELETE_EXEMPT.has(table) })
);

export const metaRules = [...auditRules];
