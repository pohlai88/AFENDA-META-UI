import { boolean, index, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const lifecycleApprovalStatusEnum = pgEnum("lifecycle_approval_status", [
  "pending",
  "approved",
  "rejected",
]);

export const lifecycleAuditReports = pgTable(
  "lifecycle_audit_reports",
  {
    id: text("id").primaryKey(),
    policyId: text("policy_id").notNull(),
    effectivePolicyId: text("effective_policy_id").notNull(),
    command: text("command").notNull(),
    actor: text("actor"),
    governanceScore: text("governance_score").notNull(),
    governanceRating: text("governance_rating").notNull(),
    sevenWOneHComplete: boolean("seven_w_one_h_complete").notNull().default(false),
    digestSha256: text("digest_sha256").notNull(),
    digestSignature: text("digest_signature"),
    payload: jsonb("payload").notNull(),
    storageMirrorKey: text("storage_mirror_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    policyIdx: index("lifecycle_audit_reports_policy_idx").on(table.policyId),
    createdAtIdx: index("lifecycle_audit_reports_created_at_idx").on(table.createdAt),
    scoreIdx: index("lifecycle_audit_reports_score_idx").on(table.governanceScore),
  })
);

export const lifecycleOverrideApprovals = pgTable(
  "lifecycle_override_approvals",
  {
    id: text("id").primaryKey(),
    metadataOverrideId: text("metadata_override_id").notNull(),
    status: lifecycleApprovalStatusEnum("status").notNull().default("pending"),
    makerId: text("maker_id").notNull(),
    checkerId: text("checker_id"),
    decisionNotes: text("decision_notes"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    overrideIdx: index("lifecycle_override_approvals_override_idx").on(table.metadataOverrideId),
    statusIdx: index("lifecycle_override_approvals_status_idx").on(table.status),
    checkerIdx: index("lifecycle_override_approvals_checker_idx").on(table.checkerId),
  })
);
