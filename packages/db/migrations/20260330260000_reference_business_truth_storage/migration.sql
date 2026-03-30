-- Business Truth Storage Engine: truth resolution, compiler log, resolution tasks, pre-decision blocks.
-- Drizzle: packages/db/src/schema/reference/tables.ts

DO $$ BEGIN
  CREATE TYPE reference.truth_resolution_state AS ENUM ('RESOLVED', 'AMBIGUOUS', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reference.truth_recommended_action AS ENUM ('ALLOW', 'ESCALATE', 'BLOCK');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reference.truth_duplicate_risk AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reference.truth_resolution_task_status AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reference.pre_decision_block_type AS ENUM (
    'PAYMENT',
    'CONTRACT_EXECUTION',
    'DELETE',
    'WORKFLOW_ADVANCE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reference.malware_scan_status AS ENUM (
    'not_required',
    'pending',
    'clean',
    'quarantined',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE reference.document_attachments
  ADD COLUMN IF NOT EXISTS truth_resolution_state reference.truth_resolution_state NOT NULL DEFAULT 'RESOLVED',
  ADD COLUMN IF NOT EXISTS truth_policy_version text,
  ADD COLUMN IF NOT EXISTS truth_decision_at timestamptz,
  ADD COLUMN IF NOT EXISTS truth_decision_summary jsonb,
  ADD COLUMN IF NOT EXISTS truth_requires_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_event_type text,
  ADD COLUMN IF NOT EXISTS business_event_id uuid,
  ADD COLUMN IF NOT EXISTS malware_scan_status reference.malware_scan_status NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS legal_hold_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retention_expires_at timestamptz;

CREATE TABLE IF NOT EXISTS reference.document_truth_decisions (
  decision_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL,
  attachment_id uuid NOT NULL,
  resolution_state reference.truth_resolution_state NOT NULL,
  recommended_action reference.truth_recommended_action NOT NULL,
  duplicate_risk reference.truth_duplicate_risk NOT NULL,
  financial_impact_amount numeric(18, 4),
  requires_human_review boolean NOT NULL,
  decision_reasons text[] NOT NULL,
  evidence_refs jsonb NOT NULL,
  policy_version text NOT NULL,
  compiled_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_reference_document_truth_decisions_tenant
    FOREIGN KEY (tenant_id) REFERENCES core.tenants (tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reference_document_truth_decisions_attachment
    FOREIGN KEY (attachment_id) REFERENCES reference.document_attachments (attachment_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reference_document_truth_decisions_tenant_attachment_time
  ON reference.document_truth_decisions (tenant_id, attachment_id, compiled_at DESC);

CREATE INDEX IF NOT EXISTS idx_reference_document_truth_decisions_tenant_resolution
  ON reference.document_truth_decisions (tenant_id, resolution_state);

CREATE INDEX IF NOT EXISTS idx_reference_document_truth_decisions_reasons_gin
  ON reference.document_truth_decisions USING gin (decision_reasons);

ALTER TABLE reference.document_truth_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY reference_document_truth_decisions_tenant_select ON reference.document_truth_decisions
  AS PERMISSIVE FOR SELECT TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_truth_decisions_tenant_insert ON reference.document_truth_decisions
  AS PERMISSIVE FOR INSERT TO app_user
  WITH CHECK (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_truth_decisions_tenant_update ON reference.document_truth_decisions
  AS PERMISSIVE FOR UPDATE TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int)
  WITH CHECK (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_truth_decisions_tenant_delete ON reference.document_truth_decisions
  AS PERMISSIVE FOR DELETE TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_truth_decisions_service_bypass ON reference.document_truth_decisions
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS reference.document_truth_resolution_tasks (
  task_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL,
  attachment_id uuid NOT NULL,
  task_status reference.truth_resolution_task_status NOT NULL DEFAULT 'OPEN',
  assigned_to integer,
  opened_reason_codes text[] NOT NULL,
  blocked_effects text[] NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT fk_reference_truth_resolution_tasks_tenant
    FOREIGN KEY (tenant_id) REFERENCES core.tenants (tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reference_truth_resolution_tasks_attachment
    FOREIGN KEY (attachment_id) REFERENCES reference.document_attachments (attachment_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reference_truth_resolution_tasks_assigned
    FOREIGN KEY (assigned_to) REFERENCES security.users ("userId") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reference_truth_resolution_tasks_open_per_attachment
  ON reference.document_truth_resolution_tasks (tenant_id, attachment_id)
  WHERE task_status IN (
    'OPEN'::reference.truth_resolution_task_status,
    'IN_REVIEW'::reference.truth_resolution_task_status
  );

CREATE INDEX IF NOT EXISTS idx_reference_truth_resolution_tasks_tenant_status
  ON reference.document_truth_resolution_tasks (tenant_id, task_status);

ALTER TABLE reference.document_truth_resolution_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY reference_document_truth_resolution_tasks_tenant_select ON reference.document_truth_resolution_tasks
  AS PERMISSIVE FOR SELECT TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_truth_resolution_tasks_tenant_insert ON reference.document_truth_resolution_tasks
  AS PERMISSIVE FOR INSERT TO app_user
  WITH CHECK (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_truth_resolution_tasks_tenant_update ON reference.document_truth_resolution_tasks
  AS PERMISSIVE FOR UPDATE TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int)
  WITH CHECK (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_truth_resolution_tasks_tenant_delete ON reference.document_truth_resolution_tasks
  AS PERMISSIVE FOR DELETE TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_truth_resolution_tasks_service_bypass ON reference.document_truth_resolution_tasks
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS reference.document_pre_decision_blocks (
  block_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL,
  attachment_id uuid NOT NULL,
  block_type reference.pre_decision_block_type NOT NULL,
  block_reason_code text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  cleared_at timestamptz,
  CONSTRAINT fk_reference_pre_decision_blocks_tenant
    FOREIGN KEY (tenant_id) REFERENCES core.tenants (tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reference_pre_decision_blocks_attachment
    FOREIGN KEY (attachment_id) REFERENCES reference.document_attachments (attachment_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reference_pre_decision_blocks_tenant_attachment_active
  ON reference.document_pre_decision_blocks (tenant_id, attachment_id, active);

ALTER TABLE reference.document_pre_decision_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY reference_document_pre_decision_blocks_tenant_select ON reference.document_pre_decision_blocks
  AS PERMISSIVE FOR SELECT TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_pre_decision_blocks_tenant_insert ON reference.document_pre_decision_blocks
  AS PERMISSIVE FOR INSERT TO app_user
  WITH CHECK (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_pre_decision_blocks_tenant_update ON reference.document_pre_decision_blocks
  AS PERMISSIVE FOR UPDATE TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int)
  WITH CHECK (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_pre_decision_blocks_tenant_delete ON reference.document_pre_decision_blocks
  AS PERMISSIVE FOR DELETE TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_pre_decision_blocks_service_bypass ON reference.document_pre_decision_blocks
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
