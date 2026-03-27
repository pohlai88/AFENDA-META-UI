-- =====================================================================
-- Partition Migration: sales_orders
-- =====================================================================
-- Description: Convert sales_orders table to monthly range partitioning
-- Partition Key: order_date (timestamp with timezone)
-- Partition Interval: Monthly (1 partition per month)
-- Expected Volume: >10M rows
-- =====================================================================

-- STEP 1: Create partitioned table structure
-- =====================================================================

CREATE TABLE IF NOT EXISTS sales.sales_orders_partitioned (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    name TEXT,
    display_name TEXT,
    partner_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    sequence_number TEXT,
    quotation_date TIMESTAMPTZ,
    validity_date TIMESTAMPTZ,
    confirmation_date TIMESTAMPTZ,
    confirmed_by INTEGER,
    currency_id INTEGER,
    pricelist_id UUID,
    payment_term_id UUID,
    fiscal_position_id UUID,
    invoice_address_id UUID,
    delivery_address_id UUID,
    warehouse_id TEXT,
    company_currency_rate NUMERIC(14, 6),
    exchange_rate_used NUMERIC(14, 6),
    exchange_rate_source TEXT,
    pricelist_snapshot_id UUID,
    credit_check_passed BOOLEAN NOT NULL DEFAULT false,
    credit_check_at TIMESTAMPTZ,
    credit_check_by INTEGER,
    credit_limit_at_check NUMERIC(14, 2),
    invoice_status TEXT NOT NULL DEFAULT 'no',
    delivery_status TEXT NOT NULL DEFAULT 'no',
    signed_by TEXT,
    signed_on TIMESTAMPTZ,
    client_order_ref TEXT,
    origin TEXT,
    team_id TEXT,
    user_id INTEGER,
    cancel_reason TEXT,
    order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- PARTITION KEY
    delivery_date TIMESTAMPTZ,
    assigned_to_id TEXT,
    notes TEXT,
    amount_untaxed NUMERIC(14, 2) NOT NULL DEFAULT 0,
    amount_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
    amount_profit NUMERIC(14, 2) NOT NULL DEFAULT 0,
    margin_percent NUMERIC(9, 4) NOT NULL DEFAULT 0,
    amount_tax NUMERIC(14, 2) NOT NULL DEFAULT 0,
    amount_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by INTEGER,
    updated_by INTEGER,
    deleted_by INTEGER,
    created_by_name TEXT,
    updated_by_name TEXT,
    deleted_by_name TEXT,

    -- CHECK CONSTRAINTS
    CONSTRAINT chk_sales_orders_amount_untaxed_non_negative CHECK (amount_untaxed >= 0),
    CONSTRAINT chk_sales_orders_amount_cost_non_negative CHECK (amount_cost >= 0),
    CONSTRAINT chk_sales_orders_amount_profit_non_negative CHECK (amount_profit >= 0),
    CONSTRAINT chk_sales_orders_amount_tax_non_negative CHECK (amount_tax >= 0),
    CONSTRAINT chk_sales_orders_amount_total_non_negative CHECK (amount_total >= 0),
    CONSTRAINT chk_sales_orders_amount_profit_formula CHECK (
        amount_profit = ROUND(amount_untaxed - amount_cost, 2)
    ),
    CONSTRAINT chk_sales_orders_margin_percent_formula CHECK (
        margin_percent = CASE
            WHEN amount_untaxed = 0 THEN 0
            ELSE ROUND((amount_profit / amount_untaxed) * 100, 4)
        END
    ),
    CONSTRAINT chk_sales_orders_amount_total_formula CHECK (
        amount_total = ROUND(amount_untaxed + amount_tax, 2)
    )
) PARTITION BY RANGE (order_date);

-- =====================================================================
-- STEP 2: Create initial partitions
-- =====================================================================
-- Strategy: Create partitions for previous 6 months, current month, and next 6 months
-- Total: 13 partitions to start
-- =====================================================================

-- Helper function to create monthly partition
CREATE OR REPLACE FUNCTION sales.create_sales_orders_partition(partition_date DATE)
RETURNS TEXT AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := 'sales_orders_' || TO_CHAR(partition_date, 'YYYY_MM');
    start_date := DATE_TRUNC('month', partition_date);
    end_date := start_date + INTERVAL '1 month';

    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS sales.%I PARTITION OF sales.sales_orders_partitioned
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );

    RETURN partition_name;
END;
$$ LANGUAGE plpgsql;

-- Create partitions for previous 6 months
SELECT sales.create_sales_orders_partition(CURRENT_DATE - INTERVAL '6 months');
SELECT sales.create_sales_orders_partition(CURRENT_DATE - INTERVAL '5 months');
SELECT sales.create_sales_orders_partition(CURRENT_DATE - INTERVAL '4 months');
SELECT sales.create_sales_orders_partition(CURRENT_DATE - INTERVAL '3 months');
SELECT sales.create_sales_orders_partition(CURRENT_DATE - INTERVAL '2 months');
SELECT sales.create_sales_orders_partition(CURRENT_DATE - INTERVAL '1 month');

-- Create partition for current month
SELECT sales.create_sales_orders_partition(CURRENT_DATE);

-- Create partitions for next 6 months
SELECT sales.create_sales_orders_partition(CURRENT_DATE + INTERVAL '1 month');
SELECT sales.create_sales_orders_partition(CURRENT_DATE + INTERVAL '2 months');
SELECT sales.create_sales_orders_partition(CURRENT_DATE + INTERVAL '3 months');
SELECT sales.create_sales_orders_partition(CURRENT_DATE + INTERVAL '4 months');
SELECT sales.create_sales_orders_partition(CURRENT_DATE + INTERVAL '5 months');
SELECT sales.create_sales_orders_partition(CURRENT_DATE + INTERVAL '6 months');

-- Create default partition for data outside defined ranges
CREATE TABLE IF NOT EXISTS sales.sales_orders_default
PARTITION OF sales.sales_orders_partitioned DEFAULT;

-- =====================================================================
-- STEP 3: Create indexes on partitioned table (inherited by all partitions)
-- =====================================================================

CREATE INDEX idx_sales_orders_tenant
ON sales.sales_orders_partitioned (tenant_id);

CREATE INDEX idx_sales_orders_partner
ON sales.sales_orders_partitioned (tenant_id, partner_id);

CREATE INDEX idx_sales_orders_status
ON sales.sales_orders_partitioned (tenant_id, status, order_date);

CREATE INDEX idx_sales_orders_credit_check
ON sales.sales_orders_partitioned (tenant_id, credit_check_passed, order_date);

CREATE INDEX idx_sales_orders_currency
ON sales.sales_orders_partitioned (tenant_id, currency_id);

CREATE INDEX idx_sales_orders_pricelist
ON sales.sales_orders_partitioned (tenant_id, pricelist_id);

CREATE INDEX idx_sales_orders_pricelist_snapshot
ON sales.sales_orders_partitioned (tenant_id, pricelist_snapshot_id);

CREATE INDEX idx_sales_orders_credit_check_by
ON sales.sales_orders_partitioned (tenant_id, credit_check_by);

CREATE INDEX idx_sales_orders_payment_term
ON sales.sales_orders_partitioned (tenant_id, payment_term_id);

CREATE INDEX idx_sales_orders_fiscal_position
ON sales.sales_orders_partitioned (tenant_id, fiscal_position_id);

CREATE INDEX idx_sales_orders_invoice_status
ON sales.sales_orders_partitioned (tenant_id, invoice_status, order_date);

CREATE INDEX idx_sales_orders_delivery_status
ON sales.sales_orders_partitioned (tenant_id, delivery_status, order_date);

-- Unique index for sequence_number (with partial index condition)
CREATE UNIQUE INDEX uq_sales_orders_sequence_number
ON sales.sales_orders_partitioned (tenant_id, sequence_number)
WHERE deleted_at IS NULL AND sequence_number IS NOT NULL;

-- =====================================================================
-- STEP 4: Migrate data from existing table (if it exists)
-- =====================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'sales'
        AND table_name = 'sales_orders'
    ) THEN
        -- Copy data from old table to partitioned table
        INSERT INTO sales.sales_orders_partitioned
        SELECT * FROM sales.sales_orders;

        -- Verify row counts match
        IF (SELECT COUNT(*) FROM sales.sales_orders) !=
           (SELECT COUNT(*) FROM sales.sales_orders_partitioned) THEN
            RAISE EXCEPTION 'Row count mismatch during migration';
        END IF;

        RAISE NOTICE 'Data migration complete. Row count: %',
            (SELECT COUNT(*) FROM sales.sales_orders_partitioned);
    ELSE
        RAISE NOTICE 'No existing sales_orders table found. Creating fresh partitioned table.';
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
        AND table_name = 'sales_orders'
    ) THEN
        -- Rename old table to _old (kept for safety, can be dropped after validation)
        ALTER TABLE sales.sales_orders RENAME TO sales_orders_old;

        -- Rename partitioned table to canonical name
        ALTER TABLE sales.sales_orders_partitioned RENAME TO sales_orders;

        RAISE NOTICE 'Table swap complete. Old table renamed to sales_orders_old';
        RAISE NOTICE 'Validate the new partitioned table before dropping sales_orders_old';
    END IF;
END $$;

-- =====================================================================
-- STEP 6: Verify partition setup
-- =====================================================================

-- Check partition count
SELECT
    'Total partitions' AS metric,
    COUNT(*) AS value
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname = 'sales_orders';

-- Check data distribution across partitions
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    (SELECT COUNT(*) FROM sales.sales_orders WHERE order_date >=
        (regexp_match(tablename, '(\d{4})_(\d{2})'))[1]||'-'||
        (regexp_match(tablename, '(\d{4})_(\d{2})'))[2]||'-01'
    AND order_date < (DATE_TRUNC('month',
        (regexp_match(tablename, '(\d{4})_(\d{2})'))[1]||'-'||
        (regexp_match(tablename, '(\d{4})_(\d{2})'))[2]||'-01'::date) + INTERVAL '1 month')
    ) AS row_count
FROM pg_tables
WHERE schemaname = 'sales' AND tablename LIKE 'sales_orders_%'
ORDER BY tablename;

-- Check default partition (should be empty)
SELECT 'Default partition row count' AS metric, COUNT(*) AS value
FROM sales.sales_orders_default;

-- =====================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =====================================================================

/*
-- To rollback to the old table:
ALTER TABLE sales.sales_orders RENAME TO sales_orders_partitioned_failed;
ALTER TABLE sales.sales_orders_old RENAME TO sales_orders;
DROP TABLE sales.sales_orders_partitioned_failed CASCADE;
*/

-- =====================================================================
-- CLEANUP (run after validation period, e.g., 7 days)
-- =====================================================================

/*
-- After validating the partitioned table works correctly:
DROP TABLE sales.sales_orders_old CASCADE;
DROP FUNCTION sales.create_sales_orders_partition(DATE);
*/
