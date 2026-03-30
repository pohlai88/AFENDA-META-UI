-- Hand-authored: lifecycle approval stamp CHECKs (parity with Drizzle lifecycle.ts),
-- plus BEFORE trigger to set notification status to expired when expires_at < now().
-- Zod: packages/db/src/schema/hr/lifecycle.ts, employeeExperience.ts (insertEmployeeNotificationSchema).

-- ---------------------------------------------------------------------------
-- 1) Lifecycle: approval stamp ↔ status (fails if existing rows violate rules)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('hr.employee_promotions') IS NOT NULL THEN
    ALTER TABLE hr.employee_promotions DROP CONSTRAINT IF EXISTS employee_promotions_approval_stamp_lifecycle;
    ALTER TABLE hr.employee_promotions
      ADD CONSTRAINT employee_promotions_approval_stamp_lifecycle CHECK (
        (
          status = 'approved'::hr.promotion_workflow_status
          AND approved_by IS NOT NULL
          AND approved_date IS NOT NULL
        )
        OR (
          status <> 'approved'::hr.promotion_workflow_status
          AND approved_by IS NULL
          AND approved_date IS NULL
        )
      );
  END IF;

  IF to_regclass('hr.employee_transfers') IS NOT NULL THEN
    ALTER TABLE hr.employee_transfers DROP CONSTRAINT IF EXISTS employee_transfers_approval_stamp_lifecycle;
    ALTER TABLE hr.employee_transfers
      ADD CONSTRAINT employee_transfers_approval_stamp_lifecycle CHECK (
        (
          status IN (
            'approved'::hr.transfer_workflow_status,
            'completed'::hr.transfer_workflow_status
          )
          AND approved_by IS NOT NULL
          AND approved_date IS NOT NULL
        )
        OR (
          status NOT IN (
            'approved'::hr.transfer_workflow_status,
            'completed'::hr.transfer_workflow_status
          )
          AND approved_by IS NULL
          AND approved_date IS NULL
        )
      );
  END IF;

  IF to_regclass('hr.full_final_settlements') IS NOT NULL THEN
    ALTER TABLE hr.full_final_settlements DROP CONSTRAINT IF EXISTS full_final_settlements_approval_stamp_lifecycle;
    ALTER TABLE hr.full_final_settlements
      ADD CONSTRAINT full_final_settlements_approval_stamp_lifecycle CHECK (
        (
          status IN (
            'approved'::hr.full_final_settlement_workflow_status,
            'paid'::hr.full_final_settlement_workflow_status
          )
          AND approved_by IS NOT NULL
          AND approved_date IS NOT NULL
        )
        OR (
          status NOT IN (
            'approved'::hr.full_final_settlement_workflow_status,
            'paid'::hr.full_final_settlement_workflow_status
          )
          AND approved_by IS NULL
          AND approved_date IS NULL
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) ESS notifications: auto-expire when past expires_at (BEFORE INSERT/UPDATE)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hr.employee_notifications_auto_expire()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < now() THEN
    NEW.status := 'expired'::hr.notification_status;
  END IF;
  RETURN NEW;
END;
$fn$;

DO $$
BEGIN
  IF to_regclass('hr.employee_notifications') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS employee_notifications_auto_expire_trg ON hr.employee_notifications;
    CREATE TRIGGER employee_notifications_auto_expire_trg
    BEFORE INSERT OR UPDATE OF expires_at, status ON hr.employee_notifications
    FOR EACH ROW
    EXECUTE PROCEDURE hr.employee_notifications_auto_expire();

    UPDATE hr.employee_notifications
    SET status = 'expired'::hr.notification_status
    WHERE expires_at IS NOT NULL
      AND expires_at < now()
      AND status IS DISTINCT FROM 'expired'::hr.notification_status;
  END IF;
END $$;
