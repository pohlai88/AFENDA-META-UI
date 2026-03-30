-- Align approval metadata with workflow enums (`leave_status`, time sheet workflow column, `request_status`).
-- Drizzle: `attendance.ts` (leave_requests, time_sheets), `employeeExperience.ts` (employee_requests).
-- WARNING: fails if existing rows violate the rules (e.g. approved* set when status is not approved).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'employee_requests'
  ) THEN
    ALTER TABLE hr.employee_requests DROP CONSTRAINT IF EXISTS employee_requests_approval_consistency;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'employee_requests'
        AND c.conname = 'employee_requests_approval_matches_status'
    ) THEN
      ALTER TABLE hr.employee_requests ADD CONSTRAINT employee_requests_approval_matches_status CHECK (
        (
          request_status = 'approved'::hr.request_status AND approved_by IS NOT NULL AND approved_at IS NOT NULL
        )
        OR
        (
          request_status <> 'approved'::hr.request_status AND approved_by IS NULL AND approved_at IS NULL
        )
      );
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'leave_requests'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'leave_requests'
        AND c.conname = 'leave_requests_approval_matches_status'
    ) THEN
      ALTER TABLE hr.leave_requests ADD CONSTRAINT leave_requests_approval_matches_status CHECK (
        (
          leave_status = 'approved'::hr.leave_status AND approved_by IS NOT NULL AND approved_date IS NOT NULL
        )
        OR
        (
          leave_status <> 'approved'::hr.leave_status AND approved_by IS NULL AND approved_date IS NULL
        )
      );
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'time_sheets'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'time_sheets'
        AND c.conname = 'time_sheets_approval_matches_status'
    ) THEN
      ALTER TABLE hr.time_sheets ADD CONSTRAINT time_sheets_approval_matches_status CHECK (
        (
          leave_status = 'approved'::hr.leave_status AND approved_by IS NOT NULL AND approved_date IS NOT NULL
        )
        OR
        (
          leave_status <> 'approved'::hr.leave_status AND approved_by IS NULL AND approved_date IS NULL
        )
      );
    END IF;
  END IF;
END $$;
