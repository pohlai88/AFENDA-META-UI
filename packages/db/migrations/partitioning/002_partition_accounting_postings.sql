-- =====================================================================
-- Partition Migration: accounting_postings
-- =====================================================================
-- Description: Convert accounting_postings table to monthly range partitioning
-- Partition Key: posting_date (timestamp with timezone)
-- Partition Interval: Monthly (aligns with accounting periods)
-- Expected Volume: Ledger-scale (>50M rows)
-- =====================================================================

-- STEP 1: Create partitioned table structure
-- =====================================================================

CREATE TABLE IF NOT EXISTS sales.accounting_postings_partitioned (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    source_document_type TEXT NOT NULL,
    source_document_id UUID NOT NULL,
    journal_entry_id UUID,
    posting_date TIMESTAMPTZ NOT NULL, -- PARTITION KEY
    debit_account_code TEXT,
    credit_account_code TEXT,
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    currency_code TEXT NOT NULL,
    posting_status TEXT NOT NULL DEFAULT 'draft',
    posted_by INTEGER,
    posted_at TIMESTAMPTZ,
    reversed_at TIMESTAMPTZ,
    reversed_by INTEGER,
    reversal_reason TEXT,
    reversal_entry_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by INTEGER,
    updated_by INTEGER,
    created_by_name TEXT,
    updated_by_name TEXT,

    -- CHECK CONSTRAINTS
    CONSTRAINT chk_sales_accounting_postings_amount_non_negative CHECK (amount >= 0),
    CONSTRAINT chk_sales_accounting_postings_status CHECK (
        posting_status IN ('draft', 'posted', 'reversed')
    ),
    CONSTRAINT chk_sales_accounting_postings_posted_consistency CHECK (
        posting_status <> 'posted' OR (posted_by IS NOT NULL AND posted_at IS NOT NULL)
    ),
    CONSTRAINT chk_sales_accounting_postings_reversed_consistency CHECK (
        posting_status <> 'reversed' OR (reversed_by IS NOT NULL AND reversed_at IS NOT NULL)
    )
) PARTITION BY RANGE (posting_date);

-- =====================================================================
-- STEP 2: Create initial partitions
-- =====================================================================
-- Strategy: Create partitions for current fiscal year + next 2 months
-- Assuming fiscal year = calendar year, adjust if needed
-- =====================================================================

-- Helper function to create monthly partition
CREATE OR REPLACE FUNCTION sales.create_accounting_postings_partition(partition_date DATE)
RETURNS TEXT AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := 'accounting_postings_' || TO_CHAR(partition_date, 'YYYY_MM');
    start_date := DATE_TRUNC('month', partition_date);
    end_date := start_date + INTERVAL '1 month';

    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS sales.%I PARTITION OF sales.accounting_postings_partitioned
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );

    RETURN partition_name;
END;
$$ LANGUAGE plpgsql;

-- Create partitions for current fiscal year (January - December)
-- Adjust these dates based on your fiscal year
SELECT sales.create_accounting_postings_partition(DATE_TRUNC('year', CURRENT_DATE) + (n || ' month')::INTERVAL)
FROM generate_series(0, 11) AS n;

-- Create partitions for next 2 months beyond current fiscal year
SELECT sales.create_accounting_postings_partition(DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '12 months');
SELECT sales.create_accounting_postings_partition(DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '13 months');

-- Create default partition for data outside defined ranges
CREATE TABLE IF NOT EXISTS sales.accounting_postings_default
PARTITION OF sales.accounting_postings_partitioned DEFAULT;

-- =====================================================================
-- STEP 3: Create indexes on partitioned table (inherited by all partitions)
-- =====================================================================

CREATE INDEX idx_sales_accounting_postings_tenant
ON sales.accounting_postings_partitioned (tenant_id);

CREATE INDEX idx_sales_accounting_postings_date
ON sales.accounting_postings_partitioned (tenant_id, posting_date, posting_status);

CREATE INDEX idx_sales_accounting_postings_source
ON sales.accounting_postings_partitioned (tenant_id, source_document_type, source_document_id);

CREATE INDEX idx_sales_accounting_postings_journal
ON sales.accounting_postings_partitioned (tenant_id, journal_entry_id);

CREATE INDEX idx_sales_accounting_postings_accounts
ON sales.accounting_postings_partitioned (tenant_id, debit_account_code, credit_account_code);

CREATE INDEX idx_sales_accounting_postings_status
ON sales.accounting_postings_partitioned (tenant_id, posting_status);

-- =====================================================================
-- STEP 4: Migrate data from existing table (if it exists)
-- =====================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'sales'
        AND table_name = 'accounting_postings'
    ) THEN
        -- Copy data from old table to partitioned table
        INSERT INTO sales.accounting_postings_partitioned
        SELECT * FROM sales.accounting_postings;

        -- Verify row counts match
        IF (SELECT COUNT(*) FROM sales.accounting_postings) !=
           (SELECT COUNT(*) FROM sales.accounting_postings_partitioned) THEN
            RAISE EXCEPTION 'Row count mismatch during migration';
        END IF;

        RAISE NOTICE 'Data migration complete. Row count: %',
            (SELECT COUNT(*) FROM sales.accounting_postings_partitioned);
    ELSE
        RAISE NOTICE 'No existing accounting_postings table found. Creating fresh partitioned table.';
    END IF;
END $$;

-- =====================================================================
-- STEP 5: Atomic table swap
-- =====================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'sales'
        AND table_name = 'accounting_postings'
    ) THEN
        -- Rename old table to _old (kept for safety, can be dropped after validation)
        ALTER TABLE sales.accounting_postings RENAME TO accounting_postings_old;

        -- Rename partitioned table to canonical name
        ALTER TABLE sales.accounting_postings_partitioned RENAME TO accounting_postings;

        RAISE NOTICE 'Table swap complete. Old table renamed to accounting_postings_old';
        RAISE NOTICE 'Validate the new partitioned table before dropping accounting_postings_old';
    END IF;
END $$;

-- =====================================================================
-- STEP 6: Re-create foreign keys (after swap)
-- =====================================================================

-- Note: Foreign keys referencing accounting_postings from other tables
-- need to be recreated if they exist. Add them here.

-- Foreign keys from accounting_postings to other tables:
ALTER TABLE sales.accounting_postings
ADD CONSTRAINT fk_sales_accounting_postings_tenant
FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id)
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE sales.accounting_postings
ADD CONSTRAINT fk_sales_accounting_postings_posted_by
FOREIGN KEY (posted_by) REFERENCES public.users(user_id)
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE sales.accounting_postings
ADD CONSTRAINT fk_sales_accounting_postings_reversed_by
FOREIGN KEY (reversed_by) REFERENCES public.users(user_id)
ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================================
-- STEP 7: Verify partition setup
-- =====================================================================

-- Check partition count
SELECT
    'Total partitions' AS metric,
    COUNT(*) AS value
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname = 'accounting_postings';

-- Check data distribution across partitions
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'sales' AND tablename LIKE 'accounting_postings_%'
ORDER BY tablename;

-- Check default partition (should be empty)
SELECT 'Default partition row count' AS metric, COUNT(*) AS value
FROM sales.accounting_postings_default;

-- Verify partition pruning works
EXPLAIN SELECT * FROM sales.accounting_postings
WHERE posting_date >= '2024-01-01' AND posting_date < '2024-02-01';
-- Look for "Partitions pruned: X" in output

-- =====================================================================
-- STEP 8: Test accounting-specific queries
-- =====================================================================

-- Test GL report query (should use partition pruning)
EXPLAIN ANALYZE
SELECT
    debit_account_code,
    SUM(amount) as total_debit
FROM sales.accounting_postings
WHERE tenant_id = 1
  AND posting_date >= '2024-01-01'
  AND posting_date < '2024-04-01'  -- Q1 2024
  AND posting_status = 'posted'
GROUP BY debit_account_code;

-- Test period closure check
SELECT
    DATE_TRUNC('month', posting_date) AS period,
    posting_status,
    COUNT(*) AS entry_count,
    SUM(amount) AS total_amount
FROM sales.accounting_postings
WHERE tenant_id = 1
  AND posting_date >= '2024-01-01'
  AND posting_date < '2025-01-01'
GROUP BY DATE_TRUNC('month', posting_date), posting_status
ORDER BY period, posting_status;

-- =====================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =====================================================================

/*
-- To rollback to the old table:
ALTER TABLE sales.accounting_postings RENAME TO accounting_postings_partitioned_failed;
ALTER TABLE sales.accounting_postings_old RENAME TO accounting_postings;
DROP TABLE sales.accounting_postings_partitioned_failed CASCADE;
*/

-- =====================================================================
-- CLEANUP (run after validation period, e.g., 7 days)
-- =====================================================================

/*
-- After validating the partitioned table works correctly:
DROP TABLE sales.accounting_postings_old CASCADE;
DROP FUNCTION sales.create_accounting_postings_partition(DATE);
*/

-- =====================================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================================

COMMENT ON TABLE sales.accounting_postings IS
'Accounting postings table - partitioned monthly by posting_date for ledger-scale performance.
Aligns with accounting periods for efficient period-based reporting and compliance.';

COMMENT ON COLUMN sales.accounting_postings.posting_date IS
'Partition key - always filter by this column for optimal query performance.
Partition pruning automatically eliminates irrelevant months.';
