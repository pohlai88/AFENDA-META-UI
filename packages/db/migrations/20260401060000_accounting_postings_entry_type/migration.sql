-- Idempotent GL stub rows per truth binding + entry type (draft/posted only; reversed excluded).
ALTER TABLE sales.accounting_postings
  ADD COLUMN IF NOT EXISTS posting_entry_type varchar(64) NOT NULL DEFAULT 'general';

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_accounting_postings_truth_entry_active
  ON sales.accounting_postings (tenant_id, truth_binding_id, posting_entry_type)
  WHERE truth_binding_id IS NOT NULL AND posting_status IN ('draft', 'posted');
