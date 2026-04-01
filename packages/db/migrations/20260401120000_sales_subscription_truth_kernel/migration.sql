-- Subscription truth kernel: pricing lock columns, append-only resolution history,
-- line discount precision, GiST overlap exclusion (requires btree_gist), RLS on resolutions.

ALTER TABLE sales.subscriptions
  ADD COLUMN IF NOT EXISTS truth_revision integer NOT NULL DEFAULT 1;

ALTER TABLE sales.subscriptions
  ADD COLUMN IF NOT EXISTS pricing_locked_at timestamptz;

ALTER TABLE sales.subscriptions
  ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE sales.subscriptions
  ADD COLUMN IF NOT EXISTS billing_anchor_date timestamptz;

ALTER TABLE sales.subscriptions
  ADD COLUMN IF NOT EXISTS currency_id integer;

UPDATE sales.subscriptions
SET billing_anchor_date = date_start
WHERE billing_anchor_date IS NULL;

ALTER TABLE sales.subscriptions
  ALTER COLUMN billing_anchor_date SET NOT NULL;

UPDATE sales.subscriptions s
SET currency_id = p.currency_id
FROM sales.subscription_templates t
JOIN sales.pricelists p ON p.id = t.pricelist_id AND p.tenant_id = t.tenant_id
WHERE s.template_id = t.id
  AND s.tenant_id = t.tenant_id
  AND s.currency_id IS NULL
  AND p.currency_id IS NOT NULL;

UPDATE sales.subscriptions
SET pricing_locked_at = COALESCE(last_invoiced_at, created_at)
WHERE status IN ('active', 'paused', 'past_due')
  AND pricing_locked_at IS NULL;

DO $fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_subscriptions_currency'
  ) THEN
    ALTER TABLE sales.subscriptions
      ADD CONSTRAINT fk_sales_subscriptions_currency
      FOREIGN KEY (currency_id) REFERENCES reference.currencies (currency_id)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$fk$;

ALTER TABLE sales.subscription_lines
  ALTER COLUMN discount TYPE numeric(6, 4);

CREATE TABLE IF NOT EXISTS sales.subscription_pricing_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  tenant_id integer NOT NULL,
  subscription_id uuid NOT NULL,
  resolution_revision integer NOT NULL,
  locked_at timestamptz DEFAULT now() NOT NULL,
  snapshot jsonb NOT NULL,
  recurring_total numeric(14, 2) NOT NULL,
  mrr numeric(14, 2) NOT NULL,
  arr numeric(14, 2) NOT NULL,
  CONSTRAINT chk_sales_subscription_pricing_resolutions_revision_positive
    CHECK (resolution_revision > 0),
  CONSTRAINT chk_sales_subscription_pricing_resolutions_mrr_non_negative CHECK (mrr >= 0),
  CONSTRAINT chk_sales_subscription_pricing_resolutions_arr_non_negative CHECK (arr >= 0),
  CONSTRAINT chk_sales_subscription_pricing_resolutions_recurring_non_negative
    CHECK (recurring_total >= 0)
);

ALTER TABLE sales.subscription_pricing_resolutions ENABLE ROW LEVEL SECURITY;

DO $fk2$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_subscription_pricing_resolutions_tenant'
  ) THEN
    ALTER TABLE sales.subscription_pricing_resolutions
      ADD CONSTRAINT fk_sales_subscription_pricing_resolutions_tenant
      FOREIGN KEY (tenant_id) REFERENCES core.tenants (tenant_id)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_subscription_pricing_resolutions_subscription'
  ) THEN
    ALTER TABLE sales.subscription_pricing_resolutions
      ADD CONSTRAINT fk_sales_subscription_pricing_resolutions_subscription
      FOREIGN KEY (subscription_id) REFERENCES sales.subscriptions (id)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$fk2$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_subscription_pricing_resolutions_sub_rev
  ON sales.subscription_pricing_resolutions (tenant_id, subscription_id, resolution_revision);

CREATE INDEX IF NOT EXISTS idx_sales_subscription_pricing_resolutions_tenant
  ON sales.subscription_pricing_resolutions (tenant_id);

CREATE INDEX IF NOT EXISTS idx_sales_subscription_pricing_resolutions_subscription
  ON sales.subscription_pricing_resolutions (tenant_id, subscription_id);

DROP POLICY IF EXISTS sales_subscription_pricing_resolutions_tenant_select
  ON sales.subscription_pricing_resolutions;
CREATE POLICY sales_subscription_pricing_resolutions_tenant_select
  ON sales.subscription_pricing_resolutions AS PERMISSIVE FOR SELECT TO app_user
  USING (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);

DROP POLICY IF EXISTS sales_subscription_pricing_resolutions_tenant_insert
  ON sales.subscription_pricing_resolutions;
CREATE POLICY sales_subscription_pricing_resolutions_tenant_insert
  ON sales.subscription_pricing_resolutions AS PERMISSIVE FOR INSERT TO app_user
  WITH CHECK (tenant_id = NULLIF(current_setting('afenda.tenant_id', true), '')::int);

DROP POLICY IF EXISTS sales_subscription_pricing_resolutions_service_bypass
  ON sales.subscription_pricing_resolutions;
CREATE POLICY sales_subscription_pricing_resolutions_service_bypass
  ON sales.subscription_pricing_resolutions AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $excl$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_subscriptions_billing_overlap_excl'
  ) THEN
    ALTER TABLE sales.subscriptions
      ADD CONSTRAINT sales_subscriptions_billing_overlap_excl
      EXCLUDE USING gist (
        tenant_id WITH =,
        partner_id WITH =,
        template_id WITH =,
        billing_overlap_period WITH &&
      );
  END IF;
END
$excl$;
