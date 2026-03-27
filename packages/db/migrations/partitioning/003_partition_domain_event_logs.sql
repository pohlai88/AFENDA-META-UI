-- =====================================================================
-- Partition Migration: domain_event_logs
-- =====================================================================
-- Description: Convert domain_event_logs table to weekly range partitioning
-- Partition Key: created_at (timestamp with timezone)
-- Partition Interval: Weekly (52 partitions per year - high-volume event sourcing)
-- Expected Volume: Event-sourcing scale (>100M rows)
-- =====================================================================

-- STEP 1: Create partitioned table structure
-- =====================================================================

CREATE TABLE IF NOT EXISTS sales.domain_event_logs_partitioned (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    payload TEXT,
    triggered_by INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- PARTITION KEY
    created_by INTEGER,
    updated_by INTEGER,
    created_by_name TEXT,
    updated_by_name TEXT
) PARTITION BY RANGE (created_at);

-- =====================================================================
-- STEP 2: Create initial partitions
-- =====================================================================
-- Strategy: Create partitions for current week + next 8 weeks
-- Weekly partitions start on Monday (ISO week)
-- =====================================================================

-- Helper function to create weekly partition
CREATE OR REPLACE FUNCTION sales.create_domain_event_logs_partition(partition_date DATE)
RETURNS TEXT AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
    year INTEGER;
    week INTEGER;
BEGIN
    -- Get ISO year and week number
    year := EXTRACT(ISOYEAR FROM partition_date);
    week := EXTRACT(WEEK FROM partition_date);

    partition_name := 'domain_event_logs_' || year || '_W' || LPAD(week::TEXT, 2, '0');

    -- Start of ISO week (Monday)
    start_date := DATE_TRUNC('week', partition_date);
    end_date := start_date + INTERVAL '7 days';

    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS sales.%I PARTITION OF sales.domain_event_logs_partitioned
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );

    RETURN partition_name;
END;
$$ LANGUAGE plpgsql;

-- Create partition for current week
SELECT sales.create_domain_event_logs_partition(CURRENT_DATE);

-- Create partitions for next 8 weeks
SELECT sales.create_domain_event_logs_partition(CURRENT_DATE + (n || ' week')::INTERVAL)
FROM generate_series(1, 8) AS n;

-- Create default partition for data outside defined ranges
CREATE TABLE IF NOT EXISTS sales.domain_event_logs_default
PARTITION OF sales.domain_event_logs_partitioned DEFAULT;

-- =====================================================================
-- STEP 3: Create indexes on partitioned table (inherited by all partitions)
-- =====================================================================

CREATE INDEX idx_sales_domain_event_logs_tenant
ON sales.domain_event_logs_partitioned (tenant_id);

CREATE INDEX idx_sales_domain_event_logs_entity
ON sales.domain_event_logs_partitioned (tenant_id, entity_type, entity_id, created_at);

CREATE INDEX idx_sales_domain_event_logs_type
ON sales.domain_event_logs_partitioned (tenant_id, event_type, created_at);

CREATE INDEX idx_sales_domain_event_logs_triggered_by
ON sales.domain_event_logs_partitioned (tenant_id, triggered_by);

-- Composite index for event replay (most common query pattern)
CREATE INDEX idx_sales_domain_event_logs_replay
ON sales.domain_event_logs_partitioned (entity_id, created_at)
INCLUDE (event_type, payload);

-- =====================================================================
-- STEP 4: Migrate data from existing table (if it exists)
-- =====================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'sales'
        AND table_name = 'domain_event_logs'
    ) THEN
        -- Check if historical data exists outside current partition range
        DECLARE
            min_date TIMESTAMPTZ;
            max_date TIMESTAMPTZ;
            earliest_week DATE;
            latest_week DATE;
        BEGIN
            SELECT MIN(created_at), MAX(created_at)
            INTO min_date, max_date
            FROM sales.domain_event_logs;

            IF min_date IS NOT NULL THEN
                -- Create partitions for historical data
                earliest_week := DATE_TRUNC('week', min_date::DATE);
                latest_week := DATE_TRUNC('week', max_date::DATE);

                RAISE NOTICE 'Creating partitions from % to %', earliest_week, latest_week;

                -- Create all weekly partitions needed for historical data
                PERFORM sales.create_domain_event_logs_partition(week_date)
                FROM generate_series(
                    earliest_week,
                    latest_week,
                    '7 days'::INTERVAL
                ) AS week_date;
            END IF;
        END;

        -- Copy data from old table to partitioned table
        INSERT INTO sales.domain_event_logs_partitioned
        SELECT * FROM sales.domain_event_logs;

        -- Verify row counts match
        IF (SELECT COUNT(*) FROM sales.domain_event_logs) !=
           (SELECT COUNT(*) FROM sales.domain_event_logs_partitioned) THEN
            RAISE EXCEPTION 'Row count mismatch during migration';
        END IF;

        RAISE NOTICE 'Data migration complete. Row count: %',
            (SELECT COUNT(*) FROM sales.domain_event_logs_partitioned);
    ELSE
        RAISE NOTICE 'No existing domain_event_logs table found. Creating fresh partitioned table.';
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
        AND table_name = 'domain_event_logs'
    ) THEN
        -- Rename old table to _old (kept for safety, can be dropped after validation)
        ALTER TABLE sales.domain_event_logs RENAME TO domain_event_logs_old;

        -- Rename partitioned table to canonical name
        ALTER TABLE sales.domain_event_logs_partitioned RENAME TO domain_event_logs;

        RAISE NOTICE 'Table swap complete. Old table renamed to domain_event_logs_old';
        RAISE NOTICE 'Validate the new partitioned table before dropping domain_event_logs_old';
    END IF;
END $$;

-- =====================================================================
-- STEP 6: Re-create foreign keys (after swap)
-- =====================================================================

ALTER TABLE sales.domain_event_logs
ADD CONSTRAINT fk_sales_domain_event_logs_tenant
FOREIGN KEY (tenant_id) REFERENCES public.tenants(tenant_id)
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE sales.domain_event_logs
ADD CONSTRAINT fk_sales_domain_event_logs_user
FOREIGN KEY (triggered_by) REFERENCES public.users(user_id)
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
WHERE parent.relname = 'domain_event_logs';

-- Check data distribution across partitions (last 10 weeks)
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    (SELECT COUNT(*) FROM sales.domain_event_logs
     WHERE created_at >= (regexp_match(tablename, '(\d{4})_W(\d{2})'))[1]::INTEGER || '-W' ||
                          (regexp_match(tablename, '(\d{4})_W(\d{2})'))[2]::INTEGER || '-1'::TEXT
       AND created_at < (regexp_match(tablename, '(\d{4})_W(\d{2})'))[1]::INTEGER || '-W' ||
                         ((regexp_match(tablename, '(\d{4})_W(\d{2})'))[2]::INTEGER + 1)::TEXT || '-1'::TEXT
    ) AS row_count
FROM pg_tables
WHERE schemaname = 'sales'
  AND tablename LIKE 'domain_event_logs_____W__'
ORDER BY tablename DESC
LIMIT 10;

-- Check default partition (should be empty)
SELECT 'Default partition row count' AS metric, COUNT(*) AS value
FROM sales.domain_event_logs_default;

-- Verify partition pruning works
EXPLAIN SELECT * FROM sales.domain_event_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND created_at < CURRENT_DATE;
-- Look for "Partitions pruned: X" in output

-- =====================================================================
-- STEP 8: Test event-sourcing specific queries
-- =====================================================================

-- Test event replay for specific entity (should use partition pruning)
EXPLAIN ANALYZE
SELECT id, event_type, payload, created_at
FROM sales.domain_event_logs
WHERE tenant_id = 1
  AND entity_type = 'SalesOrder'
  AND entity_id = '00000301-0000-4000-8000-000000000301'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY created_at;

-- Test event count by type (recent week)
SELECT
    event_type,
    COUNT(*) AS event_count,
    MIN(created_at) AS first_event,
    MAX(created_at) AS last_event
FROM sales.domain_event_logs
WHERE tenant_id = 1
  AND created_at >= DATE_TRUNC('week', CURRENT_DATE)
GROUP BY event_type
ORDER BY event_count DESC;

-- Test event volume by hour (last 24 hours)
SELECT
    DATE_TRUNC('hour', created_at) AS hour,
    COUNT(*) AS event_count
FROM sales.domain_event_logs
WHERE tenant_id = 1
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour;

-- =====================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =====================================================================

/*
-- To rollback to the old table:
ALTER TABLE sales.domain_event_logs RENAME TO domain_event_logs_partitioned_failed;
ALTER TABLE sales.domain_event_logs_old RENAME TO domain_event_logs;
DROP TABLE sales.domain_event_logs_partitioned_failed CASCADE;
*/

-- =====================================================================
-- CLEANUP (run after validation period, e.g., 7 days)
-- =====================================================================

/*
-- After validating the partitioned table works correctly:
DROP TABLE sales.domain_event_logs_old CASCADE;
DROP FUNCTION sales.create_domain_event_logs_partition(DATE);
*/

-- =====================================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================================

COMMENT ON TABLE sales.domain_event_logs IS
'Domain event logs table - partitioned weekly by created_at for event-sourcing scale (>100M events).
Weekly partitions enable efficient archival of old events while maintaining high write throughput.';

COMMENT ON COLUMN sales.domain_event_logs.created_at IS
'Partition key - always filter by this column for optimal query performance.
Partition pruning automatically eliminates irrelevant weeks. Default value NOW() ensures new events go to current partition.';

COMMENT ON COLUMN sales.domain_event_logs.entity_id IS
'Use with created_at filter for event replay: WHERE entity_id = ? AND created_at >= ?
This leverages partition pruning + index for optimal performance.';
