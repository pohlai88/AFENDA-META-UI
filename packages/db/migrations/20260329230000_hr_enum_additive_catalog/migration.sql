-- HR enum catalog: additive PostgreSQL labels aligned with
-- packages/db/src/schema/hr/_enums.ts (Phases 2–4).
--
-- Phase 2: fuel_type (hydrogen, biofuel), dei_metric_type (hiring_rate, attrition_rate).
-- Phase 3: equity_grant_status (granted, terminated) — see hr-docs/ADR-005-equity-grant-lifecycle.md.
-- Phase 4: benefit_status (pending) for core employment enrollment — see hr-docs/HR_ENUM_PHASE2_4_SIGNOFF.md.
--
-- Idempotent: ALTER runs only when the enum type exists; ADD VALUE IF NOT EXISTS skips duplicates (PostgreSQL 15+).
-- Product sign-off: HR_ENUM_PHASE2_4_SIGNOFF.md (Phases 2 & 4); ADR-005 (Phase 3 equity semantics).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'hr' AND t.typname = 'fuel_type'
  ) THEN
    ALTER TYPE hr.fuel_type ADD VALUE IF NOT EXISTS 'hydrogen';
    ALTER TYPE hr.fuel_type ADD VALUE IF NOT EXISTS 'biofuel';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'hr' AND t.typname = 'dei_metric_type'
  ) THEN
    ALTER TYPE hr.dei_metric_type ADD VALUE IF NOT EXISTS 'hiring_rate';
    ALTER TYPE hr.dei_metric_type ADD VALUE IF NOT EXISTS 'attrition_rate';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'hr' AND t.typname = 'equity_grant_status'
  ) THEN
    ALTER TYPE hr.equity_grant_status ADD VALUE IF NOT EXISTS 'granted';
    ALTER TYPE hr.equity_grant_status ADD VALUE IF NOT EXISTS 'terminated';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'hr' AND t.typname = 'benefit_status'
  ) THEN
    ALTER TYPE hr.benefit_status ADD VALUE IF NOT EXISTS 'pending';
  END IF;
END $$;
