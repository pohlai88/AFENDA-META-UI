-- Employment contracts: DB parity with Zod (dates, contributions, currency when costs exist),
-- plus versioning, plan lifecycle, benefit termination, contract document hash.
-- Drizzle: packages/db/src/schema/hr/employment.ts
-- WARNING: fails if existing rows violate new CHECKs (e.g. monthly_cost without currency_id,
--   or employee + employer contributions not summing to monthly_cost when all three set).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'employment_contracts'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'employment_contracts' AND column_name = 'amendment_number'
    ) THEN
      ALTER TABLE hr.employment_contracts
        ADD COLUMN amendment_number integer NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'employment_contracts' AND column_name = 'document_hash'
    ) THEN
      ALTER TABLE hr.employment_contracts ADD COLUMN document_hash text;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'employment_contracts'
        AND c.conname = 'employment_contracts_date_range_ok'
    ) THEN
      ALTER TABLE hr.employment_contracts ADD CONSTRAINT employment_contracts_date_range_ok CHECK (
        end_date IS NULL OR end_date >= start_date
      );
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'benefit_plans'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'benefit_plans' AND column_name = 'effective_from'
    ) THEN
      ALTER TABLE hr.benefit_plans ADD COLUMN effective_from date;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'benefit_plans' AND column_name = 'effective_to'
    ) THEN
      ALTER TABLE hr.benefit_plans ADD COLUMN effective_to date;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'benefit_plans'
        AND c.conname = 'benefit_plans_effective_range_ok'
    ) THEN
      ALTER TABLE hr.benefit_plans ADD CONSTRAINT benefit_plans_effective_range_ok CHECK (
        effective_from IS NULL OR effective_to IS NULL OR effective_from <= effective_to
      );
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'benefit_plans'
        AND c.conname = 'benefit_plans_contributions_sum_monthly'
    ) THEN
      ALTER TABLE hr.benefit_plans ADD CONSTRAINT benefit_plans_contributions_sum_monthly CHECK (
        monthly_cost IS NULL
        OR employee_contribution IS NULL
        OR employer_contribution IS NULL
        OR monthly_cost = employee_contribution + employer_contribution
      );
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'benefit_plans'
        AND c.conname = 'benefit_plans_currency_when_costs'
    ) THEN
      ALTER TABLE hr.benefit_plans ADD CONSTRAINT benefit_plans_currency_when_costs CHECK (
        (
          monthly_cost IS NULL
          AND employee_contribution IS NULL
          AND employer_contribution IS NULL
        )
        OR currency_id IS NOT NULL
      );
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'employee_benefits'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'employee_benefits' AND column_name = 'terminated_date'
    ) THEN
      ALTER TABLE hr.employee_benefits ADD COLUMN terminated_date date;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'employee_benefits' AND column_name = 'termination_reason'
    ) THEN
      ALTER TABLE hr.employee_benefits ADD COLUMN termination_reason text;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'employee_benefits'
        AND c.conname = 'employee_benefits_enrollment_before_effective'
    ) THEN
      ALTER TABLE hr.employee_benefits ADD CONSTRAINT employee_benefits_enrollment_before_effective CHECK (
        enrollment_date <= effective_date
      );
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'employee_benefits'
        AND c.conname = 'employee_benefits_effective_before_end'
    ) THEN
      ALTER TABLE hr.employee_benefits ADD CONSTRAINT employee_benefits_effective_before_end CHECK (
        end_date IS NULL OR end_date >= effective_date
      );
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'employee_benefits'
        AND c.conname = 'employee_benefits_termination_after_effective'
    ) THEN
      ALTER TABLE hr.employee_benefits ADD CONSTRAINT employee_benefits_termination_after_effective CHECK (
        terminated_date IS NULL OR terminated_date >= effective_date
      );
    END IF;
  END IF;
END $$;
