-- HR JSONB governance Phase 3: employee self-service JSON-as-text columns.
-- Drizzle: employeeExperience.ts

CREATE OR REPLACE FUNCTION hr._try_text_to_jsonb(txt text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF txt IS NULL OR btrim(txt) = '' THEN
    RETURN NULL;
  END IF;
  RETURN txt::jsonb;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'hr' AND table_name = 'employee_requests'
      AND column_name = 'request_data' AND udt_name = 'text'
  ) THEN
    ALTER TABLE hr.employee_requests
      ALTER COLUMN request_data TYPE jsonb
      USING (hr._try_text_to_jsonb(request_data));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'hr' AND table_name = 'employee_notifications'
      AND column_name = 'metadata' AND udt_name = 'text'
  ) THEN
    DROP INDEX IF EXISTS hr.employee_notifications_metadata_gin;
    ALTER TABLE hr.employee_notifications
      ALTER COLUMN metadata TYPE jsonb
      USING (hr._try_text_to_jsonb(metadata));
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'hr' AND table_name = 'employee_notifications'
      AND column_name = 'metadata' AND udt_name = 'jsonb'
  ) THEN
    CREATE INDEX IF NOT EXISTS employee_notifications_metadata_gin
      ON hr.employee_notifications USING gin (metadata)
      WHERE (metadata IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'hr' AND table_name = 'employee_surveys'
      AND column_name = 'target_audience' AND udt_name = 'text'
  ) THEN
    ALTER TABLE hr.employee_surveys
      ALTER COLUMN target_audience TYPE jsonb
      USING (hr._try_text_to_jsonb(target_audience));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'hr' AND table_name = 'employee_surveys'
      AND column_name = 'questions' AND udt_name = 'text'
  ) THEN
    ALTER TABLE hr.employee_surveys
      ALTER COLUMN questions TYPE jsonb
      USING (COALESCE(hr._try_text_to_jsonb(questions), '[]'::jsonb));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'hr' AND table_name = 'survey_responses'
      AND column_name = 'responses' AND udt_name = 'text'
  ) THEN
    ALTER TABLE hr.survey_responses
      ALTER COLUMN responses TYPE jsonb
      USING (COALESCE(hr._try_text_to_jsonb(responses), '[]'::jsonb));
  END IF;
END $$;

DROP FUNCTION IF EXISTS hr._try_text_to_jsonb(text);
