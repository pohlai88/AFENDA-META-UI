-- HR JSONB governance Phase 2: payment_distributions.metadata, assessment_attempts.answers,
-- recruitment_pipeline_stages.auto_advance_criteria, vesting_schedules.vesting_percentages.

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
    WHERE table_schema = 'hr' AND table_name = 'payment_distributions'
      AND column_name = 'metadata' AND udt_name = 'text'
  ) THEN
    ALTER TABLE hr.payment_distributions
      ALTER COLUMN metadata TYPE jsonb
      USING (hr._try_text_to_jsonb(metadata));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'hr' AND table_name = 'assessment_attempts'
      AND column_name = 'answers' AND udt_name = 'text'
  ) THEN
    ALTER TABLE hr.assessment_attempts
      ALTER COLUMN answers TYPE jsonb
      USING (hr._try_text_to_jsonb(answers));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'hr' AND table_name = 'recruitment_pipeline_stages'
      AND column_name = 'auto_advance_criteria' AND udt_name = 'text'
  ) THEN
    ALTER TABLE hr.recruitment_pipeline_stages
      ALTER COLUMN auto_advance_criteria TYPE jsonb
      USING (hr._try_text_to_jsonb(auto_advance_criteria));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'hr' AND table_name = 'vesting_schedules'
      AND column_name = 'vesting_percentages' AND udt_name = 'text'
  ) THEN
    ALTER TABLE hr.vesting_schedules
      ALTER COLUMN vesting_percentages TYPE jsonb
      USING (hr._try_text_to_jsonb(vesting_percentages));
  END IF;
END $$;

DROP FUNCTION IF EXISTS hr._try_text_to_jsonb(text);
