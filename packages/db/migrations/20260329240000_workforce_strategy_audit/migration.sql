-- Workforce strategy audit: succession plan status, talent pool performance_rating enum,
-- career_path_steps self-prerequisite check, analytics indexes.
-- Drizzle: `workforceStrategy.ts`

-- ---------------------------------------------------------------------------
-- succession_plan_status + hr.succession_plans.status
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE hr.succession_plan_status AS ENUM ('draft', 'active', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'succession_plans'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'hr' AND table_name = 'succession_plans' AND column_name = 'status'
  ) THEN
    ALTER TABLE hr.succession_plans
      ADD COLUMN status hr.succession_plan_status NOT NULL DEFAULT 'active'::hr.succession_plan_status;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS succession_plans_tenant_readiness_risk_idx
  ON hr.succession_plans (tenant_id, readiness, risk_level);

CREATE INDEX IF NOT EXISTS succession_plans_status_idx
  ON hr.succession_plans (tenant_id, status);

-- ---------------------------------------------------------------------------
-- talent_pool_members.performance_rating: text -> hr.performance_rating (nullable)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'hr' AND table_name = 'talent_pool_members'
      AND column_name = 'performance_rating'
      AND udt_name = 'text'
  ) THEN
    ALTER TABLE hr.talent_pool_members
      ALTER COLUMN performance_rating TYPE hr.performance_rating
      USING (
        CASE trim(lower(performance_rating))
          WHEN 'outstanding' THEN 'outstanding'::hr.performance_rating
          WHEN 'exceeds_expectations' THEN 'exceeds_expectations'::hr.performance_rating
          WHEN 'meets_expectations' THEN 'meets_expectations'::hr.performance_rating
          WHEN 'needs_improvement' THEN 'needs_improvement'::hr.performance_rating
          WHEN 'unsatisfactory' THEN 'unsatisfactory'::hr.performance_rating
          ELSE NULL
        END
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- career_path_steps: cannot point prerequisite to self
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'career_path_steps'
  ) THEN
    ALTER TABLE hr.career_path_steps DROP CONSTRAINT IF EXISTS career_path_steps_prerequisite_not_self;
    ALTER TABLE hr.career_path_steps ADD CONSTRAINT career_path_steps_prerequisite_not_self CHECK (
      prerequisite_step_id IS NULL OR prerequisite_step_id <> id
    );
  END IF;
END $$;
