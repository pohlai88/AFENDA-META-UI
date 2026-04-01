-- Path B: document-level `pricing_decisions` parent; `price_resolutions` and `document_truth_links` reference it.

CREATE TABLE IF NOT EXISTS "sales"."pricing_decisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" integer NOT NULL,
  "document_type" "sales"."sales_truth_document_type" NOT NULL,
  "document_id" uuid NOT NULL,
  "decision_version" integer DEFAULT 1 NOT NULL,
  "pricing_engine_version" varchar(64) DEFAULT 'v1' NOT NULL,
  "document_inputs_digest" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" integer NOT NULL,
  "updated_by" integer NOT NULL,
  CONSTRAINT "chk_sales_pricing_decisions_sales_order_scope" CHECK ("document_type" = 'sales_order'::"sales"."sales_truth_document_type"),
  CONSTRAINT "chk_sales_pricing_decisions_version_positive" CHECK ("decision_version" >= 1)
);--> statement-breakpoint

ALTER TABLE "sales"."pricing_decisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DO $fk_pd$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_pricing_decisions_tenant') THEN
    ALTER TABLE "sales"."pricing_decisions" ADD CONSTRAINT "fk_sales_pricing_decisions_tenant"
      FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("tenant_id") ON DELETE restrict ON UPDATE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_pricing_decisions_order') THEN
    ALTER TABLE "sales"."pricing_decisions" ADD CONSTRAINT "fk_sales_pricing_decisions_order"
      FOREIGN KEY ("document_id") REFERENCES "sales"."sales_orders"("id") ON DELETE restrict ON UPDATE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_pricing_decisions_created_by') THEN
    ALTER TABLE "sales"."pricing_decisions" ADD CONSTRAINT "fk_sales_pricing_decisions_created_by"
      FOREIGN KEY ("created_by") REFERENCES "security"."users"("userId") ON DELETE restrict ON UPDATE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_pricing_decisions_updated_by') THEN
    ALTER TABLE "sales"."pricing_decisions" ADD CONSTRAINT "fk_sales_pricing_decisions_updated_by"
      FOREIGN KEY ("updated_by") REFERENCES "security"."users"("userId") ON DELETE restrict ON UPDATE cascade;
  END IF;
END
$fk_pd$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "uq_sales_pricing_decisions_doc_version"
  ON "sales"."pricing_decisions" ("tenant_id","document_type","document_id","decision_version");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_sales_pricing_decisions_tenant_document"
  ON "sales"."pricing_decisions" ("tenant_id","document_type","document_id");--> statement-breakpoint

DO $pol$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'sales' AND tablename = 'pricing_decisions' AND policyname = 'sales_pricing_decisions_tenant_select') THEN
    CREATE POLICY "sales_pricing_decisions_tenant_select" ON "sales"."pricing_decisions" AS PERMISSIVE FOR SELECT TO "app_user"
      USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'sales' AND tablename = 'pricing_decisions' AND policyname = 'sales_pricing_decisions_tenant_insert') THEN
    CREATE POLICY "sales_pricing_decisions_tenant_insert" ON "sales"."pricing_decisions" AS PERMISSIVE FOR INSERT TO "app_user"
      WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'sales' AND tablename = 'pricing_decisions' AND policyname = 'sales_pricing_decisions_tenant_update') THEN
    CREATE POLICY "sales_pricing_decisions_tenant_update" ON "sales"."pricing_decisions" AS PERMISSIVE FOR UPDATE TO "app_user"
      USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int)
      WITH CHECK ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'sales' AND tablename = 'pricing_decisions' AND policyname = 'sales_pricing_decisions_tenant_delete') THEN
    CREATE POLICY "sales_pricing_decisions_tenant_delete" ON "sales"."pricing_decisions" AS PERMISSIVE FOR DELETE TO "app_user"
      USING ("tenant_id" = NULLIF(current_setting('afenda.tenant_id', true), '')::int);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'sales' AND tablename = 'pricing_decisions' AND policyname = 'sales_pricing_decisions_service_bypass') THEN
    CREATE POLICY "sales_pricing_decisions_service_bypass" ON "sales"."pricing_decisions" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
  END IF;
END
$pol$;--> statement-breakpoint

INSERT INTO "sales"."pricing_decisions" (
  "tenant_id", "document_type", "document_id", "decision_version",
  "pricing_engine_version", "created_by", "updated_by"
)
SELECT
  pr."tenant_id",
  pr."document_type",
  pr."document_id",
  1,
  COALESCE(MAX(pr."pricing_engine_version"), 'v1'),
  MIN(pr."created_by"),
  MIN(pr."updated_by")
FROM "sales"."price_resolutions" pr
GROUP BY pr."tenant_id", pr."document_type", pr."document_id"
ON CONFLICT ("tenant_id", "document_type", "document_id", "decision_version") DO NOTHING;--> statement-breakpoint

DO $col$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sales' AND table_name = 'price_resolutions' AND column_name = 'pricing_decision_id'
  ) THEN
    ALTER TABLE "sales"."price_resolutions" ADD COLUMN "pricing_decision_id" uuid;
  END IF;
END
$col$;--> statement-breakpoint

UPDATE "sales"."price_resolutions" pr
SET "pricing_decision_id" = pd."id"
FROM "sales"."pricing_decisions" pd
WHERE pr."pricing_decision_id" IS NULL
  AND pd."tenant_id" = pr."tenant_id"
  AND pd."document_type" = pr."document_type"
  AND pd."document_id" = pr."document_id"
  AND pd."decision_version" = 1;--> statement-breakpoint

DO $assert_pr$
BEGIN
  IF EXISTS (SELECT 1 FROM "sales"."price_resolutions" WHERE "pricing_decision_id" IS NULL) THEN
    RAISE EXCEPTION 'price_resolutions.pricing_decision_id backfill failed';
  END IF;
END
$assert_pr$;--> statement-breakpoint

ALTER TABLE "sales"."price_resolutions" ALTER COLUMN "pricing_decision_id" SET NOT NULL;--> statement-breakpoint

DO $fk_pr$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_price_resolutions_pricing_decision') THEN
    ALTER TABLE "sales"."price_resolutions" ADD CONSTRAINT "fk_sales_price_resolutions_pricing_decision"
      FOREIGN KEY ("pricing_decision_id") REFERENCES "sales"."pricing_decisions"("id")
      ON DELETE restrict ON UPDATE cascade;
  END IF;
END
$fk_pr$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_sales_price_resolutions_pricing_decision"
  ON "sales"."price_resolutions" ("tenant_id","pricing_decision_id");--> statement-breakpoint

DO $dtl$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_document_truth_links_pricing_decision'
  ) THEN
    ALTER TABLE "sales"."document_truth_links" DROP CONSTRAINT "fk_sales_document_truth_links_pricing_decision";
  END IF;
END
$dtl$;--> statement-breakpoint

UPDATE "sales"."document_truth_links" dtl
SET "pricing_decision_id" = pd."id"
FROM "sales"."price_resolutions" pr
INNER JOIN "sales"."pricing_decisions" pd
  ON pd."tenant_id" = pr."tenant_id"
  AND pd."document_type" = pr."document_type"
  AND pd."document_id" = pr."document_id"
  AND pd."decision_version" = 1
WHERE pr."id" = dtl."pricing_decision_id";--> statement-breakpoint

DO $fk_dtl$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_document_truth_links_pricing_decision') THEN
    ALTER TABLE "sales"."document_truth_links" ADD CONSTRAINT "fk_sales_document_truth_links_pricing_decision"
      FOREIGN KEY ("pricing_decision_id") REFERENCES "sales"."pricing_decisions"("id")
      ON DELETE restrict ON UPDATE cascade;
  END IF;
END
$fk_dtl$;--> statement-breakpoint
