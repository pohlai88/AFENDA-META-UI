-- Generic blob lifecycle + dedup index for reference.document_attachments.
-- Drizzle: packages/db/src/schema/reference/tables.ts (storage_status, updated_at).

DO $$ BEGIN
  CREATE TYPE reference.storage_status AS ENUM (
    'pending_upload',
    'uploaded',
    'verified',
    'failed',
    'tombstone'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE reference.document_attachments
  ADD COLUMN IF NOT EXISTS storage_status reference.storage_status NOT NULL DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE reference.document_attachments
SET updated_at = created_at
WHERE updated_at < created_at;

CREATE UNIQUE INDEX IF NOT EXISTS uq_reference_document_attachments_tenant_checksum
  ON reference.document_attachments (tenant_id, checksum)
  WHERE checksum IS NOT NULL AND storage_status IS DISTINCT FROM 'tombstone'::reference.storage_status;
