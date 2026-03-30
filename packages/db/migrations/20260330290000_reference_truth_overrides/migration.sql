-- Truth override audit + false-block attribution.

DO $$ BEGIN
  CREATE TYPE reference.truth_override_outcome AS ENUM (
    'CONFIRMED_BLOCK',
    'FALSE_BLOCK',
    'WAIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS reference.document_truth_overrides (
  override_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL,
  attachment_id uuid NOT NULL,
  task_id uuid,
  actor_user_id integer,
  override_outcome reference.truth_override_outcome NOT NULL,
  previous_recommended_action reference.truth_recommended_action NOT NULL,
  override_recommended_action reference.truth_recommended_action NOT NULL,
  reason text NOT NULL,
  evidence_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_reference_document_truth_overrides_tenant
    FOREIGN KEY (tenant_id) REFERENCES core.tenants (tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reference_document_truth_overrides_attachment
    FOREIGN KEY (attachment_id) REFERENCES reference.document_attachments (attachment_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reference_document_truth_overrides_task
    FOREIGN KEY (task_id) REFERENCES reference.document_truth_resolution_tasks (task_id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_reference_document_truth_overrides_actor
    FOREIGN KEY (actor_user_id) REFERENCES security.users ("userId") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reference_document_truth_overrides_attachment
  ON reference.document_truth_overrides (tenant_id, attachment_id, created_at);

CREATE INDEX IF NOT EXISTS idx_reference_document_truth_overrides_outcome
  ON reference.document_truth_overrides (tenant_id, override_outcome);

ALTER TABLE reference.document_truth_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY reference_document_truth_overrides_tenant_select ON reference.document_truth_overrides
  AS PERMISSIVE FOR SELECT TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_truth_overrides_tenant_insert ON reference.document_truth_overrides
  AS PERMISSIVE FOR INSERT TO app_user
  WITH CHECK (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_truth_overrides_tenant_update ON reference.document_truth_overrides
  AS PERMISSIVE FOR UPDATE TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int)
  WITH CHECK (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_truth_overrides_tenant_delete ON reference.document_truth_overrides
  AS PERMISSIVE FOR DELETE TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_truth_overrides_service_bypass ON reference.document_truth_overrides
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
