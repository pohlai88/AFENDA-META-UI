-- Rewards-only catalog + redemption_requests.reward_catalog_id (mutually exclusive with benefit_plan_benefit_id).
-- Drizzle: packages/db/src/schema/hr/engagement.ts (`bonus_point_reward_catalog`, `bonus_point_redemption_requests`).

DO $$ BEGIN
  CREATE TYPE hr.bonus_point_reward_catalog_status AS ENUM ('active', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'bonus_point_reward_catalog'
  ) THEN
    CREATE TABLE hr.bonus_point_reward_catalog (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id integer NOT NULL REFERENCES core.tenants (tenant_id),
      reward_code text NOT NULL,
      name text NOT NULL,
      description text,
      points_cost integer NOT NULL,
      status hr.bonus_point_reward_catalog_status NOT NULL DEFAULT 'active',
      effective_from date,
      effective_to date,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz,
      created_by integer NOT NULL,
      updated_by integer NOT NULL,
      CONSTRAINT bonus_point_reward_catalog_points_cost_positive CHECK (points_cost > 0),
      CONSTRAINT bonus_point_reward_catalog_effective_range_ok CHECK (
        effective_from IS NULL OR effective_to IS NULL OR effective_from <= effective_to
      )
    );
    CREATE UNIQUE INDEX bonus_point_reward_catalog_tenant_code_unique
      ON hr.bonus_point_reward_catalog (tenant_id, reward_code)
      WHERE deleted_at IS NULL;
    CREATE INDEX bonus_point_reward_catalog_tenant_idx ON hr.bonus_point_reward_catalog (tenant_id);
    CREATE INDEX bonus_point_reward_catalog_status_idx ON hr.bonus_point_reward_catalog (tenant_id, status);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'bonus_point_redemption_requests'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'bonus_point_redemption_requests'
        AND column_name = 'reward_catalog_id'
    ) THEN
      ALTER TABLE hr.bonus_point_redemption_requests ADD COLUMN reward_catalog_id uuid;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'bonus_point_redemption_requests'
        AND c.conname = 'bonus_point_redemption_requests_reward_catalog_fk'
    ) THEN
      ALTER TABLE hr.bonus_point_redemption_requests
        ADD CONSTRAINT bonus_point_redemption_requests_reward_catalog_fk
        FOREIGN KEY (tenant_id, reward_catalog_id)
        REFERENCES hr.bonus_point_reward_catalog (tenant_id, id);
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'bonus_point_redemption_requests'
        AND c.conname = 'bonus_point_redemption_requests_single_catalog_fk'
    ) THEN
      ALTER TABLE hr.bonus_point_redemption_requests
        ADD CONSTRAINT bonus_point_redemption_requests_single_catalog_fk CHECK (
          NOT (benefit_plan_benefit_id IS NOT NULL AND reward_catalog_id IS NOT NULL)
        );
    END IF;
  END IF;
END $$;
