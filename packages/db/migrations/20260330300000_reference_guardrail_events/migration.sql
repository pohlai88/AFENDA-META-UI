-- Guardrail evaluation event stream (policy bypass/blocked action observability).

DO $$ BEGIN
  CREATE TYPE reference.guardrail_action_type AS ENUM (
    'PAYMENT',
    'CONTRACT_EXECUTION',
    'DELETE',
    'WORKFLOW_ADVANCE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS reference.document_guardrail_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL,
  attachment_id uuid NOT NULL,
  attempted_action reference.guardrail_action_type NOT NULL,
  blocked boolean NOT NULL,
  reason_codes text[] NOT NULL,
  actor_user_id integer,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_reference_document_guardrail_events_tenant
    FOREIGN KEY (tenant_id) REFERENCES core.tenants (tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reference_document_guardrail_events_attachment
    FOREIGN KEY (attachment_id) REFERENCES reference.document_attachments (attachment_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reference_document_guardrail_events_actor
    FOREIGN KEY (actor_user_id) REFERENCES security.users ("userId") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reference_document_guardrail_events_attachment
  ON reference.document_guardrail_events (tenant_id, attachment_id, created_at);

CREATE INDEX IF NOT EXISTS idx_reference_document_guardrail_events_action
  ON reference.document_guardrail_events (tenant_id, attempted_action, blocked);

ALTER TABLE reference.document_guardrail_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY reference_document_guardrail_events_tenant_select ON reference.document_guardrail_events
  AS PERMISSIVE FOR SELECT TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_guardrail_events_tenant_insert ON reference.document_guardrail_events
  AS PERMISSIVE FOR INSERT TO app_user
  WITH CHECK (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_guardrail_events_tenant_update ON reference.document_guardrail_events
  AS PERMISSIVE FOR UPDATE TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int)
  WITH CHECK (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_guardrail_events_tenant_delete ON reference.document_guardrail_events
  AS PERMISSIVE FOR DELETE TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_guardrail_events_service_bypass ON reference.document_guardrail_events
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
