-- HR JSONB governance Phase 1: native jsonb for overtime_rules.applicable_ids,
-- biometric_logs.raw_data, appraisal_templates.applicable_ids.
-- Drizzle: attendanceEnhancements.ts, appraisalTemplates.ts
-- Idempotent: only alters columns still stored as text.

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

-- overtime_rules.applicable_ids
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'hr' AND table_name = 'overtime_rules'
      AND column_name = 'applicable_ids' AND udt_name = 'text'
  ) THEN
    DROP INDEX IF EXISTS hr.overtime_rules_applicable_ids_gin;
    ALTER TABLE hr.overtime_rules
      ALTER COLUMN applicable_ids TYPE jsonb
      USING (
        CASE
          WHEN applicable_ids IS NULL OR btrim(applicable_ids) = '' THEN NULL
          ELSE hr._try_text_to_jsonb(applicable_ids)
        END
      );
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'hr' AND table_name = 'overtime_rules'
      AND column_name = 'applicable_ids' AND udt_name = 'jsonb'
  ) THEN
    CREATE INDEX IF NOT EXISTS overtime_rules_applicable_ids_gin
      ON hr.overtime_rules USING gin (applicable_ids);
  END IF;
END $$;

-- biometric_logs.raw_data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'hr' AND table_name = 'biometric_logs'
      AND column_name = 'raw_data' AND udt_name = 'text'
  ) THEN
    DROP INDEX IF EXISTS hr.biometric_logs_raw_data_gin;
    ALTER TABLE hr.biometric_logs
      ALTER COLUMN raw_data TYPE jsonb
      USING (hr._try_text_to_jsonb(raw_data));
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'hr' AND table_name = 'biometric_logs'
      AND column_name = 'raw_data' AND udt_name = 'jsonb'
  ) THEN
    CREATE INDEX IF NOT EXISTS biometric_logs_raw_data_gin
      ON hr.biometric_logs USING gin (raw_data)
      WHERE (raw_data IS NOT NULL);
  END IF;
END $$;

-- appraisal_templates.applicable_ids
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'hr' AND table_name = 'appraisal_templates'
      AND column_name = 'applicable_ids' AND udt_name = 'text'
  ) THEN
    DROP INDEX IF EXISTS hr.appraisal_templates_applicable_ids_gin;
    ALTER TABLE hr.appraisal_templates
      ALTER COLUMN applicable_ids TYPE jsonb
      USING (
        CASE
          WHEN applicable_ids IS NULL OR btrim(applicable_ids) = '' THEN NULL
          ELSE hr._try_text_to_jsonb(applicable_ids)
        END
      );
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'hr' AND table_name = 'appraisal_templates'
      AND column_name = 'applicable_ids' AND udt_name = 'jsonb'
  ) THEN
    CREATE INDEX IF NOT EXISTS appraisal_templates_applicable_ids_gin
      ON hr.appraisal_templates USING gin (applicable_ids);
  END IF;
END $$;

DROP FUNCTION IF EXISTS hr._try_text_to_jsonb(text);
