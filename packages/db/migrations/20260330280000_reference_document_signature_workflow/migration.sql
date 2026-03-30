-- Signature workflow primitives for Business Truth Storage Engine.
-- Adds workflow status on attachments + signer attestation evidence table.

DO $$ BEGIN
  CREATE TYPE reference.signature_workflow_status AS ENUM (
    'NOT_REQUIRED',
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reference.signature_attestation_status AS ENUM (
    'REQUESTED',
    'SIGNED',
    'DECLINED',
    'EXPIRED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE reference.document_attachments
  ADD COLUMN IF NOT EXISTS signature_workflow_status reference.signature_workflow_status NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN IF NOT EXISTS signature_workflow_updated_at timestamptz;

CREATE TABLE IF NOT EXISTS reference.document_signature_attestations (
  attestation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL,
  attachment_id uuid NOT NULL,
  signer_user_id integer,
  signer_email text NOT NULL,
  signer_name text,
  attestation_status reference.signature_attestation_status NOT NULL DEFAULT 'REQUESTED',
  attested_at timestamptz,
  evidence_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_reference_document_signature_attestations_tenant
    FOREIGN KEY (tenant_id) REFERENCES core.tenants (tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reference_document_signature_attestations_attachment
    FOREIGN KEY (attachment_id) REFERENCES reference.document_attachments (attachment_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_reference_document_signature_attestations_signer_user
    FOREIGN KEY (signer_user_id) REFERENCES security.users ("userId") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reference_document_signature_attestations_attachment
  ON reference.document_signature_attestations (tenant_id, attachment_id, attestation_status);

CREATE INDEX IF NOT EXISTS idx_reference_document_signature_attestations_signer
  ON reference.document_signature_attestations (tenant_id, signer_email, attestation_status);

ALTER TABLE reference.document_signature_attestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY reference_document_signature_attestations_tenant_select ON reference.document_signature_attestations
  AS PERMISSIVE FOR SELECT TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_signature_attestations_tenant_insert ON reference.document_signature_attestations
  AS PERMISSIVE FOR INSERT TO app_user
  WITH CHECK (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_signature_attestations_tenant_update ON reference.document_signature_attestations
  AS PERMISSIVE FOR UPDATE TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int)
  WITH CHECK (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_signature_attestations_tenant_delete ON reference.document_signature_attestations
  AS PERMISSIVE FOR DELETE TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_document_signature_attestations_service_bypass ON reference.document_signature_attestations
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
