-- =====================================================================
-- Partition Maintenance Scripts
-- =====================================================================
-- Description: Archive and cleanup old partitions for lifecycle management
-- Purpose: Detach and optionally archive partitions older than retention policy
-- Schedule: Run monthly or as needed
-- =====================================================================

-- =====================================================================
-- FUNCTION 1: Archive old sales_orders partitions
-- =====================================================================

CREATE OR REPLACE FUNCTION sales.archive_sales_orders_partitions(
    p_retention_years INTEGER DEFAULT 7,
    p_dry_run BOOLEAN DEFAULT TRUE,
    p_create_archive BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    partition_name TEXT,
    partition_date TEXT,
    row_count BIGINT,
    partition_size TEXT,
    action TEXT,
    status TEXT
) AS $$
DECLARE
    partition_rec RECORD;
    cutoff_date DATE;
    rows_in_partition BIGINT;
    archive_table_name TEXT;
BEGIN
    -- Calculate cutoff date (7 years ago by default)
    cutoff_date := DATE_TRUNC('month', CURRENT_DATE - (p_retention_years || ' years')::INTERVAL);

    RETURN QUERY SELECT
        'INFO'::TEXT,
        cutoff_date::TEXT,
        NULL::BIGINT,
        NULL::TEXT,
        'Archival policy'::TEXT,
        format('Archiving partitions older than %s (retention: %s years)',
               cutoff_date, p_retention_years)::TEXT;

    -- Loop through partitions
    FOR partition_rec IN
        SELECT
            tablename,
            TO_DATE(
                SUBSTRING(tablename FROM 'sales_orders_(\d{4}_\d{2})'),
                'YYYY_MM'
            ) AS partition_date
        FROM pg_tables
        WHERE schemaname = 'sales'
          AND tablename LIKE 'sales_orders_____\____'
          AND tablename != 'sales_orders_default'
        ORDER BY tablename
    LOOP
        -- Skip partitions within retention period
        IF partition_rec.partition_date >= cutoff_date THEN
            CONTINUE;
        END IF;

        -- Get row count
        EXECUTE format('SELECT COUNT(*) FROM sales.%I', partition_rec.tablename)
        INTO rows_in_partition;

        IF p_dry_run THEN
            RETURN QUERY SELECT
                partition_rec.tablename::TEXT,
                partition_rec.partition_date::TEXT,
                rows_in_partition,
                (SELECT pg_size_pretty(pg_total_relation_size('sales.' || partition_rec.tablename))),
                'DRY_RUN'::TEXT,
                'Would detach and archive this partition'::TEXT;
        ELSE
            -- Create archive schema if it doesn't exist
            IF p_create_archive THEN
                EXECUTE 'CREATE SCHEMA IF NOT EXISTS archive';

                -- Create archive table
                archive_table_name := 'archive.' || partition_rec.tablename || '_archived';
                EXECUTE format('CREATE TABLE %s AS SELECT * FROM sales.%I',
                              archive_table_name, partition_rec.tablename);

                RETURN QUERY SELECT
                    partition_rec.tablename::TEXT,
                    partition_rec.partition_date::TEXT,
                    rows_in_partition,
                    (SELECT pg_size_pretty(pg_total_relation_size('sales.' || partition_rec.tablename))),
                    'ARCHIVED'::TEXT,
                    format('Copied to %s', archive_table_name)::TEXT;
            END IF;

            -- Detach partition
            EXECUTE format('ALTER TABLE sales.sales_orders DETACH PARTITION sales.%I',
                          partition_rec.tablename);

            -- Drop partition (data is in archive)
            IF p_create_archive THEN
                EXECUTE format('DROP TABLE sales.%I', partition_rec.tablename);

                RETURN QUERY SELECT
                    partition_rec.tablename::TEXT,
                    partition_rec.partition_date::TEXT,
                    rows_in_partition,
                    NULL::TEXT,
                    'DROPPED'::TEXT,
                    'Partition detached and dropped (archived)'::TEXT;
            ELSE
                RETURN QUERY SELECT
                    partition_rec.tablename::TEXT,
                    partition_rec.partition_date::TEXT,
                    rows_in_partition,
                    NULL::TEXT,
                    'DETACHED'::TEXT,
                    'Partition detached (not archived)'::TEXT;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- FUNCTION 2: Archive old accounting_postings partitions
-- =====================================================================

CREATE OR REPLACE FUNCTION sales.archive_accounting_postings_partitions(
    p_retention_years INTEGER DEFAULT 10,
    p_dry_run BOOLEAN DEFAULT TRUE,
    p_create_archive BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    partition_name TEXT,
    partition_date TEXT,
    row_count BIGINT,
    partition_size TEXT,
    action TEXT,
    status TEXT
) AS $$
DECLARE
    partition_rec RECORD;
    cutoff_date DATE;
    rows_in_partition BIGINT;
    archive_table_name TEXT;
BEGIN
    -- Calculate cutoff date (10 years for financial records)
    cutoff_date := DATE_TRUNC('month', CURRENT_DATE - (p_retention_years || ' years')::INTERVAL);

    RETURN QUERY SELECT
        'INFO'::TEXT,
        cutoff_date::TEXT,
        NULL::BIGINT,
        NULL::TEXT,
        'Archival policy'::TEXT,
        format('Archiving partitions older than %s (retention: %s years)',
               cutoff_date, p_retention_years)::TEXT;

    -- Loop through partitions
    FOR partition_rec IN
        SELECT
            tablename,
            TO_DATE(
                SUBSTRING(tablename FROM 'accounting_postings_(\d{4}_\d{2})'),
                'YYYY_MM'
            ) AS partition_date
        FROM pg_tables
        WHERE schemaname = 'sales'
          AND tablename LIKE 'accounting_postings_____\____'
          AND tablename != 'accounting_postings_default'
        ORDER BY tablename
    LOOP
        -- Skip partitions within retention period
        IF partition_rec.partition_date >= cutoff_date THEN
            CONTINUE;
        END IF;

        -- Get row count
        EXECUTE format('SELECT COUNT(*) FROM sales.%I', partition_rec.tablename)
        INTO rows_in_partition;

        IF p_dry_run THEN
            RETURN QUERY SELECT
                partition_rec.tablename::TEXT,
                partition_rec.partition_date::TEXT,
                rows_in_partition,
                (SELECT pg_size_pretty(pg_total_relation_size('sales.' || partition_rec.tablename))),
                'DRY_RUN'::TEXT,
                'Would detach and archive this partition'::TEXT;
        ELSE
            -- Create archive (financial records must be archived, not just dropped)
            EXECUTE 'CREATE SCHEMA IF NOT EXISTS archive';

            archive_table_name := 'archive.' || partition_rec.tablename || '_archived';
            EXECUTE format('CREATE TABLE %s AS SELECT * FROM sales.%I',
                          archive_table_name, partition_rec.tablename);

            -- Detach partition
            EXECUTE format('ALTER TABLE sales.accounting_postings DETACH PARTITION sales.%I',
                          partition_rec.tablename);

            -- Drop partition (data is safely in archive)
            EXECUTE format('DROP TABLE sales.%I', partition_rec.tablename);

            RETURN QUERY SELECT
                partition_rec.tablename::TEXT,
                partition_rec.partition_date::TEXT,
                rows_in_partition,
                NULL::TEXT,
                'ARCHIVED & DROPPED'::TEXT,
                format('Archived to %s and partition dropped', archive_table_name)::TEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- FUNCTION 3: Archive old domain_event_logs partitions
-- =====================================================================

CREATE OR REPLACE FUNCTION sales.archive_domain_event_logs_partitions(
    p_retention_days INTEGER DEFAULT 90,
    p_dry_run BOOLEAN DEFAULT TRUE,
    p_create_archive BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    partition_name TEXT,
    partition_date TEXT,
    row_count BIGINT,
    partition_size TEXT,
    action TEXT,
    status TEXT
) AS $$
DECLARE
    partition_rec RECORD;
    cutoff_date DATE;
    rows_in_partition BIGINT;
    archive_table_name TEXT;
BEGIN
    -- Calculate cutoff date (90 days by default)
    cutoff_date := DATE_TRUNC('week', CURRENT_DATE - (p_retention_days || ' days')::INTERVAL);

    RETURN QUERY SELECT
        'INFO'::TEXT,
        cutoff_date::TEXT,
        NULL::BIGINT,
        NULL::TEXT,
        'Archival policy'::TEXT,
        format('Archiving partitions older than %s (retention: %s days)',
               cutoff_date, p_retention_days)::TEXT;

    -- Loop through partitions
    FOR partition_rec IN
        SELECT
            tablename,
            -- Parse ISO week date (e.g., domain_event_logs_2024_W01)
            TO_DATE(
                SUBSTRING(tablename FROM 'domain_event_logs_(\d{4})_W(\d{2})') || '-W' ||
                SUBSTRING(tablename FROM 'domain_event_logs_\d{4}_W(\d{2})') || '-1',
                'IYYY-IW-ID'
            ) AS partition_date
        FROM pg_tables
        WHERE schemaname = 'sales'
          AND tablename LIKE 'domain_event_logs_____W__'
        ORDER BY tablename
    LOOP
        -- Skip partitions within retention period
        IF partition_rec.partition_date >= cutoff_date THEN
            CONTINUE;
        END IF;

        -- Get row count
        EXECUTE format('SELECT COUNT(*) FROM sales.%I', partition_rec.tablename)
        INTO rows_in_partition;

        IF p_dry_run THEN
            RETURN QUERY SELECT
                partition_rec.tablename::TEXT,
                partition_rec.partition_date::TEXT,
                rows_in_partition,
                (SELECT pg_size_pretty(pg_total_relation_size('sales.' || partition_rec.tablename))),
                'DRY_RUN'::TEXT,
                'Would detach and drop this partition'::TEXT;
        ELSE
            -- Optionally create archive (usually events are just dropped after retention)
            IF p_create_archive THEN
                EXECUTE 'CREATE SCHEMA IF NOT EXISTS archive';

                archive_table_name := 'archive.' || partition_rec.tablename || '_archived';
                EXECUTE format('CREATE TABLE %s AS SELECT * FROM sales.%I',
                              archive_table_name, partition_rec.tablename);

                RETURN QUERY SELECT
                    partition_rec.tablename::TEXT,
                    partition_rec.partition_date::TEXT,
                    rows_in_partition,
                    (SELECT pg_size_pretty(pg_total_relation_size('sales.' || partition_rec.tablename))),
                    'ARCHIVED'::TEXT,
                    format('Archived to %s', archive_table_name)::TEXT;
            END IF;

            -- Detach partition
            EXECUTE format('ALTER TABLE sales.domain_event_logs DETACH PARTITION sales.%I',
                          partition_rec.tablename);

            -- Drop partition
            EXECUTE format('DROP TABLE sales.%I', partition_rec.tablename);

            RETURN QUERY SELECT
                partition_rec.tablename::TEXT,
                partition_rec.partition_date::TEXT,
                rows_in_partition,
                NULL::TEXT,
                'DETACHED & DROPPED'::TEXT,
                'Partition detached and dropped'::TEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- FUNCTION 4: Setup automated partition management with pg_cron
-- =====================================================================
-- Note: Requires pg_cron extension
-- Install: CREATE EXTENSION pg_cron;

CREATE OR REPLACE FUNCTION sales.setup_partition_cron_jobs()
RETURNS TABLE (
    job_name TEXT,
    schedule TEXT,
    command TEXT,
    status TEXT
) AS $$
BEGIN
    -- Check if pg_cron is installed
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        RETURN QUERY SELECT
            'ERROR'::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            'pg_cron extension not installed. Install with: CREATE EXTENSION pg_cron;'::TEXT;
        RETURN;
    END IF;

    -- Schedule daily partition creation (2 AM)
    PERFORM cron.schedule(
        'create-future-partitions',
        '0 2 * * *',
        $$SELECT sales.create_future_partitions();$$
    );

    RETURN QUERY SELECT
        'create-future-partitions'::TEXT,
        '0 2 * * * (daily at 2 AM)'::TEXT,
        'SELECT sales.create_future_partitions();'::TEXT,
        'SCHEDULED'::TEXT;

    -- Schedule weekly partition health check (Sunday 3 AM)
    PERFORM cron.schedule(
        'check-partition-health',
        '0 3 * * 0',
        $$SELECT sales.check_partition_health();$$
    );

    RETURN QUERY SELECT
        'check-partition-health'::TEXT,
        '0 3 * * 0 (weekly on Sunday at 3 AM)'::TEXT,
        'SELECT sales.check_partition_health();'::TEXT,
        'SCHEDULED'::TEXT;

    -- Schedule monthly archival (1st of month, 4 AM)
    PERFORM cron.schedule(
        'archive-old-partitions',
        '0 4 1 * *',
        $$
        SELECT sales.archive_sales_orders_partitions(7, FALSE, TRUE);
        SELECT sales.archive_accounting_postings_partitions(10, FALSE, TRUE);
        SELECT sales.archive_domain_event_logs_partitions(90, FALSE, FALSE);
        $$
    );

    RETURN QUERY SELECT
        'archive-old-partitions'::TEXT,
        '0 4 1 * * (monthly on 1st at 4 AM)'::TEXT,
        'Archive old partitions per retention policy'::TEXT,
        'SCHEDULED'::TEXT;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT
        'ERROR'::TEXT,
        NULL::TEXT,
        NULL::TEXT,
        format('Failed to setup cron jobs: %s', SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- FUNCTION 5: Remove partition cron jobs
-- =====================================================================

CREATE OR REPLACE FUNCTION sales.remove_partition_cron_jobs()
RETURNS TABLE (
    job_name TEXT,
    status TEXT
) AS $$
BEGIN
    -- Check if pg_cron is installed
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        RETURN QUERY SELECT
            'ERROR'::TEXT,
            'pg_cron extension not installed'::TEXT;
        RETURN;
    END IF;

    -- Unschedule jobs
    PERFORM cron.unschedule('create-future-partitions');
    RETURN QUERY SELECT 'create-future-partitions'::TEXT, 'REMOVED'::TEXT;

    PERFORM cron.unschedule('check-partition-health');
    RETURN QUERY SELECT 'check-partition-health'::TEXT, 'REMOVED'::TEXT;

    PERFORM cron.unschedule('archive-old-partitions');
    RETURN QUERY SELECT 'archive-old-partitions'::TEXT, 'REMOVED'::TEXT;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT
        'ERROR'::TEXT,
        format('Failed to remove cron jobs: %s', SQLERRM)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON FUNCTION sales.archive_sales_orders_partitions(INTEGER, BOOLEAN, BOOLEAN) IS
'Archives sales_orders partitions older than retention period (default 7 years).
Usage: SELECT * FROM sales.archive_sales_orders_partitions(7, TRUE, TRUE);
Parameters: retention_years, dry_run, create_archive';

COMMENT ON FUNCTION sales.archive_accounting_postings_partitions(INTEGER, BOOLEAN, BOOLEAN) IS
'Archives accounting_postings partitions older than retention period (default 10 years).
IMPORTANT: Financial records are always archived before deletion.
Usage: SELECT * FROM sales.archive_accounting_postings_partitions(10, TRUE, TRUE);';

COMMENT ON FUNCTION sales.archive_domain_event_logs_partitions(INTEGER, BOOLEAN, BOOLEAN) IS
'Archives domain_event_logs partitions older than retention period (default 90 days).
Event logs are typically dropped without archival (set create_archive = FALSE).
Usage: SELECT * FROM sales.archive_domain_event_logs_partitions(90, TRUE, FALSE);';

COMMENT ON FUNCTION sales.setup_partition_cron_jobs() IS
'Setup automated partition management with pg_cron.
Schedules:
- Daily at 2 AM: Create future partitions
- Weekly on Sunday at 3 AM: Health check
- Monthly on 1st at 4 AM: Archive old partitions
Requires pg_cron extension.';

-- =====================================================================
-- USAGE EXAMPLES
-- =====================================================================

/*
-- 1. Dry run archival (see what would be archived)
SELECT * FROM sales.archive_sales_orders_partitions(7, TRUE, TRUE);
SELECT * FROM sales.archive_accounting_postings_partitions(10, TRUE, TRUE);
SELECT * FROM sales.archive_domain_event_logs_partitions(90, TRUE, FALSE);

-- 2. Execute archival (CAUTION: This permanently removes partitions)
SELECT * FROM sales.archive_sales_orders_partitions(7, FALSE, TRUE);
SELECT * FROM sales.archive_accounting_postings_partitions(10, FALSE, TRUE);
SELECT * FROM sales.archive_domain_event_logs_partitions(90, FALSE, FALSE);

-- 3. Setup automated partition management
SELECT * FROM sales.setup_partition_cron_jobs();

-- 4. View scheduled jobs
SELECT * FROM cron.job;

-- 5. View job history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- 6. Remove automated jobs
SELECT * FROM sales.remove_partition_cron_jobs();
*/
