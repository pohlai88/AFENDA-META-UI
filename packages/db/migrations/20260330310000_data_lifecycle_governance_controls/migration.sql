-- Data lifecycle governance controls:
-- 1) Append-only governance audit reports
-- 2) Maker-checker approvals for metadata overrides

DO $$ BEGIN
  CREATE TYPE lifecycle_approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS lifecycle_audit_reports (
  id text PRIMARY KEY,
  policy_id text NOT NULL,
  effective_policy_id text NOT NULL,
  command text NOT NULL,
  actor text,
  governance_score text NOT NULL,
  governance_rating text NOT NULL,
  seven_w_one_h_complete boolean NOT NULL DEFAULT false,
  digest_sha256 text NOT NULL,
  digest_signature text,
  payload jsonb NOT NULL,
  storage_mirror_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lifecycle_audit_reports_policy_idx
  ON lifecycle_audit_reports (policy_id);
CREATE INDEX IF NOT EXISTS lifecycle_audit_reports_created_at_idx
  ON lifecycle_audit_reports (created_at);
CREATE INDEX IF NOT EXISTS lifecycle_audit_reports_score_idx
  ON lifecycle_audit_reports (governance_score);

CREATE TABLE IF NOT EXISTS lifecycle_override_approvals (
  id text PRIMARY KEY,
  metadata_override_id text NOT NULL,
  status lifecycle_approval_status NOT NULL DEFAULT 'pending',
  maker_id text NOT NULL,
  checker_id text,
  decision_notes text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lifecycle_override_approvals_override_idx
  ON lifecycle_override_approvals (metadata_override_id);
CREATE INDEX IF NOT EXISTS lifecycle_override_approvals_status_idx
  ON lifecycle_override_approvals (status);
CREATE INDEX IF NOT EXISTS lifecycle_override_approvals_checker_idx
  ON lifecycle_override_approvals (checker_id);
