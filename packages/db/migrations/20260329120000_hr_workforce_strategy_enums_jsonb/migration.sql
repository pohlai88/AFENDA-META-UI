-- HR workforce strategy (succession / talent pools / career paths): align with Drizzle schema
-- — PostgreSQL enum types for risk level, pool type, career aspiration status
-- — jsonb for JSON payload columns (criteria, skills, development actions)
--
-- Idempotent: skips work when `hr.succession_plans` is absent or columns are already migrated.
-- Evidence for Zod/Drizzle alignment: `packages/db/src/schema/hr/workforceStrategy.ts` (Zod 4 `z.iso.date()`, `z.json()`).

DO $$ BEGIN
  CREATE TYPE hr.succession_risk_level AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hr.talent_pool_type AS ENUM (
    'leadership',
    'technical',
    'high_potential',
    'critical_skills'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hr.career_aspiration_status AS ENUM (
    'active',
    'achieved',
    'abandoned',
    'on_hold'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'hr'
      AND table_name = 'succession_plans'
  ) THEN
    RETURN;
  END IF;

  -- succession_plans.risk_level
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'hr'
      AND table_name = 'succession_plans'
      AND column_name = 'risk_level'
      AND udt_name <> 'succession_risk_level'
  ) THEN
    ALTER TABLE hr.succession_plans DROP CONSTRAINT IF EXISTS succession_plans_risk_level_valid;
    ALTER TABLE hr.succession_plans
      ALTER COLUMN risk_level TYPE hr.succession_risk_level
      USING (risk_level::text::hr.succession_risk_level);
  END IF;

  -- talent_pools.pool_type
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'hr'
      AND table_name = 'talent_pools'
      AND column_name = 'pool_type'
      AND udt_name <> 'talent_pool_type'
  ) THEN
    ALTER TABLE hr.talent_pools DROP CONSTRAINT IF EXISTS talent_pools_type_valid;
    ALTER TABLE hr.talent_pools
      ALTER COLUMN pool_type TYPE hr.talent_pool_type
      USING (pool_type::text::hr.talent_pool_type);
  END IF;

  -- talent_pools.criteria -> jsonb
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'hr'
      AND table_name = 'talent_pools'
      AND column_name = 'criteria'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE hr.talent_pools
      ALTER COLUMN criteria TYPE jsonb USING (
        CASE
          WHEN criteria IS NULL THEN NULL
          WHEN btrim(criteria) = '' THEN NULL
          ELSE criteria::jsonb
        END
      );
  END IF;

  -- career_path_steps.required_skills -> jsonb
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'hr'
      AND table_name = 'career_path_steps'
      AND column_name = 'required_skills'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE hr.career_path_steps
      ALTER COLUMN required_skills TYPE jsonb USING (
        CASE
          WHEN required_skills IS NULL THEN NULL
          WHEN btrim(required_skills) = '' THEN NULL
          ELSE required_skills::jsonb
        END
      );
  END IF;

  -- career_aspirations.status
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'hr'
      AND table_name = 'career_aspirations'
      AND column_name = 'status'
      AND udt_name <> 'career_aspiration_status'
  ) THEN
    ALTER TABLE hr.career_aspirations DROP CONSTRAINT IF EXISTS career_aspirations_status_valid;
    ALTER TABLE hr.career_aspirations
      ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE hr.career_aspirations
      ALTER COLUMN status TYPE hr.career_aspiration_status
      USING (status::text::hr.career_aspiration_status);
    ALTER TABLE hr.career_aspirations
      ALTER COLUMN status SET DEFAULT 'active'::hr.career_aspiration_status;
  END IF;

  -- career_aspirations JSON payloads
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'hr'
      AND table_name = 'career_aspirations'
      AND column_name = 'current_skill_gaps'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE hr.career_aspirations
      ALTER COLUMN current_skill_gaps TYPE jsonb USING (
        CASE
          WHEN current_skill_gaps IS NULL THEN NULL
          WHEN btrim(current_skill_gaps) = '' THEN NULL
          ELSE current_skill_gaps::jsonb
        END
      );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'hr'
      AND table_name = 'career_aspirations'
      AND column_name = 'development_actions'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE hr.career_aspirations
      ALTER COLUMN development_actions TYPE jsonb USING (
        CASE
          WHEN development_actions IS NULL THEN NULL
          WHEN btrim(development_actions) = '' THEN NULL
          ELSE development_actions::jsonb
        END
      );
  END IF;

END $$;

-- career_path_steps path FK + composite index: independent of `succession_plans` (early-exit) gate above.
-- FK: match by `pg_get_constraintdef` so auto-generated Drizzle names are handled; then normalize to
-- `career_path_steps_path_fk` with ON DELETE CASCADE.
DO $$
DECLARE
  path_fk_name text;
  path_fk_def text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'hr'
      AND table_name = 'career_path_steps'
  ) THEN
    SELECT c.conname, pg_get_constraintdef(c.oid)
    INTO path_fk_name, path_fk_def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'hr'
      AND t.relname = 'career_path_steps'
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid) LIKE '%(tenant_id, path_id)%'
      AND pg_get_constraintdef(c.oid) LIKE '%REFERENCES hr.career_paths%'
    ORDER BY c.conname
    LIMIT 1;

    IF path_fk_name IS NOT NULL
      AND position('ON DELETE CASCADE' in upper(coalesce(path_fk_def, ''))) = 0
    THEN
      EXECUTE format('ALTER TABLE hr.career_path_steps DROP CONSTRAINT %I', path_fk_name);
      ALTER TABLE hr.career_path_steps
        ADD CONSTRAINT career_path_steps_path_fk
        FOREIGN KEY (tenant_id, path_id)
        REFERENCES hr.career_paths (tenant_id, id)
        ON DELETE CASCADE
        ON UPDATE CASCADE;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'hr'
      AND table_name = 'talent_pool_members'
  ) THEN
    EXECUTE
      'CREATE INDEX IF NOT EXISTS talent_pool_members_employee_readiness_idx ON hr.talent_pool_members (tenant_id, employee_id, readiness)';
  END IF;
END $$;
