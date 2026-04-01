-- Financial boundary hardening: versioning, monetary decomposition, snapshot hash, FX context,
-- idempotency, JSON shape checks, phase/lock invariants, and immutability after lock (void/post exempt).

-- ---------------------------------------------------------------------------
-- New columns (nullable first for backfill)
-- ---------------------------------------------------------------------------
ALTER TABLE sales.document_truth_bindings
  ADD COLUMN IF NOT EXISTS binding_version integer NOT NULL DEFAULT 1;

ALTER TABLE sales.document_truth_bindings
  ADD COLUMN IF NOT EXISTS subtotal_amount numeric(14, 2),
  ADD COLUMN IF NOT EXISTS tax_amount numeric(14, 2),
  ADD COLUMN IF NOT EXISTS snapshot_hash text,
  ADD COLUMN IF NOT EXISTS fx_rate numeric(18, 8),
  ADD COLUMN IF NOT EXISTS fx_as_of timestamptz,
  ADD COLUMN IF NOT EXISTS base_currency_id integer,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Monotonic version per document (voided rows retain history).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY tenant_id, document_type, document_id
      ORDER BY committed_at ASC, id ASC
    ) AS ver
  FROM sales.document_truth_bindings
)
UPDATE sales.document_truth_bindings AS d
SET binding_version = ranked.ver
FROM ranked
WHERE d.id = ranked.id;

-- Backfill subtotal/tax from frozen header snapshot; coerce total = subtotal + tax.
UPDATE sales.document_truth_bindings
SET
  subtotal_amount = COALESCE(
    NULLIF(btrim(header_snapshot ->> 'amountUntaxed'), '')::numeric,
    total_amount
  ),
  tax_amount = COALESCE(
    NULLIF(btrim(header_snapshot ->> 'amountTax'), '')::numeric,
    0::numeric
  )
WHERE subtotal_amount IS NULL OR tax_amount IS NULL;

UPDATE sales.document_truth_bindings
SET tax_amount = total_amount - subtotal_amount
WHERE total_amount IS DISTINCT FROM (subtotal_amount + tax_amount);

UPDATE sales.document_truth_bindings
SET snapshot_hash = 'legacy-md5:' || md5(
  id::text || '|' || total_amount::text || '|' || header_snapshot::text || '|' || line_snapshot::text || '|' || tax_snapshot::text
)
WHERE snapshot_hash IS NULL;

-- Normalize line_snapshot to { "lines": <array> } for CHECK constraints.
UPDATE sales.document_truth_bindings
SET line_snapshot = CASE
  WHEN jsonb_typeof(line_snapshot) = 'object'
       AND jsonb_typeof(line_snapshot -> 'lines') = 'array' THEN line_snapshot
  WHEN jsonb_typeof(line_snapshot) = 'array' THEN jsonb_build_object('lines', line_snapshot)
  ELSE jsonb_build_object('lines', '[]'::jsonb)
END;

ALTER TABLE sales.document_truth_bindings
  ALTER COLUMN subtotal_amount SET NOT NULL,
  ALTER COLUMN tax_amount SET NOT NULL,
  ALTER COLUMN snapshot_hash SET NOT NULL;

ALTER TABLE sales.document_truth_bindings
  ADD CONSTRAINT chk_sales_document_truth_bindings_subtotal_non_negative CHECK (subtotal_amount >= 0),
  ADD CONSTRAINT chk_sales_document_truth_bindings_tax_non_negative CHECK (tax_amount >= 0);

ALTER TABLE sales.document_truth_bindings
  ADD CONSTRAINT chk_sales_document_truth_bindings_total_matches_parts
  CHECK (total_amount = subtotal_amount + tax_amount);

ALTER TABLE sales.document_truth_bindings
  ADD CONSTRAINT chk_sales_document_truth_bindings_snapshot_hash_nonempty
  CHECK (length(btrim(snapshot_hash)) >= 8);

ALTER TABLE sales.document_truth_bindings
  ADD CONSTRAINT fk_sales_document_truth_bindings_base_currency
  FOREIGN KEY (base_currency_id) REFERENCES reference.currencies (currency_id)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Replace void-only check with full phase / lock / void consistency.
ALTER TABLE sales.document_truth_bindings
  DROP CONSTRAINT IF EXISTS chk_sales_document_truth_bindings_void_consistency;

ALTER TABLE sales.document_truth_bindings
  ADD CONSTRAINT chk_sales_document_truth_bindings_phase_lock_void
  CHECK (
    (
      voided_at IS NULL
      AND commit_phase IN ('financial_commit', 'posted')
      AND locked_at IS NOT NULL
    )
    OR (
      voided_at IS NOT NULL
      AND voided_by IS NOT NULL
      AND commit_phase IN ('voided', 'superseded')
    )
  );

ALTER TABLE sales.document_truth_bindings
  ADD CONSTRAINT chk_sales_document_truth_bindings_lock_after_commit
  CHECK (locked_at >= committed_at);

ALTER TABLE sales.document_truth_bindings
  ADD CONSTRAINT chk_sales_document_truth_bindings_header_snapshot_object
  CHECK (jsonb_typeof(header_snapshot) = 'object');

ALTER TABLE sales.document_truth_bindings
  ADD CONSTRAINT chk_sales_document_truth_bindings_line_snapshot_shape
  CHECK (
    jsonb_typeof(line_snapshot) = 'object'
    AND jsonb_typeof(line_snapshot -> 'lines') = 'array'
  );

ALTER TABLE sales.document_truth_bindings
  ADD CONSTRAINT chk_sales_document_truth_bindings_tax_snapshot_object
  CHECK (jsonb_typeof(tax_snapshot) = 'object');

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_document_truth_bindings_doc_version
  ON sales.document_truth_bindings (tenant_id, document_type, document_id, binding_version);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_document_truth_bindings_idempotency
  ON sales.document_truth_bindings (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Immutability: after void, no updates. When locked and active, only lifecycle + audit columns.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sales.prevent_document_truth_bindings_mutate_locked_payload()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF OLD.voided_at IS NOT NULL THEN
    RAISE EXCEPTION
      'document_truth_bindings: voided rows are immutable'
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.locked_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF
    NEW.id IS DISTINCT FROM OLD.id
    OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.document_type IS DISTINCT FROM OLD.document_type
    OR NEW.document_id IS DISTINCT FROM OLD.document_id
    OR NEW.document_status_at_commit IS DISTINCT FROM OLD.document_status_at_commit
    OR NEW.committed_at IS DISTINCT FROM OLD.committed_at
    OR NEW.locked_at IS DISTINCT FROM OLD.locked_at
    OR NEW.committed_by IS DISTINCT FROM OLD.committed_by
    OR NEW.price_truth_link_id IS DISTINCT FROM OLD.price_truth_link_id
    OR NEW.currency_id IS DISTINCT FROM OLD.currency_id
    OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
    OR NEW.subtotal_amount IS DISTINCT FROM OLD.subtotal_amount
    OR NEW.tax_amount IS DISTINCT FROM OLD.tax_amount
    OR NEW.header_snapshot IS DISTINCT FROM OLD.header_snapshot
    OR NEW.line_snapshot IS DISTINCT FROM OLD.line_snapshot
    OR NEW.tax_snapshot IS DISTINCT FROM OLD.tax_snapshot
    OR NEW.commission_snapshot_id IS DISTINCT FROM OLD.commission_snapshot_id
    OR NEW.supersedes_binding_id IS DISTINCT FROM OLD.supersedes_binding_id
    OR NEW.binding_version IS DISTINCT FROM OLD.binding_version
    OR NEW.snapshot_hash IS DISTINCT FROM OLD.snapshot_hash
    OR NEW.fx_rate IS DISTINCT FROM OLD.fx_rate
    OR NEW.fx_as_of IS DISTINCT FROM OLD.fx_as_of
    OR NEW.base_currency_id IS DISTINCT FROM OLD.base_currency_id
    OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
  THEN
    RAISE EXCEPTION
      'document_truth_bindings: financial payload is immutable after lock (void or phase transition only)'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_document_truth_bindings_immutable_payload
  ON sales.document_truth_bindings;

CREATE TRIGGER trg_sales_document_truth_bindings_immutable_payload
  BEFORE UPDATE ON sales.document_truth_bindings
  FOR EACH ROW
  EXECUTE FUNCTION sales.prevent_document_truth_bindings_mutate_locked_payload();
