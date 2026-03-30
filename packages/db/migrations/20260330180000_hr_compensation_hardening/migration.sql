-- Compensation & equity hardening: vesting JSONB sum-to-100 (via immutable helper),
-- budget remaining identity, expired grant expiry rule, cycle publish/close ordering,
-- vesting effective range, benchmark sample_size, optional enterprise columns.
-- Drizzle: packages/db/src/schema/hr/compensation.ts
--
-- Legacy row repair (before new CHECKs): avoids migration failure on existing dev/staging data.

CREATE OR REPLACE FUNCTION hr.vesting_percentages_total_pct(p jsonb)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
STRICT
AS $fn$
  SELECT CASE jsonb_typeof(p)
    WHEN 'array' THEN COALESCE(
      (
        SELECT sum((elem->>'percentage')::numeric)
        FROM jsonb_array_elements(p) AS elem
      ),
      0::numeric
    )
    ELSE NULL::numeric
  END
$fn$;

-- Row-wise repair so corrupt JSONB does not abort the migration.
DO $$
DECLARE
  vs record;
  v_tot numeric;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'vesting_schedules'
  ) THEN
    FOR vs IN SELECT id, vesting_percentages FROM hr.vesting_schedules WHERE vesting_percentages IS NOT NULL
    LOOP
      BEGIN
        IF jsonb_typeof(vs.vesting_percentages) <> 'array' THEN
          UPDATE hr.vesting_schedules SET vesting_percentages = NULL WHERE id = vs.id;
        ELSE
          v_tot := hr.vesting_percentages_total_pct(vs.vesting_percentages);
          IF v_tot IS DISTINCT FROM 100::numeric THEN
            UPDATE hr.vesting_schedules SET vesting_percentages = NULL WHERE id = vs.id;
          END IF;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          UPDATE hr.vesting_schedules SET vesting_percentages = NULL WHERE id = vs.id;
      END;
    END LOOP;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'vesting_schedules'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'vesting_schedules' AND column_name = 'effective_from'
    ) THEN
      ALTER TABLE hr.vesting_schedules ADD COLUMN effective_from date;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'vesting_schedules' AND column_name = 'effective_to'
    ) THEN
      ALTER TABLE hr.vesting_schedules ADD COLUMN effective_to date;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'vesting_schedules'
        AND c.conname = 'vesting_schedules_effective_range'
    ) THEN
      ALTER TABLE hr.vesting_schedules ADD CONSTRAINT vesting_schedules_effective_range CHECK (
        effective_from IS NULL OR effective_to IS NULL OR effective_from <= effective_to
      );
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'vesting_schedules'
        AND c.conname = 'vesting_schedules_percentages_sum_100'
    ) THEN
      ALTER TABLE hr.vesting_schedules ADD CONSTRAINT vesting_schedules_percentages_sum_100 CHECK (
        vesting_percentages IS NULL
        OR (
          jsonb_typeof(vesting_percentages) = 'array'
          AND hr.vesting_percentages_total_pct(vesting_percentages) = 100::numeric
        )
      );
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'compensation_cycles'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'compensation_cycles' AND column_name = 'published_at'
    ) THEN
      ALTER TABLE hr.compensation_cycles ADD COLUMN published_at timestamptz;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'compensation_cycles' AND column_name = 'closed_at'
    ) THEN
      ALTER TABLE hr.compensation_cycles ADD COLUMN closed_at timestamptz;
    END IF;
    UPDATE hr.compensation_cycles
    SET closed_at = published_at
    WHERE published_at IS NOT NULL
      AND closed_at IS NOT NULL
      AND closed_at < published_at;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'compensation_cycles'
        AND c.conname = 'compensation_cycles_published_closed_order'
    ) THEN
      ALTER TABLE hr.compensation_cycles ADD CONSTRAINT compensation_cycles_published_closed_order CHECK (
        published_at IS NULL OR closed_at IS NULL OR closed_at >= published_at
      );
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'compensation_budgets'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'compensation_budgets' AND column_name = 'adjustment_reason'
    ) THEN
      ALTER TABLE hr.compensation_budgets ADD COLUMN adjustment_reason text;
    END IF;
    UPDATE hr.compensation_budgets
    SET remaining_amount = budget_amount - allocated_amount
    WHERE remaining_amount IS DISTINCT FROM (budget_amount - allocated_amount);
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'compensation_budgets'
        AND c.conname = 'compensation_budgets_remaining_matches'
    ) THEN
      ALTER TABLE hr.compensation_budgets ADD CONSTRAINT compensation_budgets_remaining_matches CHECK (
        remaining_amount = budget_amount - allocated_amount
      );
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'equity_grants'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'equity_grants' AND column_name = 'document_hash'
    ) THEN
      ALTER TABLE hr.equity_grants ADD COLUMN document_hash text;
    END IF;
    -- expired status requires expiry_date <= CURRENT_DATE; align legacy rows (null or future expiry).
    UPDATE hr.equity_grants
    SET expiry_date = LEAST(grant_date, CURRENT_DATE)
    WHERE status::text = 'expired'
      AND (
        expiry_date IS NULL
        OR expiry_date > CURRENT_DATE
      );
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'equity_grants'
        AND c.conname = 'equity_grants_expired_requires_expiry'
    ) THEN
      ALTER TABLE hr.equity_grants ADD CONSTRAINT equity_grants_expired_requires_expiry CHECK (
        status::text <> 'expired'
        OR (expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE)
      );
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'market_benchmarks'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'market_benchmarks' AND column_name = 'sample_size'
    ) THEN
      ALTER TABLE hr.market_benchmarks ADD COLUMN sample_size integer;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'market_benchmarks'
        AND c.conname = 'market_benchmarks_sample_size_positive'
    ) THEN
      ALTER TABLE hr.market_benchmarks ADD CONSTRAINT market_benchmarks_sample_size_positive CHECK (
        sample_size IS NULL OR sample_size > 0
      );
    END IF;
  END IF;
END $$;
