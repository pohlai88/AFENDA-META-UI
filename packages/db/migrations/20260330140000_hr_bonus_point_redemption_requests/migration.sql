-- Bonus point redemption workflow: optional benefit SKU link, approver, ledger tie-in.
-- Product: benefit_plan_benefits = benefits upgrade-module SKU (provider/plan/coverage).
--   Leave benefit_plan_benefit_id null when not using that path; use request_notes or reward_catalog_id
--   (see migration 20260330150000_hr_bonus_point_reward_catalog).
-- Drizzle: packages/db/src/schema/hr/engagement.ts (`bonus_point_redemption_requests`).

DO $$ BEGIN
  CREATE TYPE hr.bonus_point_redemption_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'fulfilled',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'bonus_point_redemption_requests'
  ) THEN
    CREATE TABLE hr.bonus_point_redemption_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id integer NOT NULL REFERENCES core.tenants (tenant_id),
      employee_bonus_point_id uuid NOT NULL,
      benefit_plan_benefit_id uuid,
      requested_points integer NOT NULL,
      status hr.bonus_point_redemption_status NOT NULL DEFAULT 'pending',
      request_notes text,
      rejection_reason text,
      approved_by uuid,
      approved_at timestamptz,
      bonus_point_transaction_id uuid,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz,
      created_by integer NOT NULL,
      updated_by integer NOT NULL,
      CONSTRAINT bonus_point_redemption_requests_points_positive CHECK (requested_points > 0),
      CONSTRAINT bonus_point_redemption_requests_review_consistency CHECK (
        (
          status = 'pending'::hr.bonus_point_redemption_status
          AND approved_by IS NULL
          AND approved_at IS NULL
        )
        OR (status = 'cancelled'::hr.bonus_point_redemption_status)
        OR (
          status IN (
            'approved'::hr.bonus_point_redemption_status,
            'rejected'::hr.bonus_point_redemption_status,
            'fulfilled'::hr.bonus_point_redemption_status
          )
          AND approved_by IS NOT NULL
          AND approved_at IS NOT NULL
        )
      ),
      CONSTRAINT bonus_point_redemption_requests_rejection_reason CHECK (
        status <> 'rejected'::hr.bonus_point_redemption_status OR rejection_reason IS NOT NULL
      ),
      CONSTRAINT bonus_point_redemption_requests_employee_bonus_point_fk FOREIGN KEY (tenant_id, employee_bonus_point_id)
        REFERENCES hr.employee_bonus_points (tenant_id, id),
      CONSTRAINT bonus_point_redemption_requests_benefit_catalog_fk FOREIGN KEY (tenant_id, benefit_plan_benefit_id)
        REFERENCES hr.benefit_plan_benefits (tenant_id, id),
      CONSTRAINT bonus_point_redemption_requests_approved_by_fk FOREIGN KEY (tenant_id, approved_by)
        REFERENCES hr.employees (tenant_id, id),
      CONSTRAINT bonus_point_redemption_requests_transaction_fk FOREIGN KEY (tenant_id, bonus_point_transaction_id)
        REFERENCES hr.bonus_point_transactions (tenant_id, id)
    );
    CREATE INDEX bonus_point_redemption_requests_tenant_idx ON hr.bonus_point_redemption_requests (tenant_id);
    CREATE INDEX bonus_point_redemption_requests_status_idx ON hr.bonus_point_redemption_requests (tenant_id, status);
    CREATE INDEX bonus_point_redemption_requests_balance_idx ON hr.bonus_point_redemption_requests (tenant_id, employee_bonus_point_id);
  END IF;
END $$;
