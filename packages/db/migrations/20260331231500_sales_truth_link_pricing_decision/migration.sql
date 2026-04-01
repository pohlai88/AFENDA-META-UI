-- Truth binding chain: anchor document_truth_links to a canonical price_resolutions row,
-- restrict order delete when truth exists, document-type guard, engine version on resolutions.

DO $upgrade$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sales' AND table_name = 'price_resolutions' AND column_name = 'pricing_engine_version'
  ) THEN
    ALTER TABLE "sales"."price_resolutions" ADD COLUMN "pricing_engine_version" varchar(64) DEFAULT 'v1' NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sales' AND table_name = 'document_truth_links' AND column_name = 'pricing_decision_id'
  ) THEN
    ALTER TABLE "sales"."document_truth_links" ADD COLUMN "pricing_decision_id" uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sales' AND table_name = 'document_truth_links' AND column_name = 'lock_reason'
  ) THEN
    ALTER TABLE "sales"."document_truth_links" ADD COLUMN "lock_reason" text;
  END IF;
END
$upgrade$;--> statement-breakpoint

-- Backfill: prefer product lines by sequence, latest resolution_version per line.
UPDATE "sales"."document_truth_links" dtl
SET "pricing_decision_id" = x."resolution_id"
FROM (
  SELECT DISTINCT ON (dtl2."id")
    dtl2."id" AS link_id,
    pr."id" AS resolution_id
  FROM "sales"."document_truth_links" dtl2
  INNER JOIN "sales"."price_resolutions" pr
    ON pr."tenant_id" = dtl2."tenant_id"
    AND pr."document_type" = dtl2."document_type"
    AND pr."document_id" = dtl2."document_id"
  INNER JOIN "sales"."sales_order_lines" l
    ON l."id" = pr."line_id"
    AND l."tenant_id" = dtl2."tenant_id"
    AND l."order_id" = dtl2."document_id"
    AND l."display_type" = 'product'
  WHERE pr."resolution_version" = (
    SELECT MAX(pr2."resolution_version")
    FROM "sales"."price_resolutions" pr2
    WHERE pr2."tenant_id" = pr."tenant_id" AND pr2."line_id" = pr."line_id"
  )
  ORDER BY dtl2."id", l."sequence" ASC NULLS LAST
) AS x
WHERE dtl."id" = x.link_id AND dtl."pricing_decision_id" IS NULL;--> statement-breakpoint

UPDATE "sales"."document_truth_links" dtl
SET "pricing_decision_id" = y."resolution_id"
FROM (
  SELECT DISTINCT ON (dtl2."id")
    dtl2."id" AS link_id,
    pr."id" AS resolution_id
  FROM "sales"."document_truth_links" dtl2
  INNER JOIN "sales"."price_resolutions" pr
    ON pr."tenant_id" = dtl2."tenant_id"
    AND pr."document_type" = dtl2."document_type"
    AND pr."document_id" = dtl2."document_id"
  INNER JOIN "sales"."sales_order_lines" l
    ON l."id" = pr."line_id"
    AND l."tenant_id" = dtl2."tenant_id"
    AND l."order_id" = dtl2."document_id"
  WHERE dtl2."pricing_decision_id" IS NULL
    AND pr."resolution_version" = (
      SELECT MAX(pr2."resolution_version")
      FROM "sales"."price_resolutions" pr2
      WHERE pr2."tenant_id" = pr."tenant_id" AND pr2."line_id" = pr."line_id"
    )
  ORDER BY dtl2."id", l."sequence" ASC NULLS LAST
) AS y
WHERE dtl."id" = y.link_id AND dtl."pricing_decision_id" IS NULL;--> statement-breakpoint

DO $assert$
BEGIN
  IF EXISTS (SELECT 1 FROM "sales"."document_truth_links" WHERE "pricing_decision_id" IS NULL) THEN
    RAISE EXCEPTION 'document_truth_links.pricing_decision_id backfill failed: rows remain NULL';
  END IF;
END
$assert$;--> statement-breakpoint

ALTER TABLE "sales"."document_truth_links" ALTER COLUMN "pricing_decision_id" SET NOT NULL;--> statement-breakpoint

DO $fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_document_truth_links_pricing_decision'
  ) THEN
    ALTER TABLE "sales"."document_truth_links"
      ADD CONSTRAINT "fk_sales_document_truth_links_pricing_decision"
      FOREIGN KEY ("pricing_decision_id") REFERENCES "sales"."price_resolutions"("id")
      ON DELETE restrict ON UPDATE cascade;
  END IF;
END
$fk$;--> statement-breakpoint

ALTER TABLE "sales"."document_truth_links" DROP CONSTRAINT IF EXISTS "fk_sales_document_truth_links_order";--> statement-breakpoint
ALTER TABLE "sales"."document_truth_links" ADD CONSTRAINT "fk_sales_document_truth_links_order"
  FOREIGN KEY ("document_id") REFERENCES "sales"."sales_orders"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint

DO $chk$
BEGIN
  ALTER TABLE "sales"."document_truth_links" ADD CONSTRAINT "chk_sales_document_truth_links_sales_order_only"
    CHECK ("document_type" = 'sales_order'::"sales"."sales_truth_document_type");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$chk$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_sales_document_truth_links_pricing_decision"
  ON "sales"."document_truth_links" ("tenant_id","pricing_decision_id");--> statement-breakpoint

UPDATE "sales"."document_truth_links" SET "lock_reason" = 'order_confirmed' WHERE "lock_reason" IS NULL;
