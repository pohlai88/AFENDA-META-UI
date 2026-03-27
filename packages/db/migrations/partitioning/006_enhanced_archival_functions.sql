-- =====================================================================
-- Enhanced Partition Archival Functions with Hot/Warm/Cold Support
-- =====================================================================
-- Description: Extended archival functions for 3-tier storage lifecycle
-- Version: 2.0
-- Last Updated: 2026-03-28
-- Dependencies: Requires existing partition infrastructure from 001-005
-- =====================================================================

-- =====================================================================
-- SCHEMA SETUP: Archive and Cold Storage Catalog
-- =====================================================================

-- Create archive schema for warm storage
CREATE SCHEMA IF NOT EXISTS archive;
COMMENT ON SCHEMA archive IS 'Warm storage tier for detached partitions (25-84 months retention)';

-- Create cold_storage schema for R2 catalog
CREATE SCHEMA IF NOT EXISTS cold_storage;
COMMENT ON SCHEMA cold_storage IS 'Cold storage catalog for R2-archived partitions (85+ months retention)';

-- =====================================================================
-- TABLE: R2 Archive Catalog (tracks cold storage)
-- =====================================================================

CREATE TABLE IF NOT EXISTS cold_storage.r2_archive_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Partition identification
    table_name TEXT NOT NULL, -- e.g., 'sales_orders', 'accounting_postings'
    partition_name TEXT NOT NULL, -- e.g., '2020_01', '2020_W01'
    schema_name TEXT NOT NULL DEFAULT 'sales',

    -- R2 object details
    r2_bucket_name TEXT NOT NULL DEFAULT 'afenda-archive',
    r2_object_key TEXT NOT NULL UNIQUE, -- e.g., 'sales_orders/2020/sales_orders_2020_01.parquet'
    r2_object_size_bytes BIGINT NOT NULL,
    r2_object_etag TEXT,

    -- Partition metadata
    row_count BIGINT NOT NULL,
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,
    original_table_size_bytes BIGINT NOT NULL,
    compression_ratio NUMERIC(5,2), -- e.g., 0.25 = 75% compression

    -- Archival tracking
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_by TEXT NOT NULL DEFAULT CURRENT_USER,
    checksum_sha256 TEXT NOT NULL, -- Integrity validation
    parquet_schema_version TEXT, -- e.g., '1.0', '2.0'

    -- Restoration tracking
    last_restored_at TIMESTAMPTZ,
    restored_count INTEGER NOT NULL DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_row_count_positive CHECK (row_count >= 0),
    CONSTRAINT chk_object_size_positive CHECK (r2_object_size_bytes > 0),
    CONSTRAINT chk_date_range_valid CHECK (date_range_end >= date_range_start),
    CONSTRAINT chk_compression_ratio_valid CHECK (compression_ratio > 0 AND compression_ratio <= 1)
);

-- Indexes for catalog queries
CREATE INDEX idx_r2_catalog_table_partition ON cold_storage.r2_archive_catalog (table_name, partition_name);
CREATE INDEX idx_r2_catalog_archived_at ON cold_storage.r2_archive_catalog (archived_at DESC);
CREATE INDEX idx_r2_catalog_date_range ON cold_storage.r2_archive_catalog (table_name, date_range_start, date_range_end);
CREATE INDEX idx_r2_catalog_r2_key ON cold_storage.r2_archive_catalog (r2_object_key);

COMMENT ON TABLE cold_storage.r2_archive_catalog IS 'Catalog of partitions archived to Cloudflare R2 cold storage';

-- =====================================================================
-- TABLE: Archive Promotion Log (tracks hot ÔåÆ warm transitions)
-- =====================================================================

CREATE TABLE IF NOT EXISTS archive.promotion_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Partition identification
    table_name TEXT NOT NULL,
    partition_name TEXT NOT NULL,
    schema_name TEXT NOT NULL DEFAULT 'sales',

    -- Promotion metadata
    promoted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    promoted_by TEXT NOT NULL DEFAULT CURRENT_USER,
    row_count BIGINT NOT NULL,
    original_size_bytes BIGINT NOT NULL,
    archived_size_bytes BIGINT NOT NULL,

    -- Space savings
    space_saved_bytes BIGINT GENERATED ALWAYS AS (original_size_bytes - archived_size_bytes) STORED,
    compression_ratio NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE WHEN original_size_bytes > 0
        THEN ROUND((archived_size_bytes::NUMERIC / original_size_bytes::NUMERIC), 2)
        ELSE 1.0 END
    ) STORED,

    -- Optimization actions
    indexes_dropped TEXT[], -- Array of dropped index names
    vacuum_full_executed BOOLEAN NOT NULL DEFAULT FALSE,
    fillfactor_set INTEGER, -- e.g., 100 for read-only optimization

    -- Timing
    duration_seconds NUMERIC(10,2),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_row_count_positive CHECK (row_count >= 0),
    CONSTRAINT chk_original_size_positive CHECK (original_size_bytes >= 0),
    CONSTRAINT chk_archived_size_positive CHECK (archived_size_bytes >= 0)
);

-- Indexes for promotion log queries
CREATE INDEX idx_promotion_log_promoted_at ON archive.promotion_log (promoted_at DESC);
CREATE INDEX idx_promotion_log_table_partition ON archive.promotion_log (table_name, partition_name);

COMMENT ON TABLE archive.promotion_log IS 'Audit log for hot ÔåÆ warm storage promotions';

-- =====================================================================
-- FUNCTION: Promote to Warm Storage (Hot ÔåÆ Warm)
-- =====================================================================

CREATE OR REPLACE FUNCTION sales.promote_to_warm_storage(
    p_retention_months INTEGER DEFAULT 24,
    p_dry_run BOOLEAN DEFAULT TRUE,
    p_vacuum_full BOOLEAN DEFAULT TRUE,
    p_drop_optional_indexes BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    partition_name TEXT,
    partition_date TEXT,
    row_count BIGINT,
    original_size TEXT,
    action TEXT,
    status TEXT,
    space_saved TEXT
) AS $$
DECLARE
    partition_rec RECORD;
    cutoff_date DATE;
    rows_in_partition BIGINT;
    original_size_bytes BIGINT;
    archived_size_bytes BIGINT;
    indexes_to_drop TEXT[];
    index_name TEXT;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    duration_sec NUMERIC;
BEGIN
    -- Calculate cutoff date (24 months ago by default)
    cutoff_date := DATE_TRUNC('month', CURRENT_DATE - (p_retention_months || ' months')::INTERVAL);

    RETURN QUERY SELECT
        'INFO'::TEXT,
        cutoff_date::TEXT,
        NULL::BIGINT,
        NULL::TEXT,
        'Warm promotion policy'::TEXT,
        format('Promoting partitions older than %s (retention: %s months)', cutoff_date, p_retention_months)::TEXT,
        NULL::TEXT;

    -- Process sales_orders partitions
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

        start_time := clock_timestamp();

        -- Get metadata
        EXECUTE format('SELECT COUNT(*) FROM sales.%I', partition_rec.tablename)
        INTO rows_in_partition;

        original_size_bytes := pg_total_relation_size('sales.' || partition_rec.tablename);

        IF p_dry_run THEN
            RETURN QUERY SELECT
                partition_rec.tablename::TEXT,
                partition_rec.partition_date::TEXT,
                rows_in_partition,
                pg_size_pretty(original_size_bytes),
                'DRY_RUN'::TEXT,
                'Would promote to warm storage'::TEXT,
                'N/A'::TEXT;
        ELSE
            -- 1. Detach partition from parent table
            EXECUTE format('ALTER TABLE sales.sales_orders DETACH PARTITION sales.%I', partition_rec.tablename);

            -- 2. Move to archive schema
            EXECUTE format('ALTER TABLE sales.%I SET SCHEMA archive', partition_rec.tablename);

            -- 3. Rename with _archived suffix
            EXECUTE format('ALTER TABLE archive.%I RENAME TO %I',
                          partition_rec.tablename,
                          partition_rec.tablename || '_archived');

            -- 4. Set read-only optimization (fillfactor = 100)
            EXECUTE format('ALTER TABLE archive.%I SET (fillfactor = 100)',
                          partition_rec.tablename || '_archived');

            -- 5. Drop optional indexes (keep tenant_id + date range only)
            IF p_drop_optional_indexes THEN
                indexes_to_drop := ARRAY[]::TEXT[];

                -- Identify indexes to drop (all except tenant + date)
                FOR index_name IN
                    SELECT indexname
                    FROM pg_indexes
                    WHERE schemaname = 'archive'
                      AND tablename = partition_rec.tablename || '_archived'
                      AND indexname NOT LIKE '%_tenant_%'
                      AND indexname NOT LIKE '%_date_%'
                      AND indexname NOT LIKE '%_pkey'
                LOOP
                    EXECUTE format('DROP INDEX IF EXISTS archive.%I', index_name);
                    indexes_to_drop := array_append(indexes_to_drop, index_name);
                END LOOP;
            END IF;

            -- 6. VACUUM FULL to reclaim space (optional, can be slow)
            IF p_vacuum_full THEN
                EXECUTE format('VACUUM (FULL, ANALYZE) archive.%I', partition_rec.tablename || '_archived');
            ELSE
                EXECUTE format('ANALYZE archive.%I', partition_rec.tablename || '_archived');
            END IF;

            -- 7. Get final size
            archived_size_bytes := pg_total_relation_size('archive.' || partition_rec.tablename || '_archived');

            end_time := clock_timestamp();
            duration_sec := EXTRACT(EPOCH FROM (end_time - start_time));

            -- 8. Log promotion
            INSERT INTO archive.promotion_log (
                table_name,
                partition_name,
                schema_name,
                promoted_at,
                row_count,
                original_size_bytes,
                archived_size_bytes,
                indexes_dropped,
                vacuum_full_executed,
                fillfactor_set,
                duration_seconds
            ) VALUES (
                'sales_orders',
                partition_rec.tablename,
                'sales',
                start_time,
                rows_in_partition,
                original_size_bytes,
                archived_size_bytes,
                indexes_to_drop,
                p_vacuum_full,
                100,
                duration_sec
            );

            RETURN QUERY SELECT
                partition_rec.tablename::TEXT,
                partition_rec.partition_date::TEXT,
                rows_in_partition,
                pg_size_pretty(original_size_bytes),
                'PROMOTED'::TEXT,
                format('Moved to archive schema (%.1f sec)', duration_sec)::TEXT,
                pg_size_pretty(original_size_bytes - archived_size_bytes);
        END IF;
    END LOOP;

    -- Process accounting_postings partitions (same logic)
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
        IF partition_rec.partition_date >= cutoff_date THEN
            CONTINUE;
        END IF;

        start_time := clock_timestamp();

        EXECUTE format('SELECT COUNT(*) FROM sales.%I', partition_rec.tablename)
        INTO rows_in_partition;

        original_size_bytes := pg_total_relation_size('sales.' || partition_rec.tablename);

        IF p_dry_run THEN
            RETURN QUERY SELECT
                partition_rec.tablename::TEXT,
                partition_rec.partition_date::TEXT,
                rows_in_partition,
                pg_size_pretty(original_size_bytes),
                'DRY_RUN'::TEXT,
                'Would promote to warm storage'::TEXT,
                'N/A'::TEXT;
        ELSE
            -- Same steps as sales_orders
            EXECUTE format('ALTER TABLE sales.accounting_postings DETACH PARTITION sales.%I', partition_rec.tablename);
            EXECUTE format('ALTER TABLE sales.%I SET SCHEMA archive', partition_rec.tablename);
            EXECUTE format('ALTER TABLE archive.%I RENAME TO %I', partition_rec.tablename, partition_rec.tablename || '_archived');
            EXECUTE format('ALTER TABLE archive.%I SET (fillfactor = 100)', partition_rec.tablename || '_archived');

            IF p_drop_optional_indexes THEN
                indexes_to_drop := ARRAY[]::TEXT[];
                FOR index_name IN
                    SELECT indexname FROM pg_indexes
                    WHERE schemaname = 'archive'
                      AND tablename = partition_rec.tablename || '_archived'
                      AND indexname NOT LIKE '%_tenant_%'
                      AND indexname NOT LIKE '%_date_%'
                      AND indexname NOT LIKE '%_pkey'
                LOOP
                    EXECUTE format('DROP INDEX IF EXISTS archive.%I', index_name);
                    indexes_to_drop := array_append(indexes_to_drop, index_name);
                END LOOP;
            END IF;

            IF p_vacuum_full THEN
                EXECUTE format('VACUUM (FULL, ANALYZE) archive.%I', partition_rec.tablename || '_archived');
            ELSE
                EXECUTE format('ANALYZE archive.%I', partition_rec.tablename || '_archived');
            END IF;

            archived_size_bytes := pg_total_relation_size('archive.' || partition_rec.tablename || '_archived');
            end_time := clock_timestamp();
            duration_sec := EXTRACT(EPOCH FROM (end_time - start_time));

            INSERT INTO archive.promotion_log (
                table_name, partition_name, schema_name, promoted_at,
                row_count, original_size_bytes, archived_size_bytes,
                indexes_dropped, vacuum_full_executed, fillfactor_set, duration_seconds
            ) VALUES (
                'accounting_postings', partition_rec.tablename, 'sales', start_time,
                rows_in_partition, original_size_bytes, archived_size_bytes,
                indexes_to_drop, p_vacuum_full, 100, duration_sec
            );

            RETURN QUERY SELECT
                partition_rec.tablename::TEXT,
                partition_rec.partition_date::TEXT,
                rows_in_partition,
                pg_size_pretty(original_size_bytes),
                'PROMOTED'::TEXT,
                format('Moved to archive schema (%.1f sec)', duration_sec)::TEXT,
                pg_size_pretty(original_size_bytes - archived_size_bytes);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sales.promote_to_warm_storage IS 'Promote hot partitions (>24 months) to warm storage (archive schema)';

-- =====================================================================
-- FUNCTION: List Warm Storage Inventory
-- =====================================================================

CREATE OR REPLACE FUNCTION archive.list_warm_storage_inventory()
RETURNS TABLE (
    table_name TEXT,
    partition_date TEXT,
    row_count BIGINT,
    table_size TEXT,
    age_months INTEGER,
    promoted_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pl.table_name::TEXT,
        pl.partition_name::TEXT AS partition_date,
        pl.row_count,
        pg_size_pretty(pl.archived_size_bytes)::TEXT AS table_size,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, pl.promoted_at::DATE)) * 12 +
        EXTRACT(MONTH FROM AGE(CURRENT_DATE, pl.promoted_at::DATE)) AS age_months,
        pl.promoted_at
    FROM archive.promotion_log pl
    ORDER BY pl.promoted_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION archive.list_warm_storage_inventory IS 'List all partitions in warm storage (archive schema)';

-- =====================================================================
-- FUNCTION: Identify Candidates for Cold Storage
-- =====================================================================

CREATE OR REPLACE FUNCTION archive.identify_cold_candidates(
    p_orders_retention_years INTEGER DEFAULT 7,
    p_postings_retention_years INTEGER DEFAULT 10
)
RETURNS TABLE (
    table_name TEXT,
    partition_name TEXT,
    archive_table_name TEXT,
    row_count BIGINT,
    table_size TEXT,
    age_months INTEGER,
    eligible_reason TEXT
) AS $$
DECLARE
    orders_cutoff_date DATE;
    postings_cutoff_date DATE;
BEGIN
    orders_cutoff_date := DATE_TRUNC('month', CURRENT_DATE - (p_orders_retention_years || ' years')::INTERVAL);
    postings_cutoff_date := DATE_TRUNC('month', CURRENT_DATE - (p_postings_retention_years || ' years')::INTERVAL);

    RETURN QUERY
    -- Sales orders older than 7 years
    SELECT
        'sales_orders'::TEXT,
        SUBSTRING(tablename FROM 'sales_orders_(.+)_archived')::TEXT AS partition_name,
        ('archive.' || tablename)::TEXT AS archive_table_name,
        (SELECT COUNT(*) FROM pg_class WHERE relname = tablename)::BIGINT AS row_count,
        pg_size_pretty(pg_total_relation_size('archive.' || tablename))::TEXT,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, TO_DATE(SUBSTRING(tablename FROM 'sales_orders_(\d{4}_\d{2})'), 'YYYY_MM'))) * 12 +
        EXTRACT(MONTH FROM AGE(CURRENT_DATE, TO_DATE(SUBSTRING(tablename FROM 'sales_orders_(\d{4}_\d{2})'), 'YYYY_MM'))) AS age_months,
        format('Older than %s years (retention policy)', p_orders_retention_years)::TEXT
    FROM pg_tables
    WHERE schemaname = 'archive'
      AND tablename LIKE 'sales_orders_%_archived'
      AND TO_DATE(SUBSTRING(tablename FROM 'sales_orders_(\d{4}_\d{2})'), 'YYYY_MM') < orders_cutoff_date

    UNION ALL

    -- Accounting postings older than 10 years
    SELECT
        'accounting_postings'::TEXT,
        SUBSTRING(tablename FROM 'accounting_postings_(.+)_archived')::TEXT,
        ('archive.' || tablename)::TEXT,
        (SELECT COUNT(*) FROM pg_class WHERE relname = tablename)::BIGINT,
        pg_size_pretty(pg_total_relation_size('archive.' || tablename))::TEXT,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, TO_DATE(SUBSTRING(tablename FROM 'accounting_postings_(\d{4}_\d{2})'), 'YYYY_MM'))) * 12 +
        EXTRACT(MONTH FROM AGE(CURRENT_DATE, TO_DATE(SUBSTRING(tablename FROM 'accounting_postings_(\d{4}_\d{2})'), 'YYYY_MM'))) AS age_months,
        format('Older than %s years (retention policy)', p_postings_retention_years)::TEXT
    FROM pg_tables
    WHERE schemaname = 'archive'
      AND tablename LIKE 'accounting_postings_%_archived'
      AND TO_DATE(SUBSTRING(tablename FROM 'accounting_postings_(\d{4}_\d{2})'), 'YYYY_MM') < postings_cutoff_date

    ORDER BY age_months DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION archive.identify_cold_candidates IS 'Identify archive tables eligible for cold storage (R2)';

-- =====================================================================
-- FUNCTION: Archive Health Check
-- =====================================================================

CREATE OR REPLACE FUNCTION sales.check_archive_health()
RETURNS TABLE (
    metric TEXT,
    value TEXT,
    status TEXT,
    recommendation TEXT
) AS $$
DECLARE
    hot_partition_count INTEGER;
    warm_partition_count INTEGER;
    cold_partition_count INTEGER;
    oldest_hot_months INTEGER;
    oldest_warm_months INTEGER;
    default_partition_rows BIGINT;
BEGIN
    -- Count partitions in each tier
    SELECT COUNT(*) INTO hot_partition_count
    FROM pg_tables
    WHERE schemaname = 'sales'
      AND (tablename LIKE 'sales_orders_%' OR tablename LIKE 'accounting_postings_%')
      AND tablename NOT LIKE '%_default';

    SELECT COUNT(*) INTO warm_partition_count
    FROM pg_tables
    WHERE schemaname = 'archive'
      AND tablename LIKE '%_archived';

    SELECT COUNT(*) INTO cold_partition_count
    FROM cold_storage.r2_archive_catalog;

    -- Check oldest hot partition age
    SELECT MAX(EXTRACT(YEAR FROM AGE(CURRENT_DATE, TO_DATE(SUBSTRING(tablename FROM '\d{4}_\d{2}'), 'YYYY_MM'))) * 12 +
               EXTRACT(MONTH FROM AGE(CURRENT_DATE, TO_DATE(SUBSTRING(tablename FROM '\d{4}_\d{2}'), 'YYYY_MM'))))
    INTO oldest_hot_months
    FROM pg_tables
    WHERE schemaname = 'sales'
      AND tablename LIKE 'sales_orders_%'
      AND tablename != 'sales_orders_default';

    -- Check default partition rows
    EXECUTE 'SELECT COUNT(*) FROM sales.sales_orders_default' INTO default_partition_rows;

    -- Return health metrics
    RETURN QUERY SELECT
        'Hot partition count'::TEXT,
        hot_partition_count::TEXT,
        CASE WHEN hot_partition_count BETWEEN 20 AND 30 THEN 'Ô£à OK' ELSE 'ÔÜá´©Å REVIEW' END,
        'Expected: 20-30 partitions (24 months)'::TEXT;

    RETURN QUERY SELECT
        'Warm partition count'::TEXT,
        warm_partition_count::TEXT,
        CASE WHEN warm_partition_count >= 0 THEN 'Ô£à OK' ELSE 'ÔØî ERROR' END,
        'Partitions in archive schema'::TEXT;

    RETURN QUERY SELECT
        'Cold partition count'::TEXT,
        cold_partition_count::TEXT,
        CASE WHEN cold_partition_count >= 0 THEN 'Ô£à OK' ELSE 'ÔØî ERROR' END,
        'Partitions archived to R2'::TEXT;

    RETURN QUERY SELECT
        'Oldest hot partition age'::TEXT,
        COALESCE(oldest_hot_months::TEXT || ' months', 'N/A'),
        CASE
            WHEN oldest_hot_months IS NULL THEN 'Ô£à OK'
            WHEN oldest_hot_months <= 25 THEN 'Ô£à OK'
            WHEN oldest_hot_months <= 27 THEN 'ÔÜá´©Å WARNING'
            ELSE 'ÔØî CRITICAL' END,
        'Action: Run promote_to_warm_storage() if > 24 months'::TEXT;

    RETURN QUERY SELECT
        'Default partition rows'::TEXT,
        default_partition_rows::TEXT,
        CASE
            WHEN default_partition_rows = 0 THEN 'Ô£à OK'
            WHEN default_partition_rows <= 100 THEN 'ÔÜá´©Å WARNING'
            ELSE 'ÔØî CRITICAL' END,
        'Default partition should be empty'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sales.check_archive_health IS 'Comprehensive health check for hot/warm/cold storage tiers';

-- =====================================================================
-- GRANT PERMISSIONS
-- =====================================================================

-- Read-only access to archive schema for analysts
GRANT USAGE ON SCHEMA archive TO readonly_role;
GRANT SELECT ON ALL TABLES IN SCHEMA archive TO readonly_role;

-- Read-only access to cold_storage catalog
GRANT USAGE ON SCHEMA cold_storage TO readonly_role;
GRANT SELECT ON ALL TABLES IN SCHEMA cold_storage TO readonly_role;

-- =====================================================================
-- COMPLETION
-- =====================================================================

DO $$
BEGIN
    RAISE NOTICE 'Ô£à Enhanced archival functions installed successfully';
    RAISE NOTICE '­ƒôè Run: SELECT * FROM sales.check_archive_health();';
    RAISE NOTICE '­ƒöä Test: SELECT * FROM sales.promote_to_warm_storage(24, TRUE, FALSE, TRUE);';
    RAISE NOTICE '­ƒôé List: SELECT * FROM archive.list_warm_storage_inventory();';
    RAISE NOTICE 'ÔØä´©Å Identify: SELECT * FROM archive.identify_cold_candidates(7, 10);';
END $$;
