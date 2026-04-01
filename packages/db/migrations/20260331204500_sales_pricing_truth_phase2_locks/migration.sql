-- Phase 2: versioned resolutions, FX pair checks, immutability triggers, order→sale truth gate.
-- Safe if 20260331201000 already applied the full column set (idempotent adds / IF NOT EXISTS).

DO $upgrade$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sales' AND table_name = 'price_resolutions' AND column_name = 'resolution_version'
  ) THEN
    ALTER TABLE "sales"."price_resolutions" ADD COLUMN "resolution_version" integer DEFAULT 1 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sales' AND table_name = 'price_resolutions' AND column_name = 'exchange_rate'
  ) THEN
    ALTER TABLE "sales"."price_resolutions" ADD COLUMN "exchange_rate" numeric(18, 8);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sales' AND table_name = 'price_resolutions' AND column_name = 'exchange_rate_source'
  ) THEN
    ALTER TABLE "sales"."price_resolutions" ADD COLUMN "exchange_rate_source" text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sales' AND table_name = 'document_truth_links' AND column_name = 'exchange_rate'
  ) THEN
    ALTER TABLE "sales"."document_truth_links" ADD COLUMN "exchange_rate" numeric(18, 8);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sales' AND table_name = 'document_truth_links' AND column_name = 'exchange_rate_source'
  ) THEN
    ALTER TABLE "sales"."document_truth_links" ADD COLUMN "exchange_rate_source" text;
  END IF;
END
$upgrade$;--> statement-breakpoint

DROP INDEX IF EXISTS "sales"."uq_sales_price_resolutions_line";--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_sales_price_resolutions_line_version" ON "sales"."price_resolutions" ("tenant_id","document_type","document_id","line_id","resolution_version");--> statement-breakpoint

DO $chk$
BEGIN
  ALTER TABLE "sales"."price_resolutions" ADD CONSTRAINT "chk_sales_price_resolutions_exchange_pair" CHECK (("exchange_rate" IS NULL AND "exchange_rate_source" IS NULL) OR ("exchange_rate" IS NOT NULL AND "exchange_rate_source" IS NOT NULL AND "exchange_rate" > 0));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$chk$;--> statement-breakpoint

DO $chk2$
BEGIN
  ALTER TABLE "sales"."document_truth_links" ADD CONSTRAINT "chk_sales_document_truth_links_exchange_pair" CHECK (("exchange_rate" IS NULL AND "exchange_rate_source" IS NULL) OR ("exchange_rate" IS NOT NULL AND "exchange_rate_source" IS NOT NULL AND "exchange_rate" > 0));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$chk2$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION "sales"."prevent_sales_price_resolutions_mutate_after_lock"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."locked_at" IS NOT NULL THEN
    RAISE EXCEPTION 'price_resolutions row is immutable after locked_at is set'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS "trg_sales_price_resolutions_lock_guard" ON "sales"."price_resolutions";--> statement-breakpoint
CREATE TRIGGER "trg_sales_price_resolutions_lock_guard"
  BEFORE UPDATE ON "sales"."price_resolutions"
  FOR EACH ROW
  EXECUTE FUNCTION "sales"."prevent_sales_price_resolutions_mutate_after_lock"();--> statement-breakpoint

CREATE OR REPLACE FUNCTION "sales"."prevent_sales_document_truth_links_update"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'document_truth_links is append-only; updates are not allowed'
    USING ERRCODE = 'check_violation';
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS "trg_sales_document_truth_links_immutable" ON "sales"."document_truth_links";--> statement-breakpoint
CREATE TRIGGER "trg_sales_document_truth_links_immutable"
  BEFORE UPDATE ON "sales"."document_truth_links"
  FOR EACH ROW
  EXECUTE FUNCTION "sales"."prevent_sales_document_truth_links_update"();--> statement-breakpoint

CREATE OR REPLACE FUNCTION "sales"."sales_order_enforce_truth_link_before_sale"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."status" = 'sale' AND OLD."status" IS DISTINCT FROM 'sale' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM "sales"."document_truth_links" d
      WHERE d."tenant_id" = NEW."tenant_id"
        AND d."document_id" = NEW."id"
        AND d."document_type" = 'sales_order'::"sales"."sales_truth_document_type"
    ) THEN
      RAISE EXCEPTION 'sales_orders: transition to sale requires document_truth_links row (tenant_id, document_id) first'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS "sales_order_enforce_truth_link_before_sale" ON "sales"."sales_orders";--> statement-breakpoint
CREATE TRIGGER "sales_order_enforce_truth_link_before_sale"
  BEFORE UPDATE ON "sales"."sales_orders"
  FOR EACH ROW
  EXECUTE FUNCTION "sales"."sales_order_enforce_truth_link_before_sale"();--> statement-breakpoint

CREATE OR REPLACE FUNCTION "sales"."sync_sales_price_resolutions_lock_from_document_truth"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."status" = 'sale' AND OLD."status" IS DISTINCT FROM 'sale' THEN
    UPDATE "sales"."price_resolutions" pr
    SET "locked_at" = dtl."locked_at"
    FROM "sales"."document_truth_links" dtl
    WHERE pr."tenant_id" = NEW."tenant_id"
      AND pr."document_id" = NEW."id"
      AND pr."document_type" = 'sales_order'::"sales"."sales_truth_document_type"
      AND dtl."tenant_id" = NEW."tenant_id"
      AND dtl."document_id" = NEW."id"
      AND dtl."document_type" = 'sales_order'::"sales"."sales_truth_document_type"
      AND pr."locked_at" IS NULL;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS "sync_sales_price_resolutions_lock_from_document_truth" ON "sales"."sales_orders";--> statement-breakpoint
CREATE TRIGGER "sync_sales_price_resolutions_lock_from_document_truth"
  AFTER UPDATE ON "sales"."sales_orders"
  FOR EACH ROW
  EXECUTE FUNCTION "sales"."sync_sales_price_resolutions_lock_from_document_truth"();
