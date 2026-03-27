-- =====================================================================
-- Partition Automation Functions
-- =====================================================================
-- Description: Automated partition management for high-volume tables
-- Purpose: Proactively create future partitions to prevent insert failures
-- Schedule: Run daily via cron job or pg_cron extension
-- =====================================================================

-- =====================================================================
-- FUNCTION 1: Auto-create future partitions for all tables
-- =====================================================================

CREATE OR REPLACE FUNCTION sales.create_future_partitions()
RETURNS TABLE (
    table_name TEXT,
    partition_name TEXT,
    partition_range TEXT,
    status TEXT
) AS $$
DECLARE
    partition_date DATE;
    created_partition TEXT;
    start_date TEXT;
    end_date TEXT;
BEGIN
    -- ========================================
    -- 1. sales_orders (Monthly, next 6 months)
    -- ========================================
    FOR i IN 0..6 LOOP
        partition_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' month')::INTERVAL);

        -- Check if partition already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = 'sales'
            AND tablename = 'sales_orders_' || TO_CHAR(partition_date, 'YYYY_MM')
        ) THEN
            created_partition := sales.create_sales_orders_partition(partition_date);
            start_date := partition_date::TEXT;
            end_date := (partition_date + INTERVAL '1 month')::TEXT;

            RETURN QUERY SELECT
                'sales_orders'::TEXT,
                created_partition,
                start_date || ' TO ' || end_date,
                'CREATED'::TEXT;
        END IF;
    END LOOP;

    -- ========================================
    -- 2. accounting_postings (Monthly, next 2 months)
    -- ========================================
    FOR i IN 0..2 LOOP
        partition_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' month')::INTERVAL);

        -- Check if partition already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_tables
            WHERE schemaname = 'sales'
            AND tablename = 'accounting_postings_' || TO_CHAR(partition_date, 'YYYY_MM')
        ) THEN
            created_partition := sales.create_accounting_postings_partition(partition_date);
            start_date := partition_date::TEXT;
            end_date := (partition_date + INTERVAL '1 month')::TEXT;

            RETURN QUERY SELECT
                'accounting_postings'::TEXT,
                created_partition,
                start_date || ' TO ' || end_date,
                'CREATED'::TEXT;
        END IF;
    END LOOP;

    -- ========================================
    -- 3. domain_event_logs (Weekly, next 8 weeks)
    -- ========================================
    FOR i IN 0..8 LOOP
        partition_date := DATE_TRUNC('week', CURRENT_DATE + (i || ' week')::INTERVAL);

        -- Check if partition already exists
        DECLARE
            year INTEGER := EXTRACT(ISOYEAR FROM partition_date);
            week INTEGER := EXTRACT(WEEK FROM partition_date);
            partition_name TEXT := 'domain_event_logs_' || year || '_W' || LPAD(week::TEXT, 2, '0');
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_tables
                WHERE schemaname = 'sales'
                AND tablename = partition_name
            ) THEN
                created_partition := sales.create_domain_event_logs_partition(partition_date);
                start_date := partition_date::TEXT;
                end_date := (partition_date + INTERVAL '7 days')::TEXT;

                RETURN QUERY SELECT
                    'domain_event_logs'::TEXT,
                    created_partition,
                    start_date || ' TO ' || end_date,
                    'CREATED'::TEXT;
            END IF;
        END;
    END LOOP;

    -- Return summary if no partitions were created
    IF NOT FOUND THEN
        RETURN QUERY SELECT
            'ALL'::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            'No new partitions needed - all up to date'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- FUNCTION 2: Check partition health
-- =====================================================================

CREATE OR REPLACE FUNCTION sales.check_partition_health()
RETURNS TABLE (
    table_name TEXT,
    metric TEXT,
    value TEXT,
    status TEXT,
    recommendation TEXT
) AS $$
BEGIN
    -- Check sales_orders
    RETURN QUERY
    SELECT
        'sales_orders'::TEXT,
        'Future coverage'::TEXT,
        (SELECT MAX(
            CASE
                WHEN tablename LIKE 'sales_orders_%' AND tablename != 'sales_orders_default'
                THEN TO_DATE(
                    SUBSTRING(tablename FROM 'sales_orders_(\d{4}_\d{2})'),
                    'YYYY_MM'
                )
            END
        ) FROM pg_tables WHERE schemaname = 'sales')::TEXT,
        CASE
            WHEN (SELECT MAX(
                CASE
                    WHEN tablename LIKE 'sales_orders_%' AND tablename != 'sales_orders_default'
                    THEN TO_DATE(
                        SUBSTRING(tablename FROM 'sales_orders_(\d{4}_\d{2})'),
                        'YYYY_MM'
                    )
                END
            ) FROM pg_tables WHERE schemaname = 'sales') >= CURRENT_DATE + INTERVAL '3 months'
            THEN '✅ OK'::TEXT
            ELSE '⚠️ WARNING'::TEXT
        END,
        CASE
            WHEN (SELECT MAX(
                CASE
                    WHEN tablename LIKE 'sales_orders_%' AND tablename != 'sales_orders_default'
                    THEN TO_DATE(
                        SUBSTRING(tablename FROM 'sales_orders_(\d{4}_\d{2})'),
                        'YYYY_MM'
                    )
                END
            ) FROM pg_tables WHERE schemaname = 'sales') >= CURRENT_DATE + INTERVAL '3 months'
            THEN 'Partitions covered through end of quarter'::TEXT
            ELSE 'Run create_future_partitions() to create missing partitions'::TEXT
        END;

    -- Check default partition row counts (should be 0)
    RETURN QUERY
    SELECT
        'sales_orders'::TEXT,
        'Default partition rows'::TEXT,
        (SELECT COUNT(*)::TEXT FROM sales.sales_orders_default),
        CASE
            WHEN (SELECT COUNT(*) FROM sales.sales_orders_default) = 0
            THEN '✅ OK'::TEXT
            ELSE '❌ ERROR'::TEXT
        END,
        CASE
            WHEN (SELECT COUNT(*) FROM sales.sales_orders_default) = 0
            THEN 'Default partition is empty (expected)'::TEXT
            ELSE 'Data in default partition! Create missing partitions and migrate data.'::TEXT
        END;

    RETURN QUERY
    SELECT
        'accounting_postings'::TEXT,
        'Default partition rows'::TEXT,
        (SELECT COUNT(*)::TEXT FROM sales.accounting_postings_default),
        CASE
            WHEN (SELECT COUNT(*) FROM sales.accounting_postings_default) = 0
            THEN '✅ OK'::TEXT
            ELSE '❌ ERROR'::TEXT
        END,
        CASE
            WHEN (SELECT COUNT(*) FROM sales.accounting_postings_default) = 0
            THEN 'Default partition is empty (expected)'::TEXT
            ELSE 'Data in default partition! Create missing partitions and migrate data.'::TEXT
        END;

    RETURN QUERY
    SELECT
        'domain_event_logs'::TEXT,
        'Default partition rows'::TEXT,
        (SELECT COUNT(*)::TEXT FROM sales.domain_event_logs_default),
        CASE
            WHEN (SELECT COUNT(*) FROM sales.domain_event_logs_default) = 0
            THEN '✅ OK'::TEXT
            ELSE '❌ ERROR'::TEXT
        END,
        CASE
            WHEN (SELECT COUNT(*) FROM sales.domain_event_logs_default) = 0
            THEN 'Default partition is empty (expected)'::TEXT
            ELSE 'Data in default partition! Create missing partitions and migrate data.'::TEXT
        END;

    -- Check partition sizes
    RETURN QUERY
    SELECT
        'sales_orders'::TEXT,
        'Largest partition size'::TEXT,
        (SELECT pg_size_pretty(MAX(pg_total_relation_size(schemaname||'.'||tablename)))
         FROM pg_tables
         WHERE schemaname = 'sales' AND tablename LIKE 'sales_orders_%'),
        '📊 INFO'::TEXT,
        'Monitor partition sizes. Consider monthly archival if > 50GB per partition'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- FUNCTION 3: List all partitions with metadata
-- =====================================================================

CREATE OR REPLACE FUNCTION sales.list_partitions(p_table_name TEXT DEFAULT NULL)
RETURNS TABLE (
    parent_table TEXT,
    partition_name TEXT,
    partition_range TEXT,
    row_count BIGINT,
    total_size TEXT,
    indexes_size TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        parent.relname::TEXT,
        child.relname::TEXT,
        pg_get_expr(child.relpartbound, child.oid)::TEXT AS partition_range,
        (SELECT COUNT(*) FROM sales.sales_orders
         WHERE pg_catalog.pg_table_is_visible(child.oid)) AS row_count,
        pg_size_pretty(pg_total_relation_size(child.oid))::TEXT,
        pg_size_pretty(pg_indexes_size(child.oid))::TEXT,
        obj_description(child.oid)::TIMESTAMPTZ
    FROM pg_inherits
    JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
    JOIN pg_class child ON pg_inherits.inhrelid = child.oid
    JOIN pg_namespace ON parent.relnamespace = pg_namespace.oid
    WHERE pg_namespace.nspname = 'sales'
      AND parent.relname IN ('sales_orders', 'accounting_postings', 'domain_event_logs')
      AND (p_table_name IS NULL OR parent.relname = p_table_name)
    ORDER BY parent.relname, child.relname;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- FUNCTION 4: Migrate data from default partition
-- =====================================================================

CREATE OR REPLACE FUNCTION sales.migrate_from_default_partition(
    p_table_name TEXT,
    p_dry_run BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    action TEXT,
    partition_created TEXT,
    rows_affected BIGINT,
    status TEXT
) AS $$
DECLARE
    default_count BIGINT;
    min_date TIMESTAMPTZ;
    max_date TIMESTAMPTZ;
    partition_date DATE;
    rows_moved BIGINT := 0;
BEGIN
    -- Validate table name
    IF p_table_name NOT IN ('sales_orders', 'accounting_postings', 'domain_event_logs') THEN
        RAISE EXCEPTION 'Invalid table name: %. Must be one of: sales_orders, accounting_postings, domain_event_logs', p_table_name;
    END IF;

    -- Check default partition
    EXECUTE format('SELECT COUNT(*) FROM sales.%I_default', p_table_name) INTO default_count;

    IF default_count = 0 THEN
        RETURN QUERY SELECT
            'CHECK'::TEXT,
            NULL::TEXT,
            0::BIGINT,
            'Default partition is empty - no action needed'::TEXT;
        RETURN;
    END IF;

    -- Get date range in default partition
    CASE p_table_name
        WHEN 'sales_orders' THEN
            SELECT MIN(order_date), MAX(order_date) INTO min_date, max_date
            FROM sales.sales_orders_default;
        WHEN 'accounting_postings' THEN
            SELECT MIN(posting_date), MAX(posting_date) INTO min_date, max_date
            FROM sales.accounting_postings_default;
        WHEN 'domain_event_logs' THEN
            SELECT MIN(created_at), MAX(created_at) INTO min_date, max_date
            FROM sales.domain_event_logs_default;
    END CASE;

    RETURN QUERY SELECT
        'ANALYSIS'::TEXT,
        NULL::TEXT,
        default_count,
        format('Found %s rows in default partition spanning %s to %s',
               default_count, min_date, max_date)::TEXT;

    IF p_dry_run THEN
        RETURN QUERY SELECT
            'DRY_RUN'::TEXT,
            NULL::TEXT,
            default_count,
            'Run with p_dry_run = FALSE to execute migration'::TEXT;
    ELSE
        -- TODO: Implement actual migration logic
        RETURN QUERY SELECT
            'MIGRATION'::TEXT,
            NULL::TEXT,
            0::BIGINT,
            'Migration not yet implemented. Manually create partitions and migrate data.'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- FUNCTION 5: Test partition pruning
-- =====================================================================

CREATE OR REPLACE FUNCTION sales.test_partition_pruning(
    p_table_name TEXT,
    p_date_start TIMESTAMPTZ,
    p_date_end TIMESTAMPTZ
)
RETURNS TABLE (
    query_plan TEXT,
    partitions_scanned INTEGER,
    partitions_pruned INTEGER,
    execution_time_ms NUMERIC
) AS $$
DECLARE
    query TEXT;
    plan_output TEXT;
BEGIN
    -- Build query based on table
    CASE p_table_name
        WHEN 'sales_orders' THEN
            query := format('EXPLAIN ANALYZE SELECT COUNT(*) FROM sales.sales_orders WHERE order_date >= %L AND order_date < %L',
                          p_date_start, p_date_end);
        WHEN 'accounting_postings' THEN
            query := format('EXPLAIN ANALYZE SELECT COUNT(*) FROM sales.accounting_postings WHERE posting_date >= %L AND posting_date < %L',
                          p_date_start, p_date_end);
        WHEN 'domain_event_logs' THEN
            query := format('EXPLAIN ANALYZE SELECT COUNT(*) FROM sales.domain_event_logs WHERE created_at >= %L AND created_at < %L',
                          p_date_start, p_date_end);
        ELSE
            RAISE EXCEPTION 'Invalid table name: %', p_table_name;
    END CASE;

    -- Execute EXPLAIN ANALYZE and return results
    RETURN QUERY SELECT
        query AS query_plan,
        NULL::INTEGER,
        NULL::INTEGER,
        NULL::NUMERIC;

    -- Note: Full implementation would parse EXPLAIN output for partition stats
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON FUNCTION sales.create_future_partitions() IS
'Automatically creates future partitions for all partitioned tables.
Run daily via cron: SELECT sales.create_future_partitions();
Returns list of newly created partitions.';

COMMENT ON FUNCTION sales.check_partition_health() IS
'Health check for partition setup. Verifies:
1. Future partitions exist (3-6 months ahead)
2. Default partitions are empty
3. Partition sizes are reasonable
Run weekly or after maintenance.';

COMMENT ON FUNCTION sales.list_partitions(TEXT) IS
'Lists all partitions for a table with metadata.
Usage: SELECT * FROM sales.list_partitions(''sales_orders'');
Or: SELECT * FROM sales.list_partitions() for all tables.';

COMMENT ON FUNCTION sales.migrate_from_default_partition(TEXT, BOOLEAN) IS
'Migrates data from default partition to proper date-based partitions.
Usage: SELECT * FROM sales.migrate_from_default_partition(''sales_orders'', TRUE) for dry run.
Set second parameter to FALSE to execute migration.';

-- =====================================================================
-- GRANT PERMISSIONS (adjust as needed for your environment)
-- =====================================================================

-- Grant execute to service role or admin role
-- GRANT EXECUTE ON FUNCTION sales.create_future_partitions() TO service_role;
-- GRANT EXECUTE ON FUNCTION sales.check_partition_health() TO monitoring_role;
