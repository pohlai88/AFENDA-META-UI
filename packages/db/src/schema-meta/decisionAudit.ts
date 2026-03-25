/**
 * Decision Audit Persistence Tables — Phase 4: Audit Fabric
 *
 * Replaces the in-memory array/Map stores in apps/api/src/audit/decisionAuditLogger.ts
 * with DB-backed persistence for:
 *   - Decision audit entries (every platform decision logged)
 *   - Decision audit chains (correlated request-level traces)
 */

import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { DecisionAuditEntry } from "@afenda/meta-types";

// ── Enums ──────────────────────────────────────────────────────────────────

export const decisionEventTypeEnum = pgEnum("decision_event_type", [
  "metadata_resolved",
  "rule_evaluated",
  "policy_enforced",
  "workflow_transitioned",
  "event_propagated",
  "layout_rendered",
]);

export const decisionStatusEnum = pgEnum("decision_status", ["success", "error"]);

// ── Decision Audit Entries ─────────────────────────────────────────────────

export const decisionAuditEntries = pgTable(
  "decision_audit_entries",
  {
    id: text("id").primaryKey(),
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
    tenantId: text("tenant_id").notNull(),
    userId: text("user_id"),
    eventType: decisionEventTypeEnum("event_type").notNull(),
    scope: text("scope").notNull(),
    context: jsonb("context").$type<DecisionAuditEntry["context"]>().notNull().default({}),
    decision: jsonb("decision").$type<DecisionAuditEntry["decision"]>().notNull(),
    durationMs: real("duration_ms").notNull(),
    status: decisionStatusEnum("status").notNull(),
    error: jsonb("error").$type<DecisionAuditEntry["error"]>(),
    chainId: text("chain_id"),
  },
  (t) => ({
    tenantIdx: index("dae_tenant_idx").on(t.tenantId),
    eventTypeIdx: index("dae_event_type_idx").on(t.eventType),
    scopeIdx: index("dae_scope_idx").on(t.scope),
    timestampIdx: index("dae_timestamp_idx").on(t.timestamp),
    chainIdx: index("dae_chain_idx").on(t.chainId),
    userIdx: index("dae_user_idx").on(t.tenantId, t.userId),
  })
);

// ── Decision Audit Chains ──────────────────────────────────────────────────

export const decisionAuditChains = pgTable("decision_audit_chains", {
  rootId: text("root_id").primaryKey(),
  totalDurationMs: real("total_duration_ms").notNull().default(0),
  entryCount: integer("entry_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
