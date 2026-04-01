-- Commission truth v1: resolution trace, liabilities, price anchor, lock, tier overlap exclusion, date-aligned periods.

DO $enums$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'sales' AND t.typname = 'commission_calculation_mode') THEN
    CREATE TYPE "sales"."commission_calculation_mode" AS ENUM('flat', 'tiered_step', 'tiered_cumulative');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'sales' AND t.typname = 'commission_liability_status') THEN
    CREATE TYPE "sales"."commission_liability_status" AS ENUM('accrued', 'payable', 'paid');
  END IF;
END
$enums$;--> statement-breakpoint

ALTER TABLE "sales"."commission_plans" ADD COLUMN IF NOT EXISTS "calculation_mode" "sales"."commission_calculation_mode" DEFAULT 'tiered_cumulative' NOT NULL;--> statement-breakpoint

ALTER TABLE "sales"."commission_entries" ADD COLUMN IF NOT EXISTS "entry_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" ADD COLUMN IF NOT EXISTS "price_resolution_id" uuid;--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" ADD COLUMN IF NOT EXISTS "currency_id" integer;--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" ADD COLUMN IF NOT EXISTS "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales"."commission_entries" ADD COLUMN IF NOT EXISTS "truth_binding_id" uuid;--> statement-breakpoint

DO $dates$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sales' AND table_name = 'commission_entries'
      AND column_name = 'period_start' AND data_type = 'timestamp with time zone'
  ) THEN
    ALTER TABLE "sales"."commission_entries"
      ALTER COLUMN "period_start" TYPE date USING ((period_start AT TIME ZONE 'UTC')::date),
      ALTER COLUMN "period_end" TYPE date USING ((period_end AT TIME ZONE 'UTC')::date),
      ALTER COLUMN "paid_date" TYPE date USING (
        CASE WHEN paid_date IS NULL THEN NULL ELSE (paid_date AT TIME ZONE 'UTC')::date END
      );
  END IF;
END
$dates$;--> statement-breakpoint

DROP INDEX IF EXISTS "sales"."uq_sales_commission_entries_order_salesperson";--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_sales_commission_entries_order_salesperson_plan_version"
  ON "sales"."commission_entries" ("tenant_id","order_id","salesperson_id","plan_id","entry_version")
  WHERE "deleted_at" IS NULL;--> statement-breakpoint

DO $fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_commission_entries_price_resolution'
  ) THEN
    ALTER TABLE "sales"."commission_entries"
      ADD CONSTRAINT "fk_sales_commission_entries_price_resolution"
      FOREIGN KEY ("price_resolution_id") REFERENCES "sales"."price_resolutions"("id")
      ON DELETE restrict ON UPDATE cascade;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_commission_entries_currency'
  ) THEN
    ALTER TABLE "sales"."commission_entries"
      ADD CONSTRAINT "fk_sales_commission_entries_currency"
      FOREIGN KEY ("currency_id") REFERENCES "reference"."currencies"("currency_id")
      ON DELETE restrict ON UPDATE cascade;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_commission_entries_truth_binding'
  ) THEN
    ALTER TABLE "sales"."commission_entries"
      ADD CONSTRAINT "fk_sales_commission_entries_truth_binding"
      FOREIGN KEY ("truth_binding_id") REFERENCES "sales"."document_truth_bindings"("id")
      ON DELETE set null ON UPDATE cascade;
  END IF;
END
$fk$;--> statement-breakpoint

DO $chk$
BEGIN
  ALTER TABLE "sales"."commission_entries" ADD CONSTRAINT "chk_sales_commission_entries_locked_currency"
    CHECK ("locked_at" IS NULL OR "currency_id" IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END
$chk$;--> statement-breakpoint

DO $chk2$
BEGIN
  ALTER TABLE "sales"."commission_entries" ADD CONSTRAINT "chk_sales_commission_entries_entry_version_positive"
    CHECK ("entry_version" >= 1);
EXCEPTION WHEN duplicate_object THEN NULL;
END
$chk2$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_sales_commission_entries_price_resolution"
  ON "sales"."commission_entries" ("tenant_id","price_resolution_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_sales_commission_entries_locked"
  ON "sales"."commission_entries" ("tenant_id","locked_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_commission_entries_truth_binding"
  ON "sales"."commission_entries" ("tenant_id","truth_binding_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "sales"."commission_resolutions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" integer NOT NULL,
  "commission_entry_id" uuid NOT NULL,
  "sequence" integer DEFAULT 1 NOT NULL,
  "input_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "applied_tier_id" uuid,
  "base_amount" numeric(14, 2) NOT NULL,
  "rate" numeric(9, 4) NOT NULL,
  "computed_amount" numeric(14, 2) NOT NULL,
  "source_price_resolution_id" uuid,
  "resolved_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" integer NOT NULL,
  "updated_by" integer NOT NULL,
  CONSTRAINT "chk_sales_commission_resolutions_base_non_negative" CHECK ("base_amount" >= 0),
  CONSTRAINT "chk_sales_commission_resolutions_rate_bounds" CHECK ("rate" >= 0 AND "rate" <= 100),
  CONSTRAINT "chk_sales_commission_resolutions_computed_non_negative" CHECK ("computed_amount" >= 0),
  CONSTRAINT "chk_sales_commission_resolutions_sequence_positive" CHECK ("sequence" >= 1)
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "sales"."commission_liabilities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" integer NOT NULL,
  "commission_entry_id" uuid NOT NULL,
  "installment_seq" integer DEFAULT 1 NOT NULL,
  "amount" numeric(14, 2) NOT NULL,
  "status" "sales"."commission_liability_status" DEFAULT 'accrued' NOT NULL,
  "due_date" date,
  "payment_term_id" uuid,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" integer NOT NULL,
  "updated_by" integer NOT NULL,
  CONSTRAINT "chk_sales_commission_liabilities_amount_non_negative" CHECK ("amount" >= 0),
  CONSTRAINT "chk_sales_commission_liabilities_installment_positive" CHECK ("installment_seq" >= 1)
);--> statement-breakpoint

DO $cr_fk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_commission_resolutions_tenant') THEN
    ALTER TABLE "sales"."commission_resolutions" ADD CONSTRAINT "fk_sales_commission_resolutions_tenant"
      FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE restrict ON UPDATE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_commission_resolutions_entry') THEN
    ALTER TABLE "sales"."commission_resolutions" ADD CONSTRAINT "fk_sales_commission_resolutions_entry"
      FOREIGN KEY ("commission_entry_id") REFERENCES "sales"."commission_entries"("id") ON DELETE cascade ON UPDATE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_commission_resolutions_applied_tier') THEN
    ALTER TABLE "sales"."commission_resolutions" ADD CONSTRAINT "fk_sales_commission_resolutions_applied_tier"
      FOREIGN KEY ("applied_tier_id") REFERENCES "sales"."commission_plan_tiers"("id") ON DELETE restrict ON UPDATE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_commission_resolutions_source_price_resolution') THEN
    ALTER TABLE "sales"."commission_resolutions" ADD CONSTRAINT "fk_sales_commission_resolutions_source_price_resolution"
      FOREIGN KEY ("source_price_resolution_id") REFERENCES "sales"."price_resolutions"("id") ON DELETE restrict ON UPDATE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_commission_resolutions_created_by') THEN
    ALTER TABLE "sales"."commission_resolutions" ADD CONSTRAINT "fk_sales_commission_resolutions_created_by"
      FOREIGN KEY ("created_by") REFERENCES "security"."users"("userId") ON DELETE restrict ON UPDATE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_commission_resolutions_updated_by') THEN
    ALTER TABLE "sales"."commission_resolutions" ADD CONSTRAINT "fk_sales_commission_resolutions_updated_by"
      FOREIGN KEY ("updated_by") REFERENCES "security"."users"("userId") ON DELETE restrict ON UPDATE cascade;
  END IF;
END
$cr_fk$;--> statement-breakpoint

DO $cl_fk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_commission_liabilities_tenant') THEN
    ALTER TABLE "sales"."commission_liabilities" ADD CONSTRAINT "fk_sales_commission_liabilities_tenant"
      FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE restrict ON UPDATE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_commission_liabilities_entry') THEN
    ALTER TABLE "sales"."commission_liabilities" ADD CONSTRAINT "fk_sales_commission_liabilities_entry"
      FOREIGN KEY ("commission_entry_id") REFERENCES "sales"."commission_entries"("id") ON DELETE cascade ON UPDATE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_commission_liabilities_payment_term') THEN
    ALTER TABLE "sales"."commission_liabilities" ADD CONSTRAINT "fk_sales_commission_liabilities_payment_term"
      FOREIGN KEY ("payment_term_id") REFERENCES "sales"."payment_terms"("id") ON DELETE set null ON UPDATE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_commission_liabilities_created_by') THEN
    ALTER TABLE "sales"."commission_liabilities" ADD CONSTRAINT "fk_sales_commission_liabilities_created_by"
      FOREIGN KEY ("created_by") REFERENCES "security"."users"("userId") ON DELETE restrict ON UPDATE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_commission_liabilities_updated_by') THEN
    ALTER TABLE "sales"."commission_liabilities" ADD CONSTRAINT "fk_sales_commission_liabilities_updated_by"
      FOREIGN KEY ("updated_by") REFERENCES "security"."users"("userId") ON DELETE restrict ON UPDATE cascade;
  END IF;
END
$cl_fk$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_sales_commission_resolutions_entry_sequence"
  ON "sales"."commission_resolutions" ("tenant_id","commission_entry_id","sequence");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_commission_resolutions_tenant" ON "sales"."commission_resolutions" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_commission_resolutions_entry" ON "sales"."commission_resolutions" ("tenant_id","commission_entry_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_commission_resolutions_source_price" ON "sales"."commission_resolutions" ("tenant_id","source_price_resolution_id");--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_sales_commission_liabilities_entry_installment"
  ON "sales"."commission_liabilities" ("tenant_id","commission_entry_id","installment_seq");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_commission_liabilities_tenant" ON "sales"."commission_liabilities" ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_commission_liabilities_entry" ON "sales"."commission_liabilities" ("tenant_id","commission_entry_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sales_commission_liabilities_status_due" ON "sales"."commission_liabilities" ("tenant_id","status","due_date");--> statement-breakpoint

ALTER TABLE "sales"."commission_resolutions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sales"."commission_liabilities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DROP POLICY IF EXISTS "sales_commission_resolutions_tenant_select" ON "sales"."commission_resolutions";--> statement-breakpoint
CREATE POLICY "sales_commission_resolutions_tenant_select" ON "sales"."commission_resolutions" AS PERMISSIVE FOR SELECT TO "app_user"
  USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
DROP POLICY IF EXISTS "sales_commission_resolutions_tenant_insert" ON "sales"."commission_resolutions";--> statement-breakpoint
CREATE POLICY "sales_commission_resolutions_tenant_insert" ON "sales"."commission_resolutions" AS PERMISSIVE FOR INSERT TO "app_user"
  WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
DROP POLICY IF EXISTS "sales_commission_resolutions_tenant_update" ON "sales"."commission_resolutions";--> statement-breakpoint
CREATE POLICY "sales_commission_resolutions_tenant_update" ON "sales"."commission_resolutions" AS PERMISSIVE FOR UPDATE TO "app_user"
  USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
DROP POLICY IF EXISTS "sales_commission_resolutions_tenant_delete" ON "sales"."commission_resolutions";--> statement-breakpoint
CREATE POLICY "sales_commission_resolutions_tenant_delete" ON "sales"."commission_resolutions" AS PERMISSIVE FOR DELETE TO "app_user"
  USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
DROP POLICY IF EXISTS "sales_commission_resolutions_service_bypass" ON "sales"."commission_resolutions";--> statement-breakpoint
CREATE POLICY "sales_commission_resolutions_service_bypass" ON "sales"."commission_resolutions" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint

DROP POLICY IF EXISTS "sales_commission_liabilities_tenant_select" ON "sales"."commission_liabilities";--> statement-breakpoint
CREATE POLICY "sales_commission_liabilities_tenant_select" ON "sales"."commission_liabilities" AS PERMISSIVE FOR SELECT TO "app_user"
  USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
DROP POLICY IF EXISTS "sales_commission_liabilities_tenant_insert" ON "sales"."commission_liabilities";--> statement-breakpoint
CREATE POLICY "sales_commission_liabilities_tenant_insert" ON "sales"."commission_liabilities" AS PERMISSIVE FOR INSERT TO "app_user"
  WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
DROP POLICY IF EXISTS "sales_commission_liabilities_tenant_update" ON "sales"."commission_liabilities";--> statement-breakpoint
CREATE POLICY "sales_commission_liabilities_tenant_update" ON "sales"."commission_liabilities" AS PERMISSIVE FOR UPDATE TO "app_user"
  USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
DROP POLICY IF EXISTS "sales_commission_liabilities_tenant_delete" ON "sales"."commission_liabilities";--> statement-breakpoint
CREATE POLICY "sales_commission_liabilities_tenant_delete" ON "sales"."commission_liabilities" AS PERMISSIVE FOR DELETE TO "app_user"
  USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);--> statement-breakpoint
DROP POLICY IF EXISTS "sales_commission_liabilities_service_bypass" ON "sales"."commission_liabilities";--> statement-breakpoint
CREATE POLICY "sales_commission_liabilities_service_bypass" ON "sales"."commission_liabilities" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint

CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint

DO $excl$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ex_sales_commission_plan_tiers_no_overlap'
  ) THEN
    ALTER TABLE "sales"."commission_plan_tiers"
      ADD CONSTRAINT "ex_sales_commission_plan_tiers_no_overlap"
      EXCLUDE USING gist (
        "tenant_id" WITH =,
        "plan_id" WITH =,
        numrange(
          "min_amount"::numeric,
          CASE WHEN "max_amount" IS NULL THEN NULL ELSE "max_amount"::numeric END,
          '[)'
        ) WITH &&
      );
  END IF;
END
$excl$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION "sales"."prevent_sales_commission_entries_truth_mutate_after_lock"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."locked_at" IS NOT NULL THEN
    IF NEW."base_amount" IS DISTINCT FROM OLD."base_amount"
       OR NEW."commission_amount" IS DISTINCT FROM OLD."commission_amount"
       OR NEW."plan_id" IS DISTINCT FROM OLD."plan_id"
       OR NEW."order_id" IS DISTINCT FROM OLD."order_id"
       OR NEW."salesperson_id" IS DISTINCT FROM OLD."salesperson_id"
       OR NEW."entry_version" IS DISTINCT FROM OLD."entry_version"
       OR NEW."price_resolution_id" IS DISTINCT FROM OLD."price_resolution_id"
       OR NEW."truth_binding_id" IS DISTINCT FROM OLD."truth_binding_id"
       OR NEW."currency_id" IS DISTINCT FROM OLD."currency_id"
       OR NEW."period_start" IS DISTINCT FROM OLD."period_start"
       OR NEW."period_end" IS DISTINCT FROM OLD."period_end"
       OR NEW."locked_at" IS DISTINCT FROM OLD."locked_at"
       OR NEW."tenant_id" IS DISTINCT FROM OLD."tenant_id" THEN
      RAISE EXCEPTION 'commission_entries truth fields are immutable after locked_at is set'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS "trg_sales_commission_entries_lock_guard" ON "sales"."commission_entries";--> statement-breakpoint
CREATE TRIGGER "trg_sales_commission_entries_lock_guard"
  BEFORE UPDATE ON "sales"."commission_entries"
  FOR EACH ROW
  EXECUTE FUNCTION "sales"."prevent_sales_commission_entries_truth_mutate_after_lock"();--> statement-breakpoint

CREATE OR REPLACE FUNCTION "sales"."prevent_sales_commission_resolutions_mutate_when_entry_locked"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  l timestamptz;
  eid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    eid := OLD."commission_entry_id";
  ELSE
    eid := NEW."commission_entry_id";
  END IF;
  SELECT "locked_at" INTO l FROM "sales"."commission_entries" WHERE "id" = eid;
  IF l IS NOT NULL THEN
    RAISE EXCEPTION 'commission_resolutions cannot change when parent commission entry is locked'
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS "trg_sales_commission_resolutions_lock_guard" ON "sales"."commission_resolutions";--> statement-breakpoint
CREATE TRIGGER "trg_sales_commission_resolutions_lock_guard"
  BEFORE INSERT OR UPDATE OR DELETE ON "sales"."commission_resolutions"
  FOR EACH ROW
  EXECUTE FUNCTION "sales"."prevent_sales_commission_resolutions_mutate_when_entry_locked"();--> statement-breakpoint
