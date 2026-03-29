/**
 * Mutation Policy Violations Table — Wave 5A: Gateway Observability
 *
 * Persists each MutationPolicyViolationError that passes through
 * executeMutationCommand so that ops teams can audit which commands
 * were blocked and why, without having to tail application logs.
 *
 * Wire up via the `onPolicyViolation` callback on ExecuteMutationCommandInput.
 */

import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const mutationPolicyViolations = pgTable(
  "mutation_policy_violations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    policyId: text("policy_id").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    tenantId: integer("tenant_id"),
    operation: text("operation").notNull(),
    violationType: text("violation_type").notNull(),
    details: jsonb("details"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("mpv_policy_idx").on(t.policyId),
    index("mpv_entity_type_idx").on(t.entityType),
    index("mpv_tenant_idx").on(t.tenantId),
    index("mpv_created_at_idx").on(t.createdAt),
  ]
);
