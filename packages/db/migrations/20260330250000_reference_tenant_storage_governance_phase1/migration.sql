-- Phase 1: tenant storage policy + usage counters + generic upload attachments + idempotency.
-- Drizzle: packages/db/src/schema/reference/tables.ts

DO $$ BEGIN
  CREATE TYPE reference.tenant_storage_class AS ENUM ('STANDARD', 'STANDARD_IA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE reference.attachment_entity_type ADD VALUE 'generic_upload';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS reference.tenant_storage_policies (
  tenant_id integer PRIMARY KEY,
  hard_quota_bytes bigint NOT NULL,
  grace_quota_bytes bigint NOT NULL DEFAULT 0,
  default_storage_class reference.tenant_storage_class NOT NULL DEFAULT 'STANDARD',
  is_upload_blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_reference_tenant_storage_policies_hard_quota_nonneg CHECK (hard_quota_bytes >= 0),
  CONSTRAINT chk_reference_tenant_storage_policies_grace_nonneg CHECK (grace_quota_bytes >= 0),
  CONSTRAINT fk_reference_tenant_storage_policies_tenant
    FOREIGN KEY (tenant_id) REFERENCES core.tenants (tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS reference.tenant_storage_usage (
  tenant_id integer PRIMARY KEY,
  reserved_bytes bigint NOT NULL DEFAULT 0,
  committed_bytes bigint NOT NULL DEFAULT 0,
  last_reconciled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_reference_tenant_storage_usage_reserved_nonneg CHECK (reserved_bytes >= 0),
  CONSTRAINT chk_reference_tenant_storage_usage_committed_nonneg CHECK (committed_bytes >= 0),
  CONSTRAINT fk_reference_tenant_storage_usage_tenant
    FOREIGN KEY (tenant_id) REFERENCES core.tenants (tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE reference.tenant_storage_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference.tenant_storage_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY reference_tenant_storage_policies_tenant_select ON reference.tenant_storage_policies
  AS PERMISSIVE FOR SELECT TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_tenant_storage_policies_tenant_insert ON reference.tenant_storage_policies
  AS PERMISSIVE FOR INSERT TO app_user
  WITH CHECK (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_tenant_storage_policies_tenant_update ON reference.tenant_storage_policies
  AS PERMISSIVE FOR UPDATE TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int)
  WITH CHECK (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_tenant_storage_policies_tenant_delete ON reference.tenant_storage_policies
  AS PERMISSIVE FOR DELETE TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_tenant_storage_policies_service_bypass ON reference.tenant_storage_policies
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY reference_tenant_storage_usage_tenant_select ON reference.tenant_storage_usage
  AS PERMISSIVE FOR SELECT TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_tenant_storage_usage_tenant_insert ON reference.tenant_storage_usage
  AS PERMISSIVE FOR INSERT TO app_user
  WITH CHECK (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_tenant_storage_usage_tenant_update ON reference.tenant_storage_usage
  AS PERMISSIVE FOR UPDATE TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int)
  WITH CHECK (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_tenant_storage_usage_tenant_delete ON reference.tenant_storage_usage
  AS PERMISSIVE FOR DELETE TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_tenant_storage_usage_service_bypass ON reference.tenant_storage_usage
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE reference.document_attachments
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_reference_document_attachments_tenant_idempotency
  ON reference.document_attachments (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
