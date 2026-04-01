-- Consolidate legacy tax_rates index names and guard subscription financial fields while pricing is locked.

-- ---------------------------------------------------------------------------
-- tax_rates: drop broken/legacy index names; keep canonical tenant+effective
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS sales.idx_sales_tax_rates_tenant_active_effective;

CREATE INDEX IF NOT EXISTS idx_sales_tax_rates_tenant_effective
  ON sales.tax_rates (tenant_id, effective_from);

DO $taxidx$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'sales'
      AND indexname = 'idx_sales_tax_rates_effective'
  )
     AND EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'sales'
      AND indexname = 'idx_sales_tax_rates_tenant_effective'
  ) THEN
    DROP INDEX sales.idx_sales_tax_rates_effective;
  END IF;
END
$taxidx$;

-- If only the old short name exists, rename it to the Drizzle/canonical name.
DO $taxrename$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'sales' AND indexname = 'idx_sales_tax_rates_effective'
  )
     AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'sales' AND indexname = 'idx_sales_tax_rates_tenant_effective'
  ) THEN
    ALTER INDEX sales.idx_sales_tax_rates_effective RENAME TO idx_sales_tax_rates_tenant_effective;
  END IF;
END
$taxrename$;

-- ---------------------------------------------------------------------------
-- subscriptions: immutable mrr / arr / recurring_total while pricing_locked_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sales.prevent_subscription_financial_mutate_when_pricing_locked()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF OLD.pricing_locked_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.pricing_locked_at IS DISTINCT FROM NEW.pricing_locked_at THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('cancelled', 'expired') THEN
    RETURN NEW;
  END IF;

  IF NEW.mrr IS DISTINCT FROM OLD.mrr
     OR NEW.arr IS DISTINCT FROM OLD.arr
     OR NEW.recurring_total IS DISTINCT FROM OLD.recurring_total THEN
    RAISE EXCEPTION
      'subscription financial fields are immutable while pricing_locked_at is unchanged (re-lock with a new pricing_locked_at or cancel)'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_subscriptions_pricing_lock_guard ON sales.subscriptions;
CREATE TRIGGER trg_sales_subscriptions_pricing_lock_guard
  BEFORE UPDATE ON sales.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sales.prevent_subscription_financial_mutate_when_pricing_locked();
