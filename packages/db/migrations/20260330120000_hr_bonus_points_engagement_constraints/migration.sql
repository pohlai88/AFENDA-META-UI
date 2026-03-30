-- Rewards & recognition: balance consistency, transaction checks, rule lifecycle, typed references.
-- Drizzle: packages/db/src/schema/hr/engagement.ts, _enums.ts (bonus_point_reference_type).
-- WARNING: fails if employee_bonus_points rows violate available = total - redeemed, or if
-- bonus_point_transactions.reference_type has text values not in the new enum.

DO $$ BEGIN
  CREATE TYPE hr.bonus_point_reference_type AS ENUM (
    'goal',
    'attendance',
    'training',
    'referral',
    'performance',
    'benefit_catalog',
    'other',
    'manual'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'bonus_point_rules'
  ) THEN
    ALTER TABLE hr.bonus_point_rules
      ADD COLUMN IF NOT EXISTS effective_from date,
      ADD COLUMN IF NOT EXISTS effective_to date;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'bonus_point_rules'
        AND c.conname = 'bonus_point_rules_period_cap_consistent'
    ) THEN
      ALTER TABLE hr.bonus_point_rules ADD CONSTRAINT bonus_point_rules_period_cap_consistent CHECK (
        (max_per_period IS NULL AND period_type IS NULL)
        OR (max_per_period IS NOT NULL AND period_type IS NOT NULL)
      );
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'bonus_point_rules'
        AND c.conname = 'bonus_point_rules_effective_range_ok'
    ) THEN
      ALTER TABLE hr.bonus_point_rules ADD CONSTRAINT bonus_point_rules_effective_range_ok CHECK (
        effective_from IS NULL OR effective_to IS NULL OR effective_from <= effective_to
      );
    END IF;
  END IF;
END $$;

DO $$
DECLARE
  col_type text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'bonus_point_transactions'
  ) THEN
    SELECT format_type(a.atttypid, a.atttypmod) INTO col_type
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'hr' AND c.relname = 'bonus_point_transactions'
      AND a.attname = 'reference_type' AND NOT a.attisdropped AND a.attnum > 0;
    IF col_type = 'text' THEN
      ALTER TABLE hr.bonus_point_transactions
        ALTER COLUMN reference_type TYPE hr.bonus_point_reference_type
        USING reference_type::hr.bonus_point_reference_type;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'bonus_point_transactions'
        AND c.conname = 'bonus_point_transactions_balance_non_negative'
    ) THEN
      ALTER TABLE hr.bonus_point_transactions ADD CONSTRAINT bonus_point_transactions_balance_non_negative CHECK (
        balance >= 0
      );
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'bonus_point_transactions'
        AND c.conname = 'bonus_point_transactions_reference_pairing'
    ) THEN
      ALTER TABLE hr.bonus_point_transactions ADD CONSTRAINT bonus_point_transactions_reference_pairing CHECK (
        (reference_type IS NULL AND reference_id IS NULL)
        OR (reference_type IS NOT NULL AND reference_id IS NOT NULL)
      );
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'employee_bonus_points'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'employee_bonus_points'
        AND c.conname = 'employee_bonus_points_available_equals_net'
    ) THEN
      ALTER TABLE hr.employee_bonus_points ADD CONSTRAINT employee_bonus_points_available_equals_net CHECK (
        available_points = total_points - redeemed_points
      );
    END IF;
  END IF;
END $$;
