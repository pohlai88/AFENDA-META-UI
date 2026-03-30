-- Employee self-service: request rejection reason, notification expiry/read/delivery, preference JSON + audit,
-- survey publish/close, response geo/hash, request status history.
-- Drizzle: packages/db/src/schema/hr/employeeExperience.ts, _enums.ts
-- WARNING: backfills read_at for status=read. Adding rejected_reason CHECK fails if any rejected row has NULL/blank reason.

DO $$ BEGIN
  ALTER TYPE hr.notification_status ADD VALUE IF NOT EXISTS 'expired';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hr.notification_delivery_channel AS ENUM ('email', 'sms', 'in_app', 'push');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'employee_notifications'
  ) THEN
    UPDATE hr.employee_notifications n
    SET read_at = COALESCE(n.read_at, n.created_at)
    WHERE n.status = 'read'::hr.notification_status AND n.read_at IS NULL;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'employee_notifications' AND column_name = 'delivery_channel'
    ) THEN
      ALTER TABLE hr.employee_notifications
        ADD COLUMN delivery_channel hr.notification_delivery_channel NOT NULL DEFAULT 'in_app';
    END IF;
    CREATE INDEX IF NOT EXISTS employee_notifications_delivery_idx ON hr.employee_notifications (tenant_id, delivery_channel);
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'employee_notifications'
        AND c.conname = 'employee_notifications_expired_requires_expiry'
    ) THEN
      ALTER TABLE hr.employee_notifications ADD CONSTRAINT employee_notifications_expired_requires_expiry CHECK (
        status <> 'expired'::hr.notification_status OR expires_at IS NOT NULL
      );
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'employee_notifications'
        AND c.conname = 'employee_notifications_read_requires_read_at'
    ) THEN
      ALTER TABLE hr.employee_notifications ADD CONSTRAINT employee_notifications_read_requires_read_at CHECK (
        status <> 'read'::hr.notification_status OR read_at IS NOT NULL
      );
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'employee_requests'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'employee_requests'
        AND c.conname = 'employee_requests_rejected_reason'
    ) THEN
      ALTER TABLE hr.employee_requests ADD CONSTRAINT employee_requests_rejected_reason CHECK (
        (
          request_status <> 'rejected'::hr.request_status
          AND rejected_reason IS NULL
        )
        OR (
          request_status = 'rejected'::hr.request_status
          AND rejected_reason IS NOT NULL
        )
      );
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'employee_request_history'
  ) THEN
    CREATE TABLE hr.employee_request_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id integer NOT NULL REFERENCES core.tenants (tenant_id),
      employee_request_id uuid NOT NULL,
      from_status hr.request_status,
      to_status hr.request_status NOT NULL,
      actor_employee_id uuid,
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT employee_request_history_request_fk FOREIGN KEY (tenant_id, employee_request_id)
        REFERENCES hr.employee_requests (tenant_id, id),
      CONSTRAINT employee_request_history_actor_fk FOREIGN KEY (tenant_id, actor_employee_id)
        REFERENCES hr.employees (tenant_id, id)
    );
    CREATE INDEX employee_request_history_tenant_idx ON hr.employee_request_history (tenant_id);
    CREATE INDEX employee_request_history_request_idx ON hr.employee_request_history (tenant_id, employee_request_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'employee_preferences'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'employee_preferences' AND column_name = 'preference_value_json'
    ) THEN
      ALTER TABLE hr.employee_preferences ADD COLUMN preference_value_json jsonb;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'employee_preferences' AND column_name = 'created_by'
    ) THEN
      ALTER TABLE hr.employee_preferences
        ADD COLUMN created_by integer NOT NULL DEFAULT 1,
        ADD COLUMN updated_by integer NOT NULL DEFAULT 1;
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'employee_preferences'
        AND column_name = 'preference_value' AND is_nullable = 'NO'
    ) THEN
      ALTER TABLE hr.employee_preferences ALTER COLUMN preference_value DROP NOT NULL;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'hr' AND indexname = 'employee_preferences_value_json_gin'
    ) THEN
      CREATE INDEX employee_preferences_value_json_gin ON hr.employee_preferences USING gin (preference_value_json)
      WHERE preference_value_json IS NOT NULL;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'employee_preferences'
        AND c.conname = 'employee_preferences_value_payload'
    ) THEN
      ALTER TABLE hr.employee_preferences ADD CONSTRAINT employee_preferences_value_payload CHECK (
        (preference_value_json IS NOT NULL)
        OR (preference_value IS NOT NULL AND btrim(preference_value) <> '')
      );
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'employee_surveys'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'employee_surveys' AND column_name = 'published_at'
    ) THEN
      ALTER TABLE hr.employee_surveys ADD COLUMN published_at timestamptz;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'employee_surveys' AND column_name = 'closed_at'
    ) THEN
      ALTER TABLE hr.employee_surveys ADD COLUMN closed_at timestamptz;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class r ON r.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = r.relnamespace
      WHERE n.nspname = 'hr' AND r.relname = 'employee_surveys'
        AND c.conname = 'employee_surveys_published_closed_order'
    ) THEN
      ALTER TABLE hr.employee_surveys ADD CONSTRAINT employee_surveys_published_closed_order CHECK (
        published_at IS NULL OR closed_at IS NULL OR published_at <= closed_at
      );
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'hr' AND table_name = 'survey_responses'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'survey_responses' AND column_name = 'geo_location'
    ) THEN
      ALTER TABLE hr.survey_responses ADD COLUMN geo_location jsonb;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'hr' AND table_name = 'survey_responses' AND column_name = 'response_hash'
    ) THEN
      ALTER TABLE hr.survey_responses ADD COLUMN response_hash text;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'hr' AND indexname = 'survey_responses_geo_gin'
    ) THEN
      CREATE INDEX survey_responses_geo_gin ON hr.survey_responses USING gin (geo_location)
      WHERE geo_location IS NOT NULL;
    END IF;
  END IF;
END $$;
