-- Workforce planning audit: plan_type, supersedes_plan_id, text length checks, priority range,
-- analytics indexes, succession_plan_id ↔ job_position_id integrity (trigger).
-- Drizzle: `workforcePlanning.ts`

-- ---------------------------------------------------------------------------
-- staffing_plan_type + staffing_plans.plan_type / supersedes_plan_id
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE hr.staffing_plan_type AS ENUM ('budget', 'forecast', 'actual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'staffing_plans'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'staffing_plans' AND column_name = 'plan_type'
    ) THEN
      ALTER TABLE hr.staffing_plans
        ADD COLUMN plan_type hr.staffing_plan_type NOT NULL DEFAULT 'forecast'::hr.staffing_plan_type;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'staffing_plans' AND column_name = 'supersedes_plan_id'
    ) THEN
      ALTER TABLE hr.staffing_plans ADD COLUMN supersedes_plan_id uuid;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'staffing_plans'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'staffing_plans' AND c.conname = 'staffing_plans_supersedes_fk'
    ) THEN
      ALTER TABLE hr.staffing_plans ADD CONSTRAINT staffing_plans_supersedes_fk
        FOREIGN KEY (tenant_id, supersedes_plan_id)
        REFERENCES hr.staffing_plans (tenant_id, id)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- CHECK constraints (idempotent replace)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'staffing_plans'
  ) THEN
    ALTER TABLE hr.staffing_plans DROP CONSTRAINT IF EXISTS staffing_plans_notes_max_len;
    ALTER TABLE hr.staffing_plans ADD CONSTRAINT staffing_plans_notes_max_len CHECK (
      notes IS NULL OR char_length(notes) <= 2000
    );
    ALTER TABLE hr.staffing_plans DROP CONSTRAINT IF EXISTS staffing_plans_supersedes_not_self;
    ALTER TABLE hr.staffing_plans ADD CONSTRAINT staffing_plans_supersedes_not_self CHECK (
      supersedes_plan_id IS NULL OR supersedes_plan_id <> id
    );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'staffing_plan_details'
  ) THEN
    ALTER TABLE hr.staffing_plan_details DROP CONSTRAINT IF EXISTS staffing_plan_details_priority_range;
    ALTER TABLE hr.staffing_plan_details ADD CONSTRAINT staffing_plan_details_priority_range CHECK (
      priority >= 1 AND priority <= 10
    );
    ALTER TABLE hr.staffing_plan_details DROP CONSTRAINT IF EXISTS staffing_plan_details_justification_max_len;
    ALTER TABLE hr.staffing_plan_details ADD CONSTRAINT staffing_plan_details_justification_max_len CHECK (
      justification IS NULL OR char_length(justification) <= 2000
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS staffing_plans_tenant_status_scenario_idx
  ON hr.staffing_plans (tenant_id, status, scenario);

CREATE INDEX IF NOT EXISTS staffing_plans_forecast_compare_idx
  ON hr.staffing_plans (tenant_id, fiscal_year_start, fiscal_year_end, scenario, plan_version);

-- ---------------------------------------------------------------------------
-- Succession plan on detail line must target the same job position as the plan
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION hr.enforce_staffing_detail_succession_matches_position()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.succession_plan_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM hr.succession_plans sp
    WHERE sp.tenant_id = NEW.tenant_id
      AND sp.id = NEW.succession_plan_id
      AND sp.critical_position_id = NEW.job_position_id
  ) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION
    'staffing_plan_details: succession_plan_id must reference succession_plans where critical_position_id equals job_position_id (tenant_id=%, detail_id=%)',
    NEW.tenant_id,
    NEW.id;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'staffing_plan_details'
  ) THEN
    DROP TRIGGER IF EXISTS trg_staffing_plan_details_succession_position ON hr.staffing_plan_details;
    CREATE TRIGGER trg_staffing_plan_details_succession_position
      BEFORE INSERT OR UPDATE OF succession_plan_id, job_position_id, tenant_id ON hr.staffing_plan_details
      FOR EACH ROW
      EXECUTE FUNCTION hr.enforce_staffing_detail_succession_matches_position();
  END IF;
END $$;
