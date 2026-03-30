-- Phase 2: tenant quota increase requests (after upload enforcement is stable in app rollout).
-- Drizzle: packages/db/src/schema/reference/tables.ts (tenant_storage_quota_requests)

DO $$ BEGIN
  CREATE TYPE reference.tenant_storage_quota_request_status AS ENUM (
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'applied',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS reference.tenant_storage_quota_requests (
  request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id integer NOT NULL,
  requested_hard_quota_bytes bigint NOT NULL,
  reason text,
  status reference.tenant_storage_quota_request_status NOT NULL DEFAULT 'submitted',
  reviewed_by integer,
  reviewed_at timestamptz,
  decision_note text,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_reference_tenant_storage_quota_requests_requested_nonneg
    CHECK (requested_hard_quota_bytes >= 0),
  CONSTRAINT fk_reference_tenant_storage_quota_requests_tenant
    FOREIGN KEY (tenant_id) REFERENCES core.tenants (tenant_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_reference_tenant_storage_quota_requests_reviewer
    FOREIGN KEY (reviewed_by) REFERENCES security.users ("userId") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reference_tenant_storage_quota_requests_tenant_status
  ON reference.tenant_storage_quota_requests (tenant_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reference_tenant_storage_quota_requests_active_per_tenant
  ON reference.tenant_storage_quota_requests (tenant_id)
  WHERE status IN (
    'submitted'::reference.tenant_storage_quota_request_status,
    'under_review'::reference.tenant_storage_quota_request_status
  );

ALTER TABLE reference.tenant_storage_quota_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY reference_tenant_storage_quota_requests_tenant_select
  ON reference.tenant_storage_quota_requests
  AS PERMISSIVE FOR SELECT TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_tenant_storage_quota_requests_tenant_insert
  ON reference.tenant_storage_quota_requests
  AS PERMISSIVE FOR INSERT TO app_user
  WITH CHECK (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_tenant_storage_quota_requests_tenant_update
  ON reference.tenant_storage_quota_requests
  AS PERMISSIVE FOR UPDATE TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int)
  WITH CHECK (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_tenant_storage_quota_requests_tenant_delete
  ON reference.tenant_storage_quota_requests
  AS PERMISSIVE FOR DELETE TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
CREATE POLICY reference_tenant_storage_quota_requests_service_bypass
  ON reference.tenant_storage_quota_requests
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
