CREATE TYPE "sales"."pricing_decision_status" AS ENUM('draft','final');--> statement-breakpoint
ALTER TABLE "sales"."pricing_decisions" ADD COLUMN IF NOT EXISTS "document_inputs" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."pricing_decisions" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."pricing_decisions" ADD COLUMN IF NOT EXISTS "status" "sales"."pricing_decision_status" DEFAULT 'draft'::"sales"."pricing_decision_status" NOT NULL;--> statement-breakpoint
UPDATE "sales"."pricing_decisions" SET "document_inputs" = '{}'::jsonb WHERE "document_inputs" IS NULL;--> statement-breakpoint
UPDATE "sales"."pricing_decisions" SET "document_inputs_digest" = 'legacy-' || md5("id"::text) WHERE "document_inputs_digest" IS NULL OR trim(both from "document_inputs_digest") = '';--> statement-breakpoint
ALTER TABLE "sales"."pricing_decisions" ALTER COLUMN "document_inputs_digest" SET NOT NULL;--> statement-breakpoint
UPDATE "sales"."pricing_decisions" SET "status" = 'final'::"sales"."pricing_decision_status" WHERE "status" = 'draft'::"sales"."pricing_decision_status";--> statement-breakpoint
WITH "ranked" AS (
	SELECT "id",
		ROW_NUMBER() OVER (
			PARTITION BY "tenant_id", "document_type", "document_id"
			ORDER BY "decision_version" DESC
		) AS "rn"
	FROM "sales"."pricing_decisions"
)
UPDATE "sales"."pricing_decisions" pd
SET "is_active" = ("ranked"."rn" = 1)
FROM "ranked"
WHERE pd."id" = "ranked"."id";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_sales_pricing_decisions_one_active_per_document"
	ON "sales"."pricing_decisions" ("tenant_id","document_type","document_id")
	WHERE "is_active" = true;--> statement-breakpoint
CREATE INDEX "idx_sales_pricing_decisions_status"
	ON "sales"."pricing_decisions" ("tenant_id","document_type","document_id","status");--> statement-breakpoint
ALTER TABLE "sales"."pricing_decisions" ADD CONSTRAINT "chk_sales_pricing_decisions_digest_nonempty"
	CHECK (length(trim(both from "document_inputs_digest")) >= 8);--> statement-breakpoint
CREATE OR REPLACE FUNCTION "sales"."tf_pricing_decisions_immutable_guard"()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
BEGIN
	IF OLD."status" = 'final'::"sales"."pricing_decision_status" THEN
		IF (
			NEW."document_type" IS DISTINCT FROM OLD."document_type" OR
			NEW."document_id" IS DISTINCT FROM OLD."document_id" OR
			NEW."decision_version" IS DISTINCT FROM OLD."decision_version" OR
			NEW."pricing_engine_version" IS DISTINCT FROM OLD."pricing_engine_version" OR
			NEW."document_inputs_digest" IS DISTINCT FROM OLD."document_inputs_digest" OR
			NEW."document_inputs" IS DISTINCT FROM OLD."document_inputs" OR
			NEW."status" IS DISTINCT FROM OLD."status" OR
			NEW."created_at" IS DISTINCT FROM OLD."created_at" OR
			NEW."created_by" IS DISTINCT FROM OLD."created_by"
		) THEN
			RAISE EXCEPTION 'sales.pricing_decisions: row is final; only is_active and updated_* may change';
		END IF;
		RETURN NEW;
	END IF;

	IF NEW."document_type" IS DISTINCT FROM OLD."document_type"
		OR NEW."document_id" IS DISTINCT FROM OLD."document_id"
		OR NEW."decision_version" IS DISTINCT FROM OLD."decision_version" THEN
		RAISE EXCEPTION 'sales.pricing_decisions: document key and decision_version are immutable';
	END IF;

	IF OLD."status" = 'draft'::"sales"."pricing_decision_status"
		AND NEW."status" = 'final'::"sales"."pricing_decision_status" THEN
		RETURN NEW;
	END IF;

	IF NEW."status" = 'draft'::"sales"."pricing_decision_status" THEN
		RETURN NEW;
	END IF;

	RAISE EXCEPTION 'sales.pricing_decisions: invalid status transition % → %', OLD."status", NEW."status";
END;
$f$;--> statement-breakpoint
DROP TRIGGER IF EXISTS "trg_sales_pricing_decisions_immutable_guard" ON "sales"."pricing_decisions";--> statement-breakpoint
CREATE TRIGGER "trg_sales_pricing_decisions_immutable_guard"
	BEFORE UPDATE ON "sales"."pricing_decisions"
	FOR EACH ROW
	EXECUTE PROCEDURE "sales"."tf_pricing_decisions_immutable_guard"();--> statement-breakpoint
CREATE OR REPLACE FUNCTION "sales"."tf_document_truth_links_require_final_pricing"()
RETURNS trigger
LANGUAGE plpgsql
AS $g$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM "sales"."pricing_decisions" pd
		WHERE pd."id" = NEW."pricing_decision_id"
			AND pd."status" = 'final'::"sales"."pricing_decision_status"
	) THEN
		RAISE EXCEPTION 'sales.document_truth_links: pricing_decision_id must reference status = final';
	END IF;
	RETURN NEW;
END;
$g$;--> statement-breakpoint
DROP TRIGGER IF EXISTS "trg_document_truth_links_require_final_pricing" ON "sales"."document_truth_links";--> statement-breakpoint
CREATE TRIGGER "trg_document_truth_links_require_final_pricing"
	BEFORE INSERT ON "sales"."document_truth_links"
	FOR EACH ROW
	EXECUTE PROCEDURE "sales"."tf_document_truth_links_require_final_pricing"();
